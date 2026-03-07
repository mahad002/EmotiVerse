import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore, getDecodedIdToken } from '@/lib/firebase-admin';
import { ADMIN_USER_UID, ADMIN_EMAIL } from '@/config/admin';

function isAdmin(decoded: { uid: string; email: string | null }): boolean {
  if (decoded.uid === ADMIN_USER_UID) return true;
  if (ADMIN_EMAIL && decoded.email && decoded.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) return true;
  return false;
}

interface UserDocData {
  name?: string;
  email?: string;
  phone?: string;
  createdAt?: { toDate?: () => Date } | Date;
  updatedAt?: { toDate?: () => Date } | Date;
}

function toIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object' && value && 'toDate' in value && typeof (value as any).toDate === 'function') {
    const d = (value as any).toDate();
    return d instanceof Date ? d.toISOString() : null;
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const decoded = await getDecodedIdToken(request);
    if (!decoded) {
      return NextResponse.json({ error: 'Auth required' }, { status: 401 });
    }
    if (!isAdmin(decoded)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = getAdminFirestore();
    if (!db) {
      return NextResponse.json({ error: 'Firestore unavailable' }, { status: 500 });
    }

    const snapshot = await db.collection('users').get();
    const trackedEmail = (process.env.TRACKED_ACTIVITY_EMAIL || '').trim() || null;

    const users = snapshot.docs.map((docSnap) => {
      const data = docSnap.data() as UserDocData;
      const email = (data.email ?? '').toString().trim();
      return {
        id: docSnap.id,
        name: (data.name ?? '').toString(),
        email,
        phone: (data.phone ?? '').toString(),
        createdAt: toIso(data.createdAt ?? null),
        updatedAt: toIso(data.updatedAt ?? null),
        isTracked: !!trackedEmail && email === trackedEmail,
      };
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Admin users activity API error:', error);
    const msg = error instanceof Error ? error.message : 'Something went wrong.';
    const message =
      /Could not load the default credentials/i.test(msg)
        ? 'Server missing Firebase Admin credentials. Put the service account JSON file in the project root or set FIREBASE_ADMIN_PRIVATE_KEY and FIREBASE_ADMIN_CLIENT_EMAIL in .env.'
        : msg;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


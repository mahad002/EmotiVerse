import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore, getDecodedIdToken } from '@/lib/firebase-admin';
import { ADMIN_USER_UID, ADMIN_EMAIL } from '@/config/admin';

function isAdmin(decoded: { uid: string; email: string | null }): boolean {
  if (decoded.uid === ADMIN_USER_UID) return true;
  if (ADMIN_EMAIL && decoded.email && decoded.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) return true;
  return false;
}

interface ActivityLogDoc {
  userId?: string;
  email?: string | null;
  timestamp?: { toDate?: () => Date } | Date;
  characterId?: string;
  persona?: string;
  messages?: { role: 'user' | 'ai'; text: string }[];
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

export async function POST(request: NextRequest) {
  try {
    const decoded = await getDecodedIdToken(request);
    if (!decoded) {
      return NextResponse.json({ error: 'Auth required' }, { status: 401 });
    }
    if (!isAdmin(decoded)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const emailRaw = typeof body.email === 'string' ? body.email.trim() : '';
    const email = emailRaw || null;

    const db = getAdminFirestore();
    if (!db) {
      return NextResponse.json({ error: 'Firestore unavailable' }, { status: 500 });
    }

    let query = db.collection('activity_logs');
    if (email) {
      query = query.where('email', '==', email);
    }
    query = query.orderBy('timestamp', 'desc').limit(100);

    const snapshot = await query.get();
    const logs = snapshot.docs.map((docSnap) => {
      const data = docSnap.data() as ActivityLogDoc;
      return {
        id: docSnap.id,
        timestamp: toIso(data.timestamp ?? null),
        characterId: (data.characterId ?? '').toString(),
        persona: data.persona ?? null,
        messages: (data.messages ?? []).map((m) => ({
          role: m.role,
          text: m.text,
        })),
      };
    });

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Admin logs activity API error:', error);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}


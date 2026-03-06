import { NextRequest, NextResponse } from 'next/server';
import { getDecodedIdToken } from '@/lib/firebase-admin';
import { ADMIN_EMAIL } from '@/config/admin';

function isAdmin(decoded: { uid: string; email: string | null }): boolean {
  if (ADMIN_EMAIL && decoded.email && decoded.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) return true;
  return false;
}

/** GET: returns TRACKED_ACTIVITY_EMAIL from env for admin only (so client can show Tracked badge without NEXT_PUBLIC_). */
export async function GET(request: NextRequest) {
  try {
    const decoded = await getDecodedIdToken(request);
    if (!decoded || !isAdmin(decoded)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const email = (process.env.TRACKED_ACTIVITY_EMAIL ?? '').trim();
    return NextResponse.json({ email });
  } catch {
    return NextResponse.json({ email: '' });
  }
}

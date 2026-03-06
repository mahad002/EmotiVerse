/**
 * Server-only activity log: append text-only conversation entries for a configured user.
 * Do not import from client. Fire-and-forget only; do not await in critical path.
 */
import { getAdminFirestore } from './firebase-admin';

const COLLECTION = 'activity_logs';

export interface ActivityLogMessage {
  role: 'user' | 'ai';
  text: string;
}

export interface AppendActivityLogData {
  uid: string;
  email: string | null;
  characterId: string;
  persona?: string;
  messages: ActivityLogMessage[];
}

function getTrackedEmail(): string | null {
  const e = process.env.TRACKED_ACTIVITY_EMAIL;
  return typeof e === 'string' && e.trim() ? e.trim() : null;
}

/**
 * If TRACKED_ACTIVITY_EMAIL is set and data.email matches, appends one document to activity_logs.
 * Text only; no images or voice. Call with void (fire-and-forget); do not await before responding.
 */
export function appendActivityLog(data: AppendActivityLogData): void {
  const tracked = getTrackedEmail();
  if (!tracked || data.email !== tracked) return;
  const db = getAdminFirestore();
  if (!db) return;
  const payload = {
    userId: data.uid,
    email: data.email ?? null,
    timestamp: new Date(),
    characterId: data.characterId,
    ...(data.persona ? { persona: data.persona } : {}),
    messages: data.messages,
  };
  db.collection(COLLECTION)
    .add(payload)
    .catch(() => {
      // Fire-and-forget; avoid leaking errors into response
    });
}

/**
 * Server-only activity log: append text-only conversation entries for users marked tracked in DB.
 * Do not import from client. Fire-and-forget only; do not await in critical path.
 */
import { getAdminFirestore } from './firebase-admin';

const COLLECTION = 'activity_logs';
const USERS_COLLECTION = 'users';

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
  /** e.g. 'emotional' | 'typem' | 'codem' */
  source?: string;
  sessionId?: string;
}

/**
 * If the user's document has tracked === true, appends one document to activity_logs.
 * Returns a promise so callers can await and ensure the write completes before responding.
 */
export function appendActivityLog(data: AppendActivityLogData): Promise<void> {
  const db = getAdminFirestore();
  if (!db) return Promise.resolve();
  return db
    .collection(USERS_COLLECTION)
    .doc(data.uid)
    .get()
    .then((snap) => {
      const raw = snap.exists ? snap.data()?.tracked : undefined;
      const tracked = raw === true || raw === 'true';
      if (process.env.NODE_ENV === 'development' && !tracked) {
        console.warn('[activity-log] User not tracked, skip logging. uid=%s tracked=%s', data.uid, raw);
      }
      if (!tracked) return;
      const payload = {
        userId: data.uid,
        email: data.email ?? null,
        timestamp: new Date(),
        characterId: data.characterId,
        persona: data.persona ?? '',
        messages: data.messages,
        ...(data.source ? { source: data.source } : {}),
        ...(data.sessionId ? { sessionId: data.sessionId } : {}),
      };
      return db.collection(COLLECTION).add(payload);
    })
    .then(() => {})
    .catch((err) => {
      if (process.env.NODE_ENV === 'development') {
        console.error('[activity-log]', err);
      }
    });
}

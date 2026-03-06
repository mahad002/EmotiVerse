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
 * Text only; no images or voice. Call with void (fire-and-forget); do not await before responding.
 */
export function appendActivityLog(data: AppendActivityLogData): void {
  const db = getAdminFirestore();
  if (!db) return;
  db.collection(USERS_COLLECTION)
    .doc(data.uid)
    .get()
    .then((snap) => {
      const tracked = snap.exists && snap.data()?.tracked === true;
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
    .catch(() => {
      // Fire-and-forget; avoid leaking errors into response
    });
}

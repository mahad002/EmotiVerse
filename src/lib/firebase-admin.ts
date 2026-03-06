/**
 * Server-only Firebase Admin: verify Id Tokens for abuse prevention / rate limiting.
 * Do not import this module from client code.
 */
import * as admin from 'firebase-admin';
import type { NextRequest } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

let initialized = false;

const SERVICE_ACCOUNT_FILENAME = 'emotiverse-7q2bl-firebase-adminsdk-fbsvc-05a9c066dc.json';

function ensureInitialized(): void {
  if (initialized) return;
  if (admin.apps.length > 0) {
    initialized = true;
    return;
  }
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) return;

  const possibleDirs = [process.cwd(), join(process.cwd(), '..')];
  const credPath = possibleDirs.map((dir) => join(dir, SERVICE_ACCOUNT_FILENAME)).find((p) => existsSync(p));
  if (credPath) {
    const serviceAccount = JSON.parse(readFileSync(credPath, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      projectId: serviceAccount.project_id,
    });
  } else {
    const key = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    if (key && clientEmail) {
      const privateKey = key.replace(/\\n/g, '\n');
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        projectId,
      });
    } else {
      admin.initializeApp({ projectId });
    }
  }
  initialized = true;
}

export interface DecodedToken {
  uid: string;
  email: string | null;
}

/**
 * Reads Authorization: Bearer <idToken> from the request, verifies the token with Firebase Admin,
 * and returns { uid, email } or null if missing/invalid. Use for app-wide auth (e.g. rate limiting).
 */
export function getAdminFirestore(): admin.firestore.Firestore | null {
  try {
    ensureInitialized();
    return admin.apps.length > 0 ? admin.firestore() : null;
  } catch {
    return null;
  }
}

export async function getDecodedIdToken(
  request: NextRequest
): Promise<DecodedToken | null> {
  try {
    ensureInitialized();
    if (admin.apps.length === 0) return null;
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return null;
    const idToken = authHeader.slice(7).trim();
    if (!idToken) return null;
    const decoded = await admin.auth().verifyIdToken(idToken);
    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
    };
  } catch {
    return null;
  }
}


'use server';

import { db } from '@/lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  email: string | null;
  username: string | null;
  phone: {
    country: string;
    countryCode: string;
    number: string;
  } | null;
}

export async function createUserProfile(userProfile: UserProfile): Promise<void> {
  const userRef = doc(db, 'users', userProfile.uid);
  await setDoc(userRef, userProfile, { merge: true });
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    return userSnap.data() as UserProfile;
  } else {
    return null;
  }
}

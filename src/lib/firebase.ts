import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDTMkDc7t_CM6rW0x0Vlh5oZlzkwCasgAM",
  authDomain: "saraipk.firebaseapp.com",
  databaseURL: "https://saraipk-default-rtdb.firebaseio.com",
  projectId: "saraipk",
  storageBucket: "saraipk.appspot.com",
  messagingSenderId: "680696810543",
  appId: "1:680696810543:web:8bd507838d509530a64ada",
  measurementId: "G-TDJTXB6MH3"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;

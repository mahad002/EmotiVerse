// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDTMkDc7t_CM6rW0x0Vlh5oZlzkwCasgAM",
  authDomain: "saraipk.firebaseapp.com",
  databaseURL: "https://saraipk-default-rtdb.firebaseio.com",
  projectId: "saraipk",
  storageBucket: "saraipk.firebasestorage.app",
  messagingSenderId: "680696810543",
  appId: "1:680696810543:web:8bd507838d509530a64ada",
  measurementId: "G-TDJTXB6MH3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics (only in browser environment)
let analytics;
if (typeof window !== "undefined") {
  analytics = getAnalytics(app);
}

// Initialize Firestore
const db = getFirestore(app);

export default app;
export { db, analytics };
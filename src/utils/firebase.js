import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

import { getStorage } from 'firebase/storage';

if (typeof window !== 'undefined') {
  console.log("Current Domain:", window.location.hostname);
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCgYhAozm2Cy1gO73bUDu9qb3mKTzHkfII",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "edunepal-15085.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "edunepal-15085",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "edunepal-15085.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "124967042622",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:124967042622:web:c722a12d1b0019f028db6f"
};

import { getFunctions } from 'firebase/functions';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app);

export { auth, db, storage, functions };

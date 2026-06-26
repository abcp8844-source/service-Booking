import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// .trim() کا جادو یہاں کام کرے گا، یہ کسی بھی پوشیدہ اسپیس یا لائن بریک کو کاٹ دے گا
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY?.toString().trim(),
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.toString().trim(),
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID?.toString().trim(),
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET?.toString().trim(),
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID?.toString().trim(),
  appId: import.meta.env.VITE_FIREBASE_APP_ID?.toString().trim(),
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID?.toString().trim()
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

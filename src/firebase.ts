import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "service-booking-fac40.firebaseapp.com", // یہ آپ کے نئے پروجیکٹ کا ڈومین ہے
  projectId: "service-booking-fac40",
  storageBucket: "service-booking-fac40.firebasestorage.app",
  messagingSenderId: "751595311504",
  appId: "1:751595311504:web:6be475ed42e4390886e315"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

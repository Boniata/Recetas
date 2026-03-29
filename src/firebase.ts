import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "AIzaSyCsqongi-LJmMac0_DZYwtLQ_eo57Rag3g",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "recetas-749f3.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "recetas-749f3",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "recetas-749f3.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "951193709814",
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "1:951193709814:web:082676391e4122201490d7",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

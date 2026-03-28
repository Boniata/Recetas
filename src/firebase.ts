import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCsqongi-LJmMac0_DZYwtLQ_eo57Rag3g",
  authDomain: "recetas-749f3.firebaseapp.com",
  projectId: "recetas-749f3",
  storageBucket: "recetas-749f3.firebasestorage.app",
  messagingSenderId: "951193709814",
  appId: "1:951193709814:web:082676391e4122201490d7",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

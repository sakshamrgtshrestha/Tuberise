import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD6lmOtedFt8d0piFBYqpwgsgycQ9OS5MI",
  authDomain: "tuberise-22c2a.firebaseapp.com",
  projectId: "tuberise-22c2a",
  storageBucket: "tuberise-22c2a.firebasestorage.app",
  messagingSenderId: "1090230987883",
  appId: "1:1090230987883:web:e972468b6a03b9ce7f552e"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
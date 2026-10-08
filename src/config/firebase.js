import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { initializeAuth, getReactNativePersistence, getAuth, onAuthStateChanged } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyD6lmOtedFt8d0piFBYqpwgsgycQ9OS5MI",
  authDomain: "tuberise-22c2a.firebaseapp.com",
  projectId: "tuberise-22c2a",
  storageBucket: "tuberise-22c2a.firebasestorage.app",
  messagingSenderId: "1090230987883",
  appId: "1:1090230987883:web:e972468b6a03b9ce7f552e"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);

let auth;
try {
  auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
} catch (e) {
  auth = getAuth(app);
}
export { auth };

export const waitForAuth = () => {
  return new Promise((resolve) => {
    if (auth.currentUser) {
      resolve(auth.currentUser);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        unsubscribe();
        resolve(user);
      }
    });
  });
};
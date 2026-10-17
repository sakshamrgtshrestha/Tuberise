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

let authPromise = null;

export const waitForAuth = () => {
  if (authPromise) return authPromise;

  authPromise = new Promise((resolve) => {
    if (auth.currentUser) {
      resolve(auth.currentUser);
      return;
    }

    const timeout = setTimeout(() => {
      console.warn('[FirebaseAuth] waitForAuth timed out after 5s. Proceeding without Firebase Auth.');
      if (typeof unsubscribe === 'function') unsubscribe();
      resolve(null);
    }, 5000);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        clearTimeout(timeout);
        unsubscribe();
        resolve(user);
      }
    });
  });

  return authPromise;
};
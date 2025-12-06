// IMPORTANT: This file is for SERVER-SIDE use only.
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from './config';

// This function should only be called on the server (e.g., in API routes or server components).
export function initializeFirebase() {
  if (!getApps().length) {
    const app = initializeApp(firebaseConfig);
    return {
      firebaseApp: app,
      auth: getAuth(app),
      firestore: getFirestore(app)
    };
  } else {
    const app = getApp();
    return {
      firebaseApp: app,
      auth: getAuth(app),
      firestore: getFirestore(app)
    };
  }
}

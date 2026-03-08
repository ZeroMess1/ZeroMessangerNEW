import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyD57XFZAt9SWHQ2WRAXztugYo1P6U2_XvE",
  authDomain: "zero-messenger-4d20d.firebaseapp.com",
  projectId: "zero-messenger-4d20d",
  storageBucket: "zero-messenger-4d20d.firebasestorage.app",
  messagingSenderId: "11851164681",
  appId: "1:11851164681:web:fe7a608c25654beaba9cd8"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
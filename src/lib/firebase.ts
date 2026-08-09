import { initializeApp, getApps, getApp, setLogLevel } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import jsonConfig from '../../firebase-applet-config.json';

// Silence verbose connection warnings in preview environment
setLogLevel('error');

const fallbackConfig = {
  projectId: "project-bca7c627-a682-4fa4-b57",
  appId: "1:515277941926:web:68c95c74994fac368e1867",
  apiKey: "AIzaSyCWa80aTzqLG7MK92QtyjhGQiEGlLoqHec",
  authDomain: "project-bca7c627-a682-4fa4-b57.firebaseapp.com",
  storageBucket: "project-bca7c627-a682-4fa4-b57.firebasestorage.app",
  messagingSenderId: "515277941926",
  measurementId: "",
  oAuthClientId: "515277941926-bcig3kn8uu8p18dfliaoboo8fr9rl44r.apps.googleusercontent.com",
  recaptchaSiteKey: "",
  firestoreDatabaseId: "ai-studio-mitallergestinde-bc39b28c-d4c1-4e4f-ab60-11b88b842d98"
};

const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined;

const envConfig = metaEnv?.VITE_FIREBASE_API_KEY
  ? {
      apiKey: metaEnv.VITE_FIREBASE_API_KEY,
      authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || fallbackConfig.authDomain,
      projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || fallbackConfig.projectId,
      storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || fallbackConfig.storageBucket,
      messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || fallbackConfig.messagingSenderId,
      appId: metaEnv.VITE_FIREBASE_APP_ID || fallbackConfig.appId,
      firestoreDatabaseId: metaEnv.VITE_FIREBASE_DATABASE_ID || fallbackConfig.firestoreDatabaseId,
    }
  : {};

const firebaseConfig = {
  ...fallbackConfig,
  ...(jsonConfig || {}),
  ...envConfig
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || fallbackConfig.firestoreDatabaseId);



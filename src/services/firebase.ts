import { initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';
import { z } from 'zod';

export interface FirebaseServices {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
}

const envSchema = z.object({
  VITE_FIREBASE_API_KEY: z.string().min(1),
  VITE_FIREBASE_AUTH_DOMAIN: z.string().min(1),
  VITE_FIREBASE_PROJECT_ID: z.string().min(1),
  VITE_FIREBASE_STORAGE_BUCKET: z.string().min(1),
  VITE_FIREBASE_MESSAGING_SENDER_ID: z.string().min(1),
  VITE_FIREBASE_APP_ID: z.string().min(1),
  VITE_USE_EMULATORS: z.enum(['true', 'false']).optional(),
});

type FirebaseEnv = z.infer<typeof envSchema>;

export function parseFirebaseEnv(env: Record<string, unknown>): FirebaseEnv {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    const missing = result.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new Error(`Firebase configuration is missing or invalid: ${missing}. Check .env.local.`);
  }
  rejectDemoProject(result.data);
  return result.data;
}

/**
 * The demo values from `.env.example` only work with the local emulators. Against the real
 * Firebase they fail later with "API key not valid", so they are refused at startup instead.
 */
function rejectDemoProject(env: FirebaseEnv): void {
  if (env.VITE_USE_EMULATORS === 'true') {
    return;
  }
  const demo = (
    [
      ['VITE_FIREBASE_API_KEY', env.VITE_FIREBASE_API_KEY],
      ['VITE_FIREBASE_PROJECT_ID', env.VITE_FIREBASE_PROJECT_ID],
    ] as const
  ).filter(([, value]) => value.startsWith('demo-'));
  if (demo.length > 0) {
    const names = demo.map(([name]) => name).join(' and ');
    const verb = demo.length === 1 ? 'still has the demo value' : 'still have the demo values';
    throw new Error(
      `${names} ${verb} from .env.example, which only works with the local emulators. Copy ` +
        'the real values from the Firebase console (Project settings, Your apps) into .env.local, ' +
        'or set VITE_USE_EMULATORS=true, then restart the app.',
    );
  }
}

export function initFirebase(env: FirebaseEnv): FirebaseServices {
  const app = initializeApp({
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  });
  const auth = getAuth(app);
  const db = getFirestore(app);

  if (env.VITE_USE_EMULATORS === 'true') {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
  }

  return { app, auth, db };
}

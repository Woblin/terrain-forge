import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { StartupError } from './components/StartupError';
import { initFirebase, parseFirebaseEnv, type FirebaseServices } from './services/firebase';
import './index.css';

function startFirebase(): FirebaseServices | Error {
  try {
    return initFirebase(parseFirebaseEnv(import.meta.env));
  } catch (error) {
    return error instanceof Error ? error : new Error(String(error));
  }
}

const rootElement = document.getElementById('root');
if (rootElement === null) {
  throw new Error('Root element #root not found in index.html.');
}

const firebase = startFirebase();

createRoot(rootElement).render(
  <StrictMode>
    {firebase instanceof Error ? (
      <StartupError message={firebase.message} />
    ) : (
      <App firebase={firebase} />
    )}
  </StrictMode>,
);

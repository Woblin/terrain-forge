import { createContext, useContext } from 'react';
import type { FirebaseServices } from '../services/firebase';

export const FirebaseContext = createContext<FirebaseServices | null>(null);

export function useFirebase(): FirebaseServices {
  const services = useContext(FirebaseContext);
  if (services === null) {
    throw new Error('useFirebase must be used inside FirebaseContext.Provider.');
  }
  return services;
}

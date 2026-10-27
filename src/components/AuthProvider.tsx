import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AuthContext, type AuthState } from '../hooks/authContext';
import { useFirebase } from '../hooks/firebaseContext';
import {
  createAccount,
  deleteAccount,
  refreshVerification,
  resendVerification,
  sendPasswordReset,
  signInWithEmail,
  signInWithGoogle,
  signOutPlayer,
  watchUser,
} from '../services/auth';

/** Shares who is signed in with the whole app. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const { auth, db } = useFirebase();
  const [state, setState] = useState<AuthState>({ status: 'checking' });
  const user = state.status === 'signedIn' ? state.user : null;
  const waitingForVerification = user !== null && !user.emailVerified;

  useEffect(
    () =>
      watchUser(auth, (next) => {
        setState(next === null ? { status: 'signedOut' } : { status: 'signedIn', user: next });
      }),
    [auth],
  );

  useEffect(() => {
    if (!waitingForVerification) {
      return;
    }
    // The link in the email opens in another tab; coming back here is the moment to look again.
    function checkAgain(): void {
      if (document.visibilityState === 'visible') {
        void refreshVerification(auth);
      }
    }
    document.addEventListener('visibilitychange', checkAgain);
    return () => {
      document.removeEventListener('visibilitychange', checkAgain);
    };
  }, [auth, waitingForVerification]);

  const session = useMemo(
    () => ({
      state,
      user,
      signInWithGoogle: () => signInWithGoogle(auth),
      signInWithEmail: (email: string, password: string) => signInWithEmail(auth, email, password),
      createAccount: (email: string, password: string) => createAccount(auth, email, password),
      sendPasswordReset: (email: string) => sendPasswordReset(auth, email),
      resendVerification: () => resendVerification(auth),
      refreshVerification: () => refreshVerification(auth),
      signOut: () => signOutPlayer(auth),
      deleteAccount: (proof: Parameters<typeof deleteAccount>[2]) => deleteAccount(auth, db, proof),
    }),
    [state, user, auth, db],
  );
  return <AuthContext.Provider value={session}>{children}</AuthContext.Provider>;
}

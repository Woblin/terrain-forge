import { createContext, useContext } from 'react';
import type { AppUser } from '../domain/account';
import type { Reauthentication } from '../services/auth';

export type AuthState =
  | { readonly status: 'checking' }
  | { readonly status: 'signedOut' }
  | { readonly status: 'signedIn'; readonly user: AppUser };

/**
 * Who is signed in, and the sign-in actions. Each action resolves to a message for the player
 * when it fails, or null when it worked or the player stopped it.
 */
export interface AuthSession {
  readonly state: AuthState;
  /** The signed-in player, or null. */
  readonly user: AppUser | null;
  readonly signInWithGoogle: () => Promise<string | null>;
  readonly signInWithEmail: (email: string, password: string) => Promise<string | null>;
  readonly createAccount: (email: string, password: string) => Promise<string | null>;
  readonly sendPasswordReset: (email: string) => Promise<string | null>;
  readonly resendVerification: () => Promise<string | null>;
  readonly refreshVerification: () => Promise<string | null>;
  readonly signOut: () => Promise<string | null>;
  readonly deleteAccount: (proof: Reauthentication) => Promise<string | null>;
}

export const AuthContext = createContext<AuthSession | null>(null);

export function useAuth(): AuthSession {
  const session = useContext(AuthContext);
  if (session === null) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }
  return session;
}

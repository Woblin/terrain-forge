import {
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  GoogleAuthProvider,
  onIdTokenChanged,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { AppUser, SignInMethod } from '../domain/account';
import { deleteAccountPreferences } from './accountPreferences';
import { authErrorMessage } from './authErrors';
import { deleteLibrary } from './terrainLibrary';

/** How the player confirms it is them before deleting their account. */
export type Reauthentication =
  { readonly kind: 'google' } | { readonly kind: 'password'; readonly password: string };

/**
 * Calls `onChange` with the signed-in player, or null, now and after every change. It also fires
 * when the player's token is refreshed, which is how a newly verified email reaches the app.
 */
export function watchUser(auth: Auth, onChange: (user: AppUser | null) => void): () => void {
  return onIdTokenChanged(
    auth,
    (user) => {
      onChange(user === null ? null : appUser(user));
    },
    (error) => {
      console.error('Following the sign-in state failed.', error);
      onChange(null);
    },
  );
}

export function signInWithGoogle(auth: Auth): Promise<string | null> {
  return attempt('Google sign-in', () => signInWithPopup(auth, googleProvider()));
}

export function signInWithEmail(
  auth: Auth,
  email: string,
  password: string,
): Promise<string | null> {
  return attempt('Email sign-in', () => signInWithEmailAndPassword(auth, email.trim(), password));
}

/** Creates an email account, signs it in, and sends the email that verifies it. */
export function createAccount(auth: Auth, email: string, password: string): Promise<string | null> {
  return attempt('Creating an account', async () => {
    const { user } = await createUserWithEmailAndPassword(auth, email.trim(), password);
    await sendEmailVerification(user);
  });
}

/**
 * Sends a password reset link. An unknown email counts as sent, so the page does not reveal
 * which addresses have accounts.
 */
export function sendPasswordReset(auth: Auth, email: string): Promise<string | null> {
  return attempt('Sending a password reset', async () => {
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (error) {
      if (!isCode(error, 'auth/user-not-found')) {
        throw error;
      }
    }
  });
}

export function resendVerification(auth: Auth): Promise<string | null> {
  return attempt('Sending the verification email', async () => {
    await sendEmailVerification(signedIn(auth));
  });
}

/**
 * Reads the player's verified state from the server and refreshes their token, because the
 * Firestore rules read it from the token. Resolves to a message when it is still not verified.
 */
export function refreshVerification(auth: Auth): Promise<string | null> {
  return attempt('Checking the email verification', async () => {
    const user = signedIn(auth);
    await reload(user);
    if (!user.emailVerified) {
      throw new PlayerError(
        'Your email is not verified yet. Click the link in the email we sent, then try again.',
      );
    }
    await user.getIdToken(true);
  });
}

export function signOutPlayer(auth: Auth): Promise<string | null> {
  return attempt('Signing out', () => signOut(auth));
}

/**
 * Deletes the player's terrain and photos, then their account. The player confirms it is them
 * first, so that deleting the account cannot fail halfway for an old sign-in.
 */
export function deleteAccount(
  auth: Auth,
  db: Firestore,
  proof: Reauthentication,
): Promise<string | null> {
  return attempt('Deleting the account', async () => {
    const user = signedIn(auth);
    await reauthenticate(user, proof);
    try {
      await Promise.all([deleteLibrary(db, user.uid), deleteAccountPreferences(db, user.uid)]);
    } catch (error) {
      throw new PlayerError(
        'Could not delete your terrain and settings, so the account was kept. Check your connection and try again.',
        { cause: error },
      );
    }
    await deleteUser(user);
  });
}

function reauthenticate(user: User, proof: Reauthentication): Promise<unknown> {
  if (proof.kind === 'google') {
    return reauthenticateWithPopup(user, googleProvider());
  }
  if (user.email === null) {
    throw new PlayerError('This account has no email address to confirm with.');
  }
  return reauthenticateWithCredential(
    user,
    EmailAuthProvider.credential(user.email, proof.password),
  );
}

function googleProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return provider;
}

function appUser(user: User): AppUser {
  return {
    uid: user.uid,
    email: user.email,
    emailVerified: user.emailVerified,
    methods: user.providerData.flatMap((info) => signInMethod(info.providerId)),
  };
}

function signInMethod(providerId: string): SignInMethod[] {
  if (providerId === 'google.com') {
    return ['google'];
  }
  return providerId === 'password' ? ['password'] : [];
}

function signedIn(auth: Auth): User {
  const user = auth.currentUser;
  if (user === null) {
    throw new PlayerError('You are signed out. Sign in again.');
  }
  return user;
}

/** A failure whose message is already written for the player. */
class PlayerError extends Error {}

/** Runs an Auth call and turns a failure into a message for the player, or null for success. */
async function attempt(what: string, call: () => Promise<unknown>): Promise<string | null> {
  try {
    await call();
    return null;
  } catch (error) {
    const message = error instanceof PlayerError ? error.message : authErrorMessage(error);
    if (message !== null) {
      console.error(`${what} failed.`, error);
    }
    return message;
  }
}

function isCode(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
}

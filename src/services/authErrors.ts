import { PASSWORD_RULES } from '../domain/account';

const PASSWORD_POLICY = `Pick a stronger password. It needs ${PASSWORD_RULES.map((rule) =>
  rule.label.toLowerCase(),
).join(', ')}.`;

/** Firebase Auth error codes the player can do something about, each with what to tell them. */
const MESSAGES: Readonly<Record<string, string>> = {
  'auth/invalid-credential': 'Email or password is wrong.',
  'auth/wrong-password': 'Email or password is wrong.',
  'auth/user-not-found': 'Email or password is wrong.',
  'auth/invalid-email': 'Check the email address.',
  'auth/email-already-in-use':
    'There is already an account with this email. Sign in instead, or reset the password.',
  'auth/weak-password': PASSWORD_POLICY,
  'auth/password-does-not-meet-requirements': PASSWORD_POLICY,
  'auth/too-many-requests': 'Too many attempts. Wait a few minutes and try again.',
  'auth/network-request-failed': 'Could not reach the sign-in service. Check your connection.',
  'auth/user-disabled': 'This account has been switched off.',
  'auth/popup-blocked':
    'Your browser blocked the Google sign-in window. Allow pop-ups for this site, or use email.',
  'auth/account-exists-with-different-credential':
    'This email signs in with a password. Use the email form.',
  'auth/requires-recent-login': 'For your safety, confirm it is you again, then try once more.',
  'auth/user-mismatch':
    'That was a different account. Confirm with the account you are signed in with.',
  'auth/operation-not-allowed': 'This way of signing in is switched off for Terrain Forge.',
  'auth/unauthorized-domain': 'Sign-in does not work on this web address yet.',
};

/**
 * Firebase names a bad API key in its code, such as `auth/api-key-not-valid.-please-pass-a-valid-api-key.`
 * for the server's API_KEY_INVALID, so these are matched by their start.
 */
const KEY_PROBLEM_PREFIXES = ['auth/api-key-', 'auth/invalid-api-key'];

const KEY_PROBLEM =
  'Sign-in is not set up correctly: Firebase does not accept this copy of Terrain Forge. ' +
  'If you run it, check VITE_FIREBASE_API_KEY in .env.local and restart the app.';

/** Codes for something the player chose to do, such as closing the Google window. */
const CHOSEN_BY_PLAYER = new Set(['auth/popup-closed-by-user', 'auth/cancelled-popup-request']);

const FALLBACK = 'Something went wrong with signing in. Try again.';

/**
 * What to tell the player about a failed Auth call, or null when there is nothing to say because
 * they stopped it themselves.
 */
export function authErrorMessage(error: unknown): string | null {
  const code = errorCode(error);
  if (code !== null && CHOSEN_BY_PLAYER.has(code)) {
    return null;
  }
  if (code !== null && KEY_PROBLEM_PREFIXES.some((prefix) => code.startsWith(prefix))) {
    return KEY_PROBLEM;
  }
  return (code === null ? undefined : MESSAGES[code]) ?? FALLBACK;
}

function errorCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return null;
  }
  return typeof error.code === 'string' ? error.code : null;
}

/**
 * Why Firestore refused a write, as a sentence for the player. The code tells a refusal by the
 * server apart from a lost connection, so the player is not told to check a connection that works.
 */
export function writeFailureReason(error: unknown): string {
  switch (errorCode(error)) {
    case 'permission-denied':
    case 'unauthenticated':
      return 'Your sign-in may have run out. Sign out, sign in again and try once more.';
    case 'resource-exhausted':
      return 'There were too many saves at once. Wait a minute and try again.';
    case 'invalid-argument':
    case 'failed-precondition':
    case 'out-of-range':
      return 'It is too large or holds a value Terrain Forge cannot store.';
    case 'not-found':
      return 'It was deleted, perhaps on another device.';
    default:
      return 'Check your connection and try again.';
  }
}

function errorCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return null;
  }
  return typeof error.code === 'string' ? error.code : null;
}

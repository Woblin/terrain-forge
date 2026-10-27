import {
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type DocumentReference,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';
import type { GamePreferences } from '../domain/gamePreferences';
import { parsePreferencesDocument, preferencesDocument } from './gamePreferencesSchema';

/** What the account has saved: nothing yet, settings, or settings that could not be read. */
export type AccountPreferences =
  | { readonly kind: 'missing' }
  | { readonly kind: 'found'; readonly preferences: GamePreferences }
  | { readonly kind: 'unreadable' };

export interface AccountPreferencesHandlers {
  readonly onChange: (stored: AccountPreferences) => void;
  readonly onError: (message: string) => void;
}

function preferencesRef(db: Firestore, uid: string): DocumentReference {
  return doc(db, 'users', uid, 'settings', 'preferences');
}

/** Follows a player's game settings in `users/{uid}/settings/preferences`. */
export function watchAccountPreferences(
  db: Firestore,
  uid: string,
  { onChange, onError }: AccountPreferencesHandlers,
): Unsubscribe {
  return onSnapshot(
    preferencesRef(db, uid),
    (snapshot) => {
      if (!snapshot.exists()) {
        onChange({ kind: 'missing' });
        return;
      }
      const preferences = parsePreferencesDocument(snapshot.data());
      onChange(preferences === null ? { kind: 'unreadable' } : { kind: 'found', preferences });
    },
    (error) => {
      console.error('Reading the game settings failed.', error);
      onError('Could not load your saved game settings, so the ones in this browser are used.');
    },
  );
}

/**
 * Saves the settings. The change shows at once; the promise settles when the server answers,
 * which can take until the connection is back.
 */
export async function saveAccountPreferences(
  db: Firestore,
  uid: string,
  preferences: GamePreferences,
): Promise<void> {
  try {
    await setDoc(preferencesRef(db, uid), {
      ...preferencesDocument(preferences),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Saving the game settings failed.', error);
    throw new Error(
      'Could not save your game settings to your account. They are kept in this browser.',
      { cause: error },
    );
  }
}

/** Deletes a player's game settings, for when they delete their account. */
export function deleteAccountPreferences(db: Firestore, uid: string): Promise<void> {
  return deleteDoc(preferencesRef(db, uid));
}

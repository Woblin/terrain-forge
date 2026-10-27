import { useMemo, useState, type ReactNode } from 'react';
import { canSave } from '../domain/account';
import { useAuth } from '../hooks/authContext';
import { useFirebase } from '../hooks/firebaseContext';
import { GUEST_OWNER, LibraryContext } from '../hooks/libraryContext';
import { UnsavedPiecesContext } from '../hooks/unsavedPiecesContext';
import { useLibraryStore } from '../hooks/useLibraryStore';
import { useUnsavedPieceMove } from '../hooks/useUnsavedPieceMove';
import { createMemoryLibrary } from '../services/memoryLibrary';
import { createFirestoreLibrary } from '../services/terrainLibrary';

/**
 * Shares the player's terrain library with every page. A player with a verified email gets their
 * Firestore library; anyone else gets a library in memory that lasts until the page reloads.
 */
export function LibraryProvider({ children }: { children: ReactNode }) {
  const { db } = useFirebase();
  const { state, user } = useAuth();
  const uid = user?.uid ?? null;
  const savingUid = user !== null && canSave(user) ? user.uid : null;

  // Pieces made before signing in stay for the new account; after a sign-out it starts empty.
  const [guest, setGuest] = useState(() => ({ uid, store: createMemoryLibrary() }));
  if (guest.uid !== uid) {
    setGuest({ uid, store: guest.uid === null ? guest.store : createMemoryLibrary() });
  }

  const account = useMemo(
    () => (savingUid === null ? null : createFirestoreLibrary(db, savingUid)),
    [db, savingUid],
  );
  const library = useLibraryStore(account ?? guest.store, savingUid ?? GUEST_OWNER);
  const unsaved = useUnsavedPieceMove(guest.store, account === null ? null : library);
  const shown = useMemo(
    () => (state.status === 'checking' ? { ...library, status: 'loading' as const } : library),
    [state.status, library],
  );

  return (
    <LibraryContext.Provider value={shown}>
      <UnsavedPiecesContext.Provider value={unsaved}>{children}</UnsavedPiecesContext.Provider>
    </LibraryContext.Provider>
  );
}

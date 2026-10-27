import { useState, type ReactNode } from 'react';
import { LibraryContext } from '../hooks/libraryContext';
import { useLibraryStore } from '../hooks/useLibraryStore';
import { createMemoryLibrary } from '../services/memoryLibrary';

/**
 * Shares the player's terrain library with every page. Until sign-in exists the library is kept
 * in memory; then this provider switches to the Firestore library of the signed-in player.
 */
export function LibraryProvider({ children }: { children: ReactNode }) {
  const [store] = useState(() => createMemoryLibrary());
  const library = useLibraryStore(store);
  return <LibraryContext.Provider value={library}>{children}</LibraryContext.Provider>;
}

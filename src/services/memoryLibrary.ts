import type { LibraryPiece } from '../domain/library';
import type { LibrarySnapshot, LibraryStore } from './libraryStore';

/**
 * A library kept in memory until the page reloads, used until players can sign in. It behaves
 * like the Firestore library, so the page code does not change when saving arrives.
 */
export function createMemoryLibrary(initial: readonly LibraryPiece[] = []): LibraryStore {
  let pieces = initial;
  const listeners = new Set<(snapshot: LibrarySnapshot) => void>();

  function publish(next: readonly LibraryPiece[]): void {
    pieces = next;
    for (const listener of listeners) {
      listener({ pieces, problems: [] });
    }
  }

  return {
    persistent: false,
    subscribe(onChange) {
      listeners.add(onChange);
      onChange({ pieces, problems: [] });
      return () => {
        listeners.delete(onChange);
      };
    },
    newId() {
      return crypto.randomUUID();
    },
    add(added) {
      const clash = added.find((piece) => pieces.some((existing) => existing.id === piece.id));
      if (clash !== undefined) {
        return Promise.reject(new Error(`"${clash.name}" is already in your library.`));
      }
      publish([...pieces, ...added]);
      return Promise.resolve();
    },
    update(piece) {
      if (!pieces.some((existing) => existing.id === piece.id)) {
        return Promise.reject(new Error(`"${piece.name}" is no longer in your library.`));
      }
      publish(pieces.map((existing) => (existing.id === piece.id ? piece : existing)));
      return Promise.resolve();
    },
    remove(pieceId) {
      publish(pieces.filter((piece) => piece.id !== pieceId));
      return Promise.resolve();
    },
  };
}

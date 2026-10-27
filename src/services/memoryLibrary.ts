import type { LibraryPiece } from '../domain/library';
import type { EncodedPhoto } from '../domain/imageCrop';
import type { LibrarySnapshot, LibraryStore } from './libraryStore';

/** A memory library also hands over what it holds, so it can move into an account. */
export interface MemoryLibrary extends LibraryStore {
  readonly pieces: () => readonly LibraryPiece[];
  readonly photos: () => ReadonlyMap<string, EncodedPhoto>;
  /** Empties the library once its pieces have moved somewhere that saves them. */
  readonly clear: () => void;
}

/**
 * A library kept in memory until the page reloads, used while the player cannot save. It behaves
 * like the Firestore library, so the page code is the same for both.
 */
export function createMemoryLibrary(initial: readonly LibraryPiece[] = []): MemoryLibrary {
  let pieces = initial;
  let photos: ReadonlyMap<string, EncodedPhoto> = new Map();
  const listeners = new Set<(snapshot: LibrarySnapshot) => void>();

  function publish(next: readonly LibraryPiece[]): void {
    pieces = next;
    for (const listener of listeners) {
      listener({ pieces, problems: [], saving: false });
    }
  }

  function keepPhoto(pieceId: string, photo: EncodedPhoto | null): void {
    const next = new Map(photos);
    if (photo === null) {
      next.delete(pieceId);
    } else {
      next.set(pieceId, photo);
    }
    photos = next;
  }

  function ensureKnown(piece: LibraryPiece): Promise<void> {
    return pieces.some((existing) => existing.id === piece.id)
      ? Promise.resolve()
      : Promise.reject(new Error(`"${piece.name}" is no longer in your library.`));
  }

  function replace(piece: LibraryPiece): void {
    publish(pieces.map((existing) => (existing.id === piece.id ? piece : existing)));
  }

  return {
    persistent: false,
    subscribe({ onChange }) {
      listeners.add(onChange);
      onChange({ pieces, problems: [], saving: false });
      return () => {
        listeners.delete(onChange);
      };
    },
    newId() {
      return crypto.randomUUID();
    },
    add(added, addedPhotos = new Map()) {
      const clash = added.find((piece) => pieces.some((existing) => existing.id === piece.id));
      if (clash !== undefined) {
        return Promise.reject(new Error(`"${clash.name}" is already in your library.`));
      }
      for (const piece of added) {
        keepPhoto(piece.id, addedPhotos.get(piece.id) ?? null);
      }
      publish([...pieces, ...added]);
      return Promise.resolve();
    },
    async update(piece) {
      await ensureKnown(piece);
      replace(piece);
    },
    remove(pieceId) {
      keepPhoto(pieceId, null);
      publish(pieces.filter((piece) => piece.id !== pieceId));
      return Promise.resolve();
    },
    async setPhoto(piece, photo) {
      await ensureKnown(piece);
      keepPhoto(piece.id, photo);
      replace(piece);
    },
    readPhoto(pieceId) {
      return Promise.resolve(photos.get(pieceId) ?? null);
    },
    pieces: () => pieces,
    photos: () => photos,
    clear() {
      photos = new Map();
      publish([]);
    },
  };
}

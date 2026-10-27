import { createContext, useContext } from 'react';
import type { LibraryPiece } from '../domain/library';
import type { EncodedPhoto } from '../domain/imageCrop';
import type { StoredPhoto } from './useLibraryPhotos';

/**
 * The player's terrain library and the actions on it. Each action resolves to a message for the
 * player when it fails, or null when it worked.
 */
export interface TerrainLibrary {
  /** Whose library this is: 'guest' while it is not saved, otherwise the player's uid. */
  readonly owner: string;
  readonly status: 'loading' | 'ready' | 'failed';
  readonly pieces: readonly LibraryPiece[];
  /** False while the library only lives until the page reloads. */
  readonly persistent: boolean;
  /** True while changes are not saved yet, for example when offline. */
  readonly saving: boolean;
  /** Why the library could not be loaded, when `status` is 'failed'. */
  readonly loadError: string | null;
  /** A change that was refused after the page showed it, or a photo that could not load. */
  readonly writeError: string | null;
  /** Saved pieces that could not be read. */
  readonly problems: readonly string[];
  /** Photos keyed by piece id. */
  readonly photos: ReadonlyMap<string, StoredPhoto>;
  readonly newId: () => string;
  readonly addPieces: (
    pieces: readonly LibraryPiece[],
    photos?: ReadonlyMap<string, EncodedPhoto>,
  ) => Promise<string | null>;
  readonly updatePiece: (piece: LibraryPiece) => Promise<string | null>;
  readonly deletePiece: (piece: LibraryPiece) => Promise<string | null>;
  readonly setPhoto: (piece: LibraryPiece, photo: EncodedPhoto) => Promise<string | null>;
  readonly removePhoto: (piece: LibraryPiece) => Promise<string | null>;
}

export const LibraryContext = createContext<TerrainLibrary | null>(null);

export function useTerrainLibrary(): TerrainLibrary {
  const library = useContext(LibraryContext);
  if (library === null) {
    throw new Error('useTerrainLibrary must be used inside LibraryProvider.');
  }
  return library;
}

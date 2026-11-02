import { useCallback, useMemo } from 'react';
import { withoutPhoto, withPhoto, type LibraryPiece } from '../domain/library';
import type { CroppedPhoto, EncodedPhoto } from '../domain/imageCrop';
import type { LibraryStore } from '../services/libraryStore';
import type { TerrainLibrary } from './libraryContext';
import { useLibraryPhotos } from './useLibraryPhotos';
import { useStoreReport } from './useStoreReport';

const NO_PIECES: readonly LibraryPiece[] = [];
const NO_PROBLEMS: readonly string[] = [];

/**
 * Follows the library in a store and wraps its writes for the pages. `owner` names whose library
 * it is, so pages can tell when it is swapped for another one.
 */
export function useLibraryStore(store: LibraryStore, owner: string): TerrainLibrary {
  const { load, writeError, clearWriteError } = useStoreReport(store);
  const snapshot = load.status === 'ready' ? load.snapshot : null;
  const pieces = snapshot?.pieces ?? NO_PIECES;
  const images = useLibraryPhotos(store, pieces);

  /** Runs a write and turns a failure into the message the store gave. */
  const attempt = useCallback(
    async (write: () => Promise<void>): Promise<string | null> => {
      clearWriteError();
      try {
        await write();
        return null;
      } catch (error) {
        return error instanceof Error ? error.message : 'Something went wrong. Try again.';
      }
    },
    [clearWriteError],
  );

  const { remember } = images;
  const addPieces = useCallback(
    (added: readonly LibraryPiece[], photos?: ReadonlyMap<string, EncodedPhoto>) =>
      attempt(async () => {
        for (const piece of added) {
          const photo = photos?.get(piece.id);
          if (photo !== undefined && piece.image !== null) {
            remember(piece.id, piece.image.version, photo);
          }
        }
        await store.add(added, photos);
      }),
    [store, attempt, remember],
  );
  const updatePiece = useCallback(
    (piece: LibraryPiece) => attempt(() => store.update(piece)),
    [store, attempt],
  );
  const deletePiece = useCallback(
    (piece: LibraryPiece) => attempt(() => store.remove(piece.id)),
    [store, attempt],
  );
  const setPhoto = useCallback(
    (piece: LibraryPiece, { photo, ratio }: CroppedPhoto) => {
      const changed = withPhoto(piece, ratio);
      const version = changed.image?.version ?? 0;
      return attempt(async () => {
        remember(piece.id, version, photo);
        await store.setPhoto(changed, photo);
      });
    },
    [store, attempt, remember],
  );
  const removePhoto = useCallback(
    (piece: LibraryPiece) => attempt(() => store.setPhoto(withoutPhoto(piece), null)),
    [store, attempt],
  );

  return useMemo(
    () => ({
      owner,
      status: load.status,
      pieces,
      persistent: store.persistent,
      saving: snapshot?.saving ?? false,
      loadError: load.status === 'failed' ? load.message : null,
      writeError: writeError ?? images.error,
      problems: snapshot?.problems ?? NO_PROBLEMS,
      photos: images.photos,
      newId: () => store.newId(),
      addPieces,
      updatePiece,
      deletePiece,
      setPhoto,
      removePhoto,
    }),
    [
      owner,
      load,
      pieces,
      snapshot,
      store,
      writeError,
      images.error,
      images.photos,
      addPieces,
      updatePiece,
      deletePiece,
      setPhoto,
      removePhoto,
    ],
  );
}

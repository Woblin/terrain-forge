import { useCallback, useEffect, useMemo, useState } from 'react';
import { withoutPhoto, withPhoto, type LibraryPiece } from '../domain/library';
import type { EncodedPhoto } from '../domain/imageCrop';
import type { LibrarySnapshot, LibraryStore } from '../services/libraryStore';
import type { TerrainLibrary } from './libraryContext';
import { useLibraryPhotos } from './useLibraryPhotos';

type LoadState =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly snapshot: LibrarySnapshot }
  | { readonly status: 'failed'; readonly message: string };

/** What the store last reported, and which store reported it. */
interface Report {
  readonly store: LibraryStore;
  readonly load: LoadState;
  readonly writeError: string | null;
}

const LOADING: LoadState = { status: 'loading' };
const NO_PIECES: readonly LibraryPiece[] = [];
const NO_PROBLEMS: readonly string[] = [];

/**
 * Follows the library in a store and wraps its writes for the pages. `owner` names whose library
 * it is, so pages can tell when it is swapped for another one.
 */
export function useLibraryStore(store: LibraryStore, owner: string): TerrainLibrary {
  const [report, setReport] = useState<Report>({ store, load: LOADING, writeError: null });
  // A report from the store used before is not about this one.
  const current = report.store === store ? report : { store, load: LOADING, writeError: null };
  const { load, writeError } = current;
  const snapshot = load.status === 'ready' ? load.snapshot : null;
  const pieces = snapshot?.pieces ?? NO_PIECES;
  const images = useLibraryPhotos(store, pieces);

  useEffect(
    () =>
      store.subscribe({
        onChange: (next) => {
          setReport((previous) => ({
            store,
            load: { status: 'ready', snapshot: next },
            writeError: previous.store === store ? previous.writeError : null,
          }));
        },
        onError: (message) => {
          setReport({ store, load: { status: 'failed', message }, writeError: null });
        },
        onWriteFailed: (message) => {
          setReport((previous) => ({
            store,
            load: previous.store === store ? previous.load : LOADING,
            writeError: message,
          }));
        },
      }),
    [store],
  );

  const clearWriteError = useCallback(() => {
    setReport((previous) =>
      previous.writeError === null ? previous : { ...previous, writeError: null },
    );
  }, []);

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
    (piece: LibraryPiece, photo: EncodedPhoto) => {
      const changed = withPhoto(piece);
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

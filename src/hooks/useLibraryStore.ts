import { useCallback, useEffect, useMemo, useState } from 'react';
import { withoutPhoto, withPhoto, type LibraryPiece } from '../domain/library';
import type { EncodedPhoto } from '../services/imageEncoding';
import type { LibrarySnapshot, LibraryStore } from '../services/libraryStore';
import type { TerrainLibrary } from './libraryContext';
import { useTerrainImages } from './useTerrainImages';

type LoadState =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly snapshot: LibrarySnapshot }
  | { readonly status: 'failed'; readonly message: string };

const NO_PIECES: readonly LibraryPiece[] = [];
const NO_PROBLEMS: readonly string[] = [];

/** Follows the library in a store and wraps its writes for the pages. */
export function useLibraryStore(store: LibraryStore): TerrainLibrary {
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });
  const images = useTerrainImages();

  useEffect(
    () =>
      store.subscribe(
        (snapshot) => {
          setLoad({ status: 'ready', snapshot });
        },
        (message) => {
          setLoad({ status: 'failed', message });
        },
      ),
    [store],
  );

  const addPieces = useCallback(
    (pieces: readonly LibraryPiece[]) => attempt(store.add(pieces)),
    [store],
  );
  const updatePiece = useCallback((piece: LibraryPiece) => attempt(store.update(piece)), [store]);
  const { setPhoto: keepPhoto, removePhoto: dropPhoto } = images;

  const deletePiece = useCallback(
    async (piece: LibraryPiece) => {
      const failure = await attempt(store.remove(piece.id));
      if (failure === null) {
        dropPhoto(piece.id);
      }
      return failure;
    },
    [store, dropPhoto],
  );

  const setPhoto = useCallback(
    async (piece: LibraryPiece, photo: EncodedPhoto) => {
      const failure = await attempt(store.update(withPhoto(piece)));
      if (failure === null) {
        keepPhoto(piece.id, photo);
      }
      return failure;
    },
    [store, keepPhoto],
  );

  const removePhoto = useCallback(
    async (piece: LibraryPiece) => {
      const failure = await attempt(store.update(withoutPhoto(piece)));
      if (failure === null) {
        dropPhoto(piece.id);
      }
      return failure;
    },
    [store, dropPhoto],
  );

  const snapshot = load.status === 'ready' ? load.snapshot : null;
  return useMemo(
    () => ({
      status: load.status,
      pieces: snapshot?.pieces ?? NO_PIECES,
      persistent: store.persistent,
      loadError: load.status === 'failed' ? load.message : null,
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
      load,
      snapshot,
      store,
      images.photos,
      addPieces,
      updatePiece,
      deletePiece,
      setPhoto,
      removePhoto,
    ],
  );
}

/** Runs a write and turns a failure into the message the store gave. */
async function attempt(write: Promise<void>): Promise<string | null> {
  try {
    await write;
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : 'Something went wrong. Try again.';
  }
}

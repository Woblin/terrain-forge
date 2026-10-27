import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LibraryPiece } from '../domain/library';
import type { EncodedPhoto } from '../domain/imageCrop';
import type { LibraryStore } from '../services/libraryStore';

/** A photo shown for every copy of a terrain piece. */
export interface StoredPhoto {
  readonly url: string;
  readonly width: number;
  readonly height: number;
  readonly mimeType: EncodedPhoto['mimeType'];
  readonly bytes: number;
}

interface CachedPhoto {
  readonly version: number;
  readonly photo: StoredPhoto;
}

interface Cache {
  readonly store: LibraryStore;
  readonly entries: ReadonlyMap<string, CachedPhoto>;
}

export interface LibraryPhotos {
  /** Photos keyed by terrain piece id, for the pieces as they are now. */
  readonly photos: ReadonlyMap<string, StoredPhoto>;
  /** Why a photo could not be loaded, if one could not. */
  readonly error: string | null;
  /** Shows a photo the player just saved, without loading it back from the store. */
  readonly remember: (pieceId: string, version: number, photo: EncodedPhoto) => void;
}

/**
 * Loads the photos of the library's pieces from the store, once per photo version, and keeps
 * them as object URLs for the page to show.
 */
export function useLibraryPhotos(
  store: LibraryStore,
  pieces: readonly LibraryPiece[],
): LibraryPhotos {
  const [cache, setCache] = useState<Cache>(() => ({ store, entries: new Map() }));
  const [error, setError] = useState<string | null>(null);
  const loading = useRef(new Set<string>());
  const urls = useRef(new Set<string>());
  const entries = cache.store === store ? cache.entries : EMPTY;

  const keep = useCallback(
    (from: LibraryStore, pieceId: string, version: number, photo: EncodedPhoto) => {
      const url = URL.createObjectURL(photo.blob);
      urls.current.add(url);
      setCache((current) => {
        const known = current.store === from ? current.entries : EMPTY;
        const existing = known.get(pieceId);
        if (existing !== undefined && existing.version > version) {
          return current;
        }
        const next = new Map(known);
        next.set(pieceId, { version, photo: storedPhoto(url, photo) });
        return { store: from, entries: next };
      });
    },
    [],
  );

  useEffect(() => {
    const pending = loading.current;
    const made = urls.current;
    return () => {
      for (const url of made) {
        URL.revokeObjectURL(url);
      }
      made.clear();
      pending.clear();
    };
  }, [store]);

  useEffect(() => {
    for (const piece of pieces) {
      const version = piece.image?.version;
      const key = `${piece.id}@${String(version)}`;
      if (version === undefined || entries.get(piece.id)?.version === version) {
        continue;
      }
      if (loading.current.has(key)) {
        continue;
      }
      loading.current.add(key);
      store.readPhoto(piece.id).then(
        (photo) => {
          if (photo !== null) {
            keep(store, piece.id, version, photo);
          }
        },
        (failure: unknown) => {
          loading.current.delete(key);
          setError(failure instanceof Error ? failure.message : 'Could not load a photo.');
        },
      );
    }
  }, [store, pieces, entries, keep]);

  const photos = useMemo(() => currentPhotos(pieces, entries), [pieces, entries]);
  const remember = useCallback(
    (pieceId: string, version: number, photo: EncodedPhoto) => {
      keep(store, pieceId, version, photo);
    },
    [store, keep],
  );
  return { photos, error, remember };
}

const EMPTY: ReadonlyMap<string, CachedPhoto> = new Map();

/** Only the photos whose version matches the piece as it is now. */
function currentPhotos(
  pieces: readonly LibraryPiece[],
  entries: ReadonlyMap<string, CachedPhoto>,
): ReadonlyMap<string, StoredPhoto> {
  const shown = new Map<string, StoredPhoto>();
  for (const piece of pieces) {
    const cached = entries.get(piece.id);
    if (cached !== undefined && cached.version === piece.image?.version) {
      shown.set(piece.id, cached.photo);
    }
  }
  return shown;
}

function storedPhoto(url: string, photo: EncodedPhoto): StoredPhoto {
  return {
    url,
    width: photo.width,
    height: photo.height,
    mimeType: photo.mimeType,
    bytes: photo.blob.size,
  };
}

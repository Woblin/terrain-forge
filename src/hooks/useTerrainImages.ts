import { useCallback, useEffect, useRef, useState } from 'react';
import type { EncodedPhoto } from '../services/imageEncoding';

/** A photo shown for every copy of a terrain piece. */
export interface StoredPhoto {
  readonly url: string;
  readonly width: number;
  readonly height: number;
  readonly mimeType: EncodedPhoto['mimeType'];
  readonly bytes: number;
}

export interface TerrainImages {
  /** Photos keyed by terrain piece id. */
  readonly photos: ReadonlyMap<string, StoredPhoto>;
  readonly setPhoto: (pieceId: string, photo: EncodedPhoto) => void;
  readonly removePhoto: (pieceId: string) => void;
}

/**
 * The photos of the player's terrain pieces. For now they live in memory until the page
 * reloads; once sign-in and the terrain library exist they are read from and saved to Firestore.
 */
export function useTerrainImages(): TerrainImages {
  const stored = useRef<ReadonlyMap<string, StoredPhoto>>(new Map());
  const [photos, setPhotos] = useState<ReadonlyMap<string, StoredPhoto>>(() => new Map());

  useEffect(() => {
    const current = stored;
    return () => {
      for (const photo of current.current.values()) {
        URL.revokeObjectURL(photo.url);
      }
    };
  }, []);

  const replace = useCallback((pieceId: string, photo: StoredPhoto | null) => {
    const previous = stored.current.get(pieceId);
    if (previous !== undefined) {
      URL.revokeObjectURL(previous.url);
    }
    const next = new Map(stored.current);
    if (photo === null) {
      next.delete(pieceId);
    } else {
      next.set(pieceId, photo);
    }
    stored.current = next;
    setPhotos(next);
  }, []);

  const setPhoto = useCallback(
    (pieceId: string, encoded: EncodedPhoto) => {
      replace(pieceId, {
        url: URL.createObjectURL(encoded.blob),
        width: encoded.width,
        height: encoded.height,
        mimeType: encoded.mimeType,
        bytes: encoded.blob.size,
      });
    },
    [replace],
  );

  const removePhoto = useCallback(
    (pieceId: string) => {
      replace(pieceId, null);
    },
    [replace],
  );

  return { photos, setPhoto, removePhoto };
}

import { useEffect, useState } from 'react';
import type { CroppedPhoto } from '../domain/imageCrop';

/** A photo cropped for a piece that is not saved yet, with a URL to show it. */
export interface DraftPhoto extends CroppedPhoto {
  readonly url: string;
}

export interface DraftPhotoState {
  readonly photo: DraftPhoto | null;
  readonly set: (photo: CroppedPhoto | null) => void;
}

/** Holds the photo picked in the piece form until the piece is saved, and frees its URL after. */
export function useDraftPhoto(): DraftPhotoState {
  const [photo, setPhoto] = useState<DraftPhoto | null>(null);

  useEffect(
    () => () => {
      if (photo !== null) {
        URL.revokeObjectURL(photo.url);
      }
    },
    [photo],
  );

  function set(next: CroppedPhoto | null): void {
    setPhoto(next === null ? null : { ...next, url: URL.createObjectURL(next.photo.blob) });
  }

  return { photo, set };
}

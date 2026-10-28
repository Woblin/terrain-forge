import { useEffect, useState } from 'react';
import type { CroppedPhoto } from '../domain/imageCrop';

/** A photo cropped in the piece form and not saved yet, with a URL to show it. */
export interface DraftPhoto extends CroppedPhoto {
  readonly url: string;
}

/** What the player did to the photo in the piece form: nothing, or a new photo or none. */
export type PhotoChange =
  { readonly changed: false } | { readonly changed: true; readonly photo: DraftPhoto | null };

export interface DraftPhotoState {
  readonly change: PhotoChange;
  readonly set: (photo: CroppedPhoto | null) => void;
}

const UNCHANGED: PhotoChange = { changed: false };

/** Holds the photo picked in the piece form until the piece is saved, and frees its URL after. */
export function useDraftPhoto(): DraftPhotoState {
  const [change, setChange] = useState<PhotoChange>(UNCHANGED);

  useEffect(
    () => () => {
      if (change.changed && change.photo !== null) {
        URL.revokeObjectURL(change.photo.url);
      }
    },
    [change],
  );

  function set(next: CroppedPhoto | null): void {
    setChange({
      changed: true,
      photo: next === null ? null : { ...next, url: URL.createObjectURL(next.photo.blob) },
    });
  }

  return { change, set };
}

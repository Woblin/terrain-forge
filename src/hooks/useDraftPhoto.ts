import { useEffect, useState } from 'react';
import type { CroppedPhoto } from '../domain/imageCrop';
import { shownPhotoBlob } from '../services/photoMasking';

/** A photo cropped in the piece form and not saved yet, with a URL to show it. */
export interface DraftPhoto extends CroppedPhoto {
  /** The photo as shown, with any hidden parts see-through. */
  readonly url: string;
}

/** What the player did to the photo in the piece form: nothing, or a new photo or none. */
export type PhotoChange =
  { readonly changed: false } | { readonly changed: true; readonly photo: DraftPhoto | null };

export interface DraftPhotoState {
  readonly change: PhotoChange;
  /** Takes the new photo, or none. Rejects with a message when the photo cannot be shown. */
  readonly set: (photo: CroppedPhoto | null) => Promise<void>;
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

  async function set(next: CroppedPhoto | null): Promise<void> {
    if (next === null) {
      setChange({ changed: true, photo: null });
      return;
    }
    const url = URL.createObjectURL(await shownPhotoBlob(next.photo));
    setChange({ changed: true, photo: { ...next, url } });
  }

  return { change, set };
}

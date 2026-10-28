import { useState } from 'react';
import { footprintRatio, type CroppedPhoto, type CropView } from '../domain/imageCrop';
import type { TerrainPiece } from '../domain/terrain';
import { encodeCrop, loadWorkingImage } from '../services/imageEncoding';

export interface PhotoInEditing {
  readonly piece: TerrainPiece;
  readonly image: ImageBitmap;
}

export interface PhotoEditor {
  /** The photo being cropped, or null when the crop tool is closed. */
  readonly editing: PhotoInEditing | null;
  readonly busy: 'loading' | 'saving' | null;
  readonly error: string | null;
  readonly open: (piece: TerrainPiece, file: File) => Promise<void>;
  readonly save: (view: CropView) => Promise<void>;
  readonly cancel: () => void;
}

/** Opening a photo for a piece, cropping it, and handing the encoded result on. */
export function usePhotoEditor(
  onSaved: (piece: TerrainPiece, cropped: CroppedPhoto) => void,
): PhotoEditor {
  const [editing, setEditing] = useState<PhotoInEditing | null>(null);
  const [busy, setBusy] = useState<PhotoEditor['busy']>(null);
  const [error, setError] = useState<string | null>(null);

  async function open(piece: TerrainPiece, file: File): Promise<void> {
    setBusy('loading');
    setError(null);
    try {
      const image = await loadWorkingImage(file);
      setEditing({ piece, image });
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setBusy(null);
    }
  }

  async function save(view: CropView): Promise<void> {
    if (editing === null) {
      return;
    }
    setBusy('saving');
    setError(null);
    try {
      const ratio = footprintRatio(editing.piece.footprint);
      const photo = await encodeCrop(editing.image, view, ratio);
      onSaved(editing.piece, { photo, ratio });
      editing.image.close();
      setEditing(null);
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setBusy(null);
    }
  }

  function cancel(): void {
    editing?.image.close();
    setEditing(null);
    setError(null);
  }

  return { editing, busy, error, open, save, cancel };
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong with this photo.';
}

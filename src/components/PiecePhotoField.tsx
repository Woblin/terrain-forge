import { ImageMinusIcon, ImagePlusIcon } from 'lucide-react';
import { useId } from 'react';
import type { CroppedPhoto } from '../domain/imageCrop';
import { photoFits } from '../domain/library';
import type { TerrainPiece } from '../domain/terrain';
import type { DraftPhoto } from '../hooks/useDraftPhoto';
import { usePhotoEditor } from '../hooks/usePhotoEditor';
import { BUTTON_STYLES } from './buttonStyles';
import { LABEL_STYLES } from './fieldStyles';
import { PhotoCropper } from './PhotoCropper';

interface PiecePhotoFieldProps {
  /** The piece as the form describes it, or null while its sizes are not valid yet. */
  piece: TerrainPiece | null;
  photo: DraftPhoto | null;
  disabled: boolean;
  onChange: (photo: CroppedPhoto | null) => void;
}

/** Picking and cropping a photo for a piece that is not saved yet. */
export function PiecePhotoField({ piece, photo, disabled, onChange }: PiecePhotoFieldProps) {
  const hintId = useId();
  const editor = usePhotoEditor((_piece, cropped) => {
    onChange(cropped);
  });
  const recrop = photo !== null && piece !== null && !photoFits(photo.ratio, piece.footprint);
  const canPick = piece !== null && !disabled && editor.busy === null;
  const pickLabel = photo === null ? 'Add photo' : recrop ? 'Re-crop photo' : 'Replace photo';
  const hint =
    piece === null
      ? "Enter a width and depth first, so the photo can be cropped to the piece's shape."
      : recrop
        ? 'The shape changed since you cropped the photo. Pick it again to re-crop it.'
        : null;

  return (
    <fieldset className="space-y-2">
      <legend className={LABEL_STYLES}>Photo (optional)</legend>
      <div className="flex flex-wrap gap-2">
        <label
          className={`${BUTTON_STYLES.secondary} has-[:focus-visible]:outline-accent-ink cursor-pointer has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2`}
        >
          <ImagePlusIcon className="size-[18px]" aria-hidden="true" />
          {editor.busy === 'loading' ? 'Opening…' : pickLabel}
          <input
            type="file"
            accept="image/*"
            disabled={!canPick}
            aria-describedby={hint === null ? undefined : hintId}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file !== undefined && piece !== null) {
                void editor.open(piece, file);
              }
            }}
            className="sr-only"
          />
        </label>
        {photo !== null && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              onChange(null);
            }}
            className={BUTTON_STYLES.quiet}
          >
            <ImageMinusIcon className="size-[18px]" aria-hidden="true" />
            Remove photo
          </button>
        )}
      </div>
      {hint !== null && (
        <p id={hintId} className={recrop ? 'text-warn-ink text-sm' : 'text-muted text-sm'}>
          {hint}
        </p>
      )}
      {editor.editing === null && editor.error !== null && (
        <p role="alert" className="text-fail text-sm">
          {editor.error}
        </p>
      )}
      {editor.editing !== null && (
        <PhotoCropper
          piece={editor.editing.piece}
          image={editor.editing.image}
          saving={editor.busy === 'saving'}
          error={editor.error}
          onSave={(view) => {
            void editor.save(view);
          }}
          onCancel={editor.cancel}
        />
      )}
    </fieldset>
  );
}

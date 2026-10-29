import { BrushIcon, ImageMinusIcon, ImagePlusIcon } from 'lucide-react';
import { useId, useState } from 'react';
import type { CroppedPhoto, EncodedPhoto } from '../domain/imageCrop';
import { photoFits } from '../domain/library';
import type { TerrainPiece } from '../domain/terrain';
import { usePhotoEditor } from '../hooks/usePhotoEditor';
import { BUTTON_STYLES } from './buttonStyles';
import { LABEL_STYLES } from './fieldStyles';
import { PhotoCropper } from './PhotoCropper';
import { PhotoMaskPainter } from './PhotoMaskPainter';

interface PiecePhotoFieldProps {
  /** The piece as the form describes it, or null while its sizes are not valid yet. */
  piece: TerrainPiece | null;
  /**
   * The photo the piece has in the form, or null when it has none. `source` is the photo as
   * saved, once it has loaded.
   */
  photo: { readonly ratio: number; readonly source: EncodedPhoto | undefined } | null;
  disabled: boolean;
  /** Takes the new photo, or none. Rejects with a message when the photo cannot be shown. */
  onChange: (photo: CroppedPhoto | null) => Promise<void>;
}

/** Picking, cropping and removing a piece's photo in the piece form, saved with the piece. */
export function PiecePhotoField({ piece, photo, disabled, onChange }: PiecePhotoFieldProps) {
  const hintId = useId();
  const [masking, setMasking] = useState(false);
  const [changeError, setChangeError] = useState<string | null>(null);
  const editor = usePhotoEditor((_piece, cropped) => {
    change(cropped);
  });
  const recrop = photo !== null && piece !== null && !photoFits(photo.ratio, piece.footprint);
  const source = photo?.source;
  const canMask = source !== undefined && piece !== null && !recrop && !disabled;
  const error = changeError ?? (editor.editing === null ? editor.error : null);

  function change(next: CroppedPhoto | null): void {
    setChangeError(null);
    onChange(next).catch((failure: unknown) => {
      setChangeError(failure instanceof Error ? failure.message : 'The photo could not be shown.');
    });
  }
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
            disabled={!canMask}
            onClick={() => {
              setMasking(true);
            }}
            className={BUTTON_STYLES.secondary}
          >
            <BrushIcon className="size-[18px]" aria-hidden="true" />
            {source?.mask == null ? 'Hide parts' : 'Edit hidden parts'}
          </button>
        )}
        {photo !== null && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              change(null);
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
      {error !== null && (
        <p role="alert" className="text-fail text-sm">
          {error}
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
      {masking && source !== undefined && photo !== null && piece !== null && (
        <PhotoMaskPainter
          pieceName={piece.name}
          footprint={piece.footprint}
          photo={source}
          onSave={async (mask) => {
            await onChange({ photo: { ...source, mask }, ratio: photo.ratio });
            setMasking(false);
          }}
          onCancel={() => {
            setMasking(false);
          }}
        />
      )}
    </fieldset>
  );
}

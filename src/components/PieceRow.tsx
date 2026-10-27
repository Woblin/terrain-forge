import { LIBRARY_LIMITS, needsRecrop, type LibraryPiece } from '../domain/library';
import { formatLength, type LengthUnit } from '../domain/units';
import { PieceThumbnail } from './PieceThumbnail';

interface PieceRowProps {
  piece: LibraryPiece;
  photoUrl: string | undefined;
  unit: LengthUnit;
  /** True while any change to the library is being saved. */
  busy: boolean;
  /** Whether one more copy fits in the library. */
  canAddCopy: boolean;
  onQuantityChange: (quantity: number) => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onPickPhoto: (file: File) => void;
  onRemovePhoto: () => void;
}

const BUTTON =
  'rounded border border-stone-500 px-2 py-1 text-xs hover:bg-stone-700 disabled:opacity-40';

/** One piece in the library, with its count and the things the player can do with it. */
export function PieceRow({
  piece,
  photoUrl,
  unit,
  busy,
  canAddCopy,
  onQuantityChange,
  onEdit,
  onDuplicate,
  onDelete,
  onPickPhoto,
  onRemovePhoto,
}: PieceRowProps) {
  const { width, depth } = piece.footprint;
  const hasPhoto = photoUrl !== undefined;
  return (
    <li className="flex flex-wrap items-start gap-3 py-3">
      <PieceThumbnail piece={piece} photoUrl={photoUrl} />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="font-medium">{piece.name}</p>
        <p className="text-xs text-stone-400">
          {formatLength(width, unit)} × {formatLength(depth, unit)},{' '}
          {piece.footprint.kind === 'rect' ? 'rectangle' : 'oval'}
        </p>
        {hasPhoto && needsRecrop(piece) && (
          <p className="text-xs text-amber-300">
            The piece changed shape since its photo was cropped. Re-crop the photo.
          </p>
        )}
        <div className="flex flex-wrap gap-1.5">
          <button type="button" onClick={onEdit} disabled={busy} className={BUTTON}>
            Edit
          </button>
          <button type="button" onClick={onDuplicate} disabled={busy} className={BUTTON}>
            Duplicate
          </button>
          <label
            className={`${BUTTON} cursor-pointer has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-40 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-amber-300`}
          >
            {!hasPhoto ? 'Add photo' : needsRecrop(piece) ? 'Re-crop photo' : 'Replace photo'}
            <input
              type="file"
              accept="image/*"
              disabled={busy}
              aria-label={`${hasPhoto ? 'Replace the photo' : 'Add a photo'} of ${piece.name}`}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (file !== undefined) {
                  onPickPhoto(file);
                }
              }}
              className="sr-only"
            />
          </label>
          {hasPhoto && (
            <button
              type="button"
              onClick={onRemovePhoto}
              disabled={busy}
              aria-label={`Remove the photo of ${piece.name}`}
              className={BUTTON}
            >
              Remove photo
            </button>
          )}
          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            aria-label={`Delete ${piece.name}`}
            className={`${BUTTON} border-red-400/60 text-red-200 hover:bg-red-950`}
          >
            Delete
          </button>
        </div>
      </div>
      <div className="flex items-center gap-1" role="group" aria-label={`How many ${piece.name}`}>
        <button
          type="button"
          onClick={() => {
            onQuantityChange(piece.quantity - 1);
          }}
          disabled={busy || piece.quantity <= LIBRARY_LIMITS.minQuantity}
          aria-label={`One fewer ${piece.name}`}
          className={`${BUTTON} w-7`}
        >
          −
        </button>
        <span className="w-8 text-center tabular-nums" aria-live="polite">
          ×{piece.quantity}
        </span>
        <button
          type="button"
          onClick={() => {
            onQuantityChange(piece.quantity + 1);
          }}
          disabled={busy || !canAddCopy}
          aria-label={`One more ${piece.name}`}
          className={`${BUTTON} w-7`}
        >
          +
        </button>
      </div>
    </li>
  );
}

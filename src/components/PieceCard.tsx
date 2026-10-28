import {
  CopyIcon,
  ImageMinusIcon,
  ImagePlusIcon,
  MinusIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from 'lucide-react';
import { LIBRARY_LIMITS, needsRecrop, type LibraryPiece } from '../domain/library';
import { formatLength, type LengthUnit } from '../domain/units';
import { ActionsMenu } from './ActionsMenu';
import { BUTTON_STYLES } from './buttonStyles';
import { IconButton } from './IconButton';
import { DANGER_MENU_ROW, MENU_ROW } from './menuStyles';
import { PieceThumbnail } from './PieceThumbnail';
import { TERRAIN_STYLES } from './terrainStyles';

interface PieceCardProps {
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

const MENU_ICON = 'text-muted size-4';

/** One piece in the library as a card: its picture, what it is, how many, and what can be done. */
export function PieceCard({
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
}: PieceCardProps) {
  const { width, depth } = piece.footprint;
  const hasPhoto = photoUrl !== undefined;
  const recrop = hasPhoto && needsRecrop(piece);
  const style = TERRAIN_STYLES[piece.type];
  return (
    <li className="border-line bg-surface flex flex-col overflow-hidden rounded-2xl border shadow-sm">
      <PieceThumbnail piece={piece} photoUrl={photoUrl} className="aspect-[4/3] w-full" />
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-start gap-1">
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold" title={piece.name}>
              {piece.name}
            </h3>
            <p className="text-muted text-xs tabular-nums">
              {formatLength(width, unit)} × {formatLength(depth, unit)},{' '}
              {piece.footprint.kind === 'rect' ? 'rectangle' : 'oval'}
            </p>
          </div>
          <ActionsMenu label={`More for ${piece.name}`}>
            {(close) => (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    close();
                    onDuplicate();
                  }}
                  className={MENU_ROW}
                >
                  <CopyIcon className={MENU_ICON} aria-hidden="true" />
                  Duplicate
                </button>
                <label
                  className={`${MENU_ROW} has-[:focus-visible]:outline-accent-ink cursor-pointer has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-40 has-[:focus-visible]:outline-2`}
                >
                  <ImagePlusIcon className={MENU_ICON} aria-hidden="true" />
                  {!hasPhoto ? 'Add photo' : recrop ? 'Re-crop photo' : 'Replace photo'}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={busy}
                    aria-label={`${hasPhoto ? 'Replace the photo' : 'Add a photo'} of ${piece.name}`}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = '';
                      close();
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
                    disabled={busy}
                    onClick={() => {
                      close();
                      onRemovePhoto();
                    }}
                    aria-label={`Remove the photo of ${piece.name}`}
                    className={MENU_ROW}
                  >
                    <ImageMinusIcon className={MENU_ICON} aria-hidden="true" />
                    Remove photo
                  </button>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    close();
                    onDelete();
                  }}
                  aria-label={`Delete ${piece.name}`}
                  className={DANGER_MENU_ROW}
                >
                  <Trash2Icon className="size-4" aria-hidden="true" />
                  Delete
                </button>
              </>
            )}
          </ActionsMenu>
        </div>
        <p className="text-soft flex items-center gap-1.5 text-xs">
          <span className={`size-2.5 rounded-sm ${style.swatch}`} aria-hidden="true" />
          {style.name}
        </p>
        {recrop && (
          <p className="text-accent-ink text-xs">
            The piece changed shape since its photo was cropped. Re-crop the photo.
          </p>
        )}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
          <div
            className="border-line flex items-center rounded-lg border"
            role="group"
            aria-label={`How many ${piece.name}`}
          >
            <IconButton
              icon={MinusIcon}
              label={`One fewer ${piece.name}`}
              onClick={() => {
                onQuantityChange(piece.quantity - 1);
              }}
              disabled={busy || piece.quantity <= LIBRARY_LIMITS.minQuantity}
            />
            <span className="w-8 text-center text-sm font-medium tabular-nums" aria-live="polite">
              ×{piece.quantity}
            </span>
            <IconButton
              icon={PlusIcon}
              label={`One more ${piece.name}`}
              onClick={() => {
                onQuantityChange(piece.quantity + 1);
              }}
              disabled={busy || !canAddCopy}
            />
          </div>
          <button
            type="button"
            onClick={onEdit}
            disabled={busy}
            aria-label={`Edit ${piece.name}`}
            className={`${BUTTON_STYLES.secondary} h-9 px-3 text-sm pointer-coarse:h-11`}
          >
            <PencilIcon className="size-4" aria-hidden="true" />
            Edit
          </button>
        </div>
      </div>
    </li>
  );
}

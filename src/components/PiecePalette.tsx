import type { BoardPiece } from '../domain/editor';
import { remainingCount } from '../domain/editor';
import type { TerrainPiece } from '../domain/terrain';
import { formatLength, type LengthUnit } from '../domain/units';
import type { StoredPhoto } from '../hooks/useTerrainImages';
import { PieceThumbnail } from './PieceThumbnail';

interface PiecePaletteProps {
  collection: readonly TerrainPiece[];
  pieces: readonly BoardPiece[];
  photos: ReadonlyMap<string, StoredPhoto>;
  unit: LengthUnit;
  canAdd: boolean;
  photoBusy: boolean;
  photoError: string | null;
  onAdd: (piece: TerrainPiece) => void;
  onPickPhoto: (piece: TerrainPiece, file: File) => void;
  onRemovePhoto: (piece: TerrainPiece) => void;
}

const BUTTON =
  'rounded border border-stone-500 px-2 py-1 text-xs hover:bg-stone-700 disabled:opacity-40';

/** The terrain collection: how many of each piece are left, adding them, and their photos. */
export function PiecePalette({
  collection,
  pieces,
  photos,
  unit,
  canAdd,
  photoBusy,
  photoError,
  onAdd,
  onPickPhoto,
  onRemovePhoto,
}: PiecePaletteProps) {
  return (
    <section aria-labelledby="pieces-heading" className="space-y-3 rounded-lg bg-stone-800 p-4">
      <h2
        id="pieces-heading"
        className="text-sm font-semibold tracking-wide text-stone-400 uppercase"
      >
        Terrain pieces
      </h2>
      <ul className="space-y-3">
        {collection.map((piece) => {
          const left = remainingCount(pieces, piece);
          const photo = photos.get(piece.id);
          return (
            <li key={piece.id} className="flex items-start gap-3">
              <PieceThumbnail piece={piece} photoUrl={photo?.url} />
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm font-medium">{piece.name}</p>
                <p className="text-xs text-stone-400">
                  {formatLength(piece.footprint.width, unit)} ×{' '}
                  {formatLength(piece.footprint.depth, unit)} · {left} of {piece.quantity} left
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    disabled={!canAdd || left === 0}
                    onClick={() => {
                      onAdd(piece);
                    }}
                    aria-label={`Add a ${piece.name} to the board`}
                    className={BUTTON}
                  >
                    Add
                  </button>
                  <label
                    className={`${BUTTON} cursor-pointer has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-40 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-amber-300`}
                  >
                    {photo === undefined ? 'Add photo' : 'Replace photo'}
                    <input
                      type="file"
                      accept="image/*"
                      disabled={photoBusy}
                      aria-label={`${photo === undefined ? 'Add a photo' : 'Replace the photo'} of ${piece.name}`}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = '';
                        if (file !== undefined) {
                          onPickPhoto(piece, file);
                        }
                      }}
                      className="sr-only"
                    />
                  </label>
                  {photo !== undefined && (
                    <button
                      type="button"
                      onClick={() => {
                        onRemovePhoto(piece);
                      }}
                      aria-label={`Remove the photo of ${piece.name}`}
                      className={BUTTON}
                    >
                      Remove photo
                    </button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <div aria-live="polite" className="text-sm">
        {photoBusy && <p className="text-stone-300">Opening photo…</p>}
        {photoError !== null && (
          <p role="alert" className="text-red-300">
            {photoError}
          </p>
        )}
      </div>
      <p className="text-xs text-stone-400">
        Photos stay until you reload the page. Saving them comes with sign-in and your own terrain
        library.
      </p>
    </section>
  );
}

import { Link } from 'react-router';
import type { BoardPiece } from '../domain/editor';
import { remainingCount } from '../domain/editor';
import type { TerrainPiece } from '../domain/terrain';
import { formatLength, type LengthUnit } from '../domain/units';
import type { StoredPhoto } from '../hooks/useLibraryPhotos';
import { PieceThumbnail } from './PieceThumbnail';

interface PiecePaletteProps {
  collection: readonly TerrainPiece[];
  /** Where the pieces come from. */
  source: 'library' | 'sample' | 'link';
  pieces: readonly BoardPiece[];
  photos: ReadonlyMap<string, StoredPhoto>;
  unit: LengthUnit;
  canAdd: boolean;
  onAdd: (piece: TerrainPiece) => void;
}

const SOURCES: Readonly<Record<PiecePaletteProps['source'], string>> = {
  library: 'Your terrain library.',
  sample: 'The built-in sample set, until you add your own terrain.',
  link: 'The terrain from the shared link. A new board uses your own terrain.',
};

const BUTTON =
  'rounded border border-stone-500 px-2 py-1 text-xs hover:bg-stone-700 disabled:opacity-40';

/** The terrain the board is made from: how many of each piece are left, and adding them. */
export function PiecePalette({
  collection,
  source,
  pieces,
  photos,
  unit,
  canAdd,
  onAdd,
}: PiecePaletteProps) {
  return (
    <section aria-labelledby="pieces-heading" className="space-y-3 rounded-lg bg-stone-800 p-4">
      <h2
        id="pieces-heading"
        className="text-sm font-semibold tracking-wide text-stone-400 uppercase"
      >
        Terrain pieces
      </h2>
      <p className="text-xs text-stone-400">{SOURCES[source]}</p>
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
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <Link
        to="/library"
        className="inline-block text-sm text-amber-300 underline hover:text-amber-200"
      >
        Edit your terrain and photos
      </Link>
    </section>
  );
}

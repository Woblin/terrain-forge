import { canSetQuantity, groupByType, type LibraryPiece } from '../domain/library';
import type { LengthUnit } from '../domain/units';
import type { StoredPhoto } from '../hooks/useLibraryPhotos';
import { PieceRow } from './PieceRow';
import { TERRAIN_STYLES } from './terrainStyles';

interface PieceListProps {
  pieces: readonly LibraryPiece[];
  photos: ReadonlyMap<string, StoredPhoto>;
  unit: LengthUnit;
  busy: boolean;
  onQuantityChange: (piece: LibraryPiece, quantity: number) => void;
  onEdit: (piece: LibraryPiece) => void;
  onDuplicate: (piece: LibraryPiece) => void;
  onDelete: (piece: LibraryPiece) => void;
  onPickPhoto: (piece: LibraryPiece, file: File) => void;
  onRemovePhoto: (piece: LibraryPiece) => void;
}

/** The library's pieces, grouped by terrain type. */
export function PieceList({
  pieces,
  photos,
  unit,
  busy,
  onQuantityChange,
  onEdit,
  onDuplicate,
  onDelete,
  onPickPhoto,
  onRemovePhoto,
}: PieceListProps) {
  return (
    <div className="space-y-4">
      {groupByType(pieces).map((group) => (
        <section key={group.type} aria-labelledby={`group-${group.type}`}>
          <h3
            id={`group-${group.type}`}
            className="text-muted text-sm font-semibold tracking-wide uppercase"
          >
            {TERRAIN_STYLES[group.type].name}
          </h3>
          <ul className="divide-line divide-y">
            {group.pieces.map((piece) => (
              <PieceRow
                key={piece.id}
                piece={piece}
                photoUrl={photos.get(piece.id)?.url}
                unit={unit}
                busy={busy}
                canAddCopy={canSetQuantity(pieces, piece, piece.quantity + 1)}
                onQuantityChange={(quantity) => {
                  onQuantityChange(piece, quantity);
                }}
                onEdit={() => {
                  onEdit(piece);
                }}
                onDuplicate={() => {
                  onDuplicate(piece);
                }}
                onDelete={() => {
                  onDelete(piece);
                }}
                onPickPhoto={(file) => {
                  onPickPhoto(piece, file);
                }}
                onRemovePhoto={() => {
                  onRemovePhoto(piece);
                }}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

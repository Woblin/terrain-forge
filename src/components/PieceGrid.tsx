import { canSetQuantity, type LibraryPiece } from '../domain/library';
import type { LengthUnit } from '../domain/units';
import type { StoredPhoto } from '../hooks/useLibraryPhotos';
import { PieceCard } from './PieceCard';

interface PieceGridProps {
  /** The pieces to show, already filtered and in order. */
  shown: readonly LibraryPiece[];
  /** The whole library, to know whether one more copy fits. */
  library: readonly LibraryPiece[];
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

/** The library's pieces as cards, two across on a phone and more as the window widens. */
export function PieceGrid({
  shown,
  library,
  photos,
  unit,
  busy,
  onQuantityChange,
  onEdit,
  onDuplicate,
  onDelete,
  onPickPhoto,
  onRemovePhoto,
}: PieceGridProps) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] md:gap-4">
      {shown.map((piece) => (
        <PieceCard
          key={piece.id}
          piece={piece}
          photoUrl={photos.get(piece.id)?.url}
          unit={unit}
          busy={busy}
          canAddCopy={canSetQuantity(library, piece, piece.quantity + 1)}
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
  );
}

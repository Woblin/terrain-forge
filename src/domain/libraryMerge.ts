import { countPieces, LIBRARY_LIMITS, type LibraryPiece } from './library';
import type { TerrainPiece } from './terrain';

/** Which unsaved pieces can go into the player's account library. */
export interface MovePlan {
  /** Pieces to add, in the order they were made. */
  readonly move: readonly LibraryPiece[];
  /** Pieces the account already has, matched on name, type and footprint. */
  readonly alreadySaved: number;
  /** Pieces that would take the account over its limits. */
  readonly noRoom: number;
}

/**
 * Plans moving pieces made while not saving into an account. Pieces the account already has are
 * left out, and pieces are added in order until the account library is full.
 */
export function planMove(
  unsaved: readonly LibraryPiece[],
  account: readonly LibraryPiece[],
): MovePlan {
  const fresh = unsaved.filter((piece) => !account.some((saved) => samePiece(piece, saved)));
  const move: LibraryPiece[] = [];
  let kinds = account.length;
  let total = countPieces(account);
  for (const piece of fresh) {
    if (kinds + 1 > LIBRARY_LIMITS.maxKinds || total + piece.quantity > LIBRARY_LIMITS.maxPieces) {
      continue;
    }
    move.push(piece);
    kinds += 1;
    total += piece.quantity;
  }
  return {
    move,
    alreadySaved: unsaved.length - fresh.length,
    noRoom: fresh.length - move.length,
  };
}

/** Same piece of terrain, whatever its id or how many are owned. */
function samePiece(a: TerrainPiece, b: TerrainPiece): boolean {
  return (
    a.name.trim().toLowerCase() === b.name.trim().toLowerCase() &&
    a.type === b.type &&
    a.footprint.kind === b.footprint.kind &&
    a.footprint.width === b.footprint.width &&
    a.footprint.depth === b.footprint.depth
  );
}

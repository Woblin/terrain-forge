import type { BoardPiece } from './editor';
import { pieceById } from './layoutTerrain';
import {
  boardViolations,
  placePiece,
  type PlacementRules,
  type PlacementViolation,
} from './placement';
import type { TerrainPiece } from './terrain';
import { formatLength, type LengthUnit } from './units';

/**
 * Which hard placement rules each piece breaks, as short messages for the player, keyed by the
 * piece's board key. Pieces that break no rule are left out.
 */
export function checkBoard(
  pieces: readonly BoardPiece[],
  collection: readonly TerrainPiece[],
  rules: PlacementRules,
  unit: LengthUnit,
): ReadonlyMap<string, readonly string[]> {
  const placed = pieces.map(({ placement }) =>
    placePiece(pieceById(collection, placement.pieceId), placement),
  );
  const violations = boardViolations(placed, rules);
  const extra = extraCopies(pieces, collection);
  return new Map(
    pieces.flatMap((piece, i) => {
      const messages = (violations[i] ?? []).map((violation) =>
        describeViolation(
          violation,
          (index) => placed[index]?.piece.name ?? 'another piece',
          rules,
          unit,
        ),
      );
      const owned = extra.get(piece.key);
      if (owned !== undefined) {
        messages.push(`More copies than the ${String(owned)} in your library`);
      }
      return messages.length === 0 ? [] : [[piece.key, messages] as const];
    }),
  );
}

/**
 * Copies on the board beyond the quantity in the collection, which happens when the player lowers
 * a quantity after placing pieces. Maps each extra copy's key to the quantity owned.
 */
function extraCopies(
  pieces: readonly BoardPiece[],
  collection: readonly TerrainPiece[],
): ReadonlyMap<string, number> {
  const seen = new Map<string, number>();
  const extra = new Map<string, number>();
  for (const { key, placement } of pieces) {
    const count = (seen.get(placement.pieceId) ?? 0) + 1;
    seen.set(placement.pieceId, count);
    const { quantity } = pieceById(collection, placement.pieceId);
    if (count > quantity) {
      extra.set(key, quantity);
    }
  }
  return extra;
}

export function describeViolation(
  violation: PlacementViolation,
  nameOf: (index: number) => string,
  rules: PlacementRules,
  unit: LengthUnit,
): string {
  switch (violation.kind) {
    case 'offBoard':
      return `Keep ${formatLength(rules.edgeMargin, unit)} clear of the table edge`;
    case 'edgeGap':
      return `${formatLength(violation.distance, unit)} from the table edge: keep ${formatLength(rules.spacing.edge?.hug ?? 0, unit)} or less, or ${formatLength(rules.spacing.edge?.open ?? 0, unit)} or more`;
    case 'overlaps':
      return `Overlaps ${nameOf(violation.other)}`;
    case 'tooClose':
      return `${formatLength(violation.distance, unit)} from ${nameOf(violation.other)}, needs ${formatLength(violation.needed, unit)} (or ${formatLength(rules.spacing.joinGap, unit)} or less to join them)`;
    case 'zoneCrowded':
      return `More than one piece stands fully inside Player ${violation.player}'s zone`;
  }
}

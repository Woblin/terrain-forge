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
      return messages.length === 0 ? [] : [[piece.key, messages] as const];
    }),
  );
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
    case 'tooClose':
      return `${formatLength(violation.distance, unit)} from ${nameOf(violation.other)}, needs ${formatLength(rules.minGap, unit)}`;
    case 'zoneCrowded':
      return `More than one piece stands fully inside Player ${violation.player}'s zone`;
  }
}

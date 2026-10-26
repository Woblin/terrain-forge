import type { Placement, TerrainPiece } from '../domain/terrain';
import { formatLength, type LengthUnit } from '../domain/units';

/** What a screen reader says for a piece on the board, including any rule it breaks. */
export function pieceLabel(
  piece: TerrainPiece,
  placement: Placement,
  unit: LengthUnit,
  problems: readonly string[] | undefined,
): string {
  const length = (inches: number) => formatLength(inches, unit);
  const { width, depth } = piece.footprint;
  const { position, rotation } = placement;
  const label = `${piece.name}, ${length(width)} by ${length(depth)}, at ${length(position.x)}, ${length(position.y)}, turned ${String(Math.round(rotation))}°`;
  return problems === undefined ? label : `${label}. Warning: ${problems.join('; ')}`;
}

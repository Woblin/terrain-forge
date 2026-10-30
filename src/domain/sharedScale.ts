import type { TerrainPiece } from './terrain';

/** The area every library picture shows, in inches, so pieces can be compared by size. */
export interface SharedView {
  readonly width: number;
  readonly depth: number;
}

const BASE_VIEW: SharedView = { width: 14, depth: 10.5 };
/** Room kept around the largest piece, in inches. */
const MARGIN = 1;

/**
 * A 14″ × 10.5″ view, grown evenly when the largest piece would not fit, so every piece is
 * drawn at the same scale.
 */
export function sharedView(pieces: readonly TerrainPiece[]): SharedView {
  const grow = Math.max(
    1,
    ...pieces.map((piece) =>
      Math.max(
        (piece.footprint.width + 2 * MARGIN) / BASE_VIEW.width,
        (piece.footprint.depth + 2 * MARGIN) / BASE_VIEW.depth,
      ),
    ),
  );
  return { width: BASE_VIEW.width * grow, depth: BASE_VIEW.depth * grow };
}

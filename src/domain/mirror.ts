import { mirrorPoint, type Board } from './board';
import type { BoardPiece, PieceUpdate } from './editor';
import { distance } from './geometry';
import { normalizeRotation } from './snapping';
import type { Placement } from './terrain';

/** Positions within this many inches, and angles within this many degrees, count as mirrored. */
const MIRROR_TOLERANCE = 0.01;

/** Where a piece's twin stands: mirrored through the board centre and turned half a circle. */
export function mirroredPlacement(
  placement: Pick<Placement, 'position' | 'rotation'>,
  board: Board,
): Pick<Placement, 'position' | 'rotation'> {
  return {
    position: mirrorPoint(placement.position, board),
    rotation: normalizeRotation(placement.rotation + 180),
  };
}

/**
 * The piece that stands as this piece's mirror image, as the generator places matching pairs.
 * Footprints are symmetric under a half turn, so angles are compared modulo 180 degrees.
 */
export function findMirrorTwin(
  pieces: readonly BoardPiece[],
  key: string,
  board: Board,
): BoardPiece | undefined {
  const piece = pieces.find((candidate) => candidate.key === key);
  if (piece === undefined) {
    return undefined;
  }
  const mirrored = mirroredPlacement(piece.placement, board);
  return pieces.find(
    ({ key: otherKey, placement }) =>
      otherKey !== key &&
      distance(placement.position, mirrored.position) <= MIRROR_TOLERANCE &&
      halfTurnDifference(placement.rotation, mirrored.rotation) <= MIRROR_TOLERANCE,
  );
}

/** The update for a piece, plus the matching one for its twin when it has one. */
export function withTwin(
  update: PieceUpdate,
  twin: BoardPiece | undefined,
  board: Board,
): PieceUpdate[] {
  return twin === undefined
    ? [update]
    : [update, { key: twin.key, ...mirroredPlacement(update, board) }];
}

function halfTurnDifference(a: number, b: number): number {
  const difference = Math.abs(normalizeRotation(a) - normalizeRotation(b)) % 180;
  return Math.min(difference, 180 - difference);
}

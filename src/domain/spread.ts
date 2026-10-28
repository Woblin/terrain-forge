import type { Board } from './board';
import { distance } from './geometry';
import type { PlacedPiece, SpotChoice } from './placement';

/** Legal spots compared per unit when only the spread counts. */
const SPREAD_SPOTS = 10;
/**
 * How much one inch of the leading score outweighs the spread, which only breaks ties then. A
 * leading score under 1/100 inch counts as perfect.
 */
const LEAD_WEIGHT = 1000;
/** With a perfect leading score, this many legal spots are enough to choose a spread from. */
const SPOTS_AFTER_PERFECT_LEAD = 4;
/**
 * Room beyond this many inches counts the same, so pieces spread out without lining up in a
 * grid, and holes big enough for the last pieces stay open.
 */
const ENOUGH_ROOM = 9;

/**
 * Picks, for each unit, the spot with the most room around it (best-candidate sampling), so the
 * terrain spreads over the board without looking like a grid. With a leading choice, such as
 * breaking up long lanes, that choice decides first and the spread only breaks ties.
 */
export function spreadChoice(board: Board, leading?: SpotChoice): SpotChoice {
  if (leading === undefined) {
    return {
      spots: SPREAD_SPOTS,
      rank: (candidate, placed) => spreadRank(candidate, placed, board),
      goodEnough: () => false,
    };
  }
  return {
    spots: Math.max(leading.spots, SPREAD_SPOTS),
    rank: (candidate, placed) =>
      leading.rank(candidate, placed) * LEAD_WEIGHT + spreadRank(candidate, placed, board),
    // The spread is never more than ENOUGH_ROOM, so a negative rank means a perfect lead.
    goodEnough: (bestRank, legalSpots) => bestRank < 0 && legalSpots >= SPOTS_AFTER_PERFECT_LEAD,
  };
}

/** Lower is better: minus the room around the most crowded piece of the candidate. */
export function spreadRank(
  candidate: readonly PlacedPiece[],
  placed: readonly PlacedPiece[],
  board: Board,
): number {
  return -Math.min(...candidate.map((piece) => roomAround(piece, placed, board)));
}

/**
 * How far the piece's centre is from the nearest placed piece's centre, or from its own mirror
 * image across the nearest table edge, so pieces are not pushed out to the edges either. Capped
 * at enough room.
 */
function roomAround(piece: PlacedPiece, placed: readonly PlacedPiece[], board: Board): number {
  const centre = piece.placement.position;
  const toEdge = Math.min(centre.x, board.width - centre.x, centre.y, board.depth - centre.y);
  return Math.min(
    ENOUGH_ROOM,
    2 * toEdge,
    ...placed.map((other) => distance(centre, other.placement.position)),
  );
}

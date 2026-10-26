import { PLAYERS, type Board, type DeploymentMap } from './board';
import type { Polygon } from './geometry';
import { clearLanes, sightObstacles } from './lineOfSight';
import { playableArea, type PlacedPiece, type SpotChoice } from './placement';
import type { TerrainEffects } from './terrain';

export interface LaneSetup {
  readonly board: Board;
  readonly deployment: DeploymentMap;
  readonly edgeMargin: number;
  readonly effects: TerrainEffects;
  readonly maxLane: number;
}

/** Legal spots compared per unit; more breaks lanes better but takes longer. */
const SPOTS_PER_UNIT = 12;

/**
 * The area lanes are measured in: the board without the strip along the table edge where no
 * terrain may stand, since a lane there could never be blocked.
 */
export function laneArea(board: Board, edgeMargin: number): Polygon {
  return playableArea(board, edgeMargin);
}

/** Picks, for each unit, the spot that leaves the least lane length over the limit (R5). */
export function laneBreakingChoice(setup: LaneSetup): SpotChoice {
  return {
    spots: SPOTS_PER_UNIT,
    rank: (candidate, placed) => laneExcess([...placed, ...candidate], setup),
  };
}

/** How many inches the sampled lanes run past the limit, added up over every line. */
export function laneExcess(pieces: readonly PlacedPiece[], setup: LaneSetup): number {
  const terrain = pieces.map(({ piece, polygon }) => ({
    pieceId: piece.id,
    polygon,
    effect: setup.effects[piece.type],
  }));
  const lanes = clearLanes(
    laneArea(setup.board, setup.edgeMargin),
    sightObstacles(terrain),
    PLAYERS.map((player) => setup.deployment.zones[player]),
  );
  return lanes.reduce((sum, lane) => sum + Math.max(0, lane.length - setup.maxLane), 0);
}

import { PLAYERS, type PlayerId } from './board';
import {
  evaluateFairness,
  hiddenDeploymentPoints,
  type FairnessInput,
  type FairnessReport,
} from './fairness';
import type { GameSetup } from './gameSetup';
import { prepareCollection } from './generator';
import type { Point } from './geometry';
import { laneArea } from './laneBreaking';
import { layoutTerrain } from './layoutTerrain';
import { findLongestClearLane, sightObstacles, type Lane } from './lineOfSight';
import type { Placement, TerrainPiece } from './terrain';

/** The fairness report for a board, plus what the overlays draw. */
export interface BoardAnalysis {
  readonly report: FairnessReport;
  /** R5: the longest clear lane, or null when every line is blocked. */
  readonly lane: Lane | null;
  /** R1: the sample points in each zone that the enemy zone cannot see. */
  readonly hidden: Readonly<Record<PlayerId, readonly Point[]>>;
}

/**
 * What the fairness rules need for these placements, measured with the same balance rules the
 * generator used for this collection, so an unedited layout gets the generator's own report.
 */
export function fairnessInputFor(
  setup: GameSetup,
  collection: readonly TerrainPiece[],
  placements: readonly Placement[],
): FairnessInput {
  const { board, preset, deployment } = setup;
  return {
    board,
    deployment,
    terrain: layoutTerrain(placements, collection, preset.terrainEffects),
    reach: preset.reach,
    edgeMargin: preset.edgeMargin,
    balance: prepareCollection(collection, board, preset).balance,
  };
}

export function analyseBoard(input: FairnessInput): BoardAnalysis {
  const obstacles = sightObstacles(input.terrain);
  return {
    report: evaluateFairness(input),
    lane: findLongestClearLane(
      laneArea(input.board, input.edgeMargin),
      obstacles,
      PLAYERS.map((player) => input.deployment.zones[player]),
    ),
    hidden: hiddenDeploymentPoints(input.deployment, obstacles).hidden,
  };
}

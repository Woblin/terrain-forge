import type { FairnessDetails, FairnessInput, RuleId } from './fairness';
import { explainFairness } from './fairness';
import type { GameSetup } from './gameSetup';
import { layoutTerrain } from './layoutTerrain';
import type { BalanceRules } from './presets';
import type { Placement, TerrainPiece } from './terrain';

/** The fairness report for a board, plus what the overlays draw. */
export type BoardAnalysis = FairnessDetails;

/**
 * What the fairness rules need for these placements. `balance` should be the rules the generator
 * used for this collection (from `prepareCollection`), so an unedited layout gets the generator's
 * own report, and `enabledRules` the rules the layout was generated with.
 */
export function fairnessInputFor(
  setup: GameSetup,
  collection: readonly TerrainPiece[],
  placements: readonly Placement[],
  balance: BalanceRules,
  enabledRules: readonly RuleId[],
): FairnessInput {
  const { board, preset, deployment } = setup;
  return {
    board,
    deployment,
    terrain: layoutTerrain(placements, collection, preset.terrainEffects),
    reach: preset.reach,
    edgeMargin: preset.edgeMargin,
    balance,
    enabledRules,
  };
}

export function analyseBoard(input: FairnessInput): BoardAnalysis {
  return explainFairness(input);
}

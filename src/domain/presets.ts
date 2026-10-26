import type { Board } from './board';
import type { TerrainEffects } from './terrain';

export interface Range {
  readonly min: number;
  readonly max: number;
}

/**
 * Thresholds for the balance rules R1 to R6. Shares and relative differences are fractions
 * (0.1 = 10%), distances are inches. Changing any of these needs the product owner's approval.
 */
export interface BalanceRules {
  /** R1: largest allowed difference between the players' hidden deployment shares. */
  readonly hiddenDeploymentMaxDifference: number;
  /** R1: smallest hidden deployment share each player must get. */
  readonly hiddenDeploymentMinShare: number;
  /** R2: largest allowed difference in cover within reach, relative to the larger value. */
  readonly coverInReachMaxDifference: number;
  /** R3: largest allowed difference in average distance to the nearest cover. */
  readonly nearestCoverMaxDifference: number;
  /** R4: largest allowed difference in terrain per half, relative to the larger value. */
  readonly halfBoardMaxDifference: number;
  /** R5: longest allowed clear straight line through midfield. */
  readonly maxClearLane: number;
  /** R6: share of the board that terrain should cover. */
  readonly coverage: Range;
}

export interface GameSystemPreset {
  readonly id: string;
  readonly name: string;
  readonly defaultBoard: Board;
  /** Depth of edge deployment zones. */
  readonly zoneDepth: number;
  /** Smallest distance between a piece and the board edge. */
  readonly edgeMargin: number;
  /** Smallest distance between two pieces, so models can move between them. */
  readonly minGap: number;
  /** How far from its zone a player can reach cover in the first turn (R2). */
  readonly reach: number;
  readonly terrainEffects: TerrainEffects;
  readonly balance: BalanceRules;
}

const DEFAULT_TERRAIN_EFFECTS: TerrainEffects = {
  ruin: { los: 'blocks', cover: 'heavy' },
  building: { los: 'blocks', cover: 'heavy' },
  forest: { los: 'obscures', cover: 'light' },
  obstacle: { los: 'none', cover: 'light' },
  hill: { los: 'none', cover: 'none' },
  crater: { los: 'none', cover: 'light' },
};

const SHARED_BALANCE = {
  hiddenDeploymentMaxDifference: 0.1,
  hiddenDeploymentMinShare: 0.2,
  coverInReachMaxDifference: 0.15,
  nearestCoverMaxDifference: 2,
  halfBoardMaxDifference: 0.15,
} as const;

const SHARED_SETTINGS = {
  zoneDepth: 12,
  edgeMargin: 1,
  terrainEffects: DEFAULT_TERRAIN_EFFECTS,
} as const;

/** Starting values, not taken from the rulebooks; tune them after playing on generated boards. */
export const PRESETS: readonly GameSystemPreset[] = [
  {
    id: 'warhammer-40k',
    name: 'Warhammer 40,000',
    defaultBoard: { width: 60, depth: 44 },
    minGap: 3,
    reach: 6,
    balance: { ...SHARED_BALANCE, maxClearLane: 30, coverage: { min: 0.25, max: 0.35 } },
    ...SHARED_SETTINGS,
  },
  {
    id: 'age-of-sigmar',
    name: 'Age of Sigmar',
    defaultBoard: { width: 60, depth: 44 },
    minGap: 3,
    reach: 5,
    balance: { ...SHARED_BALANCE, maxClearLane: 36, coverage: { min: 0.2, max: 0.3 } },
    ...SHARED_SETTINGS,
  },
  {
    id: 'one-page-rules',
    name: 'One Page Rules',
    defaultBoard: { width: 72, depth: 48 },
    minGap: 3,
    reach: 6,
    balance: { ...SHARED_BALANCE, maxClearLane: 36, coverage: { min: 0.25, max: 0.35 } },
    ...SHARED_SETTINGS,
  },
  {
    id: 'warhammer-fantasy',
    name: 'Warhammer Fantasy / The Old World',
    defaultBoard: { width: 72, depth: 48 },
    minGap: 4,
    reach: 8,
    balance: { ...SHARED_BALANCE, maxClearLane: 48, coverage: { min: 0.15, max: 0.25 } },
    ...SHARED_SETTINGS,
  },
];

export function findPreset(id: string): GameSystemPreset | undefined {
  return PRESETS.find((preset) => preset.id === id);
}

import type { Board } from './board';
import type { ClearanceRules } from './clearance';
import { RULE_IDS, type RuleId } from './fairness';
import type { SpacingRules } from './spacing';
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
  /** How far apart terrain stands, so models can move between pieces. */
  readonly spacing: SpacingRules;
  /** When set, every board must leave room for the widest ranked unit to march across. */
  readonly clearance: ClearanceRules | null;
  /** How far from its zone a player can reach cover in the first turn (R2). */
  readonly reach: number;
  readonly terrainEffects: TerrainEffects;
  readonly balance: BalanceRules;
  /** The balance rules that are on until the player switches them. */
  readonly defaultRules: readonly RuleId[];
}

/** The game a player starts on, before they pick one. */
export const DEFAULT_PRESET_ID = 'warhammer-fantasy';

/**
 * Neither Warhammer Fantasy nor One Page Rules asks for deployment zones hidden from the enemy:
 * both deploy unit by unit in full view. Long clear lanes (R5) are off too, at the product
 * owner's request.
 */
const RANK_AND_FILE_RULES = RULE_IDS.filter(
  (rule) => rule !== 'hiddenDeployment' && rule !== 'clearLane',
);

const DEFAULT_TERRAIN_EFFECTS: TerrainEffects = {
  ruin: { los: 'blocks', cover: 'heavy' },
  building: { los: 'blocks', cover: 'heavy' },
  forest: { los: 'obscures', cover: 'light' },
  obstacle: { los: 'none', cover: 'light' },
  wall: { los: 'none', cover: 'light' },
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

/**
 * Single models on round bases of 25 to 40 mm need about 1.6", so 3" also lets 50 to 60 mm
 * monster and vehicle bases through.
 */
const SKIRMISH_SPACING: SpacingRules = {
  minGap: 3,
  joinGap: 1,
  openTypes: ['hill'],
  openGap: 3,
  edge: null,
};

/**
 * The widest Warhammer Fantasy regiment is 6 infantry on 25 mm bases, or 6 cavalry on 25 x 50 mm
 * bases: 150 mm, or 5.9", across. Hills are open ground a regiment marches over.
 */
const REGIMENT_WIDTH = 5.9;

const REGIMENT_SPACING: SpacingRules = {
  minGap: 6,
  joinGap: 1,
  openTypes: ['hill'],
  openGap: 4,
  edge: { hug: 2, open: 6 },
};

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
    spacing: SKIRMISH_SPACING,
    clearance: null,
    reach: 6,
    balance: { ...SHARED_BALANCE, maxClearLane: 48, coverage: { min: 0.25, max: 0.35 } },
    defaultRules: RULE_IDS,
    ...SHARED_SETTINGS,
  },
  {
    id: 'age-of-sigmar',
    name: 'Age of Sigmar',
    defaultBoard: { width: 60, depth: 44 },
    spacing: SKIRMISH_SPACING,
    clearance: null,
    reach: 5,
    balance: { ...SHARED_BALANCE, maxClearLane: 48, coverage: { min: 0.2, max: 0.3 } },
    defaultRules: RULE_IDS,
    ...SHARED_SETTINGS,
  },
  {
    id: 'one-page-rules',
    name: 'One Page Rules',
    defaultBoard: { width: 72, depth: 48 },
    spacing: SKIRMISH_SPACING,
    clearance: null,
    reach: 6,
    balance: { ...SHARED_BALANCE, maxClearLane: 58, coverage: { min: 0.25, max: 0.35 } },
    defaultRules: RANK_AND_FILE_RULES,
    ...SHARED_SETTINGS,
  },
  {
    id: 'warhammer-fantasy',
    name: 'Warhammer Fantasy / The Old World',
    defaultBoard: { width: 72, depth: 48 },
    spacing: REGIMENT_SPACING,
    clearance: { width: REGIMENT_WIDTH, minReach: 0.9 },
    reach: 8,
    balance: { ...SHARED_BALANCE, maxClearLane: 58, coverage: { min: 0.15, max: 0.25 } },
    defaultRules: RANK_AND_FILE_RULES,
    ...SHARED_SETTINGS,
  },
];

export function findPreset(id: string): GameSystemPreset | undefined {
  return PRESETS.find((preset) => preset.id === id);
}

/** The game a player starts on. */
export function defaultPreset(): GameSystemPreset {
  const preset = findPreset(DEFAULT_PRESET_ID);
  if (preset === undefined) {
    throw new Error(`The default game "${DEFAULT_PRESET_ID}" is not in the presets.`);
  }
  return preset;
}

/** Whether the board shows the longest clear lane before the player switches it: when R5 is on by default. */
export function showsLaneByDefault(preset: GameSystemPreset): boolean {
  return preset.defaultRules.includes('clearLane');
}

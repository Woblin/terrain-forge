import { boardArea, type Board, type DeploymentMap } from './board';
import { isPassable, regimentClearance } from './clearance';
import { laneBreakingChoice } from './laneBreaking';
import { evaluateFairness, inRuleOrder, type FairnessReport, type RuleId } from './fairness';
import { expandCollection, placeUnits, type PlacedPiece, type PlacementRules } from './placement';
import { buildUnits, orderForTarget } from './placementUnits';
import type { BalanceRules, GameSystemPreset } from './presets';
import { createRandom, randomBetween, shuffle, type RandomSource } from './random';
import { spreadChoice } from './spread';
import { footprintArea, type PlacedTerrain, type Placement, type TerrainPiece } from './terrain';

/** Bump when a change makes the same seed give a different layout. */
export const GENERATOR_VERSION = 3;

const CANDIDATE_COUNT = 16;
/** With a small collection, at least this share of it must make it onto the board. */
const SMALL_COLLECTION_MIN_SHARE = 0.8;

export interface GenerationRequest {
  readonly board: Board;
  readonly pieces: readonly TerrainPiece[];
  readonly preset: GameSystemPreset;
  readonly deployment: DeploymentMap;
  readonly seed: number;
  /** The balance rules a board must pass. The others are measured but never fail it. */
  readonly enabledRules: readonly RuleId[];
}

export interface Layout {
  readonly board: Board;
  readonly placements: readonly Placement[];
  readonly seed: number;
  readonly presetId: string;
  readonly deploymentId: string;
  readonly generatorVersion: number;
  /** The balance rules that were on, in R1 to R6 order. */
  readonly enabledRules: readonly RuleId[];
}

export type GenerationResult =
  | {
      readonly ok: true;
      readonly layout: Layout;
      /** When no candidate passed every rule, the closest one, with its failures in here. */
      readonly report: FairnessReport;
      readonly warnings: readonly string[];
    }
  | { readonly ok: false; readonly reason: string };

interface Candidate {
  readonly pieces: readonly PlacedPiece[];
  readonly report: FairnessReport;
}

/** What helps when the terrain cannot meet a rule. */
export const RULE_ADVICE: Readonly<Record<RuleId, string>> = {
  hiddenDeployment:
    'To hide more of each deployment zone, add terrain that blocks line of sight, such as ruins or buildings.',
  coverInReach: 'For the same cover near both zones, add pieces in matching pairs.',
  nearestCover: 'To put cover equally close to both zones, add pieces in matching pairs.',
  halfBoard: 'To split the terrain evenly between both halves, add pieces in matching pairs.',
  clearLane:
    'To break up long firing lanes, add terrain that blocks line of sight, or larger pieces.',
  coverage: 'To cover more of the board, add more terrain, or larger pieces.',
};

/**
 * Builds candidate layouts from the seed and returns the fairest one that passes every rule that
 * is on. When none passes, it returns the closest one, so a small collection still gets a board.
 * Where units must be able to march across, a board they cannot cross only wins if every board
 * blocks them.
 */
export function generateLayout(request: GenerationRequest): GenerationResult {
  const { board, pieces, preset, deployment, seed } = request;
  if (pieces.every((piece) => piece.quantity <= 0)) {
    return { ok: false, reason: 'Your terrain collection is empty. Add some pieces first.' };
  }
  const { usable, balance, warnings } = prepareCollection(pieces, board, preset);
  if (usable.length === 0) {
    return { ok: false, reason: 'None of your terrain pieces fit on this board.' };
  }
  const random = createRandom(seed);
  const candidates = Array.from({ length: CANDIDATE_COUNT }, () =>
    buildCandidate(usable, request, balance, random),
  );
  const best = closest(candidates, request);
  return {
    ok: true,
    layout: {
      board,
      placements: best.pieces.map((piece) => piece.placement),
      seed,
      presetId: preset.id,
      deploymentId: deployment.id,
      generatorVersion: GENERATOR_VERSION,
      enabledRules: inRuleOrder(request.enabledRules),
    },
    report: best.report,
    warnings,
  };
}

/** The pieces the generator can use on a board, and the balance rules they are measured by. */
export interface PreparedCollection {
  /** One entry per physical piece that fits on the board. */
  readonly usable: readonly TerrainPiece[];
  readonly balance: BalanceRules;
  readonly warnings: readonly string[];
}

export function prepareCollection(
  pieces: readonly TerrainPiece[],
  board: Board,
  preset: GameSystemPreset,
): PreparedCollection {
  const usable = expandCollection(
    pieces.filter((piece) => fitsOnBoard(piece, board, preset.edgeMargin)),
  );
  const warnings = tooLargeWarnings(pieces, board, preset.edgeMargin);
  const balance = balanceForCollection(preset.balance, usable, board, warnings);
  return { usable, balance, warnings };
}

/** Whether the piece fits inside the edge margin, either way round. */
function fitsOnBoard(piece: TerrainPiece, board: Board, edgeMargin: number): boolean {
  const width = board.width - 2 * edgeMargin;
  const depth = board.depth - 2 * edgeMargin;
  const { width: w, depth: d } = piece.footprint;
  return (w <= width && d <= depth) || (d <= width && w <= depth);
}

function tooLargeWarnings(
  pieces: readonly TerrainPiece[],
  board: Board,
  edgeMargin: number,
): string[] {
  return pieces
    .filter((piece) => piece.quantity > 0 && !fitsOnBoard(piece, board, edgeMargin))
    .map((piece) => `"${piece.name}" is too large for this board and was left out.`);
}

/**
 * When the whole collection covers less of the board than the preset asks for, the coverage
 * minimum drops to what the collection can cover, less some room for pieces that find no legal
 * spot, and the player is told.
 */
function balanceForCollection(
  balance: BalanceRules,
  pieces: readonly TerrainPiece[],
  board: Board,
  warnings: string[],
): BalanceRules {
  const available = pieces.reduce((sum, piece) => sum + footprintArea(piece.footprint), 0);
  const coverage = available / boardArea(board);
  if (coverage >= balance.coverage.min) {
    return balance;
  }
  warnings.push(
    `Your terrain covers ${percent(coverage)} of this board; ${percent(balance.coverage.min)} or more plays better.`,
  );
  return {
    ...balance,
    coverage: { ...balance.coverage, min: coverage * SMALL_COLLECTION_MIN_SHARE },
  };
}

function percent(share: number): string {
  return `${String(Math.round(share * 100))}%`;
}

function buildCandidate(
  pieces: readonly TerrainPiece[],
  request: GenerationRequest,
  balance: BalanceRules,
  random: RandomSource,
): Candidate {
  const { board, preset, deployment, enabledRules } = request;
  const area = boardArea(board);
  const target = randomBetween(random, balance.coverage.min, balance.coverage.max) * area;
  const built = buildUnits(shuffle(random, pieces), preset.spacing, random);
  const units = orderForTarget(built, target, random);
  const rules: PlacementRules = {
    board,
    deployment,
    edgeMargin: preset.edgeMargin,
    spacing: preset.spacing,
  };
  // Steering pieces into long lanes only pays off while R5 counts.
  const lanes = enabledRules.includes('clearLane')
    ? laneBreakingChoice({
        ...rules,
        effects: preset.terrainEffects,
        maxLane: balance.maxClearLane,
      })
    : undefined;
  const choice = spreadChoice(board, lanes);
  const placed = placeUnits(
    units,
    { target, max: balance.coverage.max * area },
    rules,
    random,
    choice,
  );
  const report = evaluateFairness({
    board,
    deployment,
    terrain: placed.map((piece) => toPlacedTerrain(piece, preset)),
    reach: preset.reach,
    edgeMargin: preset.edgeMargin,
    balance,
    enabledRules,
  });
  return { pieces: placed, report };
}

function passable(pieces: readonly PlacedPiece[], request: GenerationRequest): boolean {
  const { board, deployment, preset } = request;
  if (preset.clearance === null) {
    return true;
  }
  const clearance = regimentClearance({
    board,
    deployment,
    pieces,
    spacing: preset.spacing,
    rules: preset.clearance,
  });
  return isPassable(clearance, preset.clearance);
}

function toPlacedTerrain(piece: PlacedPiece, preset: GameSystemPreset): PlacedTerrain {
  return {
    pieceId: piece.piece.id,
    polygon: piece.polygon,
    effect: preset.terrainEffects[piece.piece.type],
  };
}

/**
 * The candidate that fails the fewest rules, and among those the most even one, skipping boards
 * the game's widest unit cannot cross while there is another. Candidates are checked for that in
 * order, so most boards need only one check.
 */
function closest(candidates: readonly Candidate[], request: GenerationRequest): Candidate {
  const ranked = [...candidates].sort(byCloseness);
  const [first] = ranked;
  if (first === undefined) {
    throw new Error('The generator built no candidate boards.');
  }
  return ranked.find((candidate) => passable(candidate.pieces, request)) ?? first;
}

/** Fewest failed rules first, then the most even; equal candidates keep their order. */
function byCloseness(a: Candidate, b: Candidate): number {
  const failed = a.report.failedRules.length - b.report.failedRules.length;
  return failed !== 0 ? failed : a.report.imbalance - b.report.imbalance;
}

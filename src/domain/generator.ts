import { boardArea, type Board, type DeploymentMap } from './board';
import { laneBreakingChoice } from './laneBreaking';
import { evaluateFairness, type FairnessReport, type RuleId } from './fairness';
import {
  expandCollection,
  pairPieces,
  placeUnits,
  type PlacedPiece,
  type PlacementRules,
} from './placement';
import type { BalanceRules, GameSystemPreset } from './presets';
import { createRandom, randomBetween, shuffle, type RandomSource } from './random';
import { footprintArea, type PlacedTerrain, type Placement, type TerrainPiece } from './terrain';

/** Bump when a change makes the same seed give a different layout. */
export const GENERATOR_VERSION = 1;

const CANDIDATE_COUNT = 16;

export interface GenerationRequest {
  readonly board: Board;
  readonly pieces: readonly TerrainPiece[];
  readonly preset: GameSystemPreset;
  readonly deployment: DeploymentMap;
  readonly seed: number;
}

export interface Layout {
  readonly board: Board;
  readonly placements: readonly Placement[];
  readonly seed: number;
  readonly presetId: string;
  readonly deploymentId: string;
  readonly generatorVersion: number;
}

export type GenerationResult =
  | {
      readonly ok: true;
      readonly layout: Layout;
      readonly report: FairnessReport;
      readonly warnings: readonly string[];
    }
  | { readonly ok: false; readonly reason: string };

interface Candidate {
  readonly pieces: readonly PlacedPiece[];
  readonly report: FairnessReport;
}

const FAILURE_REASONS: Readonly<Record<RuleId, string>> = {
  hiddenDeployment:
    'Could not hide enough of each deployment zone. Add terrain that blocks line of sight, such as ruins or buildings.',
  coverInReach:
    'Could not give both players the same cover near their zone. Pieces in matching pairs make this easier.',
  nearestCover:
    'Could not put cover equally close to both zones. Pieces in matching pairs make this easier.',
  halfBoard:
    'Could not split the terrain evenly between both halves. Pieces in matching pairs make this easier.',
  clearLane:
    'Could not break up every long firing lane. Add terrain that blocks line of sight, or larger pieces.',
  coverage: 'Could not fit the right amount of terrain on this board. Try a different board size.',
};

/** Builds candidate layouts from the seed and returns the fairest one that passes every rule. */
export function generateLayout(request: GenerationRequest): GenerationResult {
  const { board, pieces, preset, deployment, seed } = request;
  if (pieces.every((piece) => piece.quantity <= 0)) {
    return { ok: false, reason: 'Your terrain collection is empty. Add some pieces first.' };
  }
  const usable = expandCollection(
    pieces.filter((piece) => fitsOnBoard(piece, board, preset.edgeMargin)),
  );
  if (usable.length === 0) {
    return { ok: false, reason: 'None of your terrain pieces fit on this board.' };
  }
  const warnings = tooLargeWarnings(pieces, board, preset.edgeMargin);
  const balance = balanceForCollection(preset.balance, usable, board, warnings);
  const random = createRandom(seed);
  const candidates = Array.from({ length: CANDIDATE_COUNT }, () =>
    buildCandidate(usable, request, balance, random),
  );
  const best = fairestPassing(candidates);
  if (best === undefined) {
    return { ok: false, reason: FAILURE_REASONS[mostCommonFailure(candidates)] };
  }
  return {
    ok: true,
    layout: {
      board,
      placements: best.pieces.map((piece) => piece.placement),
      seed,
      presetId: preset.id,
      deploymentId: deployment.id,
      generatorVersion: GENERATOR_VERSION,
    },
    report: best.report,
    warnings,
  };
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
 * minimum drops to what the collection can cover, and the player is told.
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
  return { ...balance, coverage: { ...balance.coverage, min: coverage } };
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
  const { board, preset, deployment } = request;
  const area = boardArea(board);
  const units = pairPieces(shuffle(random, pieces));
  const target = randomBetween(random, balance.coverage.min, balance.coverage.max) * area;
  const rules: PlacementRules = {
    board,
    deployment,
    edgeMargin: preset.edgeMargin,
    minGap: preset.minGap,
  };
  const choice = laneBreakingChoice({
    ...rules,
    effects: preset.terrainEffects,
    maxLane: balance.maxClearLane,
  });
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
  });
  return { pieces: placed, report };
}

function toPlacedTerrain(piece: PlacedPiece, preset: GameSystemPreset): PlacedTerrain {
  return {
    pieceId: piece.piece.id,
    polygon: piece.polygon,
    effect: preset.terrainEffects[piece.piece.type],
  };
}

function fairestPassing(candidates: readonly Candidate[]): Candidate | undefined {
  return candidates
    .filter((candidate) => candidate.report.failedRules.length === 0)
    .reduce<Candidate | undefined>(
      (best, candidate) =>
        best === undefined || candidate.report.imbalance < best.report.imbalance ? candidate : best,
      undefined,
    );
}

function mostCommonFailure(candidates: readonly Candidate[]): RuleId {
  const counts = new Map<RuleId, number>();
  for (const rule of candidates.flatMap((candidate) => candidate.report.failedRules)) {
    counts.set(rule, (counts.get(rule) ?? 0) + 1);
  }
  const [mostCommon] = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  return mostCommon?.[0] ?? 'coverage';
}

import { boardArea, type Board } from './board';
import type { RuleId } from './fairness';
import { prepareCollection, tooLargeWarnings } from './generator';
import { pairPieces } from './placement';
import { PRESETS, type GameSystemPreset, type Range } from './presets';
import { footprintArea, TERRAIN_TYPE_NAMES, type TerrainPiece } from './terrain';
import { formatLength, formatRoughArea, type LengthUnit } from './units';

export type CheckLevel = 'ok' | 'warning' | 'problem';

export interface CollectionFinding {
  readonly level: Exclude<CheckLevel, 'ok'>;
  readonly message: string;
}

/** How well a collection suits one game system, judged by the generator's own rules. */
export interface PresetCheck {
  readonly preset: GameSystemPreset;
  readonly board: Board;
  /** Share of the board the pieces that fit on it could cover. */
  readonly coverage: number;
  readonly coverageTarget: Range;
  readonly level: CheckLevel;
  readonly findings: readonly CollectionFinding[];
}

/**
 * `rulesFor` gives the balance rules that are on for each game; `unit` is how the findings
 * write sizes.
 */
export function checkCollection(
  pieces: readonly TerrainPiece[],
  rulesFor: (preset: GameSystemPreset) => readonly RuleId[] = (preset) => preset.defaultRules,
  unit: LengthUnit = 'in',
  presets: readonly GameSystemPreset[] = PRESETS,
): PresetCheck[] {
  return presets.map((preset) => checkCollectionFor(pieces, preset, rulesFor(preset), unit));
}

export function checkCollectionFor(
  pieces: readonly TerrainPiece[],
  preset: GameSystemPreset,
  enabledRules: readonly RuleId[] = preset.defaultRules,
  unit: LengthUnit = 'in',
): PresetCheck {
  const board = preset.defaultBoard;
  const { usable } = prepareCollection(pieces, board, preset);
  const coverage = coverageOf(usable, board);
  const findings = [
    ...emptyFindings(pieces, usable),
    ...tooLargeWarnings(pieces, board, preset.edgeMargin).map((message) => ({
      level: 'warning' as const,
      message,
    })),
    ...coverageFindings(usable, coverage, preset.balance.coverage, board, unit),
    ...sightFindings(usable, preset, enabledRules),
    ...unpairedFindings(usable, unit),
  ];
  return {
    preset,
    board,
    coverage,
    coverageTarget: preset.balance.coverage,
    level: worstLevel(findings),
    findings,
  };
}

/** The piece of middling size, to say how much terrain is missing in pieces the player knows. */
export function typicalPiece(pieces: readonly TerrainPiece[]): TerrainPiece | undefined {
  const kinds = pieces.filter(
    (piece, i) => pieces.findIndex((other) => other.id === piece.id) === i,
  );
  const bySize = kinds.sort((a, b) => footprintArea(a.footprint) - footprintArea(b.footprint));
  return bySize[Math.floor((bySize.length - 1) / 2)];
}

/** Below the preset's coverage, the generator has to settle for sparser boards. */
function coverageFindings(
  usable: readonly TerrainPiece[],
  coverage: number,
  target: Range,
  board: Board,
  unit: LengthUnit,
): CollectionFinding[] {
  if (coverage >= target.min) {
    return [];
  }
  const missing = (target.min - coverage) * boardArea(board);
  return [{ level: 'warning', message: coverageMessage(missing, typicalPiece(usable), unit) }];
}

function coverageMessage(
  missing: number,
  reference: TerrainPiece | undefined,
  unit: LengthUnit,
): string {
  const amount = `Add about ${formatRoughArea(missing, unit)} of terrain`;
  if (reference === undefined) {
    return `${amount}. Boards will feel open until then.`;
  }
  const count = Math.max(1, Math.round(missing / footprintArea(reference.footprint)));
  const pieces = count === 1 ? 'piece' : 'pieces';
  return `${amount} (roughly ${String(count)} ${pieces} the size of ${reference.name}). Boards will feel open until then.`;
}

function emptyFindings(
  pieces: readonly TerrainPiece[],
  usable: readonly TerrainPiece[],
): CollectionFinding[] {
  if (usable.length > 0) {
    return [];
  }
  const message = pieces.some((piece) => piece.quantity > 0)
    ? 'None of your pieces fit on this board.'
    : 'Add some terrain to generate boards.';
  return [{ level: 'problem', message }];
}

/** Without terrain that blocks line of sight, hidden deployment (R1) and clear lanes (R5) fail. */
function sightFindings(
  usable: readonly TerrainPiece[],
  preset: GameSystemPreset,
  enabledRules: readonly RuleId[],
): CollectionFinding[] {
  const blocks = usable.some((piece) => preset.terrainEffects[piece.type].los === 'blocks');
  const missed = sightNeeds(enabledRules);
  return usable.length === 0 || blocks || missed.length === 0
    ? []
    : [
        {
          level: 'problem',
          message: `Nothing here blocks line of sight, so boards are unlikely to ${missed.join(' or ')}. Add terrain that blocks line of sight, such as ruins or buildings.`,
        },
      ];
}

/** What the rules that are on need terrain that blocks line of sight for. */
function sightNeeds(enabledRules: readonly RuleId[]): string[] {
  return [
    ...(enabledRules.includes('hiddenDeployment') ? ['hide the deployment zones'] : []),
    ...(enabledRules.includes('clearLane') ? ['break up long firing lanes'] : []),
  ];
}

/** The generator mirrors matching pairs through the centre, so pairs make fair boards easier. */
function unpairedFindings(usable: readonly TerrainPiece[], unit: LengthUnit): CollectionFinding[] {
  const singles = pairPieces(usable).flatMap((pairing) =>
    pairing.kind === 'single' ? [pairing.piece] : [],
  );
  const kinds = singles.filter(
    (piece, i) => singles.findIndex((other) => other.name === piece.name) === i,
  );
  return kinds.map((piece) => ({ level: 'warning', message: partnerMessage(piece, unit) }));
}

function partnerMessage(piece: TerrainPiece, unit: LengthUnit): string {
  const type = TERRAIN_TYPE_NAMES[piece.type].toLowerCase();
  const { width, depth } = piece.footprint;
  const size = `${formatLength(width, unit)} × ${formatLength(depth, unit)}`;
  return `Add a second ${type} about ${size} to pair with ${piece.name}, so both sides can get one.`;
}

function coverageOf(usable: readonly TerrainPiece[], board: Board): number {
  const area = usable.reduce((sum, piece) => sum + footprintArea(piece.footprint), 0);
  return area / boardArea(board);
}

function worstLevel(findings: readonly CollectionFinding[]): CheckLevel {
  if (findings.some((finding) => finding.level === 'problem')) {
    return 'problem';
  }
  return findings.length > 0 ? 'warning' : 'ok';
}

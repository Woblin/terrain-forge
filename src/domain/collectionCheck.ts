import { boardArea, type Board } from './board';
import { prepareCollection } from './generator';
import { pairPieces } from './placement';
import { PRESETS, type GameSystemPreset, type Range } from './presets';
import { footprintArea, type TerrainPiece } from './terrain';

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

export function checkCollection(
  pieces: readonly TerrainPiece[],
  presets: readonly GameSystemPreset[] = PRESETS,
): PresetCheck[] {
  return presets.map((preset) => checkCollectionFor(pieces, preset));
}

export function checkCollectionFor(
  pieces: readonly TerrainPiece[],
  preset: GameSystemPreset,
): PresetCheck {
  const board = preset.defaultBoard;
  const { usable, warnings } = prepareCollection(pieces, board, preset);
  const findings = [
    ...emptyFindings(pieces, usable),
    ...warnings.map((message) => ({ level: 'warning' as const, message })),
    ...sightFindings(usable, preset),
    ...unpairedFindings(usable),
  ];
  return {
    preset,
    board,
    coverage: coverageOf(usable, board),
    coverageTarget: preset.balance.coverage,
    level: worstLevel(findings),
    findings,
  };
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
): CollectionFinding[] {
  const blocks = usable.some((piece) => preset.terrainEffects[piece.type].los === 'blocks');
  return usable.length === 0 || blocks
    ? []
    : [
        {
          level: 'problem',
          message:
            'Nothing here blocks line of sight, so boards are unlikely to hide the deployment zones or break up long firing lanes. Add terrain that blocks line of sight, such as ruins or buildings.',
        },
      ];
}

/** The generator mirrors matching pairs through the centre, so pairs make fair boards easier. */
function unpairedFindings(usable: readonly TerrainPiece[]): CollectionFinding[] {
  const names = new Set(
    pairPieces(usable).flatMap((unit) => (unit.kind === 'single' ? [unit.piece.name] : [])),
  );
  return names.size === 0
    ? []
    : [
        {
          level: 'warning',
          message: `No matching partner for: ${[...names].join(', ')}. Pieces in matching pairs make fair boards easier.`,
        },
      ];
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

import { describe, expect, it } from 'vitest';
import { analyseBoard, fairnessInputFor } from './boardAnalysis';
import { deploymentsFor, resolveGameSetup, type GameSetup } from './gameSetup';
import { generateLayout, prepareCollection } from './generator';
import { containsPoint } from './geometry';
import { pieceById } from './layoutTerrain';
import { boardViolations, placePiece } from './placement';
import { PRESETS } from './presets';
import { SAMPLE_COLLECTION } from './sampleCollection';
import type { Placement } from './terrain';

const SLOW_TEST_TIMEOUT = 60_000;

function sampleInput(setup: GameSetup, placements: readonly Placement[]) {
  const { balance } = prepareCollection(SAMPLE_COLLECTION, setup.board, setup.preset);
  return fairnessInputFor(setup, SAMPLE_COLLECTION, placements, balance, setup.preset.defaultRules);
}

function setupFor(presetId: string): GameSetup {
  const setup = resolveGameSetup(presetId, 'long-edges');
  if (setup === undefined) {
    throw new Error(`Missing setup for ${presetId}`);
  }
  return setup;
}

describe('the sample collection on every game system', () => {
  it.each(PRESETS.map((preset) => preset.id))(
    '%s: generates, breaks no placement rule, and measures the same when unedited',
    (presetId) => {
      const setup = setupFor(presetId);
      const result = generateLayout({
        board: setup.board,
        pieces: SAMPLE_COLLECTION,
        preset: setup.preset,
        deployment: setup.deployment,
        seed: 42,
        enabledRules: setup.preset.defaultRules,
      });
      if (!result.ok) {
        throw new Error(result.reason);
      }
      const { placements } = result.layout;
      const placed = placements.map((placement) =>
        placePiece(pieceById(SAMPLE_COLLECTION, placement.pieceId), placement),
      );
      const rules = {
        ...setup,
        edgeMargin: setup.preset.edgeMargin,
        spacing: setup.preset.spacing,
      };
      expect(boardViolations(placed, rules).flat()).toEqual([]);
      const analysis = analyseBoard(sampleInput(setup, placements));
      expect(analysis.report).toEqual(result.report);
      expect(analysis.lane?.length).toBeCloseTo(result.report.longestClearLane);
    },
    SLOW_TEST_TIMEOUT,
  );
});

describe('analyseBoard', () => {
  it('returns the hidden points inside each zone', () => {
    const setup = setupFor('warhammer-40k');
    const empty = analyseBoard(sampleInput(setup, []));
    expect(empty.hidden.A).toEqual([]);
    expect(empty.lane?.length).toBeGreaterThan(50);
    const wallOfRuins = [6, 18, 30, 42, 54].map((x) => ({
      pieceId: 'ruin-large',
      position: { x, y: 22 },
      rotation: 0,
    }));
    const wall = analyseBoard(sampleInput(setup, wallOfRuins));
    expect(wall.hidden.A.length).toBeGreaterThan(0);
    expect(wall.hidden.A.every((p) => containsPoint(setup.deployment.zones.A, p))).toBe(true);
    expect(wall.report.hiddenDeployment.A).toBeGreaterThan(0);
  });

  it('throws for a piece that is not in the collection', () => {
    expect(() =>
      sampleInput(setupFor('warhammer-40k'), [
        { pieceId: 'missing', position: { x: 1, y: 1 }, rotation: 0 },
      ]),
    ).toThrow('Terrain piece "missing" is not in the collection.');
  });
});

describe('game setups', () => {
  it('offers the three standard deployments and resolves known ids only', () => {
    const preset = setupFor('one-page-rules').preset;
    expect(deploymentsFor(preset).map((d) => d.id)).toEqual([
      'long-edges',
      'short-edges',
      'opposite-corners',
    ]);
    expect(resolveGameSetup('one-page-rules', 'short-edges')?.board).toEqual({
      width: 72,
      depth: 48,
    });
    expect(resolveGameSetup('one-page-rules', 'nope')).toBeUndefined();
    expect(resolveGameSetup('nope', 'long-edges')).toBeUndefined();
  });
});

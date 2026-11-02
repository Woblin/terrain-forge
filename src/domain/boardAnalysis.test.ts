import { describe, expect, it } from 'vitest';
import { analyseBoard, fairnessInputFor } from './boardAnalysis';
import { deploymentsFor, placementRulesFor, resolveGameSetup, type GameSetup } from './gameSetup';
import { generateLayout, prepareCollection } from './generator';
import { containsPoint } from './geometry';
import { pieceById } from './layoutTerrain';
import { placePiece } from './placedPiece';
import { boardViolations } from './placementRules';
import { PRESETS } from './presets';
import { ROBIN_COLLECTION } from './robinCollection';
import { SAMPLE_COLLECTION } from './sampleCollection';
import type { Placement, TerrainPiece } from './terrain';

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
      expect(boardViolations(placed, placementRulesFor(setup)).flat()).toEqual([]);
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

/**
 * Generates a board and measures it again the way the board page does; both reports must match,
 * so a board the player has not edited shows the generator's own verdict.
 */
function expectSameReport(setup: GameSetup, pieces: readonly TerrainPiece[], seed: number) {
  const result = generateLayout({
    board: setup.board,
    pieces,
    preset: setup.preset,
    deployment: setup.deployment,
    seed,
    enabledRules: setup.preset.defaultRules,
  });
  if (!result.ok) {
    throw new Error(result.reason);
  }
  const prepared = prepareCollection(pieces, setup.board, setup.preset);
  const input = fairnessInputFor(
    setup,
    pieces,
    result.layout.placements,
    prepared.balance,
    setup.preset.defaultRules,
  );
  expect(analyseBoard(input).report).toEqual(result.report);
  return prepared;
}

describe("the product owner's Warhammer Fantasy terrain", () => {
  const fantasy = setupFor('warhammer-fantasy').preset;

  it.each(deploymentsFor(fantasy).map((deployment) => deployment.id))(
    '%s: measures the same when unedited',
    (deploymentId) => {
      const setup = resolveGameSetup('warhammer-fantasy', deploymentId);
      if (setup === undefined) {
        throw new Error(`Missing setup for ${deploymentId}`);
      }
      expectSameReport(setup, ROBIN_COLLECTION, 1);
    },
    SLOW_TEST_TIMEOUT,
  );
});

describe('a collection too small for the coverage the game asks for', () => {
  it(
    'measures the same as the generator, with the lowered coverage minimum',
    () => {
      const setup = setupFor('warhammer-40k');
      const few = SAMPLE_COLLECTION.map((piece) => ({ ...piece, quantity: 1 }));
      const prepared = expectSameReport(setup, few, 3);
      expect(prepared.balance.coverage.min).toBeLessThan(setup.preset.balance.coverage.min);
      expect(prepared.warnings).toEqual([
        expect.stringMatching(/^Your terrain covers \d+% of this board/),
      ]);
    },
    SLOW_TEST_TIMEOUT,
  );
});

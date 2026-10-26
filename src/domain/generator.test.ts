import { describe, expect, it } from 'vitest';
import { boardPolygon, longEdgeDeployment, standardDeployments } from './board';
import { containsPolygon, polygonDistance } from './geometry';
import { GENERATOR_VERSION, generateLayout, type GenerationRequest } from './generator';
import { findPreset, PRESETS, type GameSystemPreset } from './presets';
import { placeFootprint, type TerrainPiece } from './terrain';

const SLOW_TEST_TIMEOUT = 60_000;

/** About 39% of a 60 x 44 board, with something of every kind. */
const collection: TerrainPiece[] = [
  ruinPiece('ruin-large', 'Large ruin', 12, 6, 6),
  ruinPiece('ruin-small', 'Small ruin', 8, 5, 6),
  {
    id: 'forest',
    name: 'Forest',
    type: 'forest',
    footprint: { kind: 'ellipse', width: 9, depth: 7 },
    quantity: 2,
  },
  {
    id: 'barricade',
    name: 'Barricade',
    type: 'obstacle',
    footprint: { kind: 'rect', width: 6, depth: 1 },
    quantity: 4,
  },
  {
    id: 'crater',
    name: 'Crater',
    type: 'crater',
    footprint: { kind: 'ellipse', width: 5, depth: 5 },
    quantity: 2,
  },
  {
    id: 'building',
    name: 'Building',
    type: 'building',
    footprint: { kind: 'rect', width: 10, depth: 10 },
    quantity: 2,
  },
];

function ruinPiece(
  id: string,
  name: string,
  width: number,
  depth: number,
  quantity: number,
): TerrainPiece {
  return { id, name, type: 'ruin', footprint: { kind: 'rect', width, depth }, quantity };
}

function preset(id: string): GameSystemPreset {
  const found = findPreset(id);
  if (found === undefined) {
    throw new Error(`Missing preset ${id}`);
  }
  return found;
}

const warhammer40k = preset('warhammer-40k');
const board = warhammer40k.defaultBoard;

function request(overrides: Partial<GenerationRequest> = {}): GenerationRequest {
  return {
    board,
    pieces: collection,
    preset: warhammer40k,
    deployment: longEdgeDeployment(board, warhammer40k.zoneDepth),
    seed: 1,
    ...overrides,
  };
}

describe('generateLayout determinism', () => {
  it(
    'gives the same layout for the same seed',
    () => {
      expect(generateLayout(request({ seed: 42 }))).toEqual(generateLayout(request({ seed: 42 })));
    },
    SLOW_TEST_TIMEOUT,
  );

  it(
    'gives a different layout for a different seed',
    () => {
      const first = generateLayout(request({ seed: 1 }));
      const second = generateLayout(request({ seed: 2 }));
      expect(first.ok && second.ok).toBe(true);
      if (first.ok && second.ok) {
        expect(first.layout.placements).not.toEqual(second.layout.placements);
      }
    },
    SLOW_TEST_TIMEOUT,
  );
});

describe('generateLayout invariants', () => {
  const seeds = [1, 2, 3, 4];
  const cases = standardDeployments(board, warhammer40k.zoneDepth).flatMap((deployment) =>
    seeds.map((seed) => ({ deployment, seed })),
  );

  it.each(cases)(
    'builds a legal, fair board for $deployment.id, seed $seed',
    ({ deployment, seed }) => {
      const result = generateLayout(request({ deployment, seed }));
      if (!result.ok) {
        throw new Error(result.reason);
      }
      expect(result.report.failedRules).toEqual([]);
      expect(result.layout).toMatchObject({
        seed,
        presetId: 'warhammer-40k',
        deploymentId: deployment.id,
        generatorVersion: GENERATOR_VERSION,
      });
      expectLegalPlacements(result.layout.placements, warhammer40k);
    },
    SLOW_TEST_TIMEOUT,
  );
});

function expectLegalPlacements(
  placements: readonly { pieceId: string; position: { x: number; y: number }; rotation: number }[],
  rules: GameSystemPreset,
): void {
  const used = new Map<string, number>();
  const polygons = placements.map((placement) => {
    const piece = collection.find((p) => p.id === placement.pieceId);
    if (piece === undefined) {
      throw new Error(`Unknown piece ${placement.pieceId}`);
    }
    used.set(piece.id, (used.get(piece.id) ?? 0) + 1);
    return placeFootprint(piece.footprint, placement);
  });
  for (const piece of collection) {
    expect(used.get(piece.id) ?? 0).toBeLessThanOrEqual(piece.quantity);
  }
  polygons.forEach((polygon, i) => {
    expect(containsPolygon(boardPolygon(board), polygon)).toBe(true);
    polygons.slice(i + 1).forEach((other) => {
      expect(polygonDistance(polygon, other)).toBeGreaterThanOrEqual(rules.minGap - 1e-9);
    });
  });
}

describe('generateLayout presets', () => {
  it.each(PRESETS)(
    'builds a passing board for $name',
    (gamePreset) => {
      const presetBoard = gamePreset.defaultBoard;
      const result = generateLayout({
        board: presetBoard,
        pieces: collection,
        preset: gamePreset,
        deployment: longEdgeDeployment(presetBoard, gamePreset.zoneDepth),
        seed: 5,
      });
      expect(result.ok ? result.report.failedRules : result.reason).toEqual([]);
    },
    SLOW_TEST_TIMEOUT,
  );
});

describe('generateLayout failures and warnings', () => {
  it('refuses an empty collection', () => {
    expect(generateLayout(request({ pieces: [] }))).toEqual({
      ok: false,
      reason: 'Your terrain collection is empty. Add some pieces first.',
    });
  });

  it('refuses when no piece fits on the board', () => {
    const result = generateLayout(request({ pieces: [ruinPiece('huge', 'Huge', 70, 50, 1)] }));
    expect(result).toEqual({ ok: false, reason: 'None of your terrain pieces fit on this board.' });
  });

  it(
    'explains what is missing when nothing blocks line of sight',
    () => {
      const barricades: TerrainPiece[] = [
        {
          id: 'wall',
          name: 'Wall',
          type: 'obstacle',
          footprint: { kind: 'rect', width: 8, depth: 2 },
          quantity: 40,
        },
      ];
      const result = generateLayout(request({ pieces: barricades }));
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toMatch(/blocks line of sight/);
      }
    },
    SLOW_TEST_TIMEOUT,
  );

  it(
    'leaves out pieces that are too large and says so',
    () => {
      const result = generateLayout(
        request({ pieces: [...collection, ruinPiece('huge', 'Huge ruin', 70, 50, 1)] }),
      );
      expect(result.ok && result.warnings).toEqual([
        '"Huge ruin" is too large for this board and was left out.',
      ]);
    },
    SLOW_TEST_TIMEOUT,
  );

  it(
    'warns when the collection is too small for the preset coverage',
    () => {
      const small = collection.map((piece) => ({
        ...piece,
        quantity: Math.ceil(piece.quantity / 2),
      }));
      const result = generateLayout(request({ pieces: small }));
      if (!result.ok) {
        throw new Error(result.reason);
      }
      expect(result.warnings).toEqual([
        expect.stringMatching(/^Your terrain covers \d+% of this board/),
      ]);
    },
    SLOW_TEST_TIMEOUT,
  );
});

describe('generateLayout regression', () => {
  it(
    'keeps seed 2024 stable; bump GENERATOR_VERSION if this changes on purpose',
    () => {
      const result = generateLayout(request({ seed: 2024 }));
      if (!result.ok) {
        throw new Error(result.reason);
      }
      const summary = result.layout.placements.map(
        (p) =>
          `${p.pieceId} ${p.position.x.toFixed(2)},${p.position.y.toFixed(2)} ${String(p.rotation)}`,
      );
      expect({ version: GENERATOR_VERSION, summary }).toMatchInlineSnapshot(`
        {
          "summary": [
            "building 41.39,16.50 165",
            "building 18.61,27.50 345",
            "ruin-large 47.91,28.96 315",
            "ruin-large 12.09,15.04 135",
            "ruin-large 28.76,13.41 75",
            "ruin-large 31.24,30.59 255",
            "forest 6.04,34.51 285",
            "forest 53.96,9.49 105",
            "ruin-small 54.47,38.72 15",
            "ruin-small 5.53,5.28 195",
            "barricade 1.65,19.21 90",
            "barricade 58.35,24.79 270",
          ],
          "version": 1,
        }
      `);
    },
    SLOW_TEST_TIMEOUT,
  );
});

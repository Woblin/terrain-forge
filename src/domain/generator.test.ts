import { describe, expect, it } from 'vitest';
import { longEdgeDeployment, standardDeployments, type DeploymentMap } from './board';
import { isPassable, regimentClearance } from './clearance';
import { polygonDistance } from './geometry';
import { RULE_IDS } from './fairness';
import { GENERATOR_VERSION, generateLayout, type GenerationRequest } from './generator';
import { boardViolations, placePiece } from './placement';
import { findPreset, PRESETS, type GameSystemPreset } from './presets';
import { ROBIN_COLLECTION } from './robinCollection';
import { SAMPLE_COLLECTION } from './sampleCollection';
import { placeFootprint, type Placement, type TerrainPiece } from './terrain';

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
    enabledRules: warhammer40k.defaultRules,
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
      expectLegalPlacements(result.layout.placements, warhammer40k, deployment);
    },
    SLOW_TEST_TIMEOUT,
  );
});

/** Each piece at most as often as owned, and nothing the board editor would warn about. */
function expectLegalPlacements(
  placements: readonly Placement[],
  rules: GameSystemPreset,
  deployment: DeploymentMap,
): void {
  const used = new Map<string, number>();
  const placed = placements.map((placement) => {
    const piece = collection.find((p) => p.id === placement.pieceId);
    if (piece === undefined) {
      throw new Error(`Unknown piece ${placement.pieceId}`);
    }
    used.set(piece.id, (used.get(piece.id) ?? 0) + 1);
    return placePiece(piece, placement);
  });
  for (const piece of collection) {
    expect(used.get(piece.id) ?? 0).toBeLessThanOrEqual(piece.quantity);
  }
  const placementRules = {
    board,
    deployment,
    edgeMargin: rules.edgeMargin,
    spacing: rules.spacing,
  };
  expect(boardViolations(placed, placementRules).flat()).toEqual([]);
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
        enabledRules: gamePreset.defaultRules,
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
    'still makes a board when nothing blocks line of sight, and reports the rules it breaks',
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
      if (!result.ok) {
        throw new Error(result.reason);
      }
      expect(result.layout.placements.length).toBeGreaterThan(0);
      expect(result.report.failedRules).toContain('hiddenDeployment');
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

describe('generateLayout rule switches', () => {
  it(
    'records the rules that were on, in R1 to R6 order',
    () => {
      const result = generateLayout(request({ enabledRules: ['coverage', 'hiddenDeployment'] }));
      expect(result.ok && result.layout.enabledRules).toEqual(['hiddenDeployment', 'coverage']);
    },
    SLOW_TEST_TIMEOUT,
  );

  it(
    'never fails a board on a rule that is off',
    () => {
      const walls: TerrainPiece[] = [
        {
          id: 'wall',
          name: 'Wall',
          type: 'obstacle',
          footprint: { kind: 'rect', width: 8, depth: 2 },
          quantity: 40,
        },
      ];
      const enabledRules = RULE_IDS.filter(
        (rule) => rule !== 'hiddenDeployment' && rule !== 'clearLane',
      );
      const result = generateLayout(request({ pieces: walls, enabledRules }));
      if (!result.ok) {
        throw new Error(result.reason);
      }
      expect(result.report.failedRules).not.toContain('hiddenDeployment');
      expect(result.report.failedRules).not.toContain('clearLane');
    },
    SLOW_TEST_TIMEOUT,
  );

  it(
    'with every rule off, places terrain and passes',
    () => {
      const result = generateLayout(request({ enabledRules: [] }));
      if (!result.ok) {
        throw new Error(result.reason);
      }
      expect(result.layout.placements.length).toBeGreaterThan(0);
      expect(result.report.failedRules).toEqual([]);
      expect(result.report.imbalance).toBe(0);
    },
    SLOW_TEST_TIMEOUT,
  );

  it(
    'gives a different board once a rule is switched off',
    () => {
      const all = generateLayout(request({ seed: 7 }));
      const noLanes = generateLayout(
        request({ seed: 7, enabledRules: RULE_IDS.filter((rule) => rule !== 'clearLane') }),
      );
      expect(all.ok && noLanes.ok).toBe(true);
      expect(all.ok && all.layout.placements).not.toEqual(noLanes.ok && noLanes.layout.placements);
    },
    SLOW_TEST_TIMEOUT,
  );
});

describe('generateLayout with too little terrain', () => {
  it(
    'returns the closest board, with the rules it breaks',
    () => {
      const few = [
        ruinPiece('ruin-small', 'Small ruin', 8, 5, 1),
        ruinPiece('ruin', 'Ruin', 6, 4, 1),
      ];
      const result = generateLayout(request({ pieces: few }));
      if (!result.ok) {
        throw new Error(result.reason);
      }
      expect(result.layout.placements.length).toBeGreaterThan(0);
      expect(result.report.failedRules.length).toBeGreaterThan(0);
      expect(result.warnings).toEqual([
        expect.stringMatching(/^Your terrain covers \d+% of this board/),
      ]);
    },
    SLOW_TEST_TIMEOUT,
  );
});

describe("generateLayout on the product owner's Warhammer Fantasy terrain", () => {
  const fantasy = preset('warhammer-fantasy');
  const fantasyBoard = fantasy.defaultBoard;
  const cases = standardDeployments(fantasyBoard, fantasy.zoneDepth).flatMap((deployment) =>
    [1, 2, 3, 4, 5].map((seed) => ({ deployment, seed })),
  );

  it.each(cases)(
    'leaves room for regiments and no wall alone on $deployment.id, seed $seed',
    ({ deployment, seed }) => {
      const result = generateLayout({
        board: fantasyBoard,
        pieces: ROBIN_COLLECTION,
        preset: fantasy,
        deployment,
        seed,
        enabledRules: fantasy.defaultRules,
      });
      if (!result.ok) {
        throw new Error(result.reason);
      }
      expect(result.report.failedRules).toEqual([]);
      const placed = result.layout.placements.map((placement) => {
        const piece = ROBIN_COLLECTION.find((entry) => entry.id === placement.pieceId);
        if (piece === undefined) {
          throw new Error(`Unknown piece ${placement.pieceId}`);
        }
        return placePiece(piece, placement);
      });
      // Fantasy tables stay open for wheeling and flanking.
      expect(result.report.coverage).toBeGreaterThanOrEqual(0.05);
      expect(result.report.coverage).toBeLessThanOrEqual(0.1);
      const rules = { board: fantasyBoard, deployment, edgeMargin: 1, spacing: fantasy.spacing };
      expect(boardViolations(placed, rules).flat()).toEqual([]);
      const clearance = fantasy.clearance;
      if (clearance === null) {
        throw new Error('Warhammer Fantasy should check clearance');
      }
      const marched = regimentClearance({
        board: fantasyBoard,
        deployment,
        pieces: placed,
        spacing: fantasy.spacing,
        rules: clearance,
      });
      expect(isPassable(marched, clearance)).toBe(true);
      const walls = placed.filter((piece) => piece.piece.id === 'stone-wall');
      for (const wall of walls) {
        const joined = walls.some(
          (other) => other !== wall && polygonDistance(wall.polygon, other.polygon) < 0.05,
        );
        expect(joined).toBe(true);
      }
    },
    SLOW_TEST_TIMEOUT,
  );

  it(
    'joins Stone Walls end to end on some boards',
    () => {
      const joined = [1, 2, 3, 4, 5, 6].some((seed) => {
        const result = generateLayout({
          board: fantasyBoard,
          pieces: ROBIN_COLLECTION,
          preset: fantasy,
          deployment: longEdgeDeployment(fantasyBoard, fantasy.zoneDepth),
          seed,
          enabledRules: fantasy.defaultRules,
        });
        const walls = result.ok
          ? result.layout.placements
              .filter((placement) => placement.pieceId === 'stone-wall')
              .map((placement) =>
                placeFootprint({ kind: 'rect', width: 5.12, depth: 0.59 }, placement),
              )
          : [];
        return walls.some((wall, i) =>
          walls.slice(i + 1).some((other) => polygonDistance(wall, other) < 0.05),
        );
      });
      expect(joined).toBe(true);
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
            "building 43.37,25.07 210",
            "building 16.63,18.93 30",
            "ruin-large 38.91,6.85 180",
            "ruin-large 21.09,37.15 0",
            "forest 7.58,9.12 165",
            "forest 52.42,34.88 345",
            "ruin-small 51.84,14.49 15",
            "barricade 50.94,17.57 15",
            "ruin-small 8.16,29.51 195",
            "barricade 9.06,26.43 195",
            "ruin-small 23.06,7.74 285",
            "ruin-small 36.94,36.26 105",
            "ruin-small 31.00,17.70 195",
            "ruin-small 29.00,26.30 15",
          ],
          "version": 3,
        }
      `);
    },
    SLOW_TEST_TIMEOUT,
  );

  // The cases below reach code the case above does not: diagonal zones, wall chains, the edge
  // and clear-back rules, regiment clearance, and the sample set signed-out players get. Each
  // locks the placements and the fairness result. Bump GENERATOR_VERSION if one changes on purpose.

  it(
    'keeps 40k on opposite corners stable',
    () => {
      expect(regressionSummary('warhammer-40k', 'opposite-corners', collection, 2024))
        .toMatchInlineSnapshot(`
        {
          "failedRules": [],
          "imbalance": "0.000000",
          "placements": [
            "building 22.62,22.49 0",
            "building 37.38,21.51 180",
            "ruin-large 7.67,17.16 0",
            "ruin-large 52.33,26.84 180",
            "ruin-large 24.68,6.58 0",
            "ruin-large 35.32,37.42 180",
            "forest 49.25,12.56 210",
            "forest 10.75,31.44 30",
            "ruin-small 38.13,9.49 270",
            "ruin-small 21.87,34.51 90",
            "ruin-small 50.36,38.01 240",
            "ruin-small 9.64,5.99 60",
            "barricade 6.32,38.37 180",
            "barricade 53.68,5.63 0",
            "barricade 10.26,24.20 180",
            "barricade 49.74,19.80 0",
          ],
          "version": 3,
        }
      `);
    },
    SLOW_TEST_TIMEOUT,
  );

  it(
    "keeps Warhammer Fantasy on the product owner's terrain stable, long edges",
    () => {
      expect(regressionSummary('warhammer-fantasy', 'long-edges', ROBIN_COLLECTION, 2024))
        .toMatchInlineSnapshot(`
        {
          "failedRules": [],
          "imbalance": "0.143823",
          "placements": [
            "building-1 49.53,24.00 105",
            "ruin-2 6.36,23.60 120",
            "ruin-1 65.64,24.40 300",
            "forest 34.87,13.93 240",
            "forest 37.13,34.07 60",
            "stone-wall 23.92,21.45 165",
            "stone-wall 21.90,24.95 75",
            "stone-wall 11.74,35.85 345",
            "stone-wall 16.86,35.18 0",
            "stone-wall 60.26,12.15 165",
            "stone-wall 55.14,12.82 180",
            "building-5 60.38,36.92 180",
            "building-2 11.62,11.08 0",
          ],
          "version": 3,
        }
      `);
    },
    SLOW_TEST_TIMEOUT,
  );

  it(
    "keeps Warhammer Fantasy on the product owner's terrain stable, short edges",
    () => {
      expect(regressionSummary('warhammer-fantasy', 'short-edges', ROBIN_COLLECTION, 7))
        .toMatchInlineSnapshot(`
        {
          "failedRules": [],
          "imbalance": "0.189243",
          "placements": [
            "ruin-2 36.13,14.38 90",
            "ruin-1 35.87,33.62 270",
            "forest 18.14,25.73 225",
            "forest 53.86,22.27 45",
            "building-5 19.86,38.73 90",
            "building-2 52.14,9.27 270",
          ],
          "version": 3,
        }
      `);
    },
    SLOW_TEST_TIMEOUT,
  );

  it(
    'keeps One Page Rules on the sample set stable',
    () => {
      expect(regressionSummary('one-page-rules', 'long-edges', SAMPLE_COLLECTION, 2024))
        .toMatchInlineSnapshot(`
        {
          "failedRules": [],
          "imbalance": "0.000000",
          "placements": [
            "building 57.28,24.53 270",
            "crater 65.02,22.83 270",
            "building 14.72,23.47 90",
            "crater 6.98,25.17 90",
            "ruin-large 42.00,38.99 270",
            "ruin-large 30.00,9.01 90",
            "ruin-large 11.12,11.12 0",
            "ruin-large 60.88,36.88 180",
            "ruin-large 29.60,33.02 90",
            "ruin-large 42.40,14.98 270",
            "forest 14.77,36.27 180",
            "forest 57.23,11.73 0",
            "ruin-small 5.34,39.57 75",
            "ruin-small 66.66,8.43 255",
            "ruin-small 42.87,27.01 0",
            "ruin-small 29.13,20.99 180",
            "barricade 25.29,42.98 195",
            "barricade 46.71,5.02 15",
            "barricade 48.81,37.63 270",
            "barricade 23.19,10.37 90",
          ],
          "version": 3,
        }
      `);
    },
    SLOW_TEST_TIMEOUT,
  );
});

/**
 * A board for a game, deployment, terrain and seed, as short lines that show any change: each
 * placement, then the rules it fails and how even it is.
 */
function regressionSummary(
  presetId: string,
  deploymentId: string,
  pieces: readonly TerrainPiece[],
  seed: number,
) {
  const gamePreset = preset(presetId);
  const presetBoard = gamePreset.defaultBoard;
  const deployment = standardDeployments(presetBoard, gamePreset.zoneDepth).find(
    (candidate) => candidate.id === deploymentId,
  );
  if (deployment === undefined) {
    throw new Error(`Missing deployment ${deploymentId}`);
  }
  const result = generateLayout({
    board: presetBoard,
    pieces,
    preset: gamePreset,
    deployment,
    seed,
    enabledRules: gamePreset.defaultRules,
  });
  if (!result.ok) {
    throw new Error(result.reason);
  }
  return {
    version: GENERATOR_VERSION,
    placements: result.layout.placements.map(
      (p) =>
        `${p.pieceId} ${p.position.x.toFixed(2)},${p.position.y.toFixed(2)} ${String(p.rotation)}`,
    ),
    failedRules: result.report.failedRules,
    imbalance: result.report.imbalance.toFixed(6),
  };
}

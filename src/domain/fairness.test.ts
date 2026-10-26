import { describe, expect, it } from 'vitest';
import { longEdgeDeployment, mirrorPoint, type Board } from './board';
import {
  evaluateFairness,
  measureCoverage,
  measureCoverInReach,
  measureHalfBoard,
  measureNearestCover,
  relativeDifference,
} from './fairness';
import { placePolygon, rectangle, type Point } from './geometry';
import type { BalanceRules } from './presets';
import type { PlacedTerrain, TerrainEffect } from './terrain';

const board: Board = { width: 60, depth: 44 };
const deployment = longEdgeDeployment(board, 12);
const balance: BalanceRules = {
  hiddenDeploymentMaxDifference: 0.1,
  hiddenDeploymentMinShare: 0.2,
  coverInReachMaxDifference: 0.15,
  nearestCoverMaxDifference: 2,
  halfBoardMaxDifference: 0.15,
  maxClearLane: 40,
  coverage: { min: 0.25, max: 0.35 },
};
const ruinEffect: TerrainEffect = { los: 'blocks', cover: 'heavy' };

function ruin(centre: Point, width: number, depth: number, rotation = 0): PlacedTerrain {
  const polygon = placePolygon(
    rectangle(-width / 2, -depth / 2, width / 2, depth / 2),
    centre,
    rotation,
  );
  return { pieceId: 'ruin', polygon, effect: ruinEffect };
}

function withTwin(piece: PlacedTerrain): PlacedTerrain[] {
  return [piece, { ...piece, polygon: piece.polygon.map((p) => mirrorPoint(p, board)) }];
}

/** A hand-built, point-symmetric board that should pass every rule. */
const mirroredLayout: PlacedTerrain[] = [
  ruin({ x: 30, y: 22 }, 10, 6),
  ...withTwin(ruin({ x: 8, y: 17 }, 10, 5)),
  ...withTwin(ruin({ x: 20, y: 30 }, 8, 6, 30)),
  ...withTwin(ruin({ x: 42, y: 16 }, 10, 5)),
  ...withTwin(ruin({ x: 52, y: 26 }, 6, 10)),
  ...withTwin(ruin({ x: 30, y: 9 }, 10, 6)),
  ...withTwin(ruin({ x: 18, y: 6 }, 10, 6)),
  ...withTwin(ruin({ x: 6, y: 34 }, 10, 6)),
];

/** Every ruin on player A's side. */
const lopsidedLayout: PlacedTerrain[] = [
  ruin({ x: 10, y: 16 }, 10, 6),
  ruin({ x: 30, y: 16 }, 10, 6),
  ruin({ x: 50, y: 16 }, 10, 6),
  ruin({ x: 20, y: 6 }, 10, 6),
  ruin({ x: 40, y: 6 }, 10, 6),
];

function evaluate(terrain: readonly PlacedTerrain[]) {
  return evaluateFairness({
    board,
    deployment,
    terrain,
    reach: 6,
    edgeMargin: 1,
    balance,
  });
}

describe('relativeDifference', () => {
  it('divides by the larger value', () => {
    expect(relativeDifference({ A: 80, B: 100 })).toBeCloseTo(0.2);
  });

  it('is 0 when both are 0', () => {
    expect(relativeDifference({ A: 0, B: 0 })).toBe(0);
  });
});

describe('a mirrored layout', () => {
  const report = evaluate(mirroredLayout);

  it('gives both players the same numbers', () => {
    expect(report.hiddenDeployment.A).toBeCloseTo(report.hiddenDeployment.B);
    expect(report.coverInReach.A).toBeCloseTo(report.coverInReach.B);
    expect(report.nearestCover.A).toBeCloseTo(report.nearestCover.B);
    expect(report.halfBoard.A).toBeCloseTo(report.halfBoard.B);
    expect(report.imbalance).toBeCloseTo(0);
  });

  it('passes every rule', () => {
    expect(report).toMatchObject({ failedRules: [] });
  });
});

describe('a lopsided layout', () => {
  const report = evaluate(lopsidedLayout);

  it('fails the cover and half-board rules', () => {
    expect(report.failedRules).toEqual(
      expect.arrayContaining(['coverInReach', 'nearestCover', 'halfBoard']),
    );
  });

  it('shows player A ahead', () => {
    expect(report.coverInReach.A).toBeGreaterThan(report.coverInReach.B);
    expect(report.halfBoard.A).toBeGreaterThan(report.halfBoard.B);
    expect(report.imbalance).toBeGreaterThan(1);
  });
});

describe('an empty board', () => {
  const report = evaluate([]);

  it('hides nothing and leaves a shooting gallery', () => {
    expect(report.hiddenDeployment).toEqual({ A: 0, B: 0 });
    expect(report.failedRules).toEqual(['hiddenDeployment', 'clearLane', 'coverage']);
  });
});

describe('single measures', () => {
  it('counts heavy cover in full and light cover at half', () => {
    const forest: PlacedTerrain = {
      pieceId: 'forest',
      polygon: rectangle(0, 13, 10, 17),
      effect: { los: 'obscures', cover: 'light' },
    };
    const cover = measureCoverInReach(deployment, [ruin({ x: 30, y: 15 }, 10, 4), forest], 6);
    expect(cover.A).toBeCloseTo(40 + 20);
    expect(cover.B).toBe(0);
  });

  it('measures distance from the front edge to the nearest cover', () => {
    const nearest = measureNearestCover(board, deployment, [ruin({ x: 30, y: 16 }, 60, 2)]);
    expect(nearest.A).toBeCloseTo(3);
    expect(nearest.B).toBeCloseTo(15);
  });

  it('splits a piece on the centre line between both halves', () => {
    const halves = measureHalfBoard(deployment, [ruin({ x: 30, y: 22 }, 10, 6)]);
    expect(halves.A).toBeCloseTo(30);
    expect(halves.B).toBeCloseTo(30);
  });

  it('measures coverage as a share of the board', () => {
    expect(measureCoverage(board, [ruin({ x: 30, y: 22 }, 60, 11)])).toBeCloseTo(0.25);
  });
});

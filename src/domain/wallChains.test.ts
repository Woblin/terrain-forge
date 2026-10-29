import { describe, expect, it } from 'vitest';
import { polygonDistance, polygonsOverlap } from './geometry';
import { memberPolygon } from './pieceGroup';
import { createRandom } from './random';
import type { TerrainPiece } from './terrain';
import {
  chainLengths,
  drawChainTurns,
  drawTurn,
  isChainable,
  MAX_CHAIN_LENGTH,
  MIN_CHAIN_LENGTH,
  splitWalls,
  wallChain,
} from './wallChains';

const stoneWall: TerrainPiece = {
  id: 'stone-wall',
  name: 'Stone Wall',
  type: 'wall',
  footprint: { kind: 'rect', width: 5.12, depth: 0.59 },
  quantity: 6,
};

describe('isChainable', () => {
  it('chains rectangular walls only', () => {
    expect(isChainable(stoneWall)).toBe(true);
    expect(isChainable({ ...stoneWall, type: 'obstacle' })).toBe(false);
    expect(isChainable({ ...stoneWall, footprint: { kind: 'ellipse', width: 5, depth: 1 } })).toBe(
      false,
    );
  });
});

describe('chainLengths', () => {
  it('uses every wall but a lone one, in chains of 2 or 3, with a mix of lengths', () => {
    const random = createRandom(3);
    const seen = new Set<number>();
    for (let count = 0; count <= 12; count++) {
      for (let i = 0; i < 20; i++) {
        const lengths = chainLengths(count, random);
        expect(lengths.reduce((sum, length) => sum + length, 0)).toBe(count === 1 ? 0 : count);
        lengths.forEach((length) => {
          expect(length).toBeGreaterThanOrEqual(MIN_CHAIN_LENGTH);
          expect(length).toBeLessThanOrEqual(MAX_CHAIN_LENGTH);
          seen.add(length);
        });
      }
    }
    expect([...seen].sort()).toEqual([2, 3]);
  });
});

describe('splitWalls', () => {
  it('builds every wall into chains when it can, leaving one out only when it must', () => {
    const random = createRandom(4);
    const used = (count: number): number => {
      const { perSide, centre } = splitWalls(count, random);
      expect(perSide === 0 || perSide >= MIN_CHAIN_LENGTH).toBe(true);
      expect([0, 2, 3]).toContain(centre);
      return 2 * perSide + centre;
    };
    expect([0, 1, 2, 3, 4, 5, 6, 7, 8].map(used)).toEqual([0, 0, 2, 3, 4, 4, 6, 7, 8]);
  });

  it('puts six walls either in two chains of 3, or in three chains of 2 with one in the centre', () => {
    const random = createRandom(5);
    const splits = new Set(Array.from({ length: 40 }, () => JSON.stringify(splitWalls(6, random))));
    expect(splits).toEqual(
      new Set([
        JSON.stringify({ perSide: 3, centre: 0 }),
        JSON.stringify({ perSide: 2, centre: 2 }),
      ]),
    );
  });
});

describe('drawTurn', () => {
  it('runs straight about half the time, otherwise bends 15 to 90 degrees either way', () => {
    const random = createRandom(8);
    const turns = Array.from({ length: 2000 }, () => drawTurn(random));
    const straight = turns.filter((turn) => turn === 0).length / turns.length;
    expect(straight).toBeGreaterThan(0.45);
    expect(straight).toBeLessThan(0.55);
    const bends = new Set(turns.filter((turn) => turn !== 0));
    expect([...bends].sort((a, b) => a - b)).toEqual([
      -90, -75, -60, -45, -30, -15, 15, 30, 45, 60, 75, 90,
    ]);
  });
});

describe('wallChain', () => {
  it('lays straight walls end to end along one line', () => {
    const chain = wallChain(stoneWall, [0, 0]);
    expect(chain.map((member) => member.rotation)).toEqual([0, 0, 0]);
    expect(new Set(chain.map((member) => member.offset.y.toFixed(9)))).toEqual(
      new Set(['0.000000000']),
    );
  });

  it.each([[[90]], [[-45]], [[15, 15]], [[90, 90]], [[60, -30]]])(
    'joins every wall to the next without overlap for turns %j',
    (turns) => {
      const polygons = wallChain(stoneWall, turns).map(memberPolygon);
      polygons.forEach((polygon, i) => {
        const next = polygons[i + 1];
        if (next !== undefined) {
          expect(polygonDistance(polygon, next)).toBeLessThan(0.05);
        }
        polygons.slice(i + 1).forEach((other) => {
          expect(polygonsOverlap(polygon, other)).toBe(false);
        });
      });
    },
  );

  it('turns each wall by the turns so far', () => {
    expect(wallChain(stoneWall, [30, -90]).map((member) => member.rotation)).toEqual([0, 30, 300]);
  });

  it('lays a wall whose long side is its depth along the chain too', () => {
    const upright = {
      ...stoneWall,
      footprint: { kind: 'rect' as const, width: 0.59, depth: 5.12 },
    };
    expect(wallChain(upright, [0]).map((member) => member.rotation)).toEqual([90, 90]);
  });

  it('centres the chain on its own origin', () => {
    const xs = wallChain(stoneWall, [0, 0]).map((member) => member.offset.x);
    expect(xs[0]).toBeCloseTo(-(xs[2] ?? 0));
  });
});

describe('drawChainTurns', () => {
  it('draws one turn per joint', () => {
    expect(drawChainTurns(3, createRandom(1))).toHaveLength(2);
    expect(drawChainTurns(1, createRandom(1))).toEqual([]);
  });
});

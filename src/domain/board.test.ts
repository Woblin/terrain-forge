import { describe, expect, it } from 'vitest';
import {
  boardCentre,
  longEdgeDeployment,
  mirrorPoint,
  oppositeCornersDeployment,
  shortEdgeDeployment,
  standardDeployments,
} from './board';
import { containsPoint, polygonArea, polygonBounds, signedArea } from './geometry';

const board = { width: 60, depth: 44 };

describe('mirrorPoint', () => {
  it('reflects through the board centre', () => {
    expect(mirrorPoint({ x: 10, y: 4 }, board)).toEqual({ x: 50, y: 40 });
    expect(mirrorPoint(boardCentre(board), board)).toEqual(boardCentre(board));
  });
});

describe('deployments', () => {
  it('puts long-edge zones along the long edges', () => {
    const { zones } = longEdgeDeployment(board, 12);
    expect(polygonBounds(zones.A)).toEqual({ minX: 0, minY: 0, maxX: 60, maxY: 12 });
    expect(polygonBounds(zones.B)).toEqual({ minX: 0, minY: 32, maxX: 60, maxY: 44 });
  });

  it('puts short-edge zones along the short edges', () => {
    const { zones } = shortEdgeDeployment(board, 12);
    expect(polygonBounds(zones.A)).toEqual({ minX: 0, minY: 0, maxX: 12, maxY: 44 });
    expect(polygonBounds(zones.B)).toEqual({ minX: 48, minY: 0, maxX: 60, maxY: 44 });
  });

  it('follows the long edge on a board that is deeper than wide', () => {
    const { zones } = longEdgeDeployment({ width: 44, depth: 60 }, 12);
    expect(polygonBounds(zones.A)).toEqual({ minX: 0, minY: 0, maxX: 12, maxY: 60 });
  });

  it('builds mirrored corner triangles', () => {
    const { zones } = oppositeCornersDeployment(board);
    expect(containsPoint(zones.A, { x: 2, y: 2 })).toBe(true);
    expect(containsPoint(zones.B, { x: 58, y: 42 })).toBe(true);
    expect(polygonArea(zones.A)).toBe(polygonArea(zones.B));
  });

  it('gives every zone counter-clockwise corners and equal areas', () => {
    for (const deployment of standardDeployments(board, 12)) {
      expect(signedArea(deployment.zones.A)).toBeGreaterThan(0);
      expect(signedArea(deployment.zones.B)).toBeGreaterThan(0);
      expect(polygonArea(deployment.zones.A)).toBe(polygonArea(deployment.zones.B));
    }
  });
});

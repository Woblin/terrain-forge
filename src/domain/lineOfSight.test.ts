import { describe, expect, it } from 'vitest';
import { rectangle, type Polygon } from './geometry';
import {
  findLongestClearLane,
  hasLineOfSight,
  isInCover,
  longestClearLane,
  longestGap,
  sightObstacles,
} from './lineOfSight';
import type { CoverValue, LineOfSightEffect, PlacedTerrain } from './terrain';

function terrain(
  polygon: Polygon,
  los: LineOfSightEffect,
  cover: CoverValue = 'none',
): PlacedTerrain {
  return { pieceId: 'piece', polygon, effect: { los, cover } };
}

const wall = terrain(rectangle(9, 0, 11, 10), 'blocks');
const forest = terrain(rectangle(8, 0, 12, 10), 'obscures');
const barricade = terrain(rectangle(9, 0, 11, 10), 'none');

describe('hasLineOfSight', () => {
  it('sees across an empty board', () => {
    expect(hasLineOfSight({ x: 0, y: 5 }, { x: 20, y: 5 }, [])).toBe(true);
  });

  it('is stopped by blocking terrain in the way', () => {
    expect(hasLineOfSight({ x: 0, y: 5 }, { x: 20, y: 5 }, sightObstacles([wall]))).toBe(false);
  });

  it('passes beside blocking terrain', () => {
    expect(hasLineOfSight({ x: 0, y: 12 }, { x: 20, y: 12 }, sightObstacles([wall]))).toBe(true);
  });

  it('is stopped by a line through blocking terrain even from inside it', () => {
    expect(hasLineOfSight({ x: 10, y: 5 }, { x: 20, y: 5 }, sightObstacles([wall]))).toBe(false);
  });

  it('is stopped by a line passing all the way through obscuring terrain', () => {
    expect(hasLineOfSight({ x: 0, y: 5 }, { x: 20, y: 5 }, sightObstacles([forest]))).toBe(false);
  });

  it('sees into and out of obscuring terrain', () => {
    const obstacles = sightObstacles([forest]);
    expect(hasLineOfSight({ x: 10, y: 5 }, { x: 20, y: 5 }, obstacles)).toBe(true);
    expect(hasLineOfSight({ x: 0, y: 5 }, { x: 10, y: 5 }, obstacles)).toBe(true);
  });

  it('ignores terrain that does not affect line of sight', () => {
    expect(hasLineOfSight({ x: 0, y: 5 }, { x: 20, y: 5 }, sightObstacles([barricade]))).toBe(true);
  });
});

describe('isInCover', () => {
  const ruin = terrain(rectangle(0, 0, 4, 4), 'blocks', 'heavy');

  it('counts points inside or within an inch of cover', () => {
    expect(isInCover({ x: 2, y: 2 }, [ruin])).toBe(true);
    expect(isInCover({ x: 5, y: 2 }, [ruin])).toBe(true);
  });

  it('does not count points further away', () => {
    expect(isInCover({ x: 5.5, y: 2 }, [ruin])).toBe(false);
  });

  it('ignores terrain without cover', () => {
    expect(isInCover({ x: 2, y: 2 }, [barricade])).toBe(false);
  });
});

describe('longestGap', () => {
  it('returns the whole span when nothing is stopped', () => {
    expect(longestGap({ start: 0, end: 10 }, [])).toEqual({ start: 0, end: 10 });
  });

  it('finds the longest free part between stopped intervals', () => {
    const stopped = [
      { start: 6, end: 7 },
      { start: 2, end: 3 },
    ];
    expect(longestGap({ start: 0, end: 10 }, stopped)).toEqual({ start: 3, end: 6 });
  });

  it('handles overlapping and out-of-span intervals', () => {
    const stopped = [
      { start: -5, end: 4 },
      { start: 3, end: 5 },
      { start: 12, end: 20 },
    ];
    expect(longestGap({ start: 0, end: 10 }, stopped)).toEqual({ start: 5, end: 10 });
  });
});

describe('longestClearLane', () => {
  const board = rectangle(0, 0, 60, 44);
  const zones = [rectangle(0, 0, 60, 12), rectangle(0, 32, 60, 44)];

  it('runs corner to corner across an empty midfield', () => {
    // The true diagonal of the 60 x 20 midfield is 63.2"; the 15 degree line comes closest.
    expect(longestClearLane(board, [], zones)).toBeCloseTo(60 / Math.cos(Math.PI / 12));
  });

  it('is cut by a wall across the midfield', () => {
    const centreWall = terrain(rectangle(29, 12, 31, 32), 'blocks');
    // What is left is the diagonal of one 29 x 20 half, 35.2" at most.
    expect(longestClearLane(board, sightObstacles([centreWall]), zones)).toBeLessThan(35.3);
  });

  it('says where the lane runs', () => {
    const lane = findLongestClearLane(board, [], zones);
    expect(lane?.from.y).toBeGreaterThanOrEqual(12);
    expect(lane?.to.y).toBeLessThanOrEqual(32);
    expect(lane?.length).toBeCloseTo(longestClearLane(board, [], zones));
  });

  it('is not cut by terrain that does not affect line of sight', () => {
    const lowWall = terrain(rectangle(29, 12, 31, 32), 'none');
    expect(longestClearLane(board, sightObstacles([lowWall]), zones)).toBeGreaterThan(60);
  });
});

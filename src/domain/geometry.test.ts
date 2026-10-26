import { describe, expect, it } from 'vitest';
import {
  centroid,
  clipLine,
  clipSegment,
  clipToHalfPlane,
  containsPoint,
  containsPolygon,
  counterClockwise,
  distanceToPolygon,
  gridPoints,
  placePolygon,
  pointsAlong,
  polygonArea,
  polygonBounds,
  polygonDistance,
  polygonsOverlap,
  rectangle,
  rotate,
  segmentDistance,
  signedArea,
} from './geometry';

const square = rectangle(0, 0, 4, 4);

describe('rotate', () => {
  it('turns counter-clockwise', () => {
    const p = rotate({ x: 1, y: 0 }, 90);
    expect(p.x).toBeCloseTo(0);
    expect(p.y).toBeCloseTo(1);
  });
});

describe('placePolygon', () => {
  it('rotates around the origin, then moves', () => {
    const placed = placePolygon(rectangle(-2, -1, 2, 1), { x: 10, y: 5 }, 90);
    const bounds = polygonBounds(placed);
    expect(bounds.minX).toBeCloseTo(9);
    expect(bounds.maxX).toBeCloseTo(11);
    expect(bounds.minY).toBeCloseTo(3);
    expect(bounds.maxY).toBeCloseTo(7);
  });

  it('keeps the corners counter-clockwise', () => {
    expect(signedArea(placePolygon(square, { x: 3, y: 3 }, 180))).toBeGreaterThan(0);
  });
});

describe('area and orientation', () => {
  it('measures a rectangle', () => {
    expect(polygonArea(rectangle(0, 0, 6, 4))).toBe(24);
  });

  it('reverses clockwise polygons', () => {
    const clockwise = [...square].reverse();
    expect(signedArea(counterClockwise(clockwise))).toBeGreaterThan(0);
  });

  it('finds the centroid of a rectangle', () => {
    expect(centroid(rectangle(0, 0, 6, 4))).toEqual({ x: 3, y: 2 });
  });
});

describe('containsPoint', () => {
  it('includes inside and edge points', () => {
    expect(containsPoint(square, { x: 2, y: 2 })).toBe(true);
    expect(containsPoint(square, { x: 4, y: 2 })).toBe(true);
  });

  it('excludes outside points', () => {
    expect(containsPoint(square, { x: 4.1, y: 2 })).toBe(false);
  });

  it('checks whole polygons', () => {
    expect(containsPolygon(square, rectangle(1, 1, 3, 3))).toBe(true);
    expect(containsPolygon(square, rectangle(1, 1, 5, 3))).toBe(false);
  });
});

describe('clipLine and clipSegment', () => {
  it('finds where a line crosses a polygon', () => {
    expect(clipLine(square, { x: -2, y: 2 }, { x: 1, y: 0 })).toEqual({ start: 2, end: 6 });
  });

  it('returns null when the line misses', () => {
    expect(clipLine(square, { x: -2, y: 5 }, { x: 1, y: 0 })).toBeNull();
  });

  it('handles lines parallel to an edge', () => {
    expect(clipLine(square, { x: 2, y: -1 }, { x: 0, y: 1 })).toEqual({ start: 1, end: 5 });
  });

  it('limits a segment to [0, 1]', () => {
    expect(clipSegment(square, { x: 2, y: 2 }, { x: 10, y: 2 })).toEqual({ start: 0, end: 0.25 });
    expect(clipSegment(square, { x: 5, y: 2 }, { x: 10, y: 2 })).toBeNull();
  });
});

describe('distances', () => {
  it('is zero inside a polygon', () => {
    expect(distanceToPolygon({ x: 1, y: 1 }, square)).toBe(0);
  });

  it('measures from a point to the nearest edge', () => {
    expect(distanceToPolygon({ x: 7, y: 2 }, square)).toBe(3);
  });

  it('measures between segments', () => {
    expect(segmentDistance({ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 2, y: 3 }, { x: 2, y: 9 })).toBe(3);
    expect(segmentDistance({ x: 0, y: 0 }, { x: 4, y: 4 }, { x: 0, y: 4 }, { x: 4, y: 0 })).toBe(0);
  });

  it('measures the gap between polygons', () => {
    expect(polygonDistance(square, rectangle(7, 0, 9, 4))).toBe(3);
    expect(polygonDistance(square, rectangle(3, 3, 9, 9))).toBe(0);
  });
});

describe('polygonsOverlap', () => {
  it('detects overlap', () => {
    expect(polygonsOverlap(square, rectangle(3, 3, 6, 6))).toBe(true);
  });

  it('does not count touching edges', () => {
    expect(polygonsOverlap(square, rectangle(4, 0, 8, 4))).toBe(false);
  });

  it('finds the gap between a rotated piece and a square', () => {
    const diamond = placePolygon(rectangle(-1, -1, 1, 1), { x: 6, y: 6 }, 45);
    expect(polygonsOverlap(square, diamond)).toBe(false);
  });
});

describe('clipToHalfPlane', () => {
  it('keeps the side the normal points to', () => {
    const half = clipToHalfPlane(square, { x: 1, y: 0 }, { x: 1, y: 0 });
    expect(polygonArea(half)).toBeCloseTo(12);
  });

  it('returns nothing when the polygon is on the other side', () => {
    expect(clipToHalfPlane(square, { x: 5, y: 0 }, { x: 1, y: 0 })).toEqual([]);
  });
});

describe('sampling', () => {
  it('fills a polygon with a grid', () => {
    expect(gridPoints(rectangle(0, 0, 6, 3), 3)).toEqual([
      { x: 1.5, y: 1.5 },
      { x: 4.5, y: 1.5 },
    ]);
  });

  it('walks along a segment', () => {
    expect(pointsAlong({ x: 0, y: 0 }, { x: 3, y: 0 }, 1)).toHaveLength(4);
  });
});

import { describe, expect, it } from 'vitest';
import { polygonArea, polygonBounds, signedArea } from './geometry';
import { footprintArea, footprintPolygon, placeFootprint } from './terrain';

describe('footprintPolygon', () => {
  it('centres a rectangle on the origin', () => {
    expect(polygonBounds(footprintPolygon({ kind: 'rect', width: 6, depth: 4 }))).toEqual({
      minX: -3,
      minY: -2,
      maxX: 3,
      maxY: 2,
    });
  });

  it('turns an ellipse into a counter-clockwise polygon close to its true area', () => {
    const footprint = { kind: 'ellipse', width: 8, depth: 6 } as const;
    const polygon = footprintPolygon(footprint);
    expect(signedArea(polygon)).toBeGreaterThan(0);
    expect(polygonArea(polygon) / footprintArea(footprint)).toBeGreaterThan(0.97);
  });
});

describe('footprintArea', () => {
  it('measures rectangles and ellipses', () => {
    expect(footprintArea({ kind: 'rect', width: 6, depth: 4 })).toBe(24);
    expect(footprintArea({ kind: 'ellipse', width: 2, depth: 2 })).toBeCloseTo(Math.PI);
  });
});

describe('placeFootprint', () => {
  it('moves and rotates the footprint', () => {
    const polygon = placeFootprint(
      { kind: 'rect', width: 6, depth: 2 },
      { pieceId: 'wall', position: { x: 10, y: 10 }, rotation: 90 },
    );
    const bounds = polygonBounds(polygon);
    expect(bounds.minX).toBeCloseTo(9);
    expect(bounds.maxY).toBeCloseTo(13);
  });
});

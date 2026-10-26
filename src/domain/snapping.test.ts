import { describe, expect, it } from 'vitest';
import {
  gridStep,
  normalizeRotation,
  snapRotation,
  snapToEdgeMargin,
  snapToGrid,
} from './snapping';

const board = { width: 60, depth: 44 };

describe('rotation', () => {
  it('normalizes into [0, 360)', () => {
    expect(normalizeRotation(-15)).toBe(345);
    expect(normalizeRotation(720)).toBe(0);
  });

  it('snaps to 15 degree steps', () => {
    expect(snapRotation(22)).toBe(15);
    expect(snapRotation(23)).toBe(30);
    expect(snapRotation(-7)).toBe(0);
    expect(snapRotation(-8)).toBe(345);
    expect(snapRotation(358)).toBe(0);
  });
});

describe('grid', () => {
  it('uses half an inch, or one centimetre in inches', () => {
    expect(gridStep('in')).toBe(0.5);
    expect(gridStep('cm')).toBeCloseTo(1 / 2.54);
  });

  it('rounds both coordinates to the step', () => {
    expect(snapToGrid({ x: 10.2, y: 7.8 }, 0.5)).toEqual({ x: 10, y: 8 });
  });
});

describe('snapToEdgeMargin', () => {
  it('pulls a piece onto the margin when close', () => {
    const bounds = { minX: 1.3, minY: 10, maxX: 7.3, maxY: 14 };
    expect(snapToEdgeMargin({ x: 4.3, y: 12 }, bounds, board, 1)).toEqual({ x: 4, y: 12 });
  });

  it('works on the far edges too', () => {
    const bounds = { minX: 30, minY: 38.8, maxX: 36, maxY: 42.8 };
    const snapped = snapToEdgeMargin({ x: 33, y: 40.8 }, bounds, board, 1);
    expect(snapped.x).toBe(33);
    expect(snapped.y).toBeCloseTo(41);
  });

  it('leaves a piece alone when it is far from the margin', () => {
    const bounds = { minX: 5, minY: 10, maxX: 11, maxY: 14 };
    expect(snapToEdgeMargin({ x: 8, y: 12 }, bounds, board, 1)).toEqual({ x: 8, y: 12 });
  });
});

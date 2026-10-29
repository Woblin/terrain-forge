import { describe, expect, it } from 'vitest';
import {
  brushRadius,
  clampBrushShare,
  framePointToMask,
  maskIsEmpty,
  MAX_BRUSH_SHARE,
  MAX_MASK_UNDO,
  MIN_BRUSH_SHARE,
  rememberMask,
  undoMask,
} from './photoMask';

describe('brushRadius', () => {
  it('is half the share of the long side', () => {
    expect(brushRadius(0.1, { width: 384, height: 192 })).toBeCloseTo(19.2);
    expect(brushRadius(0.1, { width: 192, height: 384 })).toBeCloseTo(19.2);
  });

  it('keeps the share within the brush sizes', () => {
    expect(clampBrushShare(0)).toBe(MIN_BRUSH_SHARE);
    expect(clampBrushShare(5)).toBe(MAX_BRUSH_SHARE);
    expect(brushRadius(5, { width: 100, height: 100 })).toBeCloseTo(MAX_BRUSH_SHARE * 50);
  });
});

describe('framePointToMask', () => {
  it('scales a point on screen to the mask pixels', () => {
    expect(
      framePointToMask({ x: 120, y: 30 }, { width: 240, height: 120 }, { width: 384, height: 192 }),
    ).toEqual({ x: 192, y: 48 });
  });

  it('gives the corner while the frame has no size yet', () => {
    expect(
      framePointToMask({ x: 5, y: 5 }, { width: 0, height: 0 }, { width: 384, height: 192 }),
    ).toEqual({ x: 0, y: 0 });
  });
});

describe('mask history', () => {
  it('undoes the most recent change first', () => {
    const history = rememberMask(rememberMask([], 'a'), 'b');
    const first = undoMask(history);
    expect(first?.state).toBe('b');
    expect(undoMask(first?.history ?? [])?.state).toBe('a');
  });

  it('has nothing to undo when empty', () => {
    expect(undoMask([])).toBeNull();
  });

  it('forgets the oldest change past the limit', () => {
    let history: readonly number[] = [];
    for (let step = 0; step < MAX_MASK_UNDO + 5; step++) {
      history = rememberMask(history, step);
    }
    expect(history).toHaveLength(MAX_MASK_UNDO);
    expect(history[0]).toBe(5);
  });
});

describe('maskIsEmpty', () => {
  it('is empty when every alpha value is 0', () => {
    expect(maskIsEmpty([0, 0, 0, 0, 255, 255, 255, 0])).toBe(true);
  });

  it('is not empty when any pixel hides the photo', () => {
    expect(maskIsEmpty([0, 0, 0, 0, 0, 0, 0, 1])).toBe(false);
  });
});

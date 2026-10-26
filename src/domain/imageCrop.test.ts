import { describe, expect, it } from 'vitest';
import {
  cropRegion,
  footprintRatio,
  initialCrop,
  MAX_CROP_ZOOM,
  outputSize,
  panCrop,
  PHOTO_LONG_SIDE,
  turnCrop,
  turnedSize,
  workingSize,
  zoomCrop,
  type Rect,
  type Size,
} from './imageCrop';

const photo: Size = { width: 4000, height: 3000 };

function inside(region: Rect, size: Size): boolean {
  const e = 1e-9;
  return (
    region.x >= -e &&
    region.y >= -e &&
    region.x + region.width <= size.width + e &&
    region.y + region.height <= size.height + e
  );
}

describe('photo sizes', () => {
  it('gives the frame the footprint ratio', () => {
    expect(footprintRatio({ kind: 'rect', width: 12, depth: 6 })).toBe(2);
  });

  it(`makes the long side ${String(PHOTO_LONG_SIDE)} px`, () => {
    expect(outputSize(2)).toEqual({ width: 384, height: 192 });
    expect(outputSize(0.5)).toEqual({ width: 192, height: 384 });
    expect(outputSize(1)).toEqual({ width: 384, height: 384 });
  });

  it('scales big photos down before cropping but never scales up', () => {
    expect(workingSize({ width: 8064, height: 6048 })).toEqual({ width: 2048, height: 1536 });
    expect(workingSize({ width: 800, height: 600 })).toEqual({ width: 800, height: 600 });
  });

  it('swaps width and height for odd quarter turns', () => {
    expect(turnedSize(photo, 1)).toEqual({ width: 3000, height: 4000 });
    expect(turnedSize(photo, 2)).toEqual(photo);
  });
});

describe('crop frame', () => {
  it('starts with the largest centred area of the frame ratio', () => {
    expect(cropRegion(initialCrop(photo, 2), photo, 2)).toEqual({
      x: 0,
      y: 500,
      width: 4000,
      height: 2000,
    });
    expect(cropRegion(initialCrop(photo, 1), photo, 1)).toEqual({
      x: 500,
      y: 0,
      width: 3000,
      height: 3000,
    });
  });

  it('keeps the frame ratio at every zoom', () => {
    for (const zoom of [1, 1.5, 3, MAX_CROP_ZOOM]) {
      const region = cropRegion(zoomCrop(initialCrop(photo, 2), photo, 2, zoom), photo, 2);
      expect(region.width / region.height).toBeCloseTo(2);
      expect(inside(region, photo)).toBe(true);
    }
  });

  it(`keeps zoom between 1 and ${String(MAX_CROP_ZOOM)}`, () => {
    const view = initialCrop(photo, 2);
    expect(zoomCrop(view, photo, 2, 0.2).zoom).toBe(1);
    expect(zoomCrop(view, photo, 2, 50).zoom).toBe(MAX_CROP_ZOOM);
  });

  it('never pans past the photo edges, so there are no empty edges', () => {
    const zoomed = zoomCrop(initialCrop(photo, 1), photo, 1, 2);
    const panned = panCrop(zoomed, photo, 1, { x: -10000, y: 10000 });
    expect(cropRegion(panned, photo, 1)).toEqual({ x: 0, y: 1500, width: 1500, height: 1500 });
  });

  it('turns a quarter at a time and stays inside the turned photo', () => {
    let view = initialCrop(photo, 2);
    for (const turns of [1, 2, 3, 0]) {
      view = turnCrop(view, photo, 2);
      expect(view.turns).toBe(turns);
      const region = cropRegion(view, photo, 2);
      expect(region.width / region.height).toBeCloseTo(2);
      expect(inside(region, turnedSize(photo, view.turns))).toBe(true);
    }
  });
});

import type { Point } from './geometry';
import type { Footprint } from './terrain';

export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export type QuarterTurns = 0 | 1 | 2 | 3;

/**
 * How a photo sits under the crop frame. `center` is the middle of the cropped area in pixels of
 * the photo after it has been turned `turns` quarter turns clockwise. Zoom 1 shows the largest
 * area with the frame's ratio that fits in the photo.
 */
export interface CropView {
  readonly zoom: number;
  readonly center: Point;
  readonly turns: QuarterTurns;
}

/** Saved photos are this many pixels on their long side. */
export const PHOTO_LONG_SIDE = 384;
/** A saved photo may be at most this many bytes. */
export const PHOTO_MAX_BYTES = 150 * 1024;
/** Encoding qualities tried in order until the photo fits in `PHOTO_MAX_BYTES`. */
export const PHOTO_QUALITIES: readonly number[] = [0.8, 0.7, 0.6, 0.5];
/** Photos are scaled down to this long side before cropping, to keep canvases small. */
export const WORKING_LONG_SIDE = 2048;
export const MAX_CROP_ZOOM = 6;

/** Width divided by depth: the shape the crop frame must have. */
export function footprintRatio(footprint: Footprint): number {
  return footprint.width / footprint.depth;
}

/** The pixel size of the saved photo for a frame ratio. */
export function outputSize(ratio: number): Size {
  return ratio >= 1
    ? { width: PHOTO_LONG_SIDE, height: Math.max(1, Math.round(PHOTO_LONG_SIDE / ratio)) }
    : { width: Math.max(1, Math.round(PHOTO_LONG_SIDE * ratio)), height: PHOTO_LONG_SIDE };
}

/** The size to scale a photo down to before cropping; small photos keep their size. */
export function workingSize(image: Size): Size {
  const scale = Math.min(1, WORKING_LONG_SIDE / Math.max(image.width, image.height));
  return {
    width: Math.max(1, Math.round(image.width * scale)),
    height: Math.max(1, Math.round(image.height * scale)),
  };
}

export function turnedSize(image: Size, turns: QuarterTurns): Size {
  return turns % 2 === 0 ? image : { width: image.height, height: image.width };
}

/** Zoom 1, centred, not turned. */
export function initialCrop(image: Size, ratio: number): CropView {
  return clampCrop({ zoom: 1, center: middle(image), turns: 0 }, image, ratio);
}

/** The area of the turned photo that the frame shows, in its pixels. */
export function cropRegion(view: CropView, image: Size, ratio: number): Rect {
  const clamped = clampCrop(view, image, ratio);
  const size = regionSize(clamped, image, ratio);
  return {
    x: clamped.center.x - size.width / 2,
    y: clamped.center.y - size.height / 2,
    width: size.width,
    height: size.height,
  };
}

/** Moves the cropped area by `delta` pixels of the turned photo, never past its edges. */
export function panCrop(view: CropView, image: Size, ratio: number, delta: Point): CropView {
  const center = { x: view.center.x + delta.x, y: view.center.y + delta.y };
  return clampCrop({ ...view, center }, image, ratio);
}

export function zoomCrop(view: CropView, image: Size, ratio: number, zoom: number): CropView {
  return clampCrop({ ...view, zoom }, image, ratio);
}

/** A quarter turn clockwise, keeping the zoom and starting again from the middle. */
export function turnCrop(view: CropView, image: Size, ratio: number): CropView {
  const turns = ((view.turns + 1) % 4) as QuarterTurns;
  return clampCrop(
    { zoom: view.zoom, center: middle(turnedSize(image, turns)), turns },
    image,
    ratio,
  );
}

/** Keeps the zoom in range and the cropped area inside the photo, so it has no empty edges. */
export function clampCrop(view: CropView, image: Size, ratio: number): CropView {
  const zoom = Math.min(MAX_CROP_ZOOM, Math.max(1, view.zoom));
  const turned = turnedSize(image, view.turns);
  const size = regionSize({ ...view, zoom }, image, ratio);
  return {
    zoom,
    turns: view.turns,
    center: {
      x: clamp(view.center.x, size.width / 2, turned.width - size.width / 2),
      y: clamp(view.center.y, size.height / 2, turned.height - size.height / 2),
    },
  };
}

function regionSize(view: CropView, image: Size, ratio: number): Size {
  const turned = turnedSize(image, view.turns);
  const base =
    turned.width / turned.height > ratio
      ? { width: turned.height * ratio, height: turned.height }
      : { width: turned.width, height: turned.width / ratio };
  return { width: base.width / view.zoom, height: base.height / view.zoom };
}

function middle(size: Size): Point {
  return { x: size.width / 2, y: size.height / 2 };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

import type { Point } from './geometry';
import type { Size } from './imageCrop';

/** Painting hides the photo where the brush goes; the other tool shows it again. */
export type MaskTool = 'hide' | 'show';

/** Brush sizes are a share of the photo's long side, so they look the same on any screen. */
export const MIN_BRUSH_SHARE = 0.02;
export const MAX_BRUSH_SHARE = 0.3;
export const DEFAULT_BRUSH_SHARE = 0.08;
/** How many strokes the player can undo. */
export const MAX_MASK_UNDO = 20;

/** The brush radius in pixels of the mask. */
export function brushRadius(share: number, mask: Size): number {
  return (clampBrushShare(share) * Math.max(mask.width, mask.height)) / 2;
}

export function clampBrushShare(share: number): number {
  return Math.min(MAX_BRUSH_SHARE, Math.max(MIN_BRUSH_SHARE, share));
}

/** Maps a point on the frame shown on screen to the same spot in the mask's pixels. */
export function framePointToMask(point: Point, frame: Size, mask: Size): Point {
  if (frame.width <= 0 || frame.height <= 0) {
    return { x: 0, y: 0 };
  }
  return {
    x: (point.x / frame.width) * mask.width,
    y: (point.y / frame.height) * mask.height,
  };
}

/** The mask states the player can step back to, the most recent last. */
export type MaskHistory<T> = readonly T[];

/** Remembers the mask as it was before a change, forgetting the oldest beyond the limit. */
export function rememberMask<T>(history: MaskHistory<T>, before: T): MaskHistory<T> {
  return [...history, before].slice(-MAX_MASK_UNDO);
}

/** The state to go back to and the history without it, or null when there is nothing to undo. */
export function undoMask<T>(
  history: MaskHistory<T>,
): { readonly state: T; readonly history: MaskHistory<T> } | null {
  const state = history.at(-1);
  return state === undefined ? null : { state, history: history.slice(0, -1) };
}

/** True when no pixel of the mask hides anything: every alpha value is 0. */
export function maskIsEmpty(rgba: ArrayLike<number>): boolean {
  for (let index = 3; index < rgba.length; index += 4) {
    if (rgba[index] !== 0) {
      return false;
    }
  }
  return true;
}

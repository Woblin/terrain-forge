import type { Board } from './board';
import type { Point } from './geometry';

/** A size on screen, in CSS pixels. */
export interface ScreenSize {
  readonly width: number;
  readonly height: number;
}

/**
 * Whether the board is drawn turned a quarter, so that its long side runs down a space that is
 * taller than wide, as on a phone held upright. Only the drawing turns; the board keeps its
 * coordinates.
 */
export function drawsUpright(board: Board, space: ScreenSize): boolean {
  return space.height > space.width && board.width > board.depth;
}

/** The largest size the board can be drawn at inside the space, keeping its proportions. */
export function fitBoard(board: Board, space: ScreenSize, upright: boolean): ScreenSize {
  const across = upright ? board.depth : board.width;
  const down = upright ? board.width : board.depth;
  const scale = Math.min(space.width / across, space.height / down);
  if (!Number.isFinite(scale) || scale <= 0) {
    return { width: 0, height: 0 };
  }
  return { width: across * scale, height: down * scale };
}

/**
 * The SVG transform that draws the board upright: board point (x, y) lands at (y, width - x),
 * so player A's long edge is on the left.
 */
export function uprightTransform(board: Board): string {
  return `translate(0 ${String(board.width)}) rotate(-90)`;
}

/** A move on screen, such as an arrow key, as the same move on the board. */
export function screenMoveToBoard(move: Point, upright: boolean): Point {
  return upright ? { x: -move.y, y: move.x } : move;
}

/** How many inches of board one CSS pixel covers when the board is drawn at this size. */
export function inchesPerPixel(board: Board, drawn: ScreenSize, upright: boolean): number | null {
  const across = upright ? board.depth : board.width;
  return drawn.width > 0 ? across / drawn.width : null;
}

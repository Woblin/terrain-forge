import { describe, expect, it } from 'vitest';
import type { Board } from './board';
import {
  drawsUpright,
  fitBoard,
  inchesPerPixel,
  screenMoveToBoard,
  uprightTransform,
} from './boardFit';

const BOARD: Board = { width: 72, depth: 48 };

describe('drawsUpright', () => {
  it('turns a wide board in a tall space', () => {
    expect(drawsUpright(BOARD, { width: 366, height: 600 })).toBe(true);
  });

  it('keeps a wide board as it is in a wide space', () => {
    expect(drawsUpright(BOARD, { width: 1156, height: 900 })).toBe(false);
  });

  it('keeps a square board as it is', () => {
    expect(drawsUpright({ width: 44, depth: 44 }, { width: 366, height: 600 })).toBe(false);
  });
});

describe('fitBoard', () => {
  it('fills the width when the space is wider in proportion than the board', () => {
    expect(fitBoard(BOARD, { width: 720, height: 1000 }, false)).toEqual({
      width: 720,
      height: 480,
    });
  });

  it('fills the height when the space is flatter than the board', () => {
    expect(fitBoard(BOARD, { width: 2000, height: 480 }, false)).toEqual({
      width: 720,
      height: 480,
    });
  });

  it('swaps the sides of an upright board', () => {
    expect(fitBoard(BOARD, { width: 360, height: 1000 }, true)).toEqual({
      width: 360,
      height: 540,
    });
  });

  it('is empty before the space is measured', () => {
    expect(fitBoard(BOARD, { width: 0, height: 0 }, false)).toEqual({ width: 0, height: 0 });
  });
});

describe('uprightTransform', () => {
  it('moves the turned board back into view by its width', () => {
    expect(uprightTransform(BOARD)).toBe('translate(0 72) rotate(-90)');
  });
});

describe('screenMoveToBoard', () => {
  it('passes moves through on a board that is not turned', () => {
    expect(screenMoveToBoard({ x: 0.5, y: 0 }, false)).toEqual({ x: 0.5, y: 0 });
  });

  it('turns screen moves into board moves on an upright board', () => {
    // Screen right runs along the board's depth; screen up runs along its width.
    expect(screenMoveToBoard({ x: 0.5, y: 0.1 }, true)).toEqual({ x: -0.1, y: 0.5 });
    expect(screenMoveToBoard({ x: 0.1, y: -0.5 }, true)).toEqual({ x: 0.5, y: 0.1 });
  });
});

describe('inchesPerPixel', () => {
  it('divides the board width by the drawn width', () => {
    expect(inchesPerPixel(BOARD, { width: 720, height: 480 }, false)).toBe(0.1);
  });

  it('uses the board depth across an upright board', () => {
    expect(inchesPerPixel(BOARD, { width: 480, height: 720 }, true)).toBe(0.1);
  });

  it('is unknown before the board is drawn', () => {
    expect(inchesPerPixel(BOARD, { width: 0, height: 0 }, false)).toBeNull();
  });
});

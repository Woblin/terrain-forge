import { describe, expect, it } from 'vitest';
import type { BoardPiece } from './editor';
import { placingOrder, stepPiece } from './placingOrder';

function piece(key: string, x: number, y: number): BoardPiece {
  return { key, placement: { pieceId: key, position: { x, y }, rotation: 0 } };
}

describe('placingOrder', () => {
  it('goes across the board from the left, top first where pieces stand level', () => {
    const pieces = [piece('c', 40, 10), piece('a', 5, 30), piece('b', 20, 30), piece('d', 20, 4)];
    expect(placingOrder(pieces)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('is empty for an empty board', () => {
    expect(placingOrder([])).toEqual([]);
  });
});

describe('stepPiece', () => {
  const order = ['a', 'b', 'c'];

  it('moves on and back', () => {
    expect(stepPiece(order, 'a', 1)).toBe('b');
    expect(stepPiece(order, 'b', -1)).toBe('a');
  });

  it('goes round at the ends', () => {
    expect(stepPiece(order, 'c', 1)).toBe('a');
    expect(stepPiece(order, 'a', -1)).toBe('c');
  });

  it('starts at the first piece for Next and the last for Previous', () => {
    expect(stepPiece(order, null, 1)).toBe('a');
    expect(stepPiece(order, null, -1)).toBe('c');
    expect(stepPiece(order, 'gone', 1)).toBe('a');
  });

  it('has nothing to step to on an empty board', () => {
    expect(stepPiece([], null, 1)).toBeNull();
  });
});

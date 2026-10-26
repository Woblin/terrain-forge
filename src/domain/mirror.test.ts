import { describe, expect, it } from 'vitest';
import type { BoardPiece } from './editor';
import { findMirrorTwin, mirroredPlacement, withTwin } from './mirror';

const board = { width: 60, depth: 44 };

function piece(key: string, x: number, y: number, rotation: number): BoardPiece {
  return { key, placement: { pieceId: 'ruin', position: { x, y }, rotation } };
}

describe('mirror twins', () => {
  const pieces = [piece('a', 10, 12, 30), piece('b', 50, 32, 210), piece('c', 30, 22, 0)];

  it('mirrors through the centre and turns half a circle', () => {
    expect(mirroredPlacement({ position: { x: 10, y: 12 }, rotation: 300 }, board)).toEqual({
      position: { x: 50, y: 32 },
      rotation: 120,
    });
  });

  it('finds the twin both ways and none for a centre piece', () => {
    expect(findMirrorTwin(pieces, 'a', board)?.key).toBe('b');
    expect(findMirrorTwin(pieces, 'b', board)?.key).toBe('a');
    expect(findMirrorTwin(pieces, 'c', board)).toBeUndefined();
  });

  it('treats angles half a turn apart as the same footprint', () => {
    const twins = [piece('a', 10, 12, 30), piece('b', 50, 32, 30)];
    expect(findMirrorTwin(twins, 'a', board)?.key).toBe('b');
  });

  it('ignores pieces that are not mirrored', () => {
    const others = [piece('a', 10, 12, 30), piece('b', 49, 32, 210), piece('c', 50, 32, 240)];
    expect(findMirrorTwin(others, 'a', board)).toBeUndefined();
  });

  it('moves the twin along with the piece', () => {
    const update = { key: 'a', position: { x: 12, y: 10 }, rotation: 45 };
    expect(withTwin(update, pieces[1], board)).toEqual([
      update,
      { key: 'b', position: { x: 48, y: 34 }, rotation: 225 },
    ]);
    expect(withTwin(update, undefined, board)).toEqual([update]);
  });
});

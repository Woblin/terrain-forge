import { describe, expect, it } from 'vitest';
import { findMat, MAT_IDS, matBackgroundSize, matIdOf, MATS } from './mats';

const board = { width: 60, depth: 44 };

describe('findMat', () => {
  it('finds every mat by its id', () => {
    for (const id of MAT_IDS) {
      expect(findMat(id).id).toBe(id);
    }
  });

  it('falls back to the plain board for an unknown or missing id', () => {
    expect(findMat('moon-dust').id).toBe('plain');
    expect(findMat(null).id).toBe('plain');
    expect(findMat(undefined).id).toBe('plain');
  });
});

describe('matIdOf', () => {
  it('keeps known ids and turns anything else into plain', () => {
    expect(matIdOf('lava')).toBe('lava');
    expect(matIdOf('LAVA')).toBe('plain');
    expect(matIdOf(3)).toBe('plain');
  });
});

describe('MATS', () => {
  it('lists each id once, with a tone between 0 and 1', () => {
    expect(MATS.map((mat) => mat.id)).toEqual([...MAT_IDS]);
    for (const mat of MATS) {
      expect(mat.tone).toBeGreaterThanOrEqual(0);
      expect(mat.tone).toBeLessThan(1);
    }
  });
});

describe('matBackgroundSize', () => {
  const square = { id: 'grass', name: 'Grass', tileWidth: 15, aspect: 1, tone: 0 } as const;

  it('has no background for the plain board', () => {
    expect(matBackgroundSize(findMat('plain'), board, false)).toBeNull();
  });

  it('sizes one repeat as a share of the board', () => {
    expect(matBackgroundSize(square, board, false)).toBe('25% 34.09%');
  });

  it('swaps the sides for a board drawn upright', () => {
    expect(matBackgroundSize(square, board, true)).toBe('34.09% 25%');
  });

  it('keeps the picture in proportion', () => {
    const wide = { ...square, tileWidth: 30, aspect: 1.5 };
    expect(matBackgroundSize(wide, board, false)).toBe('50% 45.45%');
  });
});

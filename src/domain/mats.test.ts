import { describe, expect, it } from 'vitest';
import {
  findMat,
  MAT_DARKNESS_RANGE,
  MAT_IDS,
  matBackgroundSize,
  matDarknessOf,
  matIdOf,
  MATS,
  matToneAt,
} from './mats';

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

describe('matToneAt', () => {
  const snow = findMat('snow');
  const { min, max, standard } = MAT_DARKNESS_RANGE;

  it("draws the picture as it is at the light end and the mat's own tone at the standard", () => {
    expect(matToneAt(snow, min)).toBe(0);
    expect(matToneAt(snow, standard)).toBeCloseTo(snow.tone);
  });

  it('darkens every mat further towards the dark end, without turning it black', () => {
    for (const mat of MATS.filter((each) => each.tileWidth !== null)) {
      const darkest = matToneAt(mat, max);
      expect(darkest).toBeGreaterThan(mat.tone);
      expect(darkest).toBeLessThan(1);
      expect(matToneAt(mat, (standard + max) / 2)).toBeGreaterThan(mat.tone);
    }
  });

  it('grows with the darkness and stays inside the range', () => {
    expect(matToneAt(snow, 20)).toBeLessThan(matToneAt(snow, 30));
    expect(matToneAt(snow, -10)).toBe(0);
    expect(matToneAt(snow, 500)).toBe(matToneAt(snow, max));
  });
});

describe('matDarknessOf', () => {
  it('keeps a darkness in the range and turns anything else into the standard', () => {
    expect(matDarknessOf(20)).toBe(20);
    expect(matDarknessOf(0)).toBe(0);
    expect(matDarknessOf(101)).toBe(MAT_DARKNESS_RANGE.standard);
    expect(matDarknessOf('20')).toBe(MAT_DARKNESS_RANGE.standard);
    expect(matDarknessOf(Number.NaN)).toBe(MAT_DARKNESS_RANGE.standard);
  });
});

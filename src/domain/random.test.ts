import { describe, expect, it } from 'vitest';
import {
  codeToSeed,
  createRandom,
  pick,
  randomBetween,
  randomInt,
  seedToCode,
  shuffle,
} from './random';

function take(count: number, seed: number): number[] {
  const random = createRandom(seed);
  return Array.from({ length: count }, () => random());
}

describe('createRandom', () => {
  it('gives the same sequence for the same seed', () => {
    expect(take(10, 42)).toEqual(take(10, 42));
  });

  it('gives different sequences for different seeds', () => {
    expect(take(10, 1)).not.toEqual(take(10, 2));
  });

  it('returns numbers in [0, 1)', () => {
    for (const value of take(1000, 7)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('randomBetween', () => {
  it('stays inside the range', () => {
    const random = createRandom(3);
    for (let i = 0; i < 1000; i++) {
      const value = randomBetween(random, -2, 5);
      expect(value).toBeGreaterThanOrEqual(-2);
      expect(value).toBeLessThan(5);
    }
  });
});

describe('randomInt', () => {
  it('returns every integer in the range, ends included', () => {
    const random = createRandom(4);
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i++) {
      seen.add(randomInt(random, 1, 6));
    }
    expect([...seen].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe('pick', () => {
  it('returns an item from the list', () => {
    expect(['a', 'b', 'c']).toContain(pick(createRandom(5), ['a', 'b', 'c']));
  });

  it('throws on an empty list', () => {
    expect(() => pick(createRandom(5), [])).toThrow();
  });
});

describe('shuffle', () => {
  it('keeps the same items and leaves the input unchanged', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const result = shuffle(createRandom(6), input);
    expect([...result].sort()).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('is reproducible for the same seed', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    expect(shuffle(createRandom(9), input)).toEqual(shuffle(createRandom(9), input));
  });
});

describe('seed codes', () => {
  it('round-trips a seed', () => {
    for (const seed of [0, 1, 123456, 0xffffffff]) {
      expect(codeToSeed(seedToCode(seed))).toBe(seed);
    }
  });

  it('pads codes to seven characters', () => {
    expect(seedToCode(1)).toBe('0000001');
  });

  it('accepts lower case and surrounding spaces', () => {
    expect(codeToSeed(' 00k7qf2 ')).toBe(codeToSeed('00K7QF2'));
  });

  it('rejects invalid codes', () => {
    expect(codeToSeed('')).toBeNull();
    expect(codeToSeed('ABC-123')).toBeNull();
    expect(codeToSeed('ZZZZZZZ')).toBeNull();
  });
});

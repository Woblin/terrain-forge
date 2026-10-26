import { describe, expect, it } from 'vitest';
import { createRandom } from './random';

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

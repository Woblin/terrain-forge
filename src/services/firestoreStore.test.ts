import { describe, expect, it } from 'vitest';
import { chunks, partitionParsed } from './firestoreStore';

describe('chunks', () => {
  it.each([
    [0, []],
    [1, [1]],
    [500, [500]],
    [501, [500, 1]],
    [1200, [500, 500, 200]],
  ])('splits %i items into batches of %j', (count, sizes) => {
    const items = Array.from({ length: count }, (_, i) => i);
    const parts = chunks(items, 500);
    expect(parts.map((part) => part.length)).toEqual(sizes);
    expect(parts.flat()).toEqual(items);
  });
});

describe('partitionParsed', () => {
  it('keeps the values in order and collects the problems', () => {
    expect(
      partitionParsed([
        { ok: true, value: 'a' },
        { ok: false, problem: 'b is broken' },
        { ok: true, value: 'c' },
      ]),
    ).toEqual({ values: ['a', 'c'], problems: ['b is broken'] });
  });
});

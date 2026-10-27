import { describe, expect, it } from 'vitest';
import { LIBRARY_LIMITS, type LibraryPiece } from './library';
import { planMove } from './libraryMerge';

const ruin: LibraryPiece = {
  id: 'a',
  name: 'Large ruin',
  type: 'ruin',
  footprint: { kind: 'rect', width: 12, depth: 6 },
  quantity: 4,
  image: null,
};

const forest: LibraryPiece = {
  id: 'b',
  name: 'Forest',
  type: 'forest',
  footprint: { kind: 'ellipse', width: 9, depth: 7 },
  quantity: 2,
  image: { version: 1, ratio: 9 / 7 },
};

describe('planMove', () => {
  it('moves everything into an empty account', () => {
    expect(planMove([ruin, forest], [])).toEqual({
      move: [ruin, forest],
      alreadySaved: 0,
      noRoom: 0,
    });
  });

  it('leaves out pieces the account already has, whatever their id, case or count', () => {
    const saved = { ...ruin, id: 'x', name: ' large RUIN', quantity: 1 };
    expect(planMove([ruin, forest], [saved])).toEqual({
      move: [forest],
      alreadySaved: 1,
      noRoom: 0,
    });
  });

  it('keeps pieces that differ in type or footprint', () => {
    const taller = { ...ruin, id: 'x', footprint: { ...ruin.footprint, depth: 7 } };
    const hill = { ...ruin, id: 'y', type: 'hill' as const };
    expect(planMove([ruin], [taller, hill]).move).toEqual([ruin]);
  });

  it('stops at the library limits and counts what did not fit', () => {
    const full = Array.from({ length: LIBRARY_LIMITS.maxKinds - 1 }, (_, i) => ({
      ...ruin,
      id: `s${String(i)}`,
      name: `Saved ${String(i)}`,
      quantity: 1,
    }));
    expect(planMove([ruin, forest], full)).toEqual({ move: [ruin], alreadySaved: 0, noRoom: 1 });

    const heavy = [{ ...ruin, id: 'h', name: 'Heavy', quantity: LIBRARY_LIMITS.maxPieces - 3 }];
    const small = { ...forest, quantity: 3 };
    expect(planMove([ruin, small], heavy)).toEqual({ move: [small], alreadySaved: 0, noRoom: 1 });
  });
});

import { describe, expect, it } from 'vitest';
import { expandCollection, unitArea, type PlacementUnit } from './placement';
import { buildUnits, orderForTarget } from './placementUnits';
import { findPreset } from './presets';
import { createRandom } from './random';
import { ROBIN_COLLECTION } from './robinCollection';
import { SAMPLE_COLLECTION } from './sampleCollection';

const fantasy = findPreset('warhammer-fantasy');
if (fantasy === undefined) {
  throw new Error('Missing Warhammer Fantasy');
}
const { spacing } = fantasy;

function pieceIds(unit: PlacementUnit): string[] {
  return unit.groups.flatMap((group) => group.map((member) => member.piece.id));
}

describe('buildUnits', () => {
  it('uses every piece exactly once', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const units = buildUnits(expandCollection(ROBIN_COLLECTION), spacing, createRandom(seed));
      const ids = units.flatMap(pieceIds).sort();
      expect(ids).toEqual(
        expandCollection(ROBIN_COLLECTION)
          .map((piece) => piece.id)
          .sort(),
      );
    }
  });

  it('gives each group of a pair a twin of the same kind and size', () => {
    const units = buildUnits(expandCollection(ROBIN_COLLECTION), spacing, createRandom(2));
    for (const unit of units) {
      const [first, second] = unit.groups;
      if (second !== undefined) {
        expect(second.map((member) => member.piece.type)).toEqual(
          first.map((member) => member.piece.type),
        );
      }
    }
  });

  it('joins walls into chains of at most 3, with a mix of lengths over many boards', () => {
    const lengths = new Set<number>();
    for (let seed = 1; seed <= 30; seed++) {
      const units = buildUnits(expandCollection(ROBIN_COLLECTION), spacing, createRandom(seed));
      for (const group of units.flatMap((unit) => unit.groups)) {
        const walls = group.filter((member) => member.piece.type === 'wall').length;
        if (walls > 0) {
          lengths.add(walls);
        }
        expect(walls).toBeLessThanOrEqual(3);
      }
    }
    expect([...lengths].sort()).toEqual([1, 2, 3]);
  });

  it('builds features of an anchor with walls beside it', () => {
    const featured = Array.from({ length: 20 }, (_, i) =>
      buildUnits(expandCollection(ROBIN_COLLECTION), spacing, createRandom(i + 1)),
    )
      .flat()
      .filter((unit) => unit.groups[0].some((member) => member.piece.type !== 'wall'))
      .filter((unit) => unit.groups[0].length > 1);
    expect(featured.length).toBeGreaterThan(0);
    for (const unit of featured) {
      expect(unit.groups[0][0]?.piece.type).toMatch(/building|ruin/);
      expect(unit.parts.length).toBe(2);
    }
  });

  it('orders units largest first', () => {
    const units = buildUnits(expandCollection(SAMPLE_COLLECTION), spacing, createRandom(5));
    const areas = units.map(unitArea);
    expect(areas).toEqual([...areas].sort((a, b) => b - a));
  });
});

describe('orderForTarget', () => {
  it('fills the target with every kind of terrain before adding more of one kind', () => {
    const units = buildUnits(expandCollection(SAMPLE_COLLECTION), spacing, createRandom(5));
    const ordered = orderForTarget(units, 600, createRandom(9));
    let total = 0;
    const kinds = new Set<string>();
    for (const unit of ordered) {
      if (total >= 600) {
        break;
      }
      total += unitArea(unit);
      kinds.add(unit.groups[0][0]?.piece.type ?? '');
    }
    expect(kinds).toEqual(new Set(['building', 'ruin', 'forest']));
    expect(new Set(ordered)).toEqual(new Set(units));
  });
});

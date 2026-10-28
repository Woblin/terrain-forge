import { describe, expect, it } from 'vitest';
import { expandCollection, unitArea, type PlacementUnit } from './placement';
import { soloGroup } from './pieceGroup';
import { buildUnits, claimedRoom, orderForTarget } from './placementUnits';
import { findPreset } from './presets';
import { createRandom } from './random';
import { ROBIN_COLLECTION } from './robinCollection';
import { SAMPLE_COLLECTION } from './sampleCollection';
import type { TerrainPiece } from './terrain';
import { wallChain } from './wallChains';

const fantasy = findPreset('warhammer-fantasy');
if (fantasy === undefined) {
  throw new Error('Missing Warhammer Fantasy');
}
const { spacing } = fantasy;

/** The unit and every smaller unit it can break into. */
function unitsAndParts(unit: PlacementUnit): PlacementUnit[] {
  return [unit, ...unit.parts.flatMap(unitsAndParts)];
}

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

  it('joins walls into chains of 2 or 3, with a mix of lengths over many boards', () => {
    const lengths = new Set<number>();
    for (let seed = 1; seed <= 30; seed++) {
      const units = buildUnits(expandCollection(ROBIN_COLLECTION), spacing, createRandom(seed));
      for (const group of units.flatMap(unitsAndParts).flatMap((unit) => unit.groups)) {
        const walls = group.filter((member) => member.piece.type === 'wall').length;
        if (walls > 0) {
          lengths.add(walls);
        }
      }
    }
    expect([...lengths].sort()).toEqual([2, 3]);
  });

  it('leaves out a wall that would have to stand alone', () => {
    const fiveWalls = ROBIN_COLLECTION.map((piece) =>
      piece.id === 'stone-wall' ? { ...piece, quantity: 5 } : piece,
    );
    const oneWall = ROBIN_COLLECTION.map((piece) =>
      piece.id === 'stone-wall' ? { ...piece, quantity: 1 } : piece,
    );
    const wallsUsed = (collection: readonly TerrainPiece[]): number =>
      buildUnits(expandCollection(collection), spacing, createRandom(7))
        .flatMap(pieceIds)
        .filter((id) => id === 'stone-wall').length;
    expect(wallsUsed(fiveWalls)).toBe(4);
    expect(wallsUsed(oneWall)).toBe(0);
  });

  it('builds features of an anchor with a smaller piece beside it', () => {
    const featured = Array.from({ length: 20 }, (_, i) =>
      buildUnits(expandCollection(SAMPLE_COLLECTION), spacing, createRandom(i + 1)),
    )
      .flat()
      .filter((unit) => new Set(unit.groups[0].map((member) => member.piece.id)).size > 1);
    expect(featured.length).toBeGreaterThan(0);
    for (const unit of featured) {
      expect(unit.groups[0][0]?.piece.type).toMatch(/building|ruin/);
      expect(unit.parts.length).toBe(2);
    }
  });

  it('keeps walls apart from buildings and ruins', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const units = buildUnits(expandCollection(ROBIN_COLLECTION), spacing, createRandom(seed));
      for (const group of units.flatMap((unit) => unit.groups)) {
        const types = new Set(group.map((member) => member.piece.type));
        expect(types.has('wall') && types.size > 1).toBe(false);
      }
    }
  });

  it('orders units by the room they claim, roomiest first', () => {
    const units = buildUnits(expandCollection(SAMPLE_COLLECTION), spacing, createRandom(5));
    const rooms = units.map((unit) => claimedRoom(unit, spacing));
    expect(rooms).toEqual([...rooms].sort((a, b) => b - a));
  });
});

describe('claimedRoom', () => {
  it('counts a long wall chain as more room than a small ruin of larger area', () => {
    const wall = ROBIN_COLLECTION.find((piece) => piece.id === 'stone-wall');
    const ruin = ROBIN_COLLECTION.find((piece) => piece.id === 'ruin-4');
    if (wall === undefined || ruin === undefined) {
      throw new Error('Missing test pieces');
    }
    const chain: PlacementUnit = { groups: [wallChain(wall, [0, 0])], parts: [] };
    const lone: PlacementUnit = { groups: [soloGroup(ruin)], parts: [] };
    expect(unitArea(chain)).toBeLessThan(unitArea(lone));
    expect(claimedRoom(chain, spacing)).toBeGreaterThan(claimedRoom(lone, spacing));
  });
});

describe('orderForTarget', () => {
  it('fills the target with every kind of terrain before adding more of one kind', () => {
    const units = buildUnits(expandCollection(SAMPLE_COLLECTION), spacing, createRandom(5));
    const ordered = orderForTarget(units, 600, spacing, createRandom(9));
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

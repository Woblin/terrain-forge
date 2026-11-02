import { describe, expect, it } from 'vitest';
import { longEdgeDeployment, mirrorPoint, type Board } from './board';
import { containsPolygon, polygonDistance, rectangle } from './geometry';
import {
  canPair,
  expandCollection,
  pairingArea,
  pairPieces,
  placeUnits,
  type PlacementUnit,
} from './placement';
import type { PlacementRules } from './placementRules';
import { soloGroup } from './pieceGroup';
import { createRandom } from './random';
import { footprintArea, type TerrainPiece } from './terrain';

const board: Board = { width: 60, depth: 44 };
const rules: PlacementRules = {
  board,
  deployment: longEdgeDeployment(board, 12),
  edgeMargin: 1,
  spacing: {
    minGap: 3,
    joinGap: 1,
    openTypes: ['hill'],
    openGap: 3,
    edge: null,
    clearZoneBack: null,
  },
};

/** Units of lone pieces, as before chains and features. */
function loneUnits(pieces: readonly TerrainPiece[]): PlacementUnit[] {
  return pairPieces(pieces).map((pairing) =>
    pairing.kind === 'pair'
      ? { groups: [soloGroup(pairing.pieces[0]), soloGroup(pairing.pieces[1])], parts: [] }
      : { groups: [soloGroup(pairing.piece)], parts: [] },
  );
}

function piece(id: string, width: number, depth: number, quantity = 1): TerrainPiece {
  return { id, name: id, type: 'ruin', footprint: { kind: 'rect', width, depth }, quantity };
}

describe('expandCollection', () => {
  it('repeats each piece by its quantity, sorted by id', () => {
    const expanded = expandCollection([piece('b', 6, 4, 2), piece('a', 8, 4, 1)]);
    expect(expanded.map((p) => p.id)).toEqual(['a', 'b', 'b']);
  });

  it('leaves out pieces with no quantity', () => {
    expect(expandCollection([piece('a', 6, 4, 0)])).toEqual([]);
  });
});

describe('canPair', () => {
  it('pairs pieces of the same type and similar size', () => {
    expect(canPair(piece('a', 10, 5), piece('b', 9, 5))).toBe(true);
  });

  it('does not pair pieces whose areas differ by more than 20%', () => {
    expect(canPair(piece('a', 10, 5), piece('b', 7, 5))).toBe(false);
  });

  it('does not pair different types', () => {
    const forest: TerrainPiece = { ...piece('f', 10, 5), type: 'forest' };
    expect(canPair(piece('a', 10, 5), forest)).toBe(false);
  });
});

describe('pairPieces', () => {
  it('pairs what it can and leaves the rest single, largest first', () => {
    const units = pairPieces(expandCollection([piece('small', 4, 4, 3), piece('big', 10, 6, 2)]));
    expect(units.map((unit) => unit.kind)).toEqual(['pair', 'pair', 'single']);
    expect(units[0] && pairingArea(units[0])).toBe(120);
  });
});

describe('placeUnits', () => {
  const collection = [piece('large', 12, 6, 6), piece('small', 8, 5, 6), piece('tower', 6, 6, 1)];
  const units = loneUnits(expandCollection(collection));
  const target = 0.2 * 60 * 44;
  const placed = placeUnits(units, { target, max: 0.3 * 60 * 44 }, rules, createRandom(11));

  it('reaches the target without passing the maximum', () => {
    const area = placed.reduce((sum, p) => sum + footprintArea(p.piece.footprint), 0);
    expect(area).toBeGreaterThanOrEqual(target);
    expect(area).toBeLessThanOrEqual(0.3 * 60 * 44);
  });

  it('keeps every piece on the board and apart from the others', () => {
    const playable = rectangle(1, 1, 59, 43);
    placed.forEach((p, i) => {
      expect(containsPolygon(playable, p.polygon)).toBe(true);
      placed.slice(i + 1).forEach((other) => {
        expect(polygonDistance(p.polygon, other.polygon)).toBeGreaterThanOrEqual(3);
      });
    });
  });

  it('places pairs as mirror images', () => {
    const larges = placed.filter((p) => p.piece.id === 'large');
    for (const p of larges) {
      const mirrored = mirrorPoint(p.placement.position, board);
      const twin = larges.find(
        (other) =>
          Math.abs(other.placement.position.x - mirrored.x) < 1e-9 &&
          Math.abs(other.placement.position.y - mirrored.y) < 1e-9,
      );
      expect(twin?.placement.rotation).toBe((p.placement.rotation + 180) % 360);
    }
  });

  it('is reproducible for the same seed', () => {
    const again = placeUnits(units, { target, max: 0.3 * 60 * 44 }, rules, createRandom(11));
    expect(again.map((p) => p.placement)).toEqual(placed.map((p) => p.placement));
  });

  it('uses the ranker to pick among legal spots', () => {
    const preferLeft = placeUnits(units, { target, max: 0.3 * 60 * 44 }, rules, createRandom(11), {
      spots: 10,
      rank: (candidate) => candidate[0]?.placement.position.x ?? 0,
      goodEnough: () => false,
    });
    const first = preferLeft[0]?.placement.position.x ?? Infinity;
    expect(first).toBeLessThan(placed[0]?.placement.position.x ?? 0);
  });
});

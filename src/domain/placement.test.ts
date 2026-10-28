import { describe, expect, it } from 'vitest';
import { longEdgeDeployment, mirrorPoint, type Board } from './board';
import { containsPolygon, polygonBounds, polygonDistance, rectangle } from './geometry';
import {
  boardViolations,
  canPair,
  expandCollection,
  isLegal,
  pairingArea,
  pairPieces,
  placePiece,
  placeUnits,
  type PlacementRules,
  type PlacementUnit,
} from './placement';
import { soloGroup } from './pieceGroup';
import { createRandom } from './random';
import { footprintArea, placeFootprint, type TerrainPiece } from './terrain';

const board: Board = { width: 60, depth: 44 };
const rules: PlacementRules = {
  board,
  deployment: longEdgeDeployment(board, 12),
  edgeMargin: 1,
  spacing: { minGap: 3, joinGap: 1, openTypes: ['hill'], openGap: 3, edge: null },
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

describe('isLegal', () => {
  function at(x: number, y: number) {
    const ruin = piece('r', 6, 4);
    const placement = { pieceId: 'r', position: { x, y }, rotation: 0 };
    const polygon = placeFootprint(ruin.footprint, placement);
    return { piece: ruin, placement, polygon, bounds: polygonBounds(polygon) };
  }

  it('accepts a piece in open space', () => {
    expect(isLegal([[at(30, 22)]], [], rules)).toBe(true);
  });

  it('rejects a piece inside the edge margin', () => {
    expect(isLegal([[at(3.5, 22)]], [], rules)).toBe(false);
  });

  it('rejects a piece closer than the minimum gap, even one close enough to join', () => {
    expect(isLegal([[at(30, 22)]], [at(38, 22)], rules)).toBe(false);
    expect(isLegal([[at(30, 22)]], [at(36.5, 22)], rules)).toBe(false);
    expect(isLegal([[at(30, 22)]], [at(39, 22)], rules)).toBe(true);
  });

  it('keeps two new groups apart from each other, but not the pieces inside one group', () => {
    expect(isLegal([[at(20, 22)], [at(26.5, 22)]], [], rules)).toBe(false);
    expect(isLegal([[at(20, 22), at(26.5, 22)]], [], rules)).toBe(true);
  });

  it('asks for the larger gap next to terrain that is not open', () => {
    const fantasy = { ...rules, spacing: { ...rules.spacing, minGap: 6, openGap: 4 } };
    const hill = { ...at(40, 22), piece: { ...piece('h', 6, 4), type: 'hill' as const } };
    expect(isLegal([[at(30, 22)]], [at(40, 22)], fantasy)).toBe(false);
    expect(isLegal([[at(30, 22)]], [hill], fantasy)).toBe(true);
  });

  it('lets pieces hug the table edge or leave room along it, when the game asks for that', () => {
    const edged = { ...rules, spacing: { ...rules.spacing, edge: { hug: 2, open: 6 } } };
    expect(isLegal([[at(4.5, 22)]], [], edged)).toBe(true);
    expect(isLegal([[at(7, 22)]], [], edged)).toBe(false);
    expect(isLegal([[at(9, 22)]], [], edged)).toBe(true);
  });

  it('allows only one piece fully inside a deployment zone', () => {
    expect(isLegal([[at(10, 6)]], [], rules)).toBe(true);
    expect(isLegal([[at(10, 6)]], [at(30, 6)], rules)).toBe(false);
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

describe('boardViolations', () => {
  const ruin = piece('ruin', 6, 4, 10);
  const at = (x: number, y: number, rotation = 0) =>
    placePiece(ruin, { pieceId: 'ruin', position: { x, y }, rotation });

  it('agrees with isLegal for a piece added to a legal board, unless it stands joined', () => {
    const random = createRandom(9);
    const placed = [at(20, 22), at(40, 22, 45)];
    expect(boardViolations(placed, rules).flat()).toEqual([]);
    for (let i = 0; i < 300; i++) {
      const candidate = at(random() * 60, random() * 44, Math.floor(random() * 24) * 15);
      const nearest = Math.min(...placed.map((p) => polygonDistance(p.polygon, candidate.polygon)));
      const violations = boardViolations([...placed, candidate], rules);
      if (nearest === 0 || nearest > rules.spacing.joinGap) {
        expect(violations.at(-1)?.length === 0).toBe(isLegal([[candidate]], placed, rules));
      }
    }
  });

  it('names the piece that is too close on both sides', () => {
    const violations = boardViolations([at(20, 22), at(28, 22)], rules);
    expect(violations).toEqual([
      [{ kind: 'tooClose', other: 1, distance: 2, needed: 3 }],
      [{ kind: 'tooClose', other: 0, distance: 2, needed: 3 }],
    ]);
  });

  it('lets pieces stand joined, but not overlap', () => {
    expect(boardViolations([at(20, 22), at(26.5, 22)], rules).flat()).toEqual([]);
    expect(boardViolations([at(20, 22), at(25, 22)], rules)).toEqual([
      [{ kind: 'overlaps', other: 1 }],
      [{ kind: 'overlaps', other: 0 }],
    ]);
  });

  it('flags pieces outside the playable area', () => {
    expect(boardViolations([at(2, 22)], rules)).toEqual([[{ kind: 'offBoard' }]]);
  });

  it('flags every piece in a zone holding too many', () => {
    expect(boardViolations([at(10, 5), at(30, 5), at(30, 22)], rules)).toEqual([
      [{ kind: 'zoneCrowded', player: 'A' }],
      [{ kind: 'zoneCrowded', player: 'A' }],
      [],
    ]);
  });
});

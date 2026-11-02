import { describe, expect, it } from 'vitest';
import { longEdgeDeployment, type Board } from './board';
import { polygonBounds, polygonDistance } from './geometry';
import { placePiece } from './placedPiece';
import { boardViolations, isLegal, type PlacementRules } from './placementRules';
import { PRESETS, type GameSystemPreset } from './presets';
import { createRandom } from './random';
import { placeFootprint, type TerrainPiece } from './terrain';

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

function piece(id: string, width: number, depth: number, quantity = 1): TerrainPiece {
  return { id, name: id, type: 'ruin', footprint: { kind: 'rect', width, depth }, quantity };
}

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

  it('keeps the back of each zone clear, when the game asks for that', () => {
    const clear = { ...rules, spacing: { ...rules.spacing, clearZoneBack: 0.5 } };
    expect(isLegal([[at(30, 4)]], [], clear)).toBe(false);
    expect(isLegal([[at(30, 40)]], [], clear)).toBe(false);
    expect(isLegal([[at(30, 8.5)]], [], clear)).toBe(true);
    expect(isLegal([[at(30, 4)]], [], rules)).toBe(true);
  });

  it('allows only one piece fully inside a deployment zone', () => {
    expect(isLegal([[at(10, 6)]], [], rules)).toBe(true);
    expect(isLegal([[at(10, 6)]], [at(30, 6)], rules)).toBe(false);
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

  it('flags a piece in the clear back of a zone', () => {
    const clear = { ...rules, spacing: { ...rules.spacing, clearZoneBack: 0.5 } };
    expect(boardViolations([at(30, 4), at(30, 22)], clear)).toEqual([
      [{ kind: 'zoneBack', player: 'A' }],
      [],
    ]);
  });

  it('flags every piece in a zone holding too many', () => {
    expect(boardViolations([at(10, 5), at(30, 5), at(30, 22)], rules)).toEqual([
      [{ kind: 'zoneCrowded', player: 'A' }],
      [{ kind: 'zoneCrowded', player: 'A' }],
      [],
    ]);
  });
});

describe('isLegal and boardViolations under each game system', () => {
  const ruin = piece('ruin', 6, 4, 20);
  const hill: TerrainPiece = {
    id: 'hill',
    name: 'hill',
    type: 'hill',
    footprint: { kind: 'ellipse', width: 8, depth: 6 },
    quantity: 20,
  };
  const wall: TerrainPiece = {
    id: 'wall',
    name: 'wall',
    type: 'wall',
    footprint: { kind: 'rect', width: 5, depth: 0.6 },
    quantity: 20,
  };
  const kinds = [ruin, hill, wall] as const;

  function gameRules(gamePreset: GameSystemPreset): PlacementRules {
    const gameBoard = gamePreset.defaultBoard;
    return {
      board: gameBoard,
      deployment: longEdgeDeployment(gameBoard, gamePreset.zoneDepth),
      edgeMargin: gamePreset.edgeMargin,
      spacing: gamePreset.spacing,
    };
  }

  /** The same answer from both, for one new piece on a board that already holds `placed`. */
  function expectAgreement(
    candidate: ReturnType<typeof placePiece>,
    placed: readonly ReturnType<typeof placePiece>[],
    gameRulesUsed: PlacementRules,
  ): boolean {
    const legal = isLegal([[candidate]], placed, gameRulesUsed);
    const violations = boardViolations([...placed, candidate], gameRulesUsed);
    expect(violations.at(-1)?.length === 0).toBe(legal);
    return legal;
  }

  it.each(PRESETS)(
    'agree on random pieces with the rules of $name, unless they stand joined',
    (gamePreset) => {
      const rulesUsed = gameRules(gamePreset);
      const { width, depth } = rulesUsed.board;
      const placed = [
        placePiece(ruin, {
          pieceId: 'ruin',
          position: { x: width * 0.35, y: depth / 2 },
          rotation: 0,
        }),
        placePiece(ruin, {
          pieceId: 'ruin',
          position: { x: width * 0.65, y: depth / 2 },
          rotation: 45,
        }),
      ];
      expect(boardViolations(placed, rulesUsed).flat()).toEqual([]);
      const random = createRandom(11);
      let checked = 0;
      let legal = 0;
      for (let i = 0; i < 500; i++) {
        const kind = kinds[Math.floor(random() * kinds.length)] ?? ruin;
        const candidate = placePiece(kind, {
          pieceId: kind.id,
          position: { x: random() * width, y: random() * depth },
          rotation: Math.floor(random() * 24) * 15,
        });
        const nearest = Math.min(
          ...placed.map((p) => polygonDistance(p.polygon, candidate.polygon)),
        );
        if (nearest === 0 || nearest > rulesUsed.spacing.joinGap) {
          checked++;
          if (expectAgreement(candidate, placed, rulesUsed)) {
            legal++;
          }
        }
      }
      // Enough of both answers that the comparison means something.
      expect(checked).toBeGreaterThan(400);
      expect(legal).toBeGreaterThan(50);
      expect(checked - legal).toBeGreaterThan(50);
    },
  );

  const fantasy = PRESETS.find((gamePreset) => gamePreset.id === 'warhammer-fantasy');
  if (fantasy === undefined) {
    throw new Error('Missing the Warhammer Fantasy preset');
  }
  const fantasyRules = gameRules(fantasy);

  it.each([
    { gap: 1.9, legal: true },
    { gap: 2.0, legal: true },
    { gap: 2.1, legal: false },
    { gap: 5.9, legal: false },
    { gap: 6.0, legal: true },
    { gap: 6.1, legal: true },
  ])('agree on a piece $gap" from the table edge under the Fantasy edge rule', ({ gap, legal }) => {
    const candidate = placePiece(ruin, {
      pieceId: 'ruin',
      position: { x: gap + 3, y: fantasyRules.board.depth / 2 },
      rotation: 0,
    });
    expect(expectAgreement(candidate, [], fantasyRules)).toBe(legal);
  });

  it.each([
    { y: 10.9, legal: false },
    { y: 11.1, legal: true },
  ])('agree on a piece at y $y next to the clear back of a Fantasy zone', ({ y, legal }) => {
    const candidate = placePiece(ruin, {
      pieceId: 'ruin',
      position: { x: fantasyRules.board.width / 2, y },
      rotation: 0,
    });
    expect(expectAgreement(candidate, [], fantasyRules)).toBe(legal);
  });
});

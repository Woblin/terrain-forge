import { describe, expect, it } from 'vitest';
import type { Board } from './board';
import { placePiece, type PlacedPiece } from './placement';
import { spreadChoice, spreadRank } from './spread';
import type { TerrainPiece } from './terrain';

const board: Board = { width: 60, depth: 44 };
const ruin: TerrainPiece = {
  id: 'ruin',
  name: 'Ruin',
  type: 'ruin',
  footprint: { kind: 'rect', width: 4, depth: 4 },
  quantity: 4,
};

function at(x: number, y: number): PlacedPiece {
  return placePiece(ruin, { pieceId: 'ruin', position: { x, y }, rotation: 0 });
}

describe('spreadRank', () => {
  it('prefers a spot with room around it to one next to another piece', () => {
    const placed = [at(30, 22)];
    expect(spreadRank([at(18, 22)], placed, board)).toBeLessThan(
      spreadRank([at(34, 22)], placed, board),
    );
  });

  it('keeps pieces off the table edge as if their mirror image stood beyond it', () => {
    expect(spreadRank([at(15, 22)], [], board)).toBeLessThan(spreadRank([at(2, 22)], [], board));
  });

  it('treats any spot with enough room the same, so the spread does not form a grid', () => {
    const placed = [at(10, 10)];
    expect(spreadRank([at(30, 22)], placed, board)).toBe(spreadRank([at(40, 22)], placed, board));
  });
});

describe('spreadChoice', () => {
  it('lets a leading choice decide first and the spread break ties', () => {
    const leading = {
      spots: 12,
      rank: (candidate: readonly PlacedPiece[]) =>
        (candidate[0]?.placement.position.x ?? 0) < 20 ? 1 : 0,
      goodEnough: () => false,
    };
    const choice = spreadChoice(board, leading);
    const placed = [at(30, 22)];
    expect(choice.rank([at(34, 22)], placed)).toBeLessThan(choice.rank([at(10, 22)], placed));
    expect(choice.rank([at(45, 22)], placed)).toBeLessThan(choice.rank([at(34, 22)], placed));
  });
});

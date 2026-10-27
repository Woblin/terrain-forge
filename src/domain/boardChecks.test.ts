import { describe, expect, it } from 'vitest';
import { longEdgeDeployment } from './board';
import { checkBoard } from './boardChecks';
import type { BoardPiece } from './editor';
import type { PlacementRules } from './placement';
import { SAMPLE_COLLECTION } from './sampleCollection';

const board = { width: 60, depth: 44 };
const rules: PlacementRules = {
  board,
  deployment: longEdgeDeployment(board, 12),
  edgeMargin: 1,
  minGap: 3,
};

function piece(key: string, pieceId: string, x: number, y: number): BoardPiece {
  return { key, placement: { pieceId, position: { x, y }, rotation: 0 } };
}

describe('checkBoard', () => {
  it('reports nothing for pieces that keep every rule', () => {
    const pieces = [piece('a', 'building', 15, 22), piece('b', 'building', 45, 22)];
    expect(checkBoard(pieces, SAMPLE_COLLECTION, rules, 'in').size).toBe(0);
  });

  it('names the piece that is too close, with the gap and the minimum', () => {
    const pieces = [piece('a', 'building', 15, 22), piece('b', 'ruin-small', 26, 22)];
    const checks = checkBoard(pieces, SAMPLE_COLLECTION, rules, 'in');
    expect(checks.get('a')).toEqual(['2″ from Small ruin, needs 3″']);
    expect(checks.get('b')).toEqual(['2″ from Building, needs 3″']);
  });

  it('uses the chosen unit', () => {
    const pieces = [piece('a', 'building', 15, 22), piece('b', 'ruin-small', 26, 22)];
    expect(checkBoard(pieces, SAMPLE_COLLECTION, rules, 'cm').get('a')).toEqual([
      '5.1 cm from Small ruin, needs 7.6 cm',
    ]);
  });

  it('flags pieces off the board or inside the edge margin', () => {
    const checks = checkBoard([piece('a', 'building', 5.5, 22)], SAMPLE_COLLECTION, rules, 'in');
    expect(checks.get('a')).toEqual(['Keep 1″ clear of the table edge']);
  });

  it('flags every piece in an overcrowded zone', () => {
    const pieces = [piece('a', 'barricade', 10, 5), piece('b', 'barricade', 30, 5)];
    const checks = checkBoard(pieces, SAMPLE_COLLECTION, rules, 'in');
    expect(checks.get('a')).toEqual(["More than one piece stands fully inside Player A's zone"]);
    expect(checks.get('b')).toEqual(["More than one piece stands fully inside Player A's zone"]);
  });

  it('flags copies beyond the quantity in the collection', () => {
    const fewer = SAMPLE_COLLECTION.map((entry) =>
      entry.id === 'building' ? { ...entry, quantity: 1 } : entry,
    );
    const pieces = [piece('a', 'building', 15, 22), piece('b', 'building', 45, 22)];
    const checks = checkBoard(pieces, fewer, rules, 'in');
    expect(checks.get('a')).toBeUndefined();
    expect(checks.get('b')).toEqual(['More copies than the 1 in your library']);
  });
});

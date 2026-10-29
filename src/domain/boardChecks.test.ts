import { describe, expect, it } from 'vitest';
import { longEdgeDeployment } from './board';
import { checkBoard } from './boardChecks';
import type { BoardPiece } from './editor';
import type { PlacementRules } from './placement';
import { findPreset } from './presets';
import { SAMPLE_COLLECTION } from './sampleCollection';

const board = { width: 60, depth: 44 };
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
    expect(checks.get('a')).toEqual(['2″ from Small ruin, needs 3″ (or 1″ or less to join them)']);
    expect(checks.get('b')).toEqual(['2″ from Building, needs 3″ (or 1″ or less to join them)']);
  });

  it('uses the chosen unit', () => {
    const pieces = [piece('a', 'building', 15, 22), piece('b', 'ruin-small', 26, 22)];
    expect(checkBoard(pieces, SAMPLE_COLLECTION, rules, 'cm').get('a')).toEqual([
      '5.1 cm from Small ruin, needs 7.6 cm (or 2.5 cm or less to join them)',
    ]);
  });

  it('lets pieces stand joined', () => {
    const pieces = [piece('a', 'building', 15, 22), piece('b', 'ruin-small', 24.5, 22)];
    expect(checkBoard(pieces, SAMPLE_COLLECTION, rules, 'in').size).toBe(0);
  });

  it('flags pieces that overlap', () => {
    const pieces = [piece('a', 'building', 15, 22), piece('b', 'ruin-small', 20, 22)];
    expect(checkBoard(pieces, SAMPLE_COLLECTION, rules, 'in').get('a')).toEqual([
      'Overlaps Small ruin',
    ]);
  });

  it('asks Warhammer Fantasy terrain to hug a table edge or leave room for regiments', () => {
    const fantasy = findPreset('warhammer-fantasy');
    if (fantasy === undefined) {
      throw new Error('Missing Warhammer Fantasy');
    }
    const regiments = { ...rules, spacing: fantasy.spacing };
    const checks = checkBoard([piece('a', 'building', 9, 22)], SAMPLE_COLLECTION, regiments, 'in');
    expect(checks.get('a')).toEqual(['4″ from the table edge: keep 2″ or less, or 6″ or more']);
    const hugging = [piece('a', 'building', 6.5, 22)];
    expect(checkBoard(hugging, SAMPLE_COLLECTION, regiments, 'in').size).toBe(0);
  });

  it('asks Warhammer Fantasy players to keep the back half of each zone clear', () => {
    const fantasy = findPreset('warhammer-fantasy');
    if (fantasy === undefined) {
      throw new Error('Missing Warhammer Fantasy');
    }
    const regiments = { ...rules, spacing: fantasy.spacing };
    const checks = checkBoard(
      [piece('a', 'barricade', 30, 2.5)],
      SAMPLE_COLLECTION,
      regiments,
      'in',
    );
    expect(checks.get('a')).toEqual(["Keep the back half of Player A's zone clear for deploying"]);
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

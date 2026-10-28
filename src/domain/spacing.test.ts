import { describe, expect, it } from 'vitest';
import { edgeGapAllowed, isApart, isJoined, requiredGap, type SpacingRules } from './spacing';
import type { TerrainPiece, TerrainType } from './terrain';

const regiments: SpacingRules = {
  minGap: 6,
  joinGap: 1,
  openTypes: ['hill'],
  openGap: 4,
  edge: { hug: 2, open: 6 },
};

function piece(type: TerrainType): TerrainPiece {
  return {
    id: type,
    name: type,
    type,
    footprint: { kind: 'rect', width: 6, depth: 4 },
    quantity: 1,
  };
}

describe('requiredGap', () => {
  it('asks for the full gap between pieces units cannot move over', () => {
    expect(requiredGap(piece('building'), piece('forest'), regiments)).toBe(6);
  });

  it('asks for less next to open terrain such as a hill', () => {
    expect(requiredGap(piece('hill'), piece('building'), regiments)).toBe(4);
    expect(requiredGap(piece('ruin'), piece('hill'), regiments)).toBe(4);
  });
});

describe('isJoined and isApart', () => {
  it('counts up to the join gap as joined', () => {
    expect(isJoined(0, regiments)).toBe(true);
    expect(isJoined(1, regiments)).toBe(true);
    expect(isJoined(1.1, regiments)).toBe(false);
  });

  it('counts the required gap itself as apart, despite rounding', () => {
    expect(isApart(6 - 1e-12, 6)).toBe(true);
    expect(isApart(5.9, 6)).toBe(false);
  });
});

describe('edgeGapAllowed', () => {
  it('allows hugging the edge or leaving room, nothing in between', () => {
    const edge = { hug: 2, open: 6 };
    expect(edgeGapAllowed(1.5, edge)).toBe(true);
    expect(edgeGapAllowed(2, edge)).toBe(true);
    expect(edgeGapAllowed(4, edge)).toBe(false);
    expect(edgeGapAllowed(6, edge)).toBe(true);
    expect(edgeGapAllowed(20, edge)).toBe(true);
  });
});

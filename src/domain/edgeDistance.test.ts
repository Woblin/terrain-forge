import { describe, expect, it } from 'vitest';
import {
  edgeGaps,
  farthestPoint,
  isLongEdge,
  nearestGaps,
  turnFromLongEdge,
  type BoardEdge,
  type EdgeGap,
} from './edgeDistance';
import type { Footprint, Placement } from './terrain';

const board = { width: 60, depth: 44 };
const ruin: Footprint = { kind: 'rect', width: 6, depth: 4 };
const forest: Footprint = { kind: 'ellipse', width: 6, depth: 6 };
const oval: Footprint = { kind: 'ellipse', width: 8, depth: 4 };

function placed(x: number, y: number, rotation: number): Placement {
  return { pieceId: 'p', position: { x, y }, rotation };
}

function gapsByEdge(gaps: readonly EdgeGap[]): Record<BoardEdge, number> {
  return Object.fromEntries(gaps.map((gap) => [gap.edge, gap.inches])) as Record<BoardEdge, number>;
}

describe('edgeGaps', () => {
  it('measures an unturned rectangle from its sides', () => {
    const gaps = gapsByEdge(edgeGaps(ruin, placed(10, 8, 0), board));
    expect(gaps.left).toBeCloseTo(7);
    expect(gaps.right).toBeCloseTo(47);
    expect(gaps.top).toBeCloseTo(6);
    expect(gaps.bottom).toBeCloseTo(34);
  });

  it('measures a flat side at its middle', () => {
    const [left] = edgeGaps(ruin, placed(10, 8, 0), board);
    expect(left?.from.x).toBeCloseTo(7);
    expect(left?.from.y).toBeCloseTo(8);
    expect(left?.to).toEqual({ x: 0, y: left?.from.y });
  });

  it('measures a turned rectangle from its corners', () => {
    // At 30°, the corners reach 3 cos 30° + 2 sin 30° across and 3 sin 30° + 2 cos 30° down.
    const across = 3 * Math.cos(Math.PI / 6) + 2 * Math.sin(Math.PI / 6);
    const down = 3 * Math.sin(Math.PI / 6) + 2 * Math.cos(Math.PI / 6);
    const gaps = gapsByEdge(edgeGaps(ruin, placed(20, 20, 30), board));
    expect(gaps.left).toBeCloseTo(20 - across);
    expect(gaps.right).toBeCloseTo(40 - across);
    expect(gaps.top).toBeCloseTo(20 - down);
    expect(gaps.bottom).toBeCloseTo(24 - down);
  });

  it('swaps width and depth at 90°', () => {
    const gaps = gapsByEdge(edgeGaps(ruin, placed(10, 8, 90), board));
    expect(gaps.left).toBeCloseTo(8);
    expect(gaps.top).toBeCloseTo(5);
  });

  it('reaches a diagonal corner at 45°', () => {
    const gaps = gapsByEdge(edgeGaps(ruin, placed(10, 10, 45), board));
    expect(gaps.left).toBeCloseTo(10 - 5 / Math.SQRT2);
  });

  it('measures a round piece to its curve, not its outline corners', () => {
    const gaps = gapsByEdge(edgeGaps(forest, placed(30, 22, 0), board));
    expect(gaps.top).toBeCloseTo(19);
    expect(gaps.bottom).toBeCloseTo(19);
    expect(gaps.left).toBeCloseTo(27);
  });

  it('measures a turned oval exactly', () => {
    // A 4 by 2 inch half-size oval turned 90° reaches 2 across and 4 down.
    const gaps = gapsByEdge(edgeGaps(oval, placed(10, 10, 90), board));
    expect(gaps.left).toBeCloseTo(8);
    expect(gaps.top).toBeCloseTo(6);
    // At 45°, the reach is the square root of (16 + 4) / 2.
    const turned = gapsByEdge(edgeGaps(oval, placed(10, 10, 45), board));
    expect(turned.left).toBeCloseTo(10 - Math.sqrt(10));
  });

  it('reads zero for a piece against the edge', () => {
    const gaps = gapsByEdge(edgeGaps(ruin, placed(3, 2, 0), board));
    expect(gaps.left).toBeCloseTo(0);
    expect(gaps.top).toBeCloseTo(0);
  });
});

describe('farthestPoint', () => {
  it('finds the corner of a turned rectangle', () => {
    const point = farthestPoint(ruin, placed(0, 0, 30), { x: -1, y: 0 });
    expect(point.x).toBeCloseTo(-(3 * Math.cos(Math.PI / 6) + 1));
  });
});

describe('nearestGaps', () => {
  it('picks the closer long edge, then the closer short edge', () => {
    const [long, short] = nearestGaps(edgeGaps(ruin, placed(50, 30, 0), board), board);
    expect(long.edge).toBe('bottom');
    expect(short.edge).toBe('right');
  });

  it('uses the left and right edges as long ones on a board deeper than wide', () => {
    const tall = { width: 44, depth: 60 };
    const [long, short] = nearestGaps(edgeGaps(ruin, placed(10, 50, 0), tall), tall);
    expect(long.edge).toBe('left');
    expect(short.edge).toBe('bottom');
  });
});

describe('isLongEdge', () => {
  it('counts top and bottom as long on a wide board', () => {
    expect(isLongEdge('top', board)).toBe(true);
    expect(isLongEdge('left', board)).toBe(false);
  });
});

describe('turnFromLongEdge', () => {
  it('gives the turn clockwise from the long edge', () => {
    expect(turnFromLongEdge(ruin, 30, board)).toBe(30);
    expect(turnFromLongEdge(ruin, 0, board)).toBe(0);
    expect(turnFromLongEdge(ruin, 90, board)).toBe(90);
  });

  it('treats half a turn as the same, since a rectangle looks the same', () => {
    expect(turnFromLongEdge(ruin, 210, board)).toBe(30);
    expect(turnFromLongEdge(ruin, 330, board)).toBe(-30);
    expect(turnFromLongEdge(ruin, 270, board)).toBe(90);
  });

  it('folds a square into a quarter turn', () => {
    const square: Footprint = { kind: 'rect', width: 4, depth: 4 };
    expect(turnFromLongEdge(square, 60, board)).toBe(-30);
    expect(turnFromLongEdge(square, 45, board)).toBe(45);
  });

  it('measures from the side edges on a board deeper than wide', () => {
    expect(turnFromLongEdge(ruin, 120, { width: 44, depth: 60 })).toBe(30);
  });

  it('has no turn for a round piece', () => {
    expect(turnFromLongEdge(forest, 40, board)).toBeNull();
  });

  it('rounds to whole degrees', () => {
    expect(turnFromLongEdge(oval, 12.6, board)).toBe(13);
  });
});

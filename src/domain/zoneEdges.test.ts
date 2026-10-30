import { describe, expect, it } from 'vitest';
import { longEdgeDeployment, oppositeCornersDeployment } from './board';
import { innerEdges } from './zoneEdges';

const board = { width: 72, depth: 48 };

describe('innerEdges', () => {
  it('keeps only the front of a zone along a long edge', () => {
    const { zones } = longEdgeDeployment(board, 12);
    const front = innerEdges(zones.A, board);
    expect(front).toHaveLength(1);
    expect(front[0]?.every((point) => point.y === 12)).toBe(true);
  });

  it('keeps the diagonal of a corner zone', () => {
    const { zones } = oppositeCornersDeployment(board);
    const front = innerEdges(zones.A, board);
    expect(front.length).toBeGreaterThan(0);
    for (const [a, b] of front) {
      expect(a.x === b.x && (a.x === 0 || a.x === board.width)).toBe(false);
      expect(a.y === b.y && (a.y === 0 || a.y === board.depth)).toBe(false);
    }
  });
});

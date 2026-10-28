import type { Board } from '../domain/board';
import {
  edgeGaps,
  nearestGaps,
  turnFromLongEdge,
  type BoardEdge,
  type EdgeGap,
} from '../domain/edgeDistance';
import type { Placement, TerrainPiece } from '../domain/terrain';
import { formatTableLength, type LengthUnit } from '../domain/units';

/** Where each edge of the board shows on screen when the board is drawn upright. */
const UPRIGHT_EDGES: Readonly<Record<BoardEdge, BoardEdge>> = {
  top: 'left',
  bottom: 'right',
  left: 'bottom',
  right: 'top',
};

const EDGE_NAMES: Readonly<Record<BoardEdge, string>> = {
  left: 'Left',
  right: 'Right',
  top: 'Top',
  bottom: 'Bottom',
};

/** The edge's side of the screen, so names match the board as the player sees it. */
export function screenEdge(edge: BoardEdge, upright: boolean): BoardEdge {
  return upright ? UPRIGHT_EDGES[edge] : edge;
}

function gapText(gap: EdgeGap, unit: LengthUnit, upright: boolean): string {
  return `${EDGE_NAMES[screenEdge(gap.edge, upright)]} ${formatTableLength(gap.inches, unit)}`;
}

/** How a piece is turned against the long edges, or null for a round piece. */
export function turnText(turn: number | null): string | null {
  if (turn === null) {
    return null;
  }
  if (turn === 0) {
    return 'square to the long edge';
  }
  if (turn === 90) {
    return 'at right angles to the long edge';
  }
  const way = turn > 0 ? 'clockwise' : 'counter-clockwise';
  return `${String(Math.abs(turn))}° ${way} from the long edge`;
}

/** The two gaps that place a piece and its turn, in one short line such as `Left 8½″ · Top 4″ · 30° clockwise from the long edge`. */
export function measureDetail(
  piece: TerrainPiece,
  placement: Placement,
  board: Board,
  unit: LengthUnit,
  upright: boolean,
): string {
  const gaps = nearestGaps(edgeGaps(piece.footprint, placement, board), board);
  const turn = turnText(turnFromLongEdge(piece.footprint, placement.rotation, board));
  return [...gaps.map((gap) => gapText(gap, unit, upright)), ...(turn === null ? [] : [turn])].join(
    ' · ',
  );
}

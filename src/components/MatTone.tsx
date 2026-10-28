import type { Board } from '../domain/board';
import type { Mat } from '../domain/mats';

interface MatToneProps {
  mat: Mat;
  board: Board;
}

/**
 * The layer over the mat's picture that darkens it, so that pieces and overlays read as well as
 * on the plain board; on the plain board, the board's own colour.
 */
export function MatTone({ mat, board }: MatToneProps) {
  return mat.tileWidth === null ? (
    <rect width={board.width} height={board.depth} className="fill-stone-800" />
  ) : (
    <rect
      width={board.width}
      height={board.depth}
      className="fill-stone-950"
      fillOpacity={mat.tone}
    />
  );
}

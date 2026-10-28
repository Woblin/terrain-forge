import { findMat } from '../domain/mats';
import type { SavedBoard } from '../domain/savedBoard';
import { FootprintShape } from './FootprintShape';
import { MatTone } from './MatTone';
import { matBackground } from './matPictures';
import { TERRAIN_STYLES } from './terrainStyles';

interface BoardThumbnailProps {
  board: SavedBoard;
  className?: string;
}

/** A small picture of a saved board: its mat and its terrain as plain shapes, without photos. */
export function BoardThumbnail({ board, className = 'w-28 rounded-lg' }: BoardThumbnailProps) {
  const { width, depth } = board.layout.board;
  const mat = findMat(board.matId);
  return (
    <svg
      viewBox={`0 0 ${String(width)} ${String(depth)}`}
      aria-hidden="true"
      style={matBackground(mat, board.layout.board, false, 'small')}
      className={`bg-mat shrink-0 ${className}`}
    >
      <MatTone mat={mat} board={board.layout.board} />
      {board.layout.placements.map((placement, index) => {
        const piece = board.pieces.find((candidate) => candidate.id === placement.pieceId);
        if (piece === undefined) {
          return null;
        }
        const { x, y } = placement.position;
        return (
          <g
            key={index}
            transform={`translate(${String(x)} ${String(y)}) rotate(${String(placement.rotation)})`}
          >
            <FootprintShape
              footprint={piece.footprint}
              className={TERRAIN_STYLES[piece.type].fill}
            />
          </g>
        );
      })}
    </svg>
  );
}

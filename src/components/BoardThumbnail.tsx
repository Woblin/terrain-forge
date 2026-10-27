import type { SavedBoard } from '../domain/savedBoard';
import { FootprintShape } from './FootprintShape';
import { TERRAIN_STYLES } from './terrainStyles';

interface BoardThumbnailProps {
  board: SavedBoard;
}

/** A small picture of a saved board: its terrain as plain shapes, without photos. */
export function BoardThumbnail({ board }: BoardThumbnailProps) {
  const { width, depth } = board.layout.board;
  return (
    <svg
      viewBox={`0 0 ${String(width)} ${String(depth)}`}
      aria-hidden="true"
      className="bg-mat w-28 shrink-0 rounded-lg"
    >
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

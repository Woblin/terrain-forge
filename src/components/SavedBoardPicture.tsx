import { resolveGameSetup } from '../domain/gameSetup';
import type { SavedBoard } from '../domain/savedBoard';
import { BoardPicture } from './BoardPicture';
import { BoardThumbnail } from './BoardThumbnail';

interface SavedBoardPictureProps {
  board: SavedBoard;
  className?: string;
}

/**
 * A small picture of a saved board, drawn from its saved placements: with its deployment zones
 * for a game Terrain Forge knows, and as plain terrain shapes for one it no longer does.
 */
export function SavedBoardPicture({ board, className = '' }: SavedBoardPictureProps) {
  const setup = resolveGameSetup(board.layout.presetId, board.layout.deploymentId);
  return setup === undefined ? (
    <BoardThumbnail board={board} className={className} />
  ) : (
    <BoardPicture
      setup={setup}
      layout={board.layout}
      pieces={board.pieces}
      labelled={false}
      className={`shrink-0 ${className}`}
    />
  );
}

import type { GameSetup } from '../domain/gameSetup';
import type { ParsedBoardLink } from '../domain/shareLink';
import { formatLength, type LengthUnit } from '../domain/units';
import type { SavedBoards } from '../hooks/savedBoardsContext';

/** Ends a notice about a board that could not be opened, which a new board replaces. */
export const NEW_BOARD_INSTEAD = 'Here is a new board instead.';

export function removedNotice(count: number): string {
  return count === 1
    ? 'A piece was taken off the board because it is no longer in your library.'
    : `${String(count)} pieces were taken off the board because they are no longer in your library.`;
}

export function terrainChangedNotice(count: number): string {
  return count === 1
    ? 'This board shows its terrain as it was saved: one of its pieces has changed or left your library since.'
    : `This board shows its terrain as it was saved: ${String(count)} of its pieces have changed or left your library since.`;
}

/** A new board on other terrain, after the library emptied or got its first pieces. */
export function collectionSwitchedNotice(toSample: boolean): string {
  return toSample
    ? 'Your library is empty, so this new board uses the sample set.'
    : 'This new board uses the terrain in your library instead of the sample set.';
}

export function missingBoardNotice(savedBoards: Pick<SavedBoards, 'access' | 'loadError'>): string {
  if (savedBoards.access === 'signedOut') {
    return `Sign in to open your saved boards. ${NEW_BOARD_INSTEAD}`;
  }
  if (savedBoards.access === 'unverified') {
    return `Verify your email to open your saved boards. ${NEW_BOARD_INSTEAD}`;
  }
  if (savedBoards.loadError !== null) {
    return `${savedBoards.loadError} ${NEW_BOARD_INSTEAD}`;
  }
  return `This saved board was not found. It may have been deleted. ${NEW_BOARD_INSTEAD}`;
}

export function linkNotice(link: ParsedBoardLink): string | null {
  if (link.kind === 'invalid') {
    return `${link.reason} ${NEW_BOARD_INSTEAD}`;
  }
  if (link.kind === 'valid' && link.versionMismatch) {
    return 'This link was made with a different version of the generator, so the board may not match the one that was shared.';
  }
  return null;
}

/** What a screen reader hears about the board. */
export function boardDescription(
  setup: GameSetup | undefined,
  pieceCount: number,
  unit: LengthUnit,
): string {
  if (setup === undefined) {
    return 'No board yet.';
  }
  const { preset, board, deployment } = setup;
  return `${preset.name}, ${formatLength(board.width, unit)} by ${formatLength(board.depth, unit)}, ${deployment.name} deployment, ${String(pieceCount)} terrain pieces. Tab to a piece to select it.`;
}

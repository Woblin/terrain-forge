import { describe, expect, it } from 'vitest';
import { resolveGameSetup } from '../domain/gameSetup';
import type { SavedBoardsAccess } from '../hooks/savedBoardsContext';
import {
  boardDescription,
  collectionSwitchedNotice,
  linkNotice,
  missingBoardNotice,
  NEW_BOARD_INSTEAD,
  removedNotice,
  terrainChangedNotice,
} from './boardNotices';

describe('board notices', () => {
  it('names one removed piece, or counts several', () => {
    expect(removedNotice(1)).toBe(
      'A piece was taken off the board because it is no longer in your library.',
    );
    expect(removedNotice(3)).toBe(
      '3 pieces were taken off the board because they are no longer in your library.',
    );
  });

  it('names one changed piece, or counts several', () => {
    expect(terrainChangedNotice(1)).toContain('one of its pieces has changed');
    expect(terrainChangedNotice(2)).toContain('2 of its pieces have changed');
  });

  it('says which terrain a new board switched to', () => {
    expect(collectionSwitchedNotice(true)).toBe(
      'Your library is empty, so this new board uses the sample set.',
    );
    expect(collectionSwitchedNotice(false)).toBe(
      'This new board uses the terrain in your library instead of the sample set.',
    );
  });

  it('says why a saved board could not be opened', () => {
    const notice = (access: SavedBoardsAccess, loadError: string | null) =>
      missingBoardNotice({ access, loadError });
    expect(notice('signedOut', null)).toBe(
      `Sign in to open your saved boards. ${NEW_BOARD_INSTEAD}`,
    );
    expect(notice('unverified', null)).toBe(
      `Verify your email to open your saved boards. ${NEW_BOARD_INSTEAD}`,
    );
    expect(notice('account', 'Could not load your boards.')).toBe(
      `Could not load your boards. ${NEW_BOARD_INSTEAD}`,
    );
    expect(notice('account', null)).toBe(
      `This saved board was not found. It may have been deleted. ${NEW_BOARD_INSTEAD}`,
    );
  });

  it('explains a broken or outdated link, and says nothing for a good one', () => {
    expect(linkNotice({ kind: 'invalid', reason: 'Bad link.' })).toBe(
      `Bad link. ${NEW_BOARD_INSTEAD}`,
    );
    expect(linkNotice({ kind: 'empty' })).toBeNull();
  });

  it('describes the board for a screen reader', () => {
    expect(boardDescription(undefined, 0, 'in')).toBe('No board yet.');
    expect(boardDescription(resolveGameSetup('warhammer-40k', 'long-edges'), 7, 'in')).toContain(
      'Warhammer 40,000, 60″ by 44″, Long edges deployment, 7 terrain pieces.',
    );
  });
});

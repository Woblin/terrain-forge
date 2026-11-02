import { useState } from 'react';
import type { BoardSaveState } from '../components/BoardHeaderBar';
import { evaluateFairness, type FairnessInput } from '../domain/fairness';
import { findById } from '../domain/findById';
import type { GameSetup } from '../domain/gameSetup';
import type { GameSystemPreset } from '../domain/presets';
import {
  defaultBoardName,
  hasUnsavedChanges,
  layoutFingerprint,
  savedBoardContent,
  type OpenedBoard,
} from '../domain/savedBoard';
import type { TerrainPiece } from '../domain/terrain';
import type { BoardSession } from './boardSessionContext';
import type { SavedBoards } from './savedBoardsContext';
import { useLeaveWarning } from './useLeaveWarning';

/** A name the player gave a board that is not saved, kept for the board it was given to. */
interface DraftName {
  readonly origin: object;
  readonly name: string;
}

export interface BoardSavingInput {
  readonly session: BoardSession;
  readonly savedBoards: SavedBoards;
  readonly collection: readonly TerrainPiece[];
  readonly fairnessInput: FairnessInput | null;
  readonly setup: GameSetup | undefined;
  /** The game picked for the next board, which names a board before it is made. */
  readonly chosenPreset: GameSystemPreset;
}

export interface BoardSaving {
  /** The saved board shown, with the name the account has for it. */
  readonly shownOpened: OpenedBoard | null;
  readonly boardName: () => string;
  readonly saveState: () => BoardSaveState;
  /** Saves the board under `name`; returns a message when it did not work. */
  readonly saveBoard: (name: string, asCopy: boolean) => string | null;
  readonly renameBoard: (name: string) => void;
}

/** Saves, renames and names the board, and warns before leaving it with unsaved changes. */
export function useBoardSaving(input: BoardSavingInput): BoardSaving {
  const { session, savedBoards, collection, fairnessInput, setup, chosenPreset } = input;
  const { opened, setOpened, mat: matId } = session;
  const { present } = session.editor;
  const origin = present?.origin;
  const [draftName, setDraftName] = useState<DraftName | null>(null);
  const unsaved = hasUnsavedChanges(opened, present, matId);
  // The name the account has for the board, which also shows a refused rename undone.
  const shownOpened =
    opened === null
      ? null
      : {
          ...opened,
          name: findById(savedBoards.boards, opened.id)?.name ?? opened.name,
        };
  useLeaveWarning(unsaved);

  function saveBoard(name: string, asCopy: boolean): string | null {
    if (present === null) {
      return 'There is no board to save yet.';
    }
    // Measured now: the analysis on screen can be of the board before the last change.
    const passed =
      fairnessInput !== null && evaluateFairness(fairnessInput).failedRules.length === 0;
    const content = savedBoardContent(present, collection, name, passed, matId);
    const result = savedBoards.save(content, asCopy ? null : (shownOpened?.id ?? null));
    if (!result.ok) {
      return result.message;
    }
    setOpened({
      id: result.id,
      name: content.name,
      fingerprint: layoutFingerprint(content.layout),
      matId: content.matId,
    });
    return null;
  }

  function renameBoard(name: string): void {
    if (opened !== null) {
      savedBoards.rename(opened.id, name);
    } else if (origin !== undefined) {
      setDraftName({ origin, name });
    }
  }

  function boardName(): string {
    if (shownOpened !== null) {
      return shownOpened.name;
    }
    if (draftName !== null && draftName.origin === origin) {
      return draftName.name;
    }
    return defaultBoardName(
      setup?.preset.name ?? chosenPreset.name,
      setup?.deployment.name ?? '',
      new Date(),
    );
  }

  function saveState(): BoardSaveState {
    if (shownOpened === null) {
      return 'notSaved';
    }
    if (unsaved) {
      return 'unsaved';
    }
    return savedBoards.saving ? 'saving' : 'saved';
  }

  return { shownOpened, boardName, saveState, saveBoard, renameBoard };
}

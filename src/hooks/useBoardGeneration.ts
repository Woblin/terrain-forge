import { useEffect, useRef, useState } from 'react';
import {
  DEFAULT_DEPLOYMENT_ID,
  OWN_SOURCE,
  sameSource,
  type BoardChoice,
  type CollectionSource,
} from '../domain/boardSource';
import type { RuleId } from '../domain/fairness';
import { enabledRulesFor, startingPreset } from '../domain/gamePreferences';
import { resolveGameSetup } from '../domain/gameSetup';
import type { MatId } from '../domain/mats';
import { findPreset } from '../domain/presets';
import type { TerrainPiece } from '../domain/terrain';
import type { BoardSession } from './boardSessionContext';
import type { GamePreferencesSetting } from './gamePreferencesContext';
import { randomSeed, useGenerator, type GeneratorStatus } from './useGenerator';

/**
 * How many times a board is made again when the library changes while it is made. After that the
 * last board stays, and the board page follows the library's change as it follows any other.
 */
export const MAX_REGENERATIONS = 3;

/** A new board the player asked for, waiting for them to pick its terrain. */
interface PendingBoard {
  readonly seed: number;
  readonly choice: BoardChoice;
}

/** The player's answer to which terrain a new board uses, when the board has terrain of its own. */
export type PendingAnswer = 'boardTerrain' | 'library' | 'cancel';

export interface BoardGeneration {
  readonly status: GeneratorStatus;
  /** True while the player is asked which terrain a new board uses. */
  readonly asksTerrain: boolean;
  readonly answerPending: (answer: PendingAnswer) => void;
  readonly runGeneration: (
    next: BoardChoice,
    seed: number,
    from: CollectionSource,
    enabledRules: readonly RuleId[],
  ) => Promise<void>;
  readonly generateNew: (seed: number, next?: BoardChoice) => void;
  readonly requestNew: (seed: number, next?: BoardChoice) => void;
  readonly requestRandom: () => void;
  readonly startingChoice: () => BoardChoice;
  readonly startingMat: () => MatId;
  readonly playerRules: (next: BoardChoice) => RuleId[];
}

/** Makes new boards, on the player's terrain or the board's own, with the player's rules. */
export function useBoardGeneration(
  session: BoardSession,
  settings: GamePreferencesSetting,
  ownCollection: readonly TerrainPiece[],
): BoardGeneration {
  const { choice, source, dispatch, setSource, setNotice, setOpened } = session;
  const { status, generate } = useGenerator();
  const [pendingBoard, setPendingBoard] = useState<PendingBoard | null>(null);

  // Generation reads the player's terrain when it finishes, to see if it changed meanwhile.
  const latestOwn = useRef(ownCollection);
  useEffect(() => {
    latestOwn.current = ownCollection;
  }, [ownCollection]);

  /** The rules the player has on for a game. */
  function playerRules(next: BoardChoice): RuleId[] {
    const preset = findPreset(next.presetId);
    return preset === undefined ? [] : enabledRulesFor(preset, settings.preferences);
  }

  /** The mat a new board starts on: the one the player picked last. */
  function startingMat(): MatId {
    return settings.preferences.defaultMatId;
  }

  /** The game the player starts on, keeping the deployment picked before if it is that game. */
  function startingChoice(): BoardChoice {
    const presetId = startingPreset(settings.preferences).id;
    return {
      presetId,
      deploymentId: choice.presetId === presetId ? choice.deploymentId : DEFAULT_DEPLOYMENT_ID,
    };
  }

  async function runGeneration(
    next: BoardChoice,
    seed: number,
    from: CollectionSource,
    enabledRules: readonly RuleId[],
    regenerations = 0,
  ): Promise<void> {
    const target = resolveGameSetup(next.presetId, next.deploymentId);
    if (target === undefined) {
      return;
    }
    const pieces = from.kind === 'own' ? latestOwn.current : from.pieces;
    const result = await generate({
      board: target.board,
      pieces,
      preset: target.preset,
      deployment: target.deployment,
      seed,
      enabledRules,
    });
    const libraryChanged = from.kind === 'own' && latestOwn.current !== pieces;
    if (libraryChanged && regenerations < MAX_REGENERATIONS) {
      // The library changed while the board was made; make it again from the terrain as it is.
      await runGeneration(next, seed, from, enabledRules, regenerations + 1);
      return;
    }
    if (result?.ok === true) {
      setSource(from);
      dispatch({ type: 'generated', layout: result.layout, newHistory: !sameSource(from, source) });
    }
  }

  /** A new board is made from the player's own terrain, with their rules. */
  function generateNew(seed: number, next: BoardChoice = choice): void {
    setNotice(null);
    setOpened(null);
    void runGeneration(next, seed, OWN_SOURCE, playerRules(next));
  }

  /** A new board from the terrain kept with this board, with the player's rules. */
  function generateFromBoardTerrain(seed: number, next: BoardChoice): void {
    setNotice(null);
    setOpened(null);
    void runGeneration(next, seed, source, playerRules(next));
  }

  /** A new board the player asked for. Terrain kept with the board asks which terrain to use. */
  function requestNew(seed: number, next: BoardChoice = choice): void {
    if (source.kind === 'saved') {
      setPendingBoard({ seed, choice: next });
    } else {
      generateNew(seed, next);
    }
  }

  function answerPending(answer: PendingAnswer): void {
    setPendingBoard(null);
    if (pendingBoard === null || answer === 'cancel') {
      return;
    }
    if (answer === 'boardTerrain') {
      generateFromBoardTerrain(pendingBoard.seed, pendingBoard.choice);
    } else {
      generateNew(pendingBoard.seed, pendingBoard.choice);
    }
  }

  return {
    status,
    asksTerrain: pendingBoard !== null,
    answerPending,
    runGeneration,
    generateNew,
    requestNew,
    requestRandom: () => {
      requestNew(randomSeed());
    },
    startingChoice,
    startingMat,
    playerRules,
  };
}

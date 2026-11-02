import { useEffect, useEffectEvent, useRef } from 'react';
import type { Entry } from '../domain/boardEntry';
import { adoptsLibrary, collectionChange, startAction } from '../domain/boardFollow';
import { linksToOwn, OWN_SOURCE } from '../domain/boardSource';
import { findById } from '../domain/findById';
import {
  changedPieces,
  layoutFingerprint,
  placedTerrain,
  type SavedBoard,
} from '../domain/savedBoard';
import type { TerrainPiece } from '../domain/terrain';
import {
  collectionSwitchedNotice,
  linkNotice,
  missingBoardNotice,
  removedNotice,
  terrainChangedNotice,
} from '../components/boardNotices';
import type { BoardSession } from './boardSessionContext';
import type { GamePreferencesSetting } from './gamePreferencesContext';
import type { TerrainLibrary } from './libraryContext';
import type { SavedBoards } from './savedBoardsContext';
import type { BoardGeneration } from './useBoardGeneration';
import { randomSeed } from './useGenerator';

export interface BoardLifecycleInput {
  readonly session: BoardSession;
  readonly settings: GamePreferencesSetting;
  readonly library: TerrainLibrary;
  readonly savedBoards: SavedBoards;
  readonly entry: Entry;
  /** The player's terrain: the library, or the sample set while it is empty. */
  readonly ownCollection: readonly TerrainPiece[];
  /** The terrain the board is shown with. */
  readonly collection: readonly TerrainPiece[];
  readonly knownIds: ReadonlySet<string>;
  readonly generation: BoardGeneration;
}

/**
 * Puts the board the page was opened for in place once the player's library and settings load,
 * then follows changes to the library: pieces that leave it, a library that empties or fills, and
 * terrain kept with a saved board that the library holds again.
 */
export function useBoardLifecycle(input: BoardLifecycleInput): void {
  const { session, settings, library, savedBoards, entry, ownCollection, collection } = input;
  const { generation } = input;
  const { editor, dispatch, source, setChoice, setSource, setNotice, setMat, setOpened } = session;
  const libraryLoaded = library.status !== 'loading';

  /** Shows a saved board as it was saved, on the library's terrain when it is still the same. */
  function openSaved(board: SavedBoard): void {
    const { layout } = board;
    const changed = changedPieces(
      placedTerrain(board.pieces, layout.placements),
      ownCollection,
    ).length;
    dispatch({ type: 'loaded', layout, edited: board.edited });
    setChoice({ presetId: layout.presetId, deploymentId: layout.deploymentId });
    setSource(changed === 0 ? OWN_SOURCE : { kind: 'saved', pieces: board.pieces });
    setNotice(changed === 0 ? null : terrainChangedNotice(changed));
    setMat(board.matId);
    setOpened({
      id: board.id,
      name: board.name,
      fingerprint: layoutFingerprint(layout),
      matId: board.matId,
    });
  }

  /** Makes a first board on the player's game, mat and terrain. */
  function startingBoard(): void {
    const next = generation.startingChoice();
    setChoice(next);
    setMat(generation.startingMat());
    generation.generateNew(randomSeed(), next);
  }

  /** Opens the saved board the address names, or a new board when it cannot be found. */
  function openEntry(boardId: string): void {
    const board = findById(savedBoards.boards, boardId);
    if (board === undefined) {
      startingBoard();
      setNotice(missingBoardNotice(savedBoards));
    } else {
      openSaved(board);
    }
  }

  /** Makes the board a link or another page asked for. */
  function openNew(asked: Extract<Entry, { kind: 'new' }>): void {
    const from = linksToOwn(asked.source, ownCollection) ? OWN_SOURCE : asked.source;
    const next = asked.choice ?? generation.startingChoice();
    dispatch({ type: 'cleared' });
    setChoice(next);
    if (asked.picked) {
      settings.choosePreset(next.presetId);
    }
    setSource(from);
    setMat(asked.link.kind === 'valid' ? asked.link.link.matId : generation.startingMat());
    setNotice(linkNotice(asked.link));
    const seed = asked.link.kind === 'valid' ? asked.link.link.seed : randomSeed();
    void generation.runGeneration(
      next,
      seed,
      from,
      asked.enabledRules ?? generation.playerRules(next),
    );
  }

  // The library the page opened on. Another player's library, after a sign-in or sign-out, gets
  // a new board instead of the one the page was opened for.
  const entryOwner = useRef<string | null>(null);
  const startBoard = useEffectEvent(() => {
    entryOwner.current ??= library.owner;
    const action = startAction(
      entry,
      entryOwner.current === library.owner,
      editor.present !== null,
    );
    if (action.kind === 'openSaved') {
      openEntry(action.id);
    } else if (action.kind === 'fromEntry' && entry.kind === 'new') {
      openNew(entry);
    } else if (action.kind === 'startingBoard') {
      startingBoard();
    }
  });
  // A board waits for the player's settings, so that it starts on their game and rules.
  const ready =
    libraryLoaded && settings.ready && (entry.kind !== 'saved' || savedBoards.status !== 'loading');
  useEffect(() => {
    if (ready) {
      startBoard();
    }
  }, [ready, library.owner]);

  // A page that opens another board has nothing to follow for the board it replaces.
  const replacedSeen = useRef(entry.kind === 'keep' ? null : session.seenCollection);

  /** Takes pieces that left the library off the board, or starts over on other terrain. */
  const followCollection = useEffectEvent((seen: readonly TerrainPiece[] | null) => {
    session.setSeenCollection(collection);
    const change = collectionChange({
      seen,
      replaced: replacedSeen.current,
      collection,
      knownIds: input.knownIds,
      editor,
      source,
      saved: session.opened !== null,
    });
    switch (change.kind) {
      case 'ignore':
        return;
      case 'keepSavedTerrain':
        setSource({ kind: 'saved', pieces: change.pieces });
        setNotice(terrainChangedNotice(change.changed));
        return;
      case 'newBoard':
        generation.generateNew(randomSeed());
        setNotice(collectionSwitchedNotice(change.toSample));
        return;
      case 'followLibrary':
        if (change.missing > 0) {
          setNotice(removedNotice(change.missing));
        }
        dispatch({ type: 'collectionChanged', pieceIds: input.knownIds });
    }
  });
  const { seenCollection } = session;
  useEffect(() => {
    if (seenCollection !== collection) {
      followCollection(seenCollection);
    }
  }, [seenCollection, collection]);
  // Once the page's board is in place, every later change of terrain is followed.
  useEffect(() => {
    if (ready) {
      replacedSeen.current = null;
    }
  }, [ready]);

  const adoptLibrary = useEffectEvent(() => {
    if (adoptsLibrary(source, editor.present, ownCollection)) {
      setSource(OWN_SOURCE);
    }
  });
  useEffect(() => {
    if (libraryLoaded) {
      adoptLibrary();
    }
  }, [libraryLoaded, source, ownCollection]);
}

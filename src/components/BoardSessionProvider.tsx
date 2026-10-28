import { useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_PRESET_ID } from '../domain/presets';
import type { OpenedBoard } from '../domain/savedBoard';
import type { TerrainPiece } from '../domain/terrain';
import {
  BoardSessionContext,
  DEFAULT_DEPLOYMENT_ID,
  type BoardChoice,
  type BoardViewOptions,
  type CollectionSource,
} from '../hooks/boardSessionContext';
import { GUEST_OWNER, useTerrainLibrary } from '../hooks/libraryContext';
import { useLayoutEditor } from '../hooks/useLayoutEditor';

interface SessionState {
  /** Whose library the board was made from. */
  readonly owner: string;
  readonly choice: BoardChoice;
  readonly source: CollectionSource;
  readonly notice: string | null;
  readonly view: BoardViewOptions;
  readonly seenCollection: readonly TerrainPiece[] | null;
  readonly opened: OpenedBoard | null;
}

const DEFAULT_VIEW: BoardViewOptions = {
  snap: true,
  movePairs: true,
  showPhotos: true,
  showLane: true,
  showHidden: false,
  showDistances: false,
};

/**
 * Keeps the board while the player visits other pages. Signing out or switching accounts starts
 * afresh; a board made before signing in stays, with its terrain, so that it can be saved.
 */
export function BoardSessionProvider({ children }: { children: ReactNode }) {
  const { owner } = useTerrainLibrary();
  const [editor, dispatch] = useLayoutEditor();
  const [state, setState] = useState(() => freshSession(owner));
  if (state.owner !== owner) {
    if (state.owner === GUEST_OWNER && editor.present !== null) {
      setState(carriedSession(state, owner));
    } else {
      setState(freshSession(owner));
      dispatch({ type: 'cleared' });
    }
  }

  const session = useMemo(() => {
    const change = (next: Partial<SessionState>) => {
      setState((current) => ({ ...current, ...next }));
    };
    return {
      editor,
      dispatch,
      choice: state.choice,
      setChoice: (choice: BoardChoice) => {
        change({ choice });
      },
      source: state.source,
      setSource: (source: CollectionSource) => {
        change({ source });
      },
      notice: state.notice,
      setNotice: (notice: string | null) => {
        change({ notice });
      },
      view: state.view,
      setView: (viewChange: Partial<BoardViewOptions>) => {
        setState((current) => ({ ...current, view: { ...current.view, ...viewChange } }));
      },
      seenCollection: state.seenCollection,
      setSeenCollection: (seenCollection: readonly TerrainPiece[]) => {
        change({ seenCollection });
      },
      opened: state.opened,
      setOpened: (opened: OpenedBoard | null) => {
        change({ opened });
      },
    };
  }, [editor, dispatch, state]);

  return <BoardSessionContext.Provider value={session}>{children}</BoardSessionContext.Provider>;
}

function freshSession(owner: string): SessionState {
  return {
    owner,
    choice: { presetId: DEFAULT_PRESET_ID, deploymentId: DEFAULT_DEPLOYMENT_ID },
    source: { kind: 'own' },
    notice: null,
    view: DEFAULT_VIEW,
    seenCollection: null,
    opened: null,
  };
}

/** The guest's board, kept for the account that just signed in with the terrain it was made of. */
function carriedSession(state: SessionState, owner: string): SessionState {
  const pieces = state.source.kind === 'own' ? (state.seenCollection ?? []) : state.source.pieces;
  return {
    ...state,
    owner,
    source: { kind: 'saved', pieces },
    seenCollection: pieces,
    opened: null,
  };
}

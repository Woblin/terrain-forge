import { useMemo, useState, type ReactNode } from 'react';
import { PRESETS } from '../domain/presets';
import type { TerrainPiece } from '../domain/terrain';
import {
  BoardSessionContext,
  DEFAULT_DEPLOYMENT_ID,
  type BoardChoice,
  type BoardViewOptions,
  type CollectionSource,
} from '../hooks/boardSessionContext';
import { useTerrainLibrary } from '../hooks/libraryContext';
import { useLayoutEditor } from '../hooks/useLayoutEditor';

interface SessionState {
  /** Whose library the board was made from. */
  readonly owner: string;
  readonly choice: BoardChoice;
  readonly source: CollectionSource;
  readonly notice: string | null;
  readonly view: BoardViewOptions;
  readonly seenCollection: readonly TerrainPiece[] | null;
}

const DEFAULT_VIEW: BoardViewOptions = {
  snap: true,
  movePairs: true,
  showPhotos: true,
  showLane: true,
  showHidden: false,
};

/** Keeps the board while the player visits other pages. Signing in or out starts afresh. */
export function BoardSessionProvider({ children }: { children: ReactNode }) {
  const { owner } = useTerrainLibrary();
  const [editor, dispatch] = useLayoutEditor();
  const [state, setState] = useState(() => freshSession(owner));
  if (state.owner !== owner) {
    setState(freshSession(owner));
    dispatch({ type: 'cleared' });
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
    };
  }, [editor, dispatch, state]);

  return <BoardSessionContext.Provider value={session}>{children}</BoardSessionContext.Provider>;
}

function freshSession(owner: string): SessionState {
  return {
    owner,
    choice: { presetId: PRESETS[0]?.id ?? '', deploymentId: DEFAULT_DEPLOYMENT_ID },
    source: { kind: 'own' },
    notice: null,
    view: DEFAULT_VIEW,
    seenCollection: null,
  };
}

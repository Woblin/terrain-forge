import { useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { SAVED_PARAM } from '../domain/boardEntry';
import { boardLinkFor, type CollectionSource } from '../domain/boardSource';
import type { LayoutOrigin } from '../domain/editor';
import type { MatId } from '../domain/mats';
import type { OpenedBoard } from '../domain/savedBoard';
import type { TerrainPiece } from '../domain/terrain';

export interface BoardUrlInput {
  /** What the board was generated from; undefined before the first board. */
  readonly origin: LayoutOrigin | undefined;
  readonly source: CollectionSource;
  readonly ownCollection: readonly TerrainPiece[];
  readonly opened: OpenedBoard | null;
  readonly matId: MatId;
}

/**
 * Keeps the address on the board shown, without new history entries: the saved board's id, or
 * the board's share link. Gives the share link to copy.
 */
export function useBoardUrl({ origin, source, ownCollection, opened, matId }: BoardUrlInput): {
  readonly shareUrl: () => string;
} {
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (origin === undefined) {
      return;
    }
    const search =
      opened === null
        ? boardLinkFor(origin, source, ownCollection, matId)
        : new URLSearchParams([[SAVED_PARAM, opened.id]]).toString();
    if (searchParams.toString() !== search) {
      setSearchParams(search, { replace: true });
    }
  }, [origin, source, ownCollection, opened, matId, searchParams, setSearchParams]);

  return {
    /** The share link of the board, which makes the same board again, without hand edits. */
    shareUrl: () => {
      if (origin === undefined) {
        return window.location.href;
      }
      const search = boardLinkFor(origin, source, ownCollection, matId);
      return new URL(`/board?${search}`, window.location.origin).href;
    },
  };
}

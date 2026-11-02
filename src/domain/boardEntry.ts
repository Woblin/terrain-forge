import {
  boardLinkFor,
  DEFAULT_DEPLOYMENT_ID,
  OWN_SOURCE,
  type BoardChoice,
  type CollectionSource,
} from './boardSource';
import type { LayoutOrigin } from './editor';
import type { RuleId } from './fairness';
import type { MatId } from './mats';
import { findPreset } from './presets';
import { SAMPLE_COLLECTION } from './sampleCollection';
import { parseBoardLink, type ParsedBoardLink } from './shareLink';
import type { TerrainPiece } from './terrain';

/** The address parameter that names a saved board, as in `/board?saved=<id>`. */
export const SAVED_PARAM = 'saved';

/** The board kept from before the page opened, if any. */
export interface KeptBoard {
  /** What the kept board was generated from; null when there is no board yet. */
  readonly origin: LayoutOrigin | null;
  /** The saved board it was opened from or last saved as. */
  readonly openedId: string | null;
  readonly source: CollectionSource;
  readonly mat: MatId;
}

/** How the page opens: on the board kept from before, or on a new one. */
export type Entry =
  | { readonly kind: 'keep' }
  | { readonly kind: 'saved'; readonly id: string }
  | {
      readonly kind: 'new';
      readonly link: ParsedBoardLink;
      /** Null for the game the player starts on, which is known once their settings load. */
      readonly choice: BoardChoice | null;
      readonly source: CollectionSource;
      /** The rules a shared link was made with; null for the player's own. */
      readonly enabledRules: readonly RuleId[] | null;
      /** True when the player picked this game on another page, so it becomes their default. */
      readonly picked: boolean;
    };

/**
 * The page keeps the board from before, unless a different shared link is opened, a page asked
 * for a new board, or there is no board yet.
 */
export function boardEntry(
  kept: KeptBoard,
  own: readonly TerrainPiece[],
  search: string,
  routeState: unknown,
): Entry {
  const { origin } = kept;
  const asked = requestedBoard(routeState);
  const savedId = new URLSearchParams(search).get(SAVED_PARAM);
  if (savedId !== null && asked === null) {
    return origin !== null && kept.openedId === savedId
      ? { kind: 'keep' }
      : { kind: 'saved', id: savedId };
  }
  const keptSearch = origin === null ? null : boardLinkFor(origin, kept.source, own, kept.mat);
  if (origin !== null && asked === null && (search === '' || search === keptSearch)) {
    return { kind: 'keep' };
  }
  const link = parseBoardLink(search);
  if (link.kind === 'valid') {
    const { presetId, deploymentId, pieces, enabledRules } = link.link;
    return {
      kind: 'new',
      link,
      choice: { presetId, deploymentId },
      source: { kind: 'link', pieces: pieces ?? SAMPLE_COLLECTION },
      enabledRules: enabledRules ?? findPreset(presetId)?.defaultRules ?? null,
      picked: false,
    };
  }
  const presetId = asked?.presetId;
  return {
    kind: 'new',
    link,
    choice: presetId === undefined ? null : { presetId, deploymentId: DEFAULT_DEPLOYMENT_ID },
    source: OWN_SOURCE,
    enabledRules: null,
    picked: presetId !== undefined,
  };
}

/** Another page can ask for a new board, for a game system or for the one picked before. */
function requestedBoard(routeState: unknown): { presetId?: string } | null {
  if (typeof routeState !== 'object' || routeState === null) {
    return null;
  }
  if ('presetId' in routeState) {
    const { presetId } = routeState;
    return typeof presetId === 'string' && findPreset(presetId) !== undefined ? { presetId } : {};
  }
  return 'newBoard' in routeState && routeState.newBoard === true ? {} : null;
}

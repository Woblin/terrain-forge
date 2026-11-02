import type { LayoutOrigin } from './editor';
import { sameTerrain } from './libraryLink';
import type { MatId } from './mats';
import { SAMPLE_COLLECTION } from './sampleCollection';
import { boardLinkSearch } from './shareLink';
import type { TerrainPiece } from './terrain';

export const DEFAULT_DEPLOYMENT_ID = 'long-edges';

/** The game system and deployment picked for the next board. */
export interface BoardChoice {
  readonly presetId: string;
  readonly deploymentId: string;
}

/**
 * Where the board's pieces come from: the player's own terrain, a shared link, or terrain kept
 * with the board, such as a saved board whose pieces have changed in the library since.
 */
export type CollectionSource =
  | { readonly kind: 'own' }
  | { readonly kind: 'link'; readonly pieces: readonly TerrainPiece[] }
  | { readonly kind: 'saved'; readonly pieces: readonly TerrainPiece[] };

export const OWN_SOURCE: CollectionSource = { kind: 'own' };

/** Where the pieces shown beside the board come from, as the piece list names it. */
export type SourceKind = 'link' | 'saved' | 'sample' | 'library';

/** The pieces a board's link carries; none stands for the sample set. */
export function linkPieces(
  source: CollectionSource,
  own: readonly TerrainPiece[],
): readonly TerrainPiece[] | null {
  const pieces = source.kind === 'own' ? own : source.pieces;
  return pieces === SAMPLE_COLLECTION ? null : pieces;
}

/** Two sources give the same terrain: both the player's own, or the very same link. */
export function sameSource(a: CollectionSource, b: CollectionSource): boolean {
  return a === b || (a.kind === 'own' && b.kind === 'own');
}

/** A link to the player's own terrain, such as their own board reopened, shows their pieces. */
export function linksToOwn(source: CollectionSource, own: readonly TerrainPiece[]): boolean {
  return source.kind === 'link' && sameTerrain(source.pieces, own);
}

export function sourceKind(
  source: CollectionSource,
  collection: readonly TerrainPiece[],
): SourceKind {
  if (source.kind !== 'own') {
    return source.kind;
  }
  return collection === SAMPLE_COLLECTION ? 'sample' : 'library';
}

/** The address search of a board's share link, which makes the same board again. */
export function boardLinkFor(
  origin: LayoutOrigin,
  source: CollectionSource,
  own: readonly TerrainPiece[],
  matId: MatId,
): string {
  return boardLinkSearch({ ...origin, pieces: linkPieces(source, own), matId });
}

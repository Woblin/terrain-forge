import type { TerrainPiece, TerrainType } from './terrain';

/** How close terrain may stand to a table edge: right against it, or with room to pass. */
export interface EdgeSpacing {
  /** A piece this close to an edge hugs it, which leaves no strip to move along. */
  readonly hug: number;
  /** Any further from an edge than `hug`, a piece leaves at least this much room. */
  readonly open: number;
}

/**
 * How far apart terrain stands, so units can move between pieces. Distances are inches between
 * outlines. Changing these needs the product owner's approval.
 */
export interface SpacingRules {
  /** Smallest gap between two separate pieces. */
  readonly minGap: number;
  /** Pieces this close or closer are joined into one feature, which is no path for anyone. */
  readonly joinGap: number;
  /** Terrain units move over, such as hills; next to them `openGap` is enough. */
  readonly openTypes: readonly TerrainType[];
  readonly openGap: number;
  /** Null when pieces may stand anywhere outside the edge margin. */
  readonly edge: EdgeSpacing | null;
  /**
   * Share of each deployment zone's depth, along the player's own table edge, that stays free of
   * terrain so armies have room to deploy. Null when terrain may stand anywhere in a zone.
   */
  readonly clearZoneBack: number | null;
}

/** Room for rounding, so a gap measured at exactly the limit counts as meeting it. */
const TOLERANCE = 1e-9;

export function isOpenTerrain(piece: TerrainPiece, spacing: SpacingRules): boolean {
  return spacing.openTypes.includes(piece.type);
}

/** The gap two separate pieces need between them. */
export function requiredGap(a: TerrainPiece, b: TerrainPiece, spacing: SpacingRules): number {
  return isOpenTerrain(a, spacing) || isOpenTerrain(b, spacing) ? spacing.openGap : spacing.minGap;
}

/** Whether pieces this far apart stand as one feature. */
export function isJoined(gap: number, spacing: SpacingRules): boolean {
  return gap <= spacing.joinGap + TOLERANCE;
}

/** Whether pieces this far apart leave the gap they need. */
export function isApart(gap: number, required: number): boolean {
  return gap >= required - TOLERANCE;
}

/** Whether a piece this far from a table edge either hugs it or leaves room to pass. */
export function edgeGapAllowed(gap: number, edge: EdgeSpacing): boolean {
  return gap <= edge.hug + TOLERANCE || gap >= edge.open - TOLERANCE;
}

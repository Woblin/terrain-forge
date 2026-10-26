import {
  boundsOverlap,
  clipLine,
  clipSegment,
  distanceToPolygon,
  dot,
  polygonBounds,
  rotate,
  scale,
  type Bounds,
  type Interval,
  type Point,
  type Polygon,
} from './geometry';
import type { CoverValue, PlacedTerrain } from './terrain';

/** A piece that can stop line of sight, with its bounds kept for a quick first check. */
export interface SightObstacle {
  readonly polygon: Polygon;
  readonly bounds: Bounds;
  readonly los: 'blocks' | 'obscures';
}

/** A point this close to a cover piece, or inside it, counts as in cover. */
export const COVER_DISTANCE = 1;

const LANE_ANGLE_STEP = 15;
const LANE_SPACING = 2;

export function sightObstacles(terrain: readonly PlacedTerrain[]): SightObstacle[] {
  return terrain.flatMap(({ polygon, effect }) =>
    effect.los === 'none' ? [] : [{ polygon, bounds: polygonBounds(polygon), los: effect.los }],
  );
}

/**
 * Top-down line of sight: terrain that blocks stops any line crossing it, and terrain that
 * obscures stops a line only when it passes all the way through.
 */
export function hasLineOfSight(
  from: Point,
  to: Point,
  obstacles: readonly SightObstacle[],
): boolean {
  const lineBounds = polygonBounds([from, to]);
  return !obstacles.some(
    (obstacle) => boundsOverlap(obstacle.bounds, lineBounds) && stopsLine(obstacle, from, to),
  );
}

function stopsLine(obstacle: SightObstacle, from: Point, to: Point): boolean {
  const inside = clipSegment(obstacle.polygon, from, to);
  if (inside === null) {
    return false;
  }
  return obstacle.los === 'blocks' || (inside.start > 0 && inside.end < 1);
}

export function coverWeight(cover: CoverValue): number {
  return { none: 0, light: 0.5, heavy: 1 }[cover];
}

export function isInCover(point: Point, terrain: readonly PlacedTerrain[]): boolean {
  return terrain.some(
    ({ polygon, effect }) =>
      effect.cover !== 'none' && distanceToPolygon(point, polygon) <= COVER_DISTANCE,
  );
}

/**
 * The longest straight line inside `area` that no terrain stops and that stays out of the
 * `excluded` polygons (the deployment zones). Lines are sampled every 15 degrees and 2 inches.
 */
export function longestClearLane(
  area: Polygon,
  obstacles: readonly SightObstacle[],
  excluded: readonly Polygon[],
): number {
  const stoppers = [...obstacles.map((obstacle) => obstacle.polygon), ...excluded];
  let longest = 0;
  for (let angle = 0; angle < 180; angle += LANE_ANGLE_STEP) {
    for (const [origin, direction] of sampledLines(area, angle)) {
      const span = clipLine(area, origin, direction);
      if (span !== null) {
        const stopped = stoppers.flatMap((polygon) => clipLine(polygon, origin, direction) ?? []);
        longest = Math.max(longest, longestGap(span, stopped));
      }
    }
  }
  return longest;
}

/** Parallel lines at one angle, `LANE_SPACING` apart, covering the whole area. */
function sampledLines(area: Polygon, angle: number): [Point, Point][] {
  const direction = rotate({ x: 1, y: 0 }, angle);
  const normal = rotate({ x: 0, y: 1 }, angle);
  const offsets = area.map((corner) => dot(corner, normal));
  const lines: [Point, Point][] = [];
  const last = Math.max(...offsets);
  for (
    let offset = Math.min(...offsets) + LANE_SPACING / 2;
    offset < last;
    offset += LANE_SPACING
  ) {
    lines.push([scale(normal, offset), direction]);
  }
  return lines;
}

/** The longest part of `span` that none of the `stopped` intervals cover. */
export function longestGap(span: Interval, stopped: readonly Interval[]): number {
  const sorted = [...stopped].sort((a, b) => a.start - b.start);
  let longest = 0;
  let freeFrom = span.start;
  for (const interval of sorted) {
    longest = Math.max(longest, Math.min(interval.start, span.end) - freeFrom);
    freeFrom = Math.max(freeFrom, interval.end);
  }
  return Math.max(longest, span.end - freeFrom);
}

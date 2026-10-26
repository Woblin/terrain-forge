import {
  add,
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

/** A clear straight line, in inches. */
export interface Lane {
  readonly from: Point;
  readonly to: Point;
  readonly length: number;
}

/**
 * The longest straight line inside `area` that no terrain stops and that stays out of the
 * `excluded` polygons (the deployment zones). Lines are sampled every 15 degrees and 2 inches.
 */
export function findLongestClearLane(
  area: Polygon,
  obstacles: readonly SightObstacle[],
  excluded: readonly Polygon[],
): Lane | null {
  return clearLanes(area, obstacles, excluded).reduce<Lane | null>(
    (longest, lane) => (lane.length > (longest?.length ?? 0) ? lane : longest),
    null,
  );
}

/** The longest clear stretch on each sampled line. */
export function clearLanes(
  area: Polygon,
  obstacles: readonly SightObstacle[],
  excluded: readonly Polygon[],
): Lane[] {
  const stoppers = [...obstacles.map((obstacle) => obstacle.polygon), ...excluded];
  const lanes: Lane[] = [];
  for (let angle = 0; angle < 180; angle += LANE_ANGLE_STEP) {
    const direction = rotate({ x: 1, y: 0 }, angle);
    const normal = rotate({ x: 0, y: 1 }, angle);
    const reach = stoppers.map((polygon) => ({ polygon, across: projection(polygon, normal) }));
    for (const offset of laneOffsets(projection(area, normal))) {
      const origin = scale(normal, offset);
      const span = clipLine(area, origin, direction);
      if (span !== null) {
        const stopped = reach
          .filter(({ across }) => across.start <= offset && offset <= across.end)
          .flatMap(({ polygon }) => clipLine(polygon, origin, direction) ?? []);
        const gap = longestGap(span, stopped);
        lanes.push({
          from: add(origin, scale(direction, gap.start)),
          to: add(origin, scale(direction, gap.end)),
          length: gap.end - gap.start,
        });
      }
    }
  }
  return lanes;
}

/** How far the polygon reaches along `axis`. */
function projection(polygon: Polygon, axis: Point): Interval {
  const values = polygon.map((corner) => dot(corner, axis));
  return { start: Math.min(...values), end: Math.max(...values) };
}

/** Offsets of parallel lines `LANE_SPACING` apart, covering the whole range. */
function laneOffsets(range: Interval): number[] {
  const offsets: number[] = [];
  for (let offset = range.start + LANE_SPACING / 2; offset < range.end; offset += LANE_SPACING) {
    offsets.push(offset);
  }
  return offsets;
}

export function longestClearLane(
  area: Polygon,
  obstacles: readonly SightObstacle[],
  excluded: readonly Polygon[],
): number {
  return findLongestClearLane(area, obstacles, excluded)?.length ?? 0;
}

/** The longest part of `span` that none of the `stopped` intervals cover. */
export function longestGap(span: Interval, stopped: readonly Interval[]): Interval {
  const sorted = [...stopped].sort((a, b) => a.start - b.start);
  let longest: Interval = { start: span.start, end: span.start };
  let freeFrom = span.start;
  for (const interval of [...sorted, { start: span.end, end: span.end }]) {
    const freeTo = Math.min(interval.start, span.end);
    if (freeTo - freeFrom > longest.end - longest.start) {
      longest = { start: freeFrom, end: freeTo };
    }
    freeFrom = Math.max(freeFrom, interval.end);
  }
  return longest;
}

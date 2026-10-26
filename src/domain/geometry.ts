/** A point or vector on the board, in inches. */
export interface Point {
  readonly x: number;
  readonly y: number;
}

/** A convex polygon with its corners in counter-clockwise order. */
export type Polygon = readonly Point[];

export interface Bounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

/** A range of positions along a line, as parameters of `from + t * direction`. */
export interface Interval {
  readonly start: number;
  readonly end: number;
}

const EPSILON = 1e-9;

export function add(a: Point, b: Point): Point {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function subtract(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scale(p: Point, factor: number): Point {
  return { x: p.x * factor, y: p.y * factor };
}

export function dot(a: Point, b: Point): number {
  return a.x * b.x + a.y * b.y;
}

export function cross(a: Point, b: Point): number {
  return a.x * b.y - a.y * b.x;
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Rotates counter-clockwise around the origin. */
export function rotate(p: Point, degrees: number): Point {
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return { x: p.x * cos - p.y * sin, y: p.x * sin + p.y * cos };
}

/** Rotates a polygon around its own origin, then moves the origin to `position`. */
export function placePolygon(polygon: Polygon, position: Point, degrees: number): Polygon {
  return polygon.map((corner) => add(rotate(corner, degrees), position));
}

export function signedArea(polygon: Polygon): number {
  return edges(polygon).reduce((sum, [a, b]) => sum + cross(a, b), 0) / 2;
}

export function polygonArea(polygon: Polygon): number {
  return Math.abs(signedArea(polygon));
}

export function counterClockwise(polygon: Polygon): Polygon {
  return signedArea(polygon) < 0 ? [...polygon].reverse() : polygon;
}

export function centroid(polygon: Polygon): Point {
  const sum = polygon.reduce((total, corner) => add(total, corner), { x: 0, y: 0 });
  return scale(sum, 1 / polygon.length);
}

export function polygonBounds(polygon: Polygon): Bounds {
  const xs = polygon.map((corner) => corner.x);
  const ys = polygon.map((corner) => corner.y);
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
}

export function boundsOverlap(a: Bounds, b: Bounds, margin = 0): boolean {
  return (
    a.minX - margin <= b.maxX &&
    b.minX - margin <= a.maxX &&
    a.minY - margin <= b.maxY &&
    b.minY - margin <= a.maxY
  );
}

export function rectangle(minX: number, minY: number, maxX: number, maxY: number): Polygon {
  return [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: maxY },
    { x: minX, y: maxY },
  ];
}

/** Each side of the polygon as a pair of corners, in order. */
export function edges(polygon: Polygon): [Point, Point][] {
  return polygon.map((a, i) => [a, polygon[(i + 1) % polygon.length] as Point]);
}

/** True when the point is inside or on the edge of the polygon. */
export function containsPoint(polygon: Polygon, p: Point): boolean {
  return edges(polygon).every(([a, b]) => cross(subtract(b, a), subtract(p, a)) >= -EPSILON);
}

export function containsPolygon(outer: Polygon, inner: Polygon): boolean {
  return inner.every((corner) => containsPoint(outer, corner));
}

/**
 * The part of the line `from + t * direction` that lies inside the polygon, or `null` if the
 * line misses it (Cyrus-Beck clipping).
 */
export function clipLine(polygon: Polygon, from: Point, direction: Point): Interval | null {
  let start = -Infinity;
  let end = Infinity;
  // Hot path for line of sight: plain arithmetic, no allocations.
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i] as Point;
    const b = polygon[(i + 1) % polygon.length] as Point;
    const edgeX = b.x - a.x;
    const edgeY = b.y - a.y;
    const offset = edgeX * (from.y - a.y) - edgeY * (from.x - a.x);
    const rate = edgeX * direction.y - edgeY * direction.x;
    if (Math.abs(rate) < EPSILON) {
      if (offset < 0) {
        return null;
      }
    } else if (rate > 0) {
      start = Math.max(start, -offset / rate);
    } else {
      end = Math.min(end, -offset / rate);
    }
  }
  return start > end ? null : { start, end };
}

/** The part of the segment from `a` to `b` inside the polygon, as parameters in [0, 1]. */
export function clipSegment(polygon: Polygon, a: Point, b: Point): Interval | null {
  const clipped = clipLine(polygon, a, subtract(b, a));
  if (clipped === null) {
    return null;
  }
  const start = Math.max(clipped.start, 0);
  const end = Math.min(clipped.end, 1);
  return start < end ? { start, end } : null;
}

export function distanceToSegment(p: Point, a: Point, b: Point): number {
  const segment = subtract(b, a);
  const lengthSquared = dot(segment, segment);
  if (lengthSquared < EPSILON) {
    return distance(p, a);
  }
  const t = Math.min(1, Math.max(0, dot(subtract(p, a), segment) / lengthSquared));
  return distance(p, add(a, scale(segment, t)));
}

export function segmentsIntersect(a1: Point, a2: Point, b1: Point, b2: Point): boolean {
  const a = subtract(a2, a1);
  const b = subtract(b2, b1);
  const d1 = cross(a, subtract(b1, a1));
  const d2 = cross(a, subtract(b2, a1));
  const d3 = cross(b, subtract(a1, b1));
  const d4 = cross(b, subtract(a2, b1));
  return d1 * d2 <= 0 && d3 * d4 <= 0 && !(d1 === 0 && d2 === 0 && d3 === 0 && d4 === 0);
}

export function segmentDistance(a1: Point, a2: Point, b1: Point, b2: Point): number {
  if (segmentsIntersect(a1, a2, b1, b2)) {
    return 0;
  }
  return Math.min(
    distanceToSegment(a1, b1, b2),
    distanceToSegment(a2, b1, b2),
    distanceToSegment(b1, a1, a2),
    distanceToSegment(b2, a1, a2),
  );
}

/** Zero when the point is inside the polygon. */
export function distanceToPolygon(p: Point, polygon: Polygon): number {
  if (containsPoint(polygon, p)) {
    return 0;
  }
  return Math.min(...edges(polygon).map(([a, b]) => distanceToSegment(p, a, b)));
}

/** Separating axis test. Polygons that only touch do not overlap. */
export function polygonsOverlap(a: Polygon, b: Polygon): boolean {
  return !hasSeparatingAxis(a, b) && !hasSeparatingAxis(b, a);
}

function hasSeparatingAxis(a: Polygon, b: Polygon): boolean {
  return edges(a).some(([start, end]) => {
    const edge = subtract(end, start);
    const normal = { x: edge.y, y: -edge.x };
    const [minA, maxA] = project(a, normal);
    const [minB, maxB] = project(b, normal);
    return maxA <= minB + EPSILON || maxB <= minA + EPSILON;
  });
}

function project(polygon: Polygon, axis: Point): [number, number] {
  const values = polygon.map((corner) => dot(corner, axis));
  return [Math.min(...values), Math.max(...values)];
}

/** Shortest distance between two polygons; zero when they overlap. */
export function polygonDistance(a: Polygon, b: Polygon): number {
  if (polygonsOverlap(a, b)) {
    return 0;
  }
  let nearest = Infinity;
  for (const [a1, a2] of edges(a)) {
    for (const [b1, b2] of edges(b)) {
      nearest = Math.min(nearest, segmentDistance(a1, a2, b1, b2));
    }
  }
  return nearest;
}

/** The part of the polygon on the side of the line where `normal` points (Sutherland-Hodgman). */
export function clipToHalfPlane(polygon: Polygon, linePoint: Point, normal: Point): Polygon {
  const side = (p: Point): number => dot(subtract(p, linePoint), normal);
  const result: Point[] = [];
  for (const [a, b] of edges(polygon)) {
    const sideA = side(a);
    const sideB = side(b);
    if (sideA >= 0) {
      result.push(a);
    }
    if (sideA >= 0 !== sideB >= 0) {
      result.push(add(a, scale(subtract(b, a), sideA / (sideA - sideB))));
    }
  }
  return result;
}

/** Grid points inside the polygon, `spacing` apart, starting half a spacing in from its bounds. */
export function gridPoints(polygon: Polygon, spacing: number): Point[] {
  const bounds = polygonBounds(polygon);
  const points: Point[] = [];
  for (let y = bounds.minY + spacing / 2; y <= bounds.maxY; y += spacing) {
    for (let x = bounds.minX + spacing / 2; x <= bounds.maxX; x += spacing) {
      const p = { x, y };
      if (containsPoint(polygon, p)) {
        points.push(p);
      }
    }
  }
  return points;
}

/** Points along a segment, at most `spacing` apart, both ends included. */
export function pointsAlong(a: Point, b: Point, spacing: number): Point[] {
  const steps = Math.max(1, Math.ceil(distance(a, b) / spacing));
  return Array.from({ length: steps + 1 }, (_, i) => add(a, scale(subtract(b, a), i / steps)));
}

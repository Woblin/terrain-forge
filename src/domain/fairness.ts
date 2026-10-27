import { boardArea, PLAYERS, type Board, type DeploymentMap, type PlayerId } from './board';
import {
  add,
  centroid,
  clipToHalfPlane,
  containsPoint,
  distanceToPolygon,
  edges,
  gridPoints,
  pointsAlong,
  polygonArea,
  polygonDistance,
  scale,
  subtract,
  type Point,
  type Polygon,
} from './geometry';
import {
  coverWeight,
  findLongestClearLane,
  hasLineOfSight,
  sightObstacles,
  type Lane,
  type SightObstacle,
} from './lineOfSight';
import { laneArea } from './laneBreaking';
import type { BalanceRules } from './presets';
import type { PlacedTerrain } from './terrain';

export type RuleId =
  'hiddenDeployment' | 'coverInReach' | 'nearestCover' | 'halfBoard' | 'clearLane' | 'coverage';

export type PerPlayer = Readonly<Record<PlayerId, number>>;

export interface FairnessReport {
  /** R1: share of each zone that no point in the enemy zone can see. */
  readonly hiddenDeployment: PerPlayer;
  /** R2: weighted cover area within reach of each zone, in square inches. */
  readonly coverInReach: PerPlayer;
  /** R3: average distance from each zone's front edge to the nearest cover, in inches. */
  readonly nearestCover: PerPlayer;
  /** R4: terrain area in each player's half of the board, in square inches. */
  readonly halfBoard: PerPlayer;
  /** R5: longest clear straight line through midfield, in inches. */
  readonly longestClearLane: number;
  /** R6: share of the board covered by terrain. */
  readonly coverage: number;
  readonly failedRules: readonly RuleId[];
  /** Sum of the R1 to R4 differences, each divided by its tolerance. 0 is perfectly even. */
  readonly imbalance: number;
}

export interface FairnessInput {
  readonly board: Board;
  readonly deployment: DeploymentMap;
  readonly terrain: readonly PlacedTerrain[];
  readonly reach: number;
  readonly edgeMargin: number;
  readonly balance: BalanceRules;
}

/** Spacing of the sample points used for line of sight inside each zone. */
export const ZONE_SAMPLE_SPACING = 3;
/** Spacing of the sample points along each zone's front edge. */
const FRONT_EDGE_SAMPLE_SPACING = 1;

/** The fairness report with what R1 and R5 found, so the board can draw them. */
export interface FairnessDetails {
  readonly report: FairnessReport;
  /** R5: the longest clear lane, or null when every line is blocked. */
  readonly lane: Lane | null;
  /** R1: the sample points in each zone that the enemy zone cannot see. */
  readonly hidden: Readonly<Record<PlayerId, readonly Point[]>>;
}

export function evaluateFairness(input: FairnessInput): FairnessReport {
  return explainFairness(input).report;
}

export function explainFairness(input: FairnessInput): FairnessDetails {
  const { board, deployment, terrain, reach, edgeMargin, balance } = input;
  const obstacles = sightObstacles(terrain);
  const hiddenPoints = hiddenDeploymentPoints(deployment, obstacles);
  const lane = findLongestClearLane(
    laneArea(board, edgeMargin),
    obstacles,
    PLAYERS.map((player) => deployment.zones[player]),
  );
  const measures = {
    hiddenDeployment: hiddenShares(hiddenPoints),
    coverInReach: measureCoverInReach(deployment, terrain, reach),
    nearestCover: measureNearestCover(board, deployment, terrain),
    halfBoard: measureHalfBoard(deployment, terrain),
    longestClearLane: lane?.length ?? 0,
    coverage: measureCoverage(board, terrain),
  };
  const report = {
    ...measures,
    failedRules: failedRules(measures, balance),
    imbalance: imbalance(measures, balance),
  };
  return { report, lane, hidden: hiddenPoints.hidden };
}

type Measures = Omit<FairnessReport, 'failedRules' | 'imbalance'>;

function failedRules(measures: Measures, balance: BalanceRules): RuleId[] {
  const { hiddenDeployment, coverInReach, nearestCover, halfBoard } = measures;
  const broken: Record<RuleId, boolean> = {
    hiddenDeployment:
      difference(hiddenDeployment) > balance.hiddenDeploymentMaxDifference ||
      Math.min(hiddenDeployment.A, hiddenDeployment.B) < balance.hiddenDeploymentMinShare,
    coverInReach: relativeDifference(coverInReach) > balance.coverInReachMaxDifference,
    nearestCover: difference(nearestCover) > balance.nearestCoverMaxDifference,
    halfBoard: relativeDifference(halfBoard) > balance.halfBoardMaxDifference,
    clearLane: measures.longestClearLane > balance.maxClearLane,
    coverage: measures.coverage < balance.coverage.min || measures.coverage > balance.coverage.max,
  };
  return (Object.keys(broken) as RuleId[]).filter((rule) => broken[rule]);
}

function imbalance(measures: Measures, balance: BalanceRules): number {
  return (
    difference(measures.hiddenDeployment) / balance.hiddenDeploymentMaxDifference +
    relativeDifference(measures.coverInReach) / balance.coverInReachMaxDifference +
    difference(measures.nearestCover) / balance.nearestCoverMaxDifference +
    relativeDifference(measures.halfBoard) / balance.halfBoardMaxDifference
  );
}

export function difference(values: PerPlayer): number {
  return Math.abs(values.A - values.B);
}

/** The difference as a share of the larger value; 0 when both are 0. */
export function relativeDifference(values: PerPlayer): number {
  const larger = Math.max(values.A, values.B);
  return larger === 0 ? 0 : difference(values) / larger;
}

function perPlayer(measure: (player: PlayerId) => number): PerPlayer {
  return { A: measure('A'), B: measure('B') };
}

function enemyOf(player: PlayerId): PlayerId {
  return player === 'A' ? 'B' : 'A';
}

/** R1 */
function hiddenShares({ samples, hidden }: HiddenDeploymentPoints): PerPlayer {
  return perPlayer((player) => {
    const own = samples[player];
    return own.length === 0 ? 0 : hidden[player].length / own.length;
  });
}

/** The sample points R1 uses in each zone, and those that no point in the enemy zone can see. */
export interface HiddenDeploymentPoints {
  readonly samples: Readonly<Record<PlayerId, readonly Point[]>>;
  readonly hidden: Readonly<Record<PlayerId, readonly Point[]>>;
}

export function hiddenDeploymentPoints(
  deployment: DeploymentMap,
  obstacles: readonly SightObstacle[],
): HiddenDeploymentPoints {
  const samples = perPlayerPoints((player) =>
    deployableSamples(deployment.zones[player], obstacles),
  );
  const hidden = perPlayerPoints((player) => {
    const enemy = samples[enemyOf(player)];
    return samples[player].filter((p) => !enemy.some((e) => hasLineOfSight(e, p, obstacles)));
  });
  return { samples, hidden };
}

function perPlayerPoints(sample: (player: PlayerId) => Point[]): Record<PlayerId, Point[]> {
  return { A: sample('A'), B: sample('B') };
}

/** Grid points in the zone, leaving out points inside terrain that blocks line of sight. */
function deployableSamples(zone: Polygon, obstacles: readonly SightObstacle[]): Point[] {
  return gridPoints(zone, ZONE_SAMPLE_SPACING).filter(
    (p) => !obstacles.some((o) => o.los === 'blocks' && containsPoint(o.polygon, p)),
  );
}

/** R2 */
export function measureCoverInReach(
  deployment: DeploymentMap,
  terrain: readonly PlacedTerrain[],
  reach: number,
): PerPlayer {
  return perPlayer((player) =>
    terrain
      .filter(({ polygon }) => polygonDistance(polygon, deployment.zones[player]) <= reach)
      .reduce(
        (sum, { polygon, effect }) => sum + polygonArea(polygon) * coverWeight(effect.cover),
        0,
      ),
  );
}

/** R3. With no cover on the board, both players get the board diagonal. */
export function measureNearestCover(
  board: Board,
  deployment: DeploymentMap,
  terrain: readonly PlacedTerrain[],
): PerPlayer {
  const cover = terrain.filter(({ effect }) => effect.cover !== 'none');
  const diagonal = Math.hypot(board.width, board.depth);
  return perPlayer((player) => {
    const points = frontEdgePoints(deployment.zones[player], board);
    const distances = points.map((p) =>
      Math.min(diagonal, ...cover.map(({ polygon }) => distanceToPolygon(p, polygon))),
    );
    return distances.reduce((sum, d) => sum + d, 0) / Math.max(1, distances.length);
  });
}

/** Points along the zone edges that face the board, not the table edge. */
function frontEdgePoints(zone: Polygon, board: Board): Point[] {
  return edges(zone)
    .filter(([a, b]) => !onSameBoardEdge(a, b, board))
    .flatMap(([a, b]) => pointsAlong(a, b, FRONT_EDGE_SAMPLE_SPACING));
}

function onSameBoardEdge(a: Point, b: Point, board: Board): boolean {
  return (
    (a.x === 0 && b.x === 0) ||
    (a.y === 0 && b.y === 0) ||
    (a.x === board.width && b.x === board.width) ||
    (a.y === board.depth && b.y === board.depth)
  );
}

/** R4. Each player's half is the side of the line halfway between the two zones. */
export function measureHalfBoard(
  deployment: DeploymentMap,
  terrain: readonly PlacedTerrain[],
): PerPlayer {
  const centreA = centroid(deployment.zones.A);
  const centreB = centroid(deployment.zones.B);
  const middle = scale(add(centreA, centreB), 0.5);
  const towardA = subtract(centreA, centreB);
  return perPlayer((player) => {
    const toward = player === 'A' ? towardA : scale(towardA, -1);
    return terrain.reduce(
      (sum, { polygon }) => sum + polygonArea(clipToHalfPlane(polygon, middle, toward)),
      0,
    );
  });
}

/** R6 */
export function measureCoverage(board: Board, terrain: readonly PlacedTerrain[]): number {
  const area = terrain.reduce((sum, { polygon }) => sum + polygonArea(polygon), 0);
  return area / boardArea(board);
}

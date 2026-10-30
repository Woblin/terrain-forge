import type { RuleId } from './fairness';

/** How close a board's two sides are, in words. */
export type BalanceGrade = 'Nearly even' | 'Slightly uneven' | 'Uneven' | 'Close to the limit';

export interface BalanceReading {
  /** Where the marker sits: 0 is identical sides, 1 is every rule at its limit. */
  readonly position: number;
  readonly grade: BalanceGrade;
}

/** The rules that add to the imbalance score, each up to 1 at its limit. */
const SCORED_RULES: readonly RuleId[] = [
  'hiddenDeployment',
  'coverInReach',
  'nearestCover',
  'halfBoard',
];

/** The highest score a board can have while every scored rule that is on still passes. */
export function maxImbalance(enabledRules: readonly RuleId[]): number {
  return SCORED_RULES.filter((rule) => enabledRules.includes(rule)).length;
}

/**
 * The imbalance score as a share of the most it can be, and its grade; null when no rule
 * that adds to the score is on.
 */
export function readBalance(
  imbalance: number,
  enabledRules: readonly RuleId[],
): BalanceReading | null {
  const max = maxImbalance(enabledRules);
  if (max === 0) {
    return null;
  }
  const position = Math.min(Math.max(imbalance / max, 0), 1);
  return { position, grade: gradeOf(position) };
}

function gradeOf(position: number): BalanceGrade {
  if (position < 0.1) {
    return 'Nearly even';
  }
  if (position < 0.4) {
    return 'Slightly uneven';
  }
  return position < 0.75 ? 'Uneven' : 'Close to the limit';
}

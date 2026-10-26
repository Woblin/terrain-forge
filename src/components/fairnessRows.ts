import type { FairnessReport, PerPlayer, RuleId } from '../domain/fairness';
import type { BalanceRules } from '../domain/presets';
import { formatArea, formatLength, type LengthUnit } from '../domain/units';

export interface RuleRow {
  readonly id: RuleId;
  readonly code: string;
  readonly name: string;
  /** One value per player, or one value for the whole board. */
  readonly values: readonly [string, string] | string;
  readonly limit: string;
}

export const RULE_ORDER: readonly RuleId[] = [
  'hiddenDeployment',
  'coverInReach',
  'nearestCover',
  'halfBoard',
  'clearLane',
  'coverage',
];

export const RULE_NAMES: Readonly<Record<RuleId, { code: string; name: string }>> = {
  hiddenDeployment: { code: 'R1', name: 'Hidden deployment' },
  coverInReach: { code: 'R2', name: 'Cover within reach' },
  nearestCover: { code: 'R3', name: 'Distance to nearest cover' },
  halfBoard: { code: 'R4', name: 'Terrain in each half' },
  clearLane: { code: 'R5', name: 'Longest clear lane' },
  coverage: { code: 'R6', name: 'Board covered' },
};

export function ruleRows(
  report: FairnessReport,
  balance: BalanceRules,
  unit: LengthUnit,
): RuleRow[] {
  const percent = (share: number) => `${String(Math.round(share * 100))}%`;
  const both = (values: PerPlayer, format: (value: number) => string) =>
    [format(values.A), format(values.B)] as const;
  const area = (value: number) => formatArea(value, unit);
  const length = (value: number) => formatLength(value, unit);
  const rows: Readonly<Record<RuleId, Omit<RuleRow, 'id' | 'code' | 'name'>>> = {
    hiddenDeployment: {
      values: both(report.hiddenDeployment, percent),
      limit: `each ≥ ${percent(balance.hiddenDeploymentMinShare)}, gap ≤ ${percent(balance.hiddenDeploymentMaxDifference)}`,
    },
    coverInReach: {
      values: both(report.coverInReach, area),
      limit: `gap ≤ ${percent(balance.coverInReachMaxDifference)}`,
    },
    nearestCover: {
      values: both(report.nearestCover, length),
      limit: `gap ≤ ${length(balance.nearestCoverMaxDifference)}`,
    },
    halfBoard: {
      values: both(report.halfBoard, area),
      limit: `gap ≤ ${percent(balance.halfBoardMaxDifference)}`,
    },
    clearLane: {
      values: length(report.longestClearLane),
      limit: `at most ${length(balance.maxClearLane)}`,
    },
    coverage: {
      values: percent(report.coverage),
      limit: `${percent(balance.coverage.min)} to ${percent(balance.coverage.max)}`,
    },
  };
  return RULE_ORDER.map((id) => ({ id, ...RULE_NAMES[id], ...rows[id] }));
}

export function joinWithAnd(items: readonly string[]): string {
  return items.length <= 1
    ? items.join('')
    : `${items.slice(0, -1).join(', ')} and ${items.at(-1) ?? ''}`;
}

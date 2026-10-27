import { useState } from 'react';
import type { BoardAnalysis } from '../domain/boardAnalysis';
import { RULE_IDS, type FairnessReport, type RuleId } from '../domain/fairness';
import type { BalanceRules } from '../domain/presets';
import type { LengthUnit } from '../domain/units';
import { ClosestBoardNote } from './ClosestBoardNote';
import { FairnessRuleRow } from './FairnessRuleRow';
import { FairnessVerdict } from './FairnessVerdict';
import { Switch } from './Switch';
import { RULE_NAMES, ruleRows } from './fairnessRows';

interface FairnessPanelProps {
  analysis: BoardAnalysis | null;
  /** False while the shown analysis belongs to an older version of the board. */
  current: boolean;
  error: string | null;
  balance: BalanceRules | null;
  /** The rules the board was generated with; the others show as off. */
  enabledRules: readonly RuleId[];
  edited: boolean;
  /** How many pieces break the placement rules (gaps, table edge, deployment zones). */
  misplaced: number;
  warnings: readonly string[];
  unit: LengthUnit;
  showLane: boolean;
  showHidden: boolean;
  onShowLaneChange: (show: boolean) => void;
  onShowHiddenChange: (show: boolean) => void;
}

/** The six balance rules for the board on show, each with both players' values and its limit. */
export function FairnessPanel({
  analysis,
  current,
  error,
  balance,
  enabledRules,
  edited,
  misplaced,
  warnings,
  unit,
  showLane,
  showHidden,
  onShowLaneChange,
  onShowHiddenChange,
}: FairnessPanelProps) {
  const report = analysis?.report ?? null;
  const [shownReport, setShownReport] = useState(report);
  const [announcement, setAnnouncement] = useState('');
  if (report !== shownReport) {
    setShownReport(report);
    setAnnouncement(describeChange(shownReport, report));
  }

  return (
    <section aria-label="Fairness" className="space-y-3">
      {!current && report !== null && (
        <p className="text-muted text-right text-xs" aria-hidden="true">
          Updating…
        </p>
      )}
      {report === null || balance === null ? (
        <p className="text-muted text-sm">{error ?? 'Generate a board to see how fair it is.'}</p>
      ) : (
        <>
          <FairnessVerdict
            report={report}
            edited={edited}
            allRulesOn={enabledRules.length === RULE_IDS.length}
          />
          {!edited && report.failedRules.length > 0 && (
            <ClosestBoardNote failedRules={report.failedRules} />
          )}
          {misplaced > 0 && (
            <p className="text-fail text-sm">
              ⚠ {misplaced === 1 ? '1 piece breaks' : `${String(misplaced)} pieces break`} the
              placement rules. Select a piece with a red outline to see why.
            </p>
          )}
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted text-left text-xs">
                <th scope="col" className="py-1 font-normal">
                  Rule
                </th>
                <th scope="col" className="py-1 text-right font-normal">
                  A
                </th>
                <th scope="col" className="py-1 text-right font-normal">
                  B
                </th>
                <th scope="col" className="py-1 text-right font-normal">
                  Result
                </th>
              </tr>
            </thead>
            <tbody>
              {ruleRows(report, balance, unit).map((row) => (
                <FairnessRuleRow
                  key={row.id}
                  row={row}
                  failed={report.failedRules.includes(row.id)}
                  off={!enabledRules.includes(row.id)}
                />
              ))}
            </tbody>
          </table>
          <p className="text-muted text-xs">
            Imbalance score {report.imbalance.toFixed(2)} (0 is perfectly even).
          </p>
          {error !== null && (
            <p role="alert" className="text-fail text-sm">
              {error}
            </p>
          )}
        </>
      )}
      {warnings.length > 0 && (
        <ul className="text-warn-ink list-disc space-y-1 pl-5 text-sm">
          {warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}
      <fieldset className="border-line border-t pt-2">
        <legend className="sr-only">Show on the board</legend>
        <Switch checked={showLane} onChange={onShowLaneChange}>
          Show the longest clear lane
        </Switch>
        <Switch checked={showHidden} onChange={onShowHiddenChange}>
          Show hidden deployment areas
        </Switch>
      </fieldset>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </section>
  );
}

/** What a screen reader hears when rules start or stop failing. */
function describeChange(before: FairnessReport | null, after: FairnessReport | null): string {
  if (before === null || after === null) {
    return '';
  }
  const label = (rule: RuleId) => `${RULE_NAMES[rule].code} ${RULE_NAMES[rule].name}`;
  const nowFailing = after.failedRules.filter((rule) => !before.failedRules.includes(rule));
  const nowPassing = before.failedRules.filter((rule) => !after.failedRules.includes(rule));
  return [
    ...nowFailing.map((rule) => `${label(rule)} now fails.`),
    ...nowPassing.map((rule) => `${label(rule)} passes again.`),
  ].join(' ');
}

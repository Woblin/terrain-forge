import { SparklesIcon } from 'lucide-react';
import type { BoardAnalysis } from '../domain/boardAnalysis';
import { RULE_IDS, type RuleId } from '../domain/fairness';
import type { BalanceRules } from '../domain/presets';
import type { LengthUnit } from '../domain/units';
import { BalanceMeter } from './BalanceMeter';
import { BUTTON_STYLES } from './buttonStyles';
import { ClosestBoardNote } from './ClosestBoardNote';
import { FairnessRuleRow } from './FairnessRuleRow';
import { FairnessVerdict } from './FairnessVerdict';
import { ruleRows } from './fairnessRows';
import { SectionHeading } from './SectionHeading';
import { Switch } from './Switch';
import { TextButton } from './TextButton';

/** The balance rules the next board must pass, as the player has switched them. */
export interface RuleChoice {
  readonly chosen: readonly RuleId[];
  readonly onChange: (rule: RuleId, chosen: boolean) => void;
  /** False when this game's rules and the board options are already as they start. */
  readonly canReset: boolean;
  readonly onReset: () => void;
}

interface FairnessPanelProps {
  /** The id of the rule list, so that other controls can bring it into view. */
  rulesId: string;
  analysis: BoardAnalysis | null;
  /** False while the shown analysis belongs to an older version of the board. */
  current: boolean;
  error: string | null;
  balance: BalanceRules | null;
  /** The rules the board was generated with; the others show as off. */
  enabledRules: readonly RuleId[];
  rules: RuleChoice;
  edited: boolean;
  /** How many pieces break the placement rules (gaps, table edge, deployment zones). */
  misplaced: number;
  warnings: readonly string[];
  unit: LengthUnit;
  generating: boolean;
  onGenerate: () => void;
  showLane: boolean;
  showHidden: boolean;
  onShowLaneChange: (show: boolean) => void;
  onShowHiddenChange: (show: boolean) => void;
}

/** How fair the board on show is, rule by rule, with the switches for the next board's rules. */
export function FairnessPanel({
  rulesId,
  analysis,
  current,
  error,
  balance,
  enabledRules,
  rules,
  edited,
  misplaced,
  warnings,
  unit,
  generating,
  onGenerate,
  showLane,
  showHidden,
  onShowLaneChange,
  onShowHiddenChange,
}: FairnessPanelProps) {
  const report = analysis?.report ?? null;
  const rows = report === null || balance === null ? null : ruleRows(report, balance, unit);
  const changed = report !== null && !sameRules(rules.chosen, enabledRules);

  return (
    <section aria-label="Fairness" className="space-y-3">
      {!current && report !== null && (
        <p className="text-muted text-right text-xs" aria-hidden="true">
          Updating…
        </p>
      )}
      {report === null ? (
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
        </>
      )}
      <fieldset id={rulesId} tabIndex={-1} className="scroll-mt-4 outline-none">
        <legend className="w-full pb-1">
          <SectionHeading as="span">Balance rules</SectionHeading>
        </legend>
        <ul>
          {RULE_IDS.map((rule) => (
            <FairnessRuleRow
              key={rule}
              rule={rule}
              row={rows?.find((row) => row.id === rule) ?? null}
              chosen={rules.chosen.includes(rule)}
              onChosenChange={(chosen) => {
                rules.onChange(rule, chosen);
              }}
              failed={report?.failedRules.includes(rule) ?? false}
              off={report !== null && !enabledRules.includes(rule)}
            />
          ))}
        </ul>
        <p className="text-muted mt-2 text-sm">
          Switches set which rules the next board must pass. Rules that are off are still measured.{' '}
          <TextButton onClick={rules.onReset} disabled={!rules.canReset}>
            Reset to defaults
          </TextButton>
        </p>
      </fieldset>
      {changed && (
        <div className="border-warn-line bg-warn-soft text-warn-ink flex items-center justify-between gap-3 rounded-[3px] border py-1.5 pr-1.5 pl-3 text-sm">
          <p>Rules changed. Generate to apply them.</p>
          <button
            type="button"
            disabled={generating}
            onClick={onGenerate}
            className={`${BUTTON_STYLES.primary} shrink-0 px-3 py-1 text-base`}
          >
            <SparklesIcon className="size-4" aria-hidden="true" />
            Generate
          </button>
        </div>
      )}
      {report !== null && <BalanceMeter imbalance={report.imbalance} enabledRules={enabledRules} />}
      {error !== null && report !== null && (
        <p role="alert" className="text-fail text-sm">
          {error}
        </p>
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
    </section>
  );
}

function sameRules(a: readonly RuleId[], b: readonly RuleId[]): boolean {
  return a.length === b.length && a.every((rule) => b.includes(rule));
}

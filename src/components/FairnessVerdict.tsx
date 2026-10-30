import { CheckIcon, XIcon } from 'lucide-react';
import type { FairnessReport } from '../domain/fairness';
import { joinWithAnd, RULE_NAMES } from './fairnessRows';

interface FairnessVerdictProps {
  report: FairnessReport;
  edited: boolean;
  /** False when some rules are switched off. */
  allRulesOn: boolean;
  /** Smaller, for the one line a phone shows under the board. */
  compact?: boolean;
}

/** One line saying whether the board passes every balance rule, and which ones it breaks. */
export function FairnessVerdict({
  report,
  edited,
  allRulesOn,
  compact = false,
}: FairnessVerdictProps) {
  const size = compact ? 'px-2.5 py-1.5 text-sm' : 'px-3 py-2';
  const failed = report.failedRules.map((rule) => RULE_NAMES[rule].code);
  const passed = failed.length === 0;
  const Icon = passed ? CheckIcon : XIcon;
  const text = passed
    ? passText(edited, allRulesOn, compact)
    : `${edited ? 'Edited' : 'Generated'}, breaks ${joinWithAnd(failed)}`;
  return (
    <p
      title={compact ? text : undefined}
      className={`flex items-center gap-2 rounded-[3px] border font-semibold ${passed ? 'bg-pass-soft border-pass-line text-pass' : 'bg-fail-soft border-fail-line text-fail'} ${size}`}
    >
      <Icon className="size-[18px] shrink-0" aria-hidden="true" />
      <span className={compact ? 'truncate' : ''}>{text}</span>
    </p>
  );
}

function passText(edited: boolean, allRulesOn: boolean, compact: boolean): string {
  const rules = allRulesOn ? 'all rules' : compact ? 'rules that are on' : 'all rules that are on';
  if (!edited) {
    return `Passes ${rules}`;
  }
  return compact ? `Edited, passes ${rules}` : `Edited, still passes ${rules}`;
}

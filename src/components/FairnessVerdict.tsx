import { CheckIcon, XIcon } from 'lucide-react';
import type { FairnessReport } from '../domain/fairness';
import { joinWithAnd, RULE_NAMES } from './fairnessRows';

interface FairnessVerdictProps {
  report: FairnessReport;
  edited: boolean;
  /** False when some rules are switched off. */
  allRulesOn: boolean;
}

/** One line saying whether the board passes every balance rule, and which ones it breaks. */
export function FairnessVerdict({ report, edited, allRulesOn }: FairnessVerdictProps) {
  const failed = report.failedRules.map((rule) => RULE_NAMES[rule].code);
  const passed = failed.length === 0;
  const Icon = passed ? CheckIcon : XIcon;
  const text = passed
    ? passText(edited, allRulesOn)
    : `${edited ? 'Edited' : 'Generated'}, breaks ${joinWithAnd(failed)}`;
  return (
    <p
      className={`flex items-center gap-2 rounded-[3px] border px-3 py-2 font-semibold ${passed ? 'bg-pass-soft border-pass-line text-pass' : 'bg-fail-soft border-fail-line text-fail'}`}
    >
      <Icon className="size-[18px] shrink-0" aria-hidden="true" />
      <span>{text}</span>
    </p>
  );
}

function passText(edited: boolean, allRulesOn: boolean): string {
  const rules = allRulesOn ? 'all rules' : 'all rules that are on';
  return edited ? `Edited, still passes ${rules}` : `Passes ${rules}`;
}

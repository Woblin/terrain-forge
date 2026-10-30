import { CheckIcon, XIcon } from 'lucide-react';
import type { FairnessReport, RuleId } from '../domain/fairness';
import { joinWithAnd, RULE_NAMES } from './fairnessRows';

interface FairBadgeProps {
  report: FairnessReport;
  /** The rules the board was measured against. */
  enabledRules: readonly RuleId[];
  /** Makes the badge a button, for layouts where the fairness panel is folded away. */
  onOpen?: () => void;
}

const LOOK =
  'flex items-center gap-1.5 rounded-[3px] border border-brass bg-iron/84 py-1 pr-3 pl-2 text-sm font-semibold';

/** Whether the board is fair, in the corner of the mat. */
export function FairBadge({ report, enabledRules, onOpen }: FairBadgeProps) {
  const failed = report.failedRules.map((rule) => RULE_NAMES[rule].code);
  const passed = failed.length === 0;
  const Icon = passed ? CheckIcon : XIcon;
  const colour = passed ? 'text-[#b6e0a6]' : 'text-[#f2a493]';
  const passing = enabledRules.length - failed.length;
  const text = passed
    ? `Fair · passes ${String(passing)} of ${String(enabledRules.length)} rules on`
    : `Breaks ${joinWithAnd(failed)}`;
  const content = (
    <>
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      {onOpen === undefined ? text : passed ? 'Fair · see why' : `${text} · see why`}
    </>
  );
  if (onOpen !== undefined) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className={`${LOOK} ${colour} focus-visible:outline-brass-bright hover:bg-iron min-h-11 focus-visible:outline-2`}
      >
        {content}
      </button>
    );
  }
  return (
    <p role="status" className={`${LOOK} ${colour} pointer-events-none`}>
      {content}
    </p>
  );
}

import { CheckIcon, XIcon } from 'lucide-react';
import type { FairnessReport, RuleId } from '../domain/fairness';
import { joinWithAnd, RULE_NAMES } from './fairnessRows';

interface SheetVerdictButtonProps {
  /** The board's fairness, or null before there is a board. */
  report: FairnessReport | null;
  /** The rules the board was measured against. */
  enabledRules: readonly RuleId[];
  /** Opens the balance rules. */
  onOpen: () => void;
}

const LOOK =
  'focus-visible:outline-brass-bright flex h-11 min-w-0 flex-1 items-center gap-2 rounded-[3px] border px-2.5 text-left font-bold focus-visible:outline-2';

/** Whether the board is fair, at the top of the phone sheet, opening the rules behind it. */
export function SheetVerdictButton({ report, enabledRules, onOpen }: SheetVerdictButtonProps) {
  if (report === null) {
    return (
      <p className="text-muted min-w-0 flex-1 text-sm">Generate a board to see how fair it is.</p>
    );
  }
  const failed = report.failedRules.map((rule) => RULE_NAMES[rule].code);
  const passed = failed.length === 0;
  const Icon = passed ? CheckIcon : XIcon;
  const passing = enabledRules.length - failed.length;
  const text = passed
    ? `Fair · ${String(passing)} of ${String(enabledRules.length)} rules pass`
    : `Breaks ${joinWithAnd(failed)}`;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`${LOOK} ${passed ? 'border-pass-line bg-pass-soft text-pass' : 'border-fail-line bg-fail-soft text-fail'}`}
    >
      <Icon className="size-[18px] shrink-0" strokeWidth={2.4} aria-hidden="true" />
      <span className="truncate">{text}</span>
    </button>
  );
}

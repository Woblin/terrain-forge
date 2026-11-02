import { SparklesIcon } from 'lucide-react';
import type { FairnessReport, RuleId } from '../domain/fairness';
import { BUTTON_STYLES } from './buttonStyles';
import { SheetVerdictButton } from './SheetVerdictButton';

interface BoardSummaryProps {
  report: FairnessReport | null;
  enabledRules: readonly RuleId[];
  generating: boolean;
  onGenerate: () => void;
  onOpenRules: () => void;
}

/** The verdict and the Generate button, in the sheet under the board on a phone. */
export function BoardSummary({
  report,
  enabledRules,
  generating,
  onGenerate,
  onOpenRules,
}: BoardSummaryProps) {
  return (
    <div className="flex items-center gap-2.5">
      <SheetVerdictButton report={report} enabledRules={enabledRules} onOpen={onOpenRules} />
      <button
        type="button"
        disabled={generating}
        onClick={onGenerate}
        className={`${BUTTON_STYLES.primary} h-11 shrink-0 px-3.5`}
      >
        <SparklesIcon className="size-4" aria-hidden="true" />
        {generating ? 'Generating…' : 'Generate'}
      </button>
    </div>
  );
}

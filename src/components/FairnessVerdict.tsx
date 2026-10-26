import type { FairnessReport } from '../domain/fairness';
import { joinWithAnd, RULE_NAMES } from './fairnessRows';

interface FairnessVerdictProps {
  report: FairnessReport;
  edited: boolean;
}

/** One line saying whether the board passes every balance rule, and which ones it breaks. */
export function FairnessVerdict({ report, edited }: FairnessVerdictProps) {
  const failed = report.failedRules.map((rule) => RULE_NAMES[rule].code);
  if (failed.length === 0) {
    return (
      <p className="font-medium text-emerald-300">
        ✓ {edited ? 'Edited, still passes all rules' : 'Passes all rules'}
      </p>
    );
  }
  return (
    <p className="font-medium text-rose-300">
      ✗ {edited ? 'Edited' : 'Generated'}, breaks {joinWithAnd(failed)}
    </p>
  );
}

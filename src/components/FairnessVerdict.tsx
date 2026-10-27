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
  if (failed.length === 0) {
    const rules = allRulesOn ? 'all rules' : 'all rules that are on';
    return (
      <p className="text-pass font-medium">
        ✓ {edited ? `Edited, still passes ${rules}` : `Passes ${rules}`}
      </p>
    );
  }
  return (
    <p className="text-fail font-medium">
      ✗ {edited ? 'Edited' : 'Generated'}, breaks {joinWithAnd(failed)}
    </p>
  );
}

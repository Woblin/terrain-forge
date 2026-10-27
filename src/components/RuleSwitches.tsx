import { RULE_IDS, type RuleId } from '../domain/fairness';
import { RULE_NAMES } from './fairnessRows';

interface RuleSwitchesProps {
  enabledRules: readonly RuleId[];
  onRuleChange: (rule: RuleId, enabled: boolean) => void;
}

/** Which balance rules the next board must pass. Rules that are off are still measured. */
export function RuleSwitches({ enabledRules, onRuleChange }: RuleSwitchesProps) {
  return (
    <fieldset className="space-y-1">
      <legend className="text-sm text-stone-300">Balance rules</legend>
      {RULE_IDS.map((rule) => (
        <label key={rule} className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={enabledRules.includes(rule)}
            onChange={(event) => {
              onRuleChange(rule, event.target.checked);
            }}
            className="accent-amber-500"
          />
          <span>
            <span className="text-stone-400">{RULE_NAMES[rule].code}</span> {RULE_NAMES[rule].name}
          </span>
        </label>
      ))}
      <p className="text-xs text-stone-400">
        Used for the next board you generate. Rules that are off are still measured.
      </p>
    </fieldset>
  );
}

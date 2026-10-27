import { RULE_IDS, type RuleId } from '../domain/fairness';
import { RULE_NAMES } from './fairnessRows';
import { Switch } from './Switch';

interface RuleSwitchesProps {
  enabledRules: readonly RuleId[];
  onRuleChange: (rule: RuleId, enabled: boolean) => void;
}

/** Which balance rules the next board must pass. Rules that are off are still measured. */
export function RuleSwitches({ enabledRules, onRuleChange }: RuleSwitchesProps) {
  return (
    <fieldset>
      <legend className="text-muted mb-1 text-xs font-medium">Balance rules</legend>
      {RULE_IDS.map((rule) => (
        <Switch
          key={rule}
          checked={enabledRules.includes(rule)}
          onChange={(enabled) => {
            onRuleChange(rule, enabled);
          }}
        >
          <span className="text-faint mr-1.5 text-xs font-semibold">{RULE_NAMES[rule].code}</span>
          {RULE_NAMES[rule].name}
        </Switch>
      ))}
      <p className="text-muted mt-1 text-xs">
        Used for the next board you generate. Rules that are off are still measured.
      </p>
    </fieldset>
  );
}

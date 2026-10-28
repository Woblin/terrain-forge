import { RULE_IDS, type RuleId } from '../domain/fairness';
import { RULE_NAMES } from './fairnessRows';
import { Switch } from './Switch';
import { TextButton } from './TextButton';

interface RuleSwitchesProps {
  enabledRules: readonly RuleId[];
  onRuleChange: (rule: RuleId, enabled: boolean) => void;
  /** False when this game's rules and the board options are already as they start. */
  canReset: boolean;
  onReset: () => void;
}

/** Which balance rules the next board must pass. Rules that are off are still measured. */
export function RuleSwitches({ enabledRules, onRuleChange, canReset, onReset }: RuleSwitchesProps) {
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
      <p className="mt-2 text-xs">
        <TextButton onClick={onReset} disabled={!canReset}>
          Reset to defaults
        </TextButton>
        <span className="text-muted">
          {' '}
          puts this game's rules and the board options, such as the lane and snapping, back as they
          start.
        </span>
      </p>
    </fieldset>
  );
}

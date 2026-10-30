import { useId } from 'react';
import type { RuleId } from '../domain/fairness';
import { deploymentsFor } from '../domain/gameSetup';
import { PRESETS, type GameSystemPreset } from '../domain/presets';
import { formatLength, type LengthUnit } from '../domain/units';
import type { GeneratorStatus } from '../hooks/useGenerator';
import { SparklesIcon } from 'lucide-react';
import { BUTTON_STYLES } from './buttonStyles';
import { FIELD_STYLES, LABEL_STYLES } from './fieldStyles';
import { RuleSwitches } from './RuleSwitches';
import { SectionHeading } from './SectionHeading';

interface GeneratorControlsProps {
  preset: GameSystemPreset;
  deploymentId: string;
  status: GeneratorStatus;
  unit: LengthUnit;
  enabledRules: readonly RuleId[];
  /** Why the player's game settings could not be loaded or saved, if they could not. */
  settingsError: string | null;
  onPresetChange: (presetId: string) => void;
  onDeploymentChange: (deploymentId: string) => void;
  onRuleChange: (rule: RuleId, enabled: boolean) => void;
  /** False when the rules and board options are already as they start. */
  canReset: boolean;
  onReset: () => void;
  onGenerate: () => void;
}

/** Game system and deployment for the next board, and the button that generates it. */
export function GeneratorControls({
  preset,
  deploymentId,
  status,
  unit,
  enabledRules,
  settingsError,
  onPresetChange,
  onDeploymentChange,
  onRuleChange,
  canReset,
  onReset,
  onGenerate,
}: GeneratorControlsProps) {
  const presetId = useId();
  const deploymentSelectId = useId();
  const { width, depth } = preset.defaultBoard;
  return (
    <section aria-labelledby={`${presetId}-heading`} className="space-y-4">
      <SectionHeading id={`${presetId}-heading`}>New board</SectionHeading>
      <div>
        <label htmlFor={presetId} className={LABEL_STYLES}>
          Game system
        </label>
        <select
          id={presetId}
          value={preset.id}
          onChange={(event) => {
            onPresetChange(event.target.value);
          }}
          className={FIELD_STYLES}
        >
          {PRESETS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
        <p className="text-muted mt-1 text-xs">
          Board {formatLength(width, unit)} × {formatLength(depth, unit)}
        </p>
      </div>
      <div>
        <label htmlFor={deploymentSelectId} className={LABEL_STYLES}>
          Deployment
        </label>
        <select
          id={deploymentSelectId}
          value={deploymentId}
          onChange={(event) => {
            onDeploymentChange(event.target.value);
          }}
          className={FIELD_STYLES}
        >
          {deploymentsFor(preset).map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      </div>
      <RuleSwitches
        enabledRules={enabledRules}
        onRuleChange={onRuleChange}
        canReset={canReset}
        onReset={onReset}
      />
      {settingsError !== null && <p className="text-warn-ink text-sm">{settingsError}</p>}
      <button type="button" onClick={onGenerate} className={`w-full ${BUTTON_STYLES.primary} h-11`}>
        <SparklesIcon className="size-[18px]" aria-hidden="true" />
        {status.running ? 'Generating…' : 'Generate board'}
      </button>
      <div aria-live="polite" className="text-sm">
        {status.slow && <p className="text-soft">Still working on a fair layout…</p>}
        {status.error !== null && (
          <p role="alert" className="text-fail">
            {status.error}
          </p>
        )}
      </div>
    </section>
  );
}

import { useId } from 'react';
import type { RuleId } from '../domain/fairness';
import { deploymentsFor } from '../domain/gameSetup';
import { PRESETS, type GameSystemPreset } from '../domain/presets';
import { formatLength, type LengthUnit } from '../domain/units';
import type { GeneratorStatus } from '../hooks/useGenerator';
import { RuleSwitches } from './RuleSwitches';

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
  onGenerate,
}: GeneratorControlsProps) {
  const presetId = useId();
  const deploymentSelectId = useId();
  const { width, depth } = preset.defaultBoard;
  return (
    <section
      aria-labelledby={`${presetId}-heading`}
      className="border-line bg-surface space-y-3 rounded-2xl border p-4 shadow-sm"
    >
      <h2
        id={`${presetId}-heading`}
        className="text-muted text-sm font-semibold tracking-wide uppercase"
      >
        New board
      </h2>
      <div className="space-y-1">
        <label htmlFor={presetId} className="text-soft block text-sm">
          Game system
        </label>
        <select
          id={presetId}
          value={preset.id}
          onChange={(event) => {
            onPresetChange(event.target.value);
          }}
          className="border-line-strong bg-raised w-full rounded-lg border px-2 py-1.5"
        >
          {PRESETS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
        <p className="text-muted text-xs">
          Board {formatLength(width, unit)} × {formatLength(depth, unit)}
        </p>
      </div>
      <div className="space-y-1">
        <label htmlFor={deploymentSelectId} className="text-soft block text-sm">
          Deployment
        </label>
        <select
          id={deploymentSelectId}
          value={deploymentId}
          onChange={(event) => {
            onDeploymentChange(event.target.value);
          }}
          className="border-line-strong bg-raised w-full rounded-lg border px-2 py-1.5"
        >
          {deploymentsFor(preset).map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      </div>
      <RuleSwitches enabledRules={enabledRules} onRuleChange={onRuleChange} />
      {settingsError !== null && <p className="text-warn-ink text-sm">{settingsError}</p>}
      <button
        type="button"
        onClick={onGenerate}
        className="bg-accent text-on-accent hover:bg-accent-hover focus-visible:outline-accent-ink w-full rounded-lg px-3 py-2 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        {status.running ? 'Generating…' : 'Generate'}
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

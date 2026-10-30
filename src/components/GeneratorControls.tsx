import { useId } from 'react';
import { deploymentsFor } from '../domain/gameSetup';
import { PRESETS, type GameSystemPreset } from '../domain/presets';
import { formatLength, type LengthUnit } from '../domain/units';
import type { GeneratorStatus } from '../hooks/useGenerator';
import { SparklesIcon } from 'lucide-react';
import { BUTTON_STYLES } from './buttonStyles';
import { FIELD_STYLES, LABEL_STYLES } from './fieldStyles';
import { SectionHeading } from './SectionHeading';
import { TextButton } from './TextButton';

interface GeneratorControlsProps {
  preset: GameSystemPreset;
  deploymentId: string;
  status: GeneratorStatus;
  unit: LengthUnit;
  /** How many balance rules the next board must pass. */
  ruleCount: number;
  /** Why the player's game settings could not be loaded or saved, if they could not. */
  settingsError: string | null;
  onPresetChange: (presetId: string) => void;
  onDeploymentChange: (deploymentId: string) => void;
  onGenerate: () => void;
  /** Shows the balance rules, where they are switched on and off. */
  onChooseRules: () => void;
  /** False on phones, where Generate sits in the sheet's summary row instead. */
  showGenerate?: boolean;
}

/** Game system and deployment for the next board, and the button that generates it. */
export function GeneratorControls({
  preset,
  deploymentId,
  status,
  unit,
  ruleCount,
  settingsError,
  onPresetChange,
  onDeploymentChange,
  onGenerate,
  onChooseRules,
  showGenerate = true,
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
        <p className="text-muted mt-1 text-xs italic">
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
      {settingsError !== null && <p className="text-warn-ink text-sm">{settingsError}</p>}
      <div className="space-y-1.5">
        {showGenerate && (
          <button
            type="button"
            onClick={onGenerate}
            className={`w-full ${BUTTON_STYLES.primary} h-[46px] text-[19px]`}
          >
            <SparklesIcon className="size-[18px]" aria-hidden="true" />
            {status.running ? 'Generating…' : 'Generate board'}
          </button>
        )}
        <p className={`text-muted text-sm ${showGenerate ? 'text-center' : ''}`}>
          Must pass {ruleCount === 1 ? '1 balance rule' : `${String(ruleCount)} balance rules`}.{' '}
          <TextButton onClick={onChooseRules}>Choose rules</TextButton>
        </p>
      </div>
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

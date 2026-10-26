import { useId } from 'react';
import { deploymentsFor } from '../domain/gameSetup';
import { PRESETS, type GameSystemPreset } from '../domain/presets';
import { formatLength, type LengthUnit } from '../domain/units';
import type { GeneratorStatus } from '../hooks/useGenerator';

interface GeneratorControlsProps {
  preset: GameSystemPreset;
  deploymentId: string;
  status: GeneratorStatus;
  unit: LengthUnit;
  onPresetChange: (presetId: string) => void;
  onDeploymentChange: (deploymentId: string) => void;
  onGenerate: () => void;
}

/** Game system and deployment for the next board, and the button that generates it. */
export function GeneratorControls({
  preset,
  deploymentId,
  status,
  unit,
  onPresetChange,
  onDeploymentChange,
  onGenerate,
}: GeneratorControlsProps) {
  const presetId = useId();
  const deploymentSelectId = useId();
  const { width, depth } = preset.defaultBoard;
  return (
    <section
      aria-labelledby={`${presetId}-heading`}
      className="space-y-3 rounded-lg bg-stone-800 p-4"
    >
      <h2
        id={`${presetId}-heading`}
        className="text-sm font-semibold tracking-wide text-stone-400 uppercase"
      >
        New board
      </h2>
      <div className="space-y-1">
        <label htmlFor={presetId} className="block text-sm text-stone-300">
          Game system
        </label>
        <select
          id={presetId}
          value={preset.id}
          onChange={(event) => {
            onPresetChange(event.target.value);
          }}
          className="w-full rounded border border-stone-600 bg-stone-900 px-2 py-1.5"
        >
          {PRESETS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-stone-400">
          Board {formatLength(width, unit)} × {formatLength(depth, unit)}
        </p>
      </div>
      <div className="space-y-1">
        <label htmlFor={deploymentSelectId} className="block text-sm text-stone-300">
          Deployment
        </label>
        <select
          id={deploymentSelectId}
          value={deploymentId}
          onChange={(event) => {
            onDeploymentChange(event.target.value);
          }}
          className="w-full rounded border border-stone-600 bg-stone-900 px-2 py-1.5"
        >
          {deploymentsFor(preset).map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        onClick={onGenerate}
        className="w-full rounded bg-amber-500 px-3 py-2 font-semibold text-stone-950 hover:bg-amber-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
      >
        {status.running ? 'Generating…' : 'Generate'}
      </button>
      <div aria-live="polite" className="text-sm">
        {status.slow && <p className="text-stone-300">Still working on a fair layout…</p>}
        {status.error !== null && (
          <p role="alert" className="text-red-300">
            {status.error}
          </p>
        )}
      </div>
    </section>
  );
}

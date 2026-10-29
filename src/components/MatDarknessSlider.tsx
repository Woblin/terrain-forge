import { useId } from 'react';
import { MAT_DARKNESS_RANGE } from '../domain/mats';

interface MatDarknessSliderProps {
  value: number;
  /** Off when the board shows no mat picture to darken, such as the plain board. */
  disabled: boolean;
  onChange: (darkness: number) => void;
}

/** A slider from the mat's picture as it is to a darker mat, with the standard in the middle. */
export function MatDarknessSlider({ value, disabled, onChange }: MatDarknessSliderProps) {
  const id = useId();
  const { min, max, step, standard } = MAT_DARKNESS_RANGE;
  return (
    <div className={`py-1.5 text-sm ${disabled ? 'opacity-50' : ''}`}>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id}>Darken mat</label>
        <span className="flex items-center gap-2">
          <output htmlFor={id} className="text-muted text-xs">
            {darknessName(value)}
          </output>
          {value !== standard && !disabled && (
            <button
              type="button"
              onClick={() => {
                onChange(standard);
              }}
              className="text-accent-ink hover:text-accent-ink-hover text-xs font-medium underline-offset-2 hover:underline"
            >
              Reset
            </button>
          )}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-valuetext={darknessName(value)}
        onChange={(event) => {
          onChange(Number(event.target.value));
        }}
        className="accent-accent mt-1 block h-6 w-full cursor-pointer disabled:cursor-not-allowed"
      />
    </div>
  );
}

function darknessName(darkness: number): string {
  const { min, standard } = MAT_DARKNESS_RANGE;
  if (darkness === min) {
    return 'None, picture as it is';
  }
  if (darkness === standard) {
    return 'Standard';
  }
  return darkness < standard ? 'Lighter' : 'Darker';
}

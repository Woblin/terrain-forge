import { useId } from 'react';
import { MATS, type MatId } from '../domain/mats';
import { MatDarknessSlider } from './MatDarknessSlider';
import { matPicture } from './matPictures';

interface MatPickerProps {
  value: MatId;
  onChange: (mat: MatId) => void;
  darkness: number;
  onDarknessChange: (darkness: number) => void;
}

/** A swatch for each mat, to pick the ground under the board's terrain. */
export function MatPicker({ value, onChange, darkness, onDarknessChange }: MatPickerProps) {
  const name = useId();
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold">Mat</legend>
      <p className="text-muted text-xs">The ground under the terrain. Saved with the board.</p>
      <div className="grid grid-cols-4 gap-2 p-1">
        {MATS.map((mat) => {
          const picture = matPicture(mat, 'small');
          const checked = mat.id === value;
          return (
            <label
              key={mat.id}
              className={`group flex cursor-pointer flex-col items-center gap-1 text-center text-xs leading-tight ${checked ? 'text-ink font-semibold' : 'text-muted hover:text-ink'}`}
            >
              <input
                type="radio"
                name={name}
                value={mat.id}
                checked={checked}
                onChange={() => {
                  onChange(mat.id);
                }}
                className="peer sr-only"
              />
              <span
                aria-hidden="true"
                style={
                  picture === null
                    ? undefined
                    : { backgroundImage: `url("${picture}")`, backgroundSize: 'cover' }
                }
                className={`bg-mat ring-offset-surface peer-focus-visible:outline-accent-ink block aspect-square w-full rounded-lg ring-offset-2 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 ${checked ? 'ring-accent-ink ring-2' : 'ring-line-strong ring-1 group-hover:ring-2'}`}
              />
              {mat.name}
            </label>
          );
        })}
      </div>
      <MatDarknessSlider
        value={darkness}
        disabled={value === 'plain'}
        onChange={onDarknessChange}
      />
    </fieldset>
  );
}

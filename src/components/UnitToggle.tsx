import type { LengthUnit } from '../domain/units';
import { useUnits } from '../hooks/unitsContext';

const OPTIONS: readonly { unit: LengthUnit; label: string }[] = [
  { unit: 'in', label: 'Inches' },
  { unit: 'cm', label: 'Centimetres' },
];

/** Switches every length shown in the app between inches and centimetres. */
export function UnitToggle() {
  const { unit, setUnit } = useUnits();
  return (
    <fieldset className="flex items-center gap-1 rounded-full bg-stone-800 p-1 text-sm">
      <legend className="sr-only">Units</legend>
      {OPTIONS.map((option) => (
        <label
          key={option.unit}
          className={`cursor-pointer rounded-full px-3 py-1 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-amber-300 ${unit === option.unit ? 'bg-stone-600 text-white' : 'text-stone-300'}`}
        >
          <input
            type="radio"
            name="length-unit"
            value={option.unit}
            checked={unit === option.unit}
            onChange={() => {
              setUnit(option.unit);
            }}
            className="sr-only"
          />
          {option.label}
        </label>
      ))}
    </fieldset>
  );
}

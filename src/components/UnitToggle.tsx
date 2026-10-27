import type { LengthUnit } from '../domain/units';
import { useUnits } from '../hooks/unitsContext';
import { SegmentedControl, type Segment } from './SegmentedControl';

const SEGMENTS: readonly Segment<LengthUnit>[] = [
  { value: 'in', label: 'in', ariaLabel: 'Inches' },
  { value: 'cm', label: 'cm', ariaLabel: 'Centimetres' },
];

interface UnitToggleProps {
  className?: string;
}

/** Switches every length shown in the app between inches and centimetres. */
export function UnitToggle({ className }: UnitToggleProps) {
  const { unit, setUnit } = useUnits();
  return (
    <SegmentedControl
      legend="Units"
      segments={SEGMENTS}
      value={unit}
      onChange={setUnit}
      className={className}
    />
  );
}

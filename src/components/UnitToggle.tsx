import type { LengthUnit } from '../domain/units';
import { useUnits } from '../hooks/unitsContext';
import { SegmentedControl, type Segment } from './SegmentedControl';

const SEGMENTS: readonly Segment<LengthUnit>[] = [
  { value: 'in', label: 'in', ariaLabel: 'Inches' },
  { value: 'cm', label: 'cm', ariaLabel: 'Centimetres' },
];

const LABELLED_SEGMENTS: readonly Segment<LengthUnit>[] = [
  { value: 'in', label: 'Inches' },
  { value: 'cm', label: 'Centimetres' },
];

interface UnitToggleProps {
  className?: string;
  /** What it sits on; parchment by default. */
  tone?: 'parchment' | 'iron';
  /** Spells out the units, where there is room, such as the account page. */
  labelled?: boolean;
}

/** Switches every length shown in the app between inches and centimetres. */
export function UnitToggle({ className, tone, labelled = false }: UnitToggleProps) {
  const { unit, setUnit } = useUnits();
  return (
    <SegmentedControl
      legend="Units"
      segments={labelled ? LABELLED_SEGMENTS : SEGMENTS}
      value={unit}
      onChange={setUnit}
      tone={tone}
      className={className}
    />
  );
}

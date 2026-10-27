import { MonitorIcon, MoonIcon, SunIcon } from 'lucide-react';
import type { ThemeChoice } from '../domain/theme';
import { useTheme } from '../hooks/themeContext';
import { SegmentedControl, type Segment } from './SegmentedControl';

const ICON = 'size-4';

const SEGMENTS: readonly Segment<ThemeChoice>[] = [
  { value: 'system', label: <MonitorIcon className={ICON} />, ariaLabel: 'Same as device' },
  { value: 'light', label: <SunIcon className={ICON} />, ariaLabel: 'Light' },
  { value: 'dark', label: <MoonIcon className={ICON} />, ariaLabel: 'Dark' },
];

interface ThemeSwitchProps {
  className?: string;
}

/** Picks the light or dark theme, or follows the device. */
export function ThemeSwitch({ className }: ThemeSwitchProps) {
  const { choice, setChoice } = useTheme();
  return (
    <SegmentedControl
      legend="Theme"
      segments={SEGMENTS}
      value={choice}
      onChange={setChoice}
      className={className}
    />
  );
}

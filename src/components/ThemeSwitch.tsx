import { MonitorIcon, MoonIcon, SunIcon, type LucideIcon } from 'lucide-react';
import type { ThemeChoice } from '../domain/theme';
import { useTheme } from '../hooks/themeContext';
import { SegmentedControl, type Segment } from './SegmentedControl';

const ICON = 'size-4';

const SEGMENTS: readonly Segment<ThemeChoice>[] = [
  { value: 'system', label: <MonitorIcon className={ICON} />, ariaLabel: 'Same as device' },
  { value: 'light', label: <SunIcon className={ICON} />, ariaLabel: 'Light' },
  { value: 'dark', label: <MoonIcon className={ICON} />, ariaLabel: 'Dark' },
];

const LABELLED_SEGMENTS: readonly Segment<ThemeChoice>[] = [
  { value: 'system', label: withIcon(MonitorIcon, 'System') },
  { value: 'light', label: withIcon(SunIcon, 'Light') },
  { value: 'dark', label: withIcon(MoonIcon, 'Dark') },
];

interface ThemeSwitchProps {
  className?: string;
  /** Names each choice next to its icon, where there is room, such as the account page. */
  labelled?: boolean;
}

/** Picks the light or dark theme, or follows the device. */
export function ThemeSwitch({ className, labelled = false }: ThemeSwitchProps) {
  const { choice, setChoice } = useTheme();
  return (
    <SegmentedControl
      legend="Theme"
      segments={labelled ? LABELLED_SEGMENTS : SEGMENTS}
      value={choice}
      onChange={setChoice}
      className={className}
    />
  );
}

function withIcon(Icon: LucideIcon, text: string) {
  return (
    <>
      <Icon className={ICON} aria-hidden="true" />
      {text}
    </>
  );
}

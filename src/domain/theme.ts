/** What the player picked: follow the device, or always light or dark. */
export type ThemeChoice = 'system' | 'light' | 'dark';

/** The theme the app is drawn in. */
export type Theme = 'light' | 'dark';

export const THEME_CHOICES: readonly ThemeChoice[] = ['system', 'light', 'dark'];

/** The theme to draw, given the player's choice and whether the device prefers dark. */
export function resolveTheme(choice: ThemeChoice, deviceIsDark: boolean): Theme {
  if (choice === 'system') {
    return deviceIsDark ? 'dark' : 'light';
  }
  return choice;
}

/** A stored theme choice, or 'system' when it is missing or unreadable. */
export function parseThemeChoice(value: unknown): ThemeChoice {
  return value === 'light' || value === 'dark' ? value : 'system';
}

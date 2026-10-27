import { createContext, useContext } from 'react';
import type { Theme, ThemeChoice } from '../domain/theme';

export interface ThemeSetting {
  readonly choice: ThemeChoice;
  /** The theme the app is drawn in now. */
  readonly theme: Theme;
  readonly setChoice: (choice: ThemeChoice) => void;
}

export const ThemeContext = createContext<ThemeSetting | null>(null);

/** The light or dark theme, and the player's choice behind it. */
export function useTheme(): ThemeSetting {
  const setting = useContext(ThemeContext);
  if (setting === null) {
    throw new Error('useTheme must be used inside ThemeProvider.');
  }
  return setting;
}

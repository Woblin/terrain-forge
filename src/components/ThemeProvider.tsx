import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { resolveTheme, type ThemeChoice } from '../domain/theme';
import { ThemeContext } from '../hooks/themeContext';
import { useDeviceIsDark } from '../hooks/useDeviceIsDark';
import { loadThemeChoice, saveThemeChoice } from '../services/preferences';

/** Shares the light or dark theme with the app, draws the page in it, and remembers the choice. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [choice, setChoiceState] = useState<ThemeChoice>(loadThemeChoice);
  const theme = resolveTheme(choice, useDeviceIsDark());

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const setting = useMemo(
    () => ({
      choice,
      theme,
      setChoice: (next: ThemeChoice) => {
        setChoiceState(next);
        saveThemeChoice(next);
      },
    }),
    [choice, theme],
  );
  return <ThemeContext.Provider value={setting}>{children}</ThemeContext.Provider>;
}

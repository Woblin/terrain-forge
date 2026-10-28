import { createContext, useContext } from 'react';
import type { RuleId } from '../domain/fairness';
import type { GamePreferences } from '../domain/gamePreferences';
import type { GameSystemPreset } from '../domain/presets';

/** The game a new board starts on, the balance rules switched for each game, and the changes. */
export interface GamePreferencesSetting {
  /** False while a signed-in player's settings are still loading. */
  readonly ready: boolean;
  readonly preferences: GamePreferences;
  /** Why the account's settings could not be loaded or saved, if they could not. */
  readonly error: string | null;
  /** Remembers the game the player picked, so the next board starts on it. */
  readonly choosePreset: (presetId: string) => void;
  readonly switchRule: (preset: GameSystemPreset, rule: RuleId, enabled: boolean) => void;
  /** Puts a game's balance rules back to its defaults. */
  readonly resetRules: (preset: GameSystemPreset) => void;
}

export const GamePreferencesContext = createContext<GamePreferencesSetting | null>(null);

export function useGamePreferences(): GamePreferencesSetting {
  const setting = useContext(GamePreferencesContext);
  if (setting === null) {
    throw new Error('useGamePreferences must be used inside GamePreferencesProvider.');
  }
  return setting;
}

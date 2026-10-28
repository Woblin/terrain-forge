import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { canSave } from '../domain/account';
import type { RuleId } from '../domain/fairness';
import {
  withDefaultPreset,
  withRuleSwitched,
  withRulesReset,
  type GamePreferences,
} from '../domain/gamePreferences';
import type { GameSystemPreset } from '../domain/presets';
import { useAuth } from '../hooks/authContext';
import { useFirebase } from '../hooks/firebaseContext';
import { GamePreferencesContext } from '../hooks/gamePreferencesContext';
import { saveAccountPreferences, watchAccountPreferences } from '../services/accountPreferences';
import { loadGamePreferences, saveGamePreferences } from '../services/preferences';

/** The settings of the signed-in player, once loaded. */
interface AccountState {
  readonly uid: string;
  readonly preferences: GamePreferences;
}

interface AccountError {
  readonly uid: string;
  readonly message: string;
}

/**
 * Shares the player's game settings with every page. They are kept in this browser, and for a
 * player with a verified email also in their account, whose settings win when they sign in.
 */
export function GamePreferencesProvider({ children }: { children: ReactNode }) {
  const { db } = useFirebase();
  const { state, user } = useAuth();
  const savingUid = user !== null && canSave(user) ? user.uid : null;
  const [local, setLocal] = useState(loadGamePreferences);
  const [account, setAccount] = useState<AccountState | null>(null);
  const [error, setError] = useState<AccountError | null>(null);

  // A new account starts with the settings showing now, saved once.
  const latestLocal = useRef(local);
  const seeded = useRef<string | null>(null);
  useEffect(() => {
    latestLocal.current = local;
  }, [local]);

  useEffect(() => {
    if (savingUid === null) {
      return;
    }
    const fail = (message: string) => {
      setError({ uid: savingUid, message });
    };
    return watchAccountPreferences(db, savingUid, {
      onChange: (stored) => {
        if (stored.kind === 'found') {
          setAccount({ uid: savingUid, preferences: stored.preferences });
          return;
        }
        setAccount({ uid: savingUid, preferences: latestLocal.current });
        if (stored.kind === 'unreadable') {
          fail('Your saved game settings could not be read, so the ones in this browser are used.');
        } else if (seeded.current !== savingUid) {
          seeded.current = savingUid;
          saveAccountPreferences(db, savingUid, latestLocal.current).catch((cause: unknown) => {
            fail(messageOf(cause));
          });
        }
      },
      onError: (message) => {
        setAccount({ uid: savingUid, preferences: latestLocal.current });
        fail(message);
      },
    });
  }, [db, savingUid]);

  const accountLoaded = savingUid !== null && account?.uid === savingUid;
  const preferences = accountLoaded ? account.preferences : local;
  const ready = state.status !== 'checking' && (savingUid === null || accountLoaded);

  const setting = useMemo(() => {
    const update = (next: GamePreferences) => {
      setLocal(next);
      saveGamePreferences(next);
      if (savingUid === null) {
        return;
      }
      setAccount({ uid: savingUid, preferences: next });
      saveAccountPreferences(db, savingUid, next).catch((cause: unknown) => {
        setError({ uid: savingUid, message: messageOf(cause) });
      });
    };
    return {
      ready,
      preferences,
      error: error !== null && error.uid === savingUid ? error.message : null,
      choosePreset: (presetId: string) => {
        update(withDefaultPreset(preferences, presetId));
      },
      switchRule: (preset: GameSystemPreset, rule: RuleId, enabled: boolean) => {
        update(withRuleSwitched(preferences, preset, rule, enabled));
      },
      resetRules: (preset: GameSystemPreset) => {
        update(withRulesReset(preferences, preset));
      },
    };
  }, [db, savingUid, ready, preferences, error]);

  return (
    <GamePreferencesContext.Provider value={setting}>{children}</GamePreferencesContext.Provider>
  );
}

function messageOf(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

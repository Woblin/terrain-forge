import { useMemo, useState, type ReactNode } from 'react';
import type { LengthUnit } from '../domain/units';
import { UnitsContext } from '../hooks/unitsContext';
import { loadLengthUnit, saveLengthUnit } from '../services/preferences';

/** Shares the player's length unit with the whole app and remembers it on this device. */
export function UnitsProvider({ children }: { children: ReactNode }) {
  const [unit, setUnitState] = useState<LengthUnit>(loadLengthUnit);
  const setting = useMemo(
    () => ({
      unit,
      setUnit: (next: LengthUnit) => {
        setUnitState(next);
        saveLengthUnit(next);
      },
    }),
    [unit],
  );
  return <UnitsContext.Provider value={setting}>{children}</UnitsContext.Provider>;
}

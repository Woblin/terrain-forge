import { createContext, useContext } from 'react';
import type { LengthUnit } from '../domain/units';

export interface UnitsSetting {
  readonly unit: LengthUnit;
  readonly setUnit: (unit: LengthUnit) => void;
}

export const UnitsContext = createContext<UnitsSetting | null>(null);

/** The length unit the player reads and types lengths in. Board data stays in inches. */
export function useUnits(): UnitsSetting {
  const setting = useContext(UnitsContext);
  if (setting === null) {
    throw new Error('useUnits must be used inside UnitsProvider.');
  }
  return setting;
}

import { useState } from 'react';
import { loadMatDarkness, saveMatDarkness } from '../services/preferences';

/** How dark the mats are drawn on the board, remembered on this device. */
export function useMatDarkness(): [number, (darkness: number) => void] {
  const [darkness, setDarkness] = useState(loadMatDarkness);
  function change(next: number): void {
    setDarkness(next);
    saveMatDarkness(next);
  }
  return [darkness, change];
}

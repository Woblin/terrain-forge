import { useState } from 'react';
import { loadOpenPanels, saveOpenPanels, type OpenPanels } from '../services/preferences';

/** Which board side panels are open on a wide screen, remembered on this device. */
export function useOpenPanels(): [OpenPanels, (change: Partial<OpenPanels>) => void] {
  const [panels, setPanels] = useState(loadOpenPanels);
  function change(next: Partial<OpenPanels>): void {
    const merged = { ...panels, ...next };
    setPanels(merged);
    saveOpenPanels(merged);
  }
  return [panels, change];
}

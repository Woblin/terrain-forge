import { useState } from 'react';
import { loadBoardTipDismissed, saveBoardTipDismissed } from '../services/preferences';

/** Whether the editing tip under the board shows, and a way to put it away for good. */
export function useBoardTip(): [boolean, () => void] {
  const [dismissed, setDismissed] = useState(loadBoardTipDismissed);
  function dismiss(): void {
    setDismissed(true);
    saveBoardTipDismissed();
  }
  return [!dismissed, dismiss];
}

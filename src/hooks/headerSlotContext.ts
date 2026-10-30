import { createContext, useContext } from 'react';

/**
 * Where a page can put its own buttons in the phone's top bar, such as the board options. Null
 * until the top bar has rendered, and on screens where it has no such place.
 */
export const HeaderSlotContext = createContext<HTMLElement | null>(null);

export function useHeaderSlot(): HTMLElement | null {
  return useContext(HeaderSlotContext);
}

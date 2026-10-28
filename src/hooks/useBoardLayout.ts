import { useMediaQuery } from './useMediaQuery';

/**
 * How the board page is arranged: side panels next to the board on wide screens, panels that
 * slide over the board on tablets, a bottom sheet on phones, and a panel beside the board on
 * phones held sideways.
 */
export type BoardLayout = 'desktop' | 'tablet' | 'phone' | 'sideways';

/** A screen this short, held sideways, is a phone on its side. */
const SIDEWAYS_PHONE = '(orientation: landscape) and (max-height: 500px)';

export function useBoardLayout(): BoardLayout {
  const wide = useMediaQuery('(min-width: 1280px)');
  const medium = useMediaQuery('(min-width: 768px)');
  const sideways = useMediaQuery(SIDEWAYS_PHONE);
  if (wide) {
    return 'desktop';
  }
  if (sideways) {
    return 'sideways';
  }
  return medium ? 'tablet' : 'phone';
}

import { useMediaQuery } from './useMediaQuery';

/**
 * How the board page is arranged: side panels next to the board on wide screens, panels that
 * slide over the board on tablets and phones held sideways, and a bottom sheet on phones.
 */
export type BoardLayout = 'desktop' | 'tablet' | 'phone';

export function useBoardLayout(): BoardLayout {
  const wide = useMediaQuery('(min-width: 1280px)');
  const medium = useMediaQuery('(min-width: 768px)');
  if (wide) {
    return 'desktop';
  }
  return medium ? 'tablet' : 'phone';
}

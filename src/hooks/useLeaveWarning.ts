import { useEffect } from 'react';

/** Asks the browser to warn before the page is closed or reloaded while `active` is true. */
export function useLeaveWarning(active: boolean): void {
  useEffect(() => {
    if (!active) {
      return;
    }
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => {
      window.removeEventListener('beforeunload', warn);
    };
  }, [active]);
}

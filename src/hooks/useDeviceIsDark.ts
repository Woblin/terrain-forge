import { useSyncExternalStore } from 'react';

const DARK_QUERY = '(prefers-color-scheme: dark)';

function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener('change', onChange);
  return () => {
    query.removeEventListener('change', onChange);
  };
}

function deviceIsDark(): boolean {
  return window.matchMedia(DARK_QUERY).matches;
}

/** Whether the device is set to dark mode, kept up to date when the player changes it. */
export function useDeviceIsDark(): boolean {
  return useSyncExternalStore(subscribe, deviceIsDark);
}

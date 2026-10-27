import { useMediaQuery } from './useMediaQuery';

/** Whether the device is set to dark mode, kept up to date when the player changes it. */
export function useDeviceIsDark(): boolean {
  return useMediaQuery('(prefers-color-scheme: dark)');
}

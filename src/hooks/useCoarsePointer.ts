import { useMediaQuery } from './useMediaQuery';

/** Whether the main pointer is a finger rather than a mouse or pen. */
export function useCoarsePointer(): boolean {
  return useMediaQuery('(pointer: coarse)');
}

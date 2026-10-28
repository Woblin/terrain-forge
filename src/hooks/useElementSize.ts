import { useEffect, useState } from 'react';
import type { ScreenSize } from '../domain/boardFit';

const UNMEASURED: ScreenSize = { width: 0, height: 0 };

/**
 * The content size in CSS pixels of the element given to the returned ref, kept up to date as
 * it resizes or is swapped for another element; 0 before measuring.
 */
export function useElementSize<T extends Element>(): [
  element: T | null,
  ref: (element: T | null) => void,
  size: ScreenSize,
] {
  const [element, setElement] = useState<T | null>(null);
  const [size, setSize] = useState(UNMEASURED);
  useEffect(() => {
    if (element === null) {
      return;
    }
    const observer = new ResizeObserver(([entry]) => {
      if (entry !== undefined) {
        setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [element]);
  return [element, setElement, size];
}

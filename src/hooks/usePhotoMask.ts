import { useEffect, useState } from 'react';
import type { Point } from '../domain/geometry';
import type { EncodedPhoto } from '../domain/imageCrop';
import { rememberMask, undoMask, type MaskHistory, type MaskTool } from '../domain/photoMask';
import {
  copyMask,
  fillMask,
  openMaskCanvas,
  paintStroke,
  restoreMask,
  type MaskCanvas,
} from '../services/photoMasking';

export interface PhotoMask {
  /** The photo and its mask once they are open, or null while they load. */
  readonly canvas: MaskCanvas | null;
  /** Why the photo could not be opened. */
  readonly error: string | null;
  /** Changes on every change to the mask, so the view knows to draw it again. */
  readonly revision: number;
  readonly canUndo: boolean;
  /** Remembers the mask as it is now, before a stroke or a fill changes it. */
  readonly checkpoint: () => void;
  /** Paints from one point to another, in pixels of the mask. */
  readonly paint: (from: Point, to: Point, radius: number, tool: MaskTool) => void;
  readonly fill: (hidden: boolean) => void;
  readonly undo: () => void;
}

/** A photo's mask while the player paints it, with undo. */
export function usePhotoMask(photo: EncodedPhoto): PhotoMask {
  const [canvas, setCanvas] = useState<MaskCanvas | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<MaskHistory<ImageData>>([]);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let open: MaskCanvas | null = null;
    let cancelled = false;
    openMaskCanvas(photo).then(
      (opened) => {
        if (cancelled) {
          opened.image.close();
        } else {
          open = opened;
          setCanvas(opened);
        }
      },
      (failure: unknown) => {
        if (!cancelled) {
          setError(failure instanceof Error ? failure.message : 'The photo could not be opened.');
        }
      },
    );
    return () => {
      cancelled = true;
      open?.image.close();
    };
  }, [photo]);

  function changed(): void {
    setRevision((current) => current + 1);
  }

  return {
    canvas,
    error,
    revision,
    canUndo: history.length > 0,
    checkpoint: () => {
      const pixels = canvas === null ? null : copyMask(canvas.mask);
      if (pixels !== null) {
        setHistory((current) => rememberMask(current, pixels));
      }
    },
    paint: (from, to, radius, tool) => {
      if (canvas !== null) {
        paintStroke(canvas.mask, from, to, radius, tool);
        changed();
      }
    },
    fill: (hidden) => {
      if (canvas !== null) {
        fillMask(canvas.mask, hidden);
        changed();
      }
    },
    undo: () => {
      const step = undoMask(history);
      if (canvas !== null && step !== null) {
        restoreMask(canvas.mask, step.state);
        setHistory(step.history);
        changed();
      }
    },
  };
}

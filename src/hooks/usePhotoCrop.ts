import { useState } from 'react';
import type { Point } from '../domain/geometry';
import {
  cropRegion,
  initialCrop,
  panCrop,
  turnCrop,
  zoomCrop,
  type CropView,
  type Rect,
  type Size,
} from '../domain/imageCrop';
import { drawCrop } from '../services/imageEncoding';

export interface PhotoCrop {
  readonly view: CropView;
  /** The area of the turned photo the frame shows, in its pixels. */
  readonly region: Rect;
  /** Moves the photo under the frame by `delta` pixels of the turned photo. */
  readonly pan: (delta: Point) => void;
  readonly zoomTo: (zoom: number) => void;
  readonly turn: () => void;
  /** Draws what the frame shows onto a canvas of the given pixel size. */
  readonly draw: (canvas: HTMLCanvasElement, size: Size) => void;
}

/** Pan, zoom and quarter turns of a photo under a crop frame with the footprint's ratio. */
export function usePhotoCrop(image: ImageBitmap, ratio: number): PhotoCrop {
  const [view, setView] = useState(() => initialCrop(image, ratio));
  return {
    view,
    region: cropRegion(view, image, ratio),
    pan: (delta) => {
      setView((current) => panCrop(current, image, ratio, delta));
    },
    zoomTo: (zoom) => {
      setView((current) => zoomCrop(current, image, ratio, zoom));
    },
    turn: () => {
      setView((current) => turnCrop(current, image, ratio));
    },
    draw: (canvas, size) => {
      const context = canvas.getContext('2d');
      if (context !== null) {
        drawCrop(context, image, view, ratio, size);
      }
    },
  };
}

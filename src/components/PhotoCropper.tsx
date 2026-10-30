import { useEffect, useId, useRef, type KeyboardEvent, type PointerEvent } from 'react';
import type { Point } from '../domain/geometry';
import { cropFrameSize, footprintRatio, MAX_CROP_ZOOM, type CropView } from '../domain/imageCrop';
import type { TerrainPiece } from '../domain/terrain';
import { useElementSize } from '../hooks/useElementSize';
import { usePhotoCrop } from '../hooks/usePhotoCrop';
import { BUTTON_STYLES } from './buttonStyles';
import { ovalMask } from './ovalMask';

interface PhotoCropperProps {
  piece: TerrainPiece;
  image: ImageBitmap;
  saving: boolean;
  error: string | null;
  onSave: (view: CropView) => void;
  onCancel: () => void;
}

/** The longest side of the crop frame on screen, in CSS pixels; it shrinks to fit a phone. */
const FRAME_SIZE = 480;
/** Arrow keys move the photo by this share of the frame. */
const KEY_PAN_SHARE = 0.05;
const KEY_ZOOM_STEP = 1.1;
const WHEEL_ZOOM_RATE = 0.0015;

/**
 * A dialog for cropping a photo to a piece's footprint: drag to pan, pinch, scroll or use the
 * slider to zoom, and turn in quarter turns. Round pieces show an oval mask.
 */
export function PhotoCropper({ piece, image, saving, error, onSave, onCancel }: PhotoCropperProps) {
  const ratio = footprintRatio(piece.footprint);
  const crop = usePhotoCrop(image, ratio);
  const dialog = useRef<HTMLDialogElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const pointers = useRef(new Map<number, Point>());
  const titleId = useId();
  const zoomId = useId();
  const [, frameAreaRef, frameSpace] = useElementSize<HTMLDivElement>();
  const frame = cropFrameSize(ratio, frameSpace, FRAME_SIZE);
  const pixelRatio = typeof window === 'undefined' ? 1 : window.devicePixelRatio;
  const canvasSize = {
    width: Math.round(frame.width * pixelRatio),
    height: Math.round(frame.height * pixelRatio),
  };
  const imagePixelsPerCssPixel = frame.width > 0 ? crop.region.width / frame.width : 0;

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => {
      element?.close();
    };
  }, []);

  const { draw } = crop;
  useEffect(() => {
    if (canvas.current !== null && canvasSize.width > 0 && canvasSize.height > 0) {
      draw(canvas.current, canvasSize);
    }
  });

  function panByScreen(dx: number, dy: number): void {
    crop.pan({ x: -dx * imagePixelsPerCssPixel, y: -dy * imagePixelsPerCssPixel });
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>): void {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>): void {
    const previous = pointers.current.get(event.pointerId);
    if (previous === undefined) {
      return;
    }
    const next = { x: event.clientX, y: event.clientY };
    const others = [...pointers.current].filter(([id]) => id !== event.pointerId);
    pointers.current.set(event.pointerId, next);
    const other = others[0]?.[1];
    if (others.length === 0) {
      panByScreen(next.x - previous.x, next.y - previous.y);
    } else if (other !== undefined) {
      const before = Math.hypot(previous.x - other.x, previous.y - other.y);
      const after = Math.hypot(next.x - other.x, next.y - other.y);
      if (before > 0) {
        crop.zoomTo(crop.view.zoom * (after / before));
      }
    }
  }

  function onPointerEnd(event: PointerEvent<HTMLDivElement>): void {
    pointers.current.delete(event.pointerId);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    const step = { x: frame.width * KEY_PAN_SHARE, y: frame.height * KEY_PAN_SHARE };
    const actions: Record<string, () => void> = {
      ArrowLeft: () => {
        panByScreen(step.x, 0);
      },
      ArrowRight: () => {
        panByScreen(-step.x, 0);
      },
      ArrowUp: () => {
        panByScreen(0, step.y);
      },
      ArrowDown: () => {
        panByScreen(0, -step.y);
      },
      '+': () => {
        crop.zoomTo(crop.view.zoom * KEY_ZOOM_STEP);
      },
      '=': () => {
        crop.zoomTo(crop.view.zoom * KEY_ZOOM_STEP);
      },
      '-': () => {
        crop.zoomTo(crop.view.zoom / KEY_ZOOM_STEP);
      },
    };
    const action = actions[event.key];
    if (action !== undefined) {
      event.preventDefault();
      action();
    }
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        // React passes the event on to a dialog this one opened over, such as the piece form.
        event.stopPropagation();
        if (!saving) {
          onCancel();
        }
      }}
      className="parchment frame roomy:m-auto roomy:h-fit roomy:w-fit roomy:max-w-[calc(100vw-2rem)] roomy:rounded-sm roomy:pt-0 m-0 h-dvh max-h-none w-full max-w-none p-0 pt-[env(safe-area-inset-top)] shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      <div className="roomy:p-5 flex h-full flex-col gap-4 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="space-y-1">
          <h2 id={titleId} className="font-display text-[22px] leading-tight">
            Photo of {piece.name}
          </h2>
          <p className="text-soft roomy:max-w-md text-sm [@media(max-height:500px)]:hidden">
            Line the photo up with the piece seen from straight above. The frame has the
            piece&apos;s shape. Drag to move it, pinch or scroll to zoom. Arrow keys and + and −
            work too.
          </p>
        </div>
        <div
          ref={frameAreaRef}
          className="roomy:h-[min(480px,calc(100dvh-17rem))] roomy:w-[480px] roomy:flex-none flex min-h-0 flex-1 items-center justify-center"
        >
          <div
            tabIndex={0}
            role="application"
            aria-label="Photo crop frame"
            aria-roledescription="crop frame"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
            onWheel={(event) => {
              crop.zoomTo(crop.view.zoom * Math.exp(-event.deltaY * WHEEL_ZOOM_RATE));
            }}
            onKeyDown={onKeyDown}
            style={{ width: frame.width, height: frame.height }}
            className="focus-visible:ring-accent-ink relative mx-auto cursor-move touch-none overflow-hidden rounded-lg bg-stone-950 outline-none focus-visible:ring-2"
          >
            <canvas
              ref={canvas}
              width={canvasSize.width}
              height={canvasSize.height}
              style={{ width: frame.width, height: frame.height }}
              className="block"
            />
            {piece.footprint.kind === 'ellipse' && (
              <svg
                viewBox={`0 0 ${String(frame.width)} ${String(frame.height)}`}
                className="pointer-events-none absolute inset-0 h-full w-full"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  className="fill-black/55"
                  d={ovalMask(frame.width, frame.height)}
                />
                <ellipse
                  cx={frame.width / 2}
                  cy={frame.height / 2}
                  rx={frame.width / 2}
                  ry={frame.height / 2}
                  className="fill-none stroke-white/70"
                  strokeWidth={1.5}
                />
              </svg>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label htmlFor={zoomId} className="text-soft text-sm">
            Zoom
          </label>
          <input
            id={zoomId}
            type="range"
            min={1}
            max={MAX_CROP_ZOOM}
            step={0.01}
            value={crop.view.zoom}
            onChange={(event) => {
              crop.zoomTo(Number(event.target.value));
            }}
            className="accent-accent roomy:h-auto h-11 flex-1"
          />
          <button
            type="button"
            onClick={crop.turn}
            className={`${BUTTON_STYLES.secondary} text-sm`}
          >
            Turn 90°
          </button>
        </div>
        {error !== null && (
          <p role="alert" className="text-fail roomy:max-w-md text-sm">
            {error}
          </p>
        )}
        <div className="roomy:justify-end flex gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={onCancel}
            className={BUTTON_STYLES.secondary}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => {
              onSave(crop.view);
            }}
            className={`${BUTTON_STYLES.primary} roomy:flex-none flex-1`}
          >
            {saving ? 'Saving…' : 'Use photo'}
          </button>
        </div>
      </div>
    </dialog>
  );
}

import { useEffect, useId, useRef, type KeyboardEvent, type PointerEvent } from 'react';
import type { Point } from '../domain/geometry';
import { footprintRatio, MAX_CROP_ZOOM, type CropView } from '../domain/imageCrop';
import type { TerrainPiece } from '../domain/terrain';
import { usePhotoCrop } from '../hooks/usePhotoCrop';

interface PhotoCropperProps {
  piece: TerrainPiece;
  image: ImageBitmap;
  saving: boolean;
  error: string | null;
  onSave: (view: CropView) => void;
  onCancel: () => void;
}

/** The longest side of the crop frame on screen, in CSS pixels. */
const FRAME_SIZE = 320;
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
  const frame =
    ratio >= 1
      ? { width: FRAME_SIZE, height: FRAME_SIZE / ratio }
      : { width: FRAME_SIZE * ratio, height: FRAME_SIZE };
  const pixelRatio = typeof window === 'undefined' ? 1 : window.devicePixelRatio;
  const canvasSize = {
    width: Math.round(frame.width * pixelRatio),
    height: Math.round(frame.height * pixelRatio),
  };
  const imagePixelsPerCssPixel = crop.region.width / frame.width;

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => {
      element?.close();
    };
  }, []);

  const { draw } = crop;
  useEffect(() => {
    if (canvas.current !== null) {
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
        if (!saving) {
          onCancel();
        }
      }}
      className="border-line bg-surface text-ink shadow-shade m-auto max-w-[calc(100vw-2rem)] rounded-2xl border p-0 shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      <div className="space-y-4 p-5">
        <h2 id={titleId} className="text-lg font-semibold">
          Photo of {piece.name}
        </h2>
        <p className="text-soft max-w-sm text-sm">
          Line the photo up with the piece seen from straight above. The frame has the piece&apos;s
          shape. Drag to move it, pinch or scroll to zoom. Arrow keys and + and − work too.
        </p>
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
            className="flex-1 accent-amber-500"
          />
          <button
            type="button"
            onClick={crop.turn}
            className="border-line-strong hover:bg-hover rounded-lg border px-3 py-1.5 text-sm"
          >
            Turn 90°
          </button>
        </div>
        {error !== null && (
          <p role="alert" className="text-fail max-w-sm text-sm">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={onCancel}
            className="border-line-strong hover:bg-hover rounded-lg border px-3 py-1.5 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => {
              onSave(crop.view);
            }}
            className="bg-accent text-on-accent hover:bg-accent-hover rounded-lg px-3 py-1.5 font-semibold disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Use photo'}
          </button>
        </div>
      </div>
    </dialog>
  );
}

/** A rectangle with an oval hole, to darken what falls outside a round piece. */
function ovalMask(width: number, height: number): string {
  const rx = width / 2;
  const ry = height / 2;
  return [
    `M0 0H${String(width)}V${String(height)}H0Z`,
    `M0 ${String(ry)}a${String(rx)} ${String(ry)} 0 1 0 ${String(width)} 0`,
    `a${String(rx)} ${String(ry)} 0 1 0 ${String(-width)} 0Z`,
  ].join('');
}

import { EyeIcon, EyeOffIcon, Undo2Icon } from 'lucide-react';
import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { Point } from '../domain/geometry';
import { cropFrameSize, type EncodedPhoto } from '../domain/imageCrop';
import {
  brushRadius,
  clampBrushShare,
  DEFAULT_BRUSH_SHARE,
  framePointToMask,
  MAX_BRUSH_SHARE,
  MIN_BRUSH_SHARE,
  type MaskTool,
} from '../domain/photoMask';
import type { Footprint } from '../domain/terrain';
import { useElementSize } from '../hooks/useElementSize';
import { usePhotoMask } from '../hooks/usePhotoMask';
import { drawMaskedPhoto, encodeMask } from '../services/photoMasking';
import { BUTTON_STYLES } from './buttonStyles';
import { ovalMask } from './ovalMask';
import { SegmentedControl, type Segment } from './SegmentedControl';

interface PhotoMaskPainterProps {
  pieceName: string;
  footprint: Footprint;
  photo: EncodedPhoto;
  /** Called with the new mask, or null when nothing is hidden. */
  onSave: (mask: Blob | null) => Promise<void>;
  onCancel: () => void;
}

/** The longest side of the photo on screen, in CSS pixels; it shrinks to fit a phone. */
const FRAME_SIZE = 480;
/** The [ and ] keys change the brush size by this factor. */
const KEY_BRUSH_STEP = 1.25;

const TOOLS: readonly Segment<MaskTool>[] = [
  {
    value: 'hide',
    label: (
      <>
        <EyeOffIcon className="size-4" aria-hidden="true" />
        Hide
      </>
    ),
  },
  {
    value: 'show',
    label: (
      <>
        <EyeIcon className="size-4" aria-hidden="true" />
        Show
      </>
    ),
  },
];

/**
 * A dialog for hiding parts of a piece's photo, such as the table around it: paint with the Hide
 * brush, bring parts back with the Show brush. Hidden parts are tinted while painting.
 */
export function PhotoMaskPainter({
  pieceName,
  footprint,
  photo,
  onSave,
  onCancel,
}: PhotoMaskPainterProps) {
  const mask = usePhotoMask(photo);
  const [tool, setTool] = useState<MaskTool>('hide');
  const [brushShare, setBrushShare] = useState(DEFAULT_BRUSH_SHARE);
  const [cursor, setCursor] = useState<Point | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const view = useRef<HTMLCanvasElement>(null);
  const tint = useRef<HTMLCanvasElement | null>(null);
  const stroke = useRef<{ readonly pointerId: number; last: Point } | null>(null);
  const titleId = useId();
  const sizeId = useId();
  const [, frameAreaRef, frameSpace] = useElementSize<HTMLDivElement>();
  const frame = cropFrameSize(photo.width / photo.height, frameSpace, FRAME_SIZE);
  const pixelRatio = typeof window === 'undefined' ? 1 : window.devicePixelRatio;
  const canvasSize = {
    width: Math.round(frame.width * pixelRatio),
    height: Math.round(frame.height * pixelRatio),
  };
  const radius = brushRadius(brushShare, photo);
  const radiusOnScreen = frame.width > 0 ? (radius * frame.width) / photo.width : 0;
  const error = saveError ?? mask.error;

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => {
      element?.close();
    };
  }, []);

  const { canvas, revision } = mask;
  const { width: canvasWidth, height: canvasHeight } = canvasSize;
  useEffect(() => {
    const context = view.current?.getContext('2d') ?? null;
    if (canvas === null || context === null || canvasWidth <= 0 || canvasHeight <= 0) {
      return;
    }
    tint.current ??= document.createElement('canvas');
    tint.current.width = canvas.mask.width;
    tint.current.height = canvas.mask.height;
    drawMaskedPhoto(context, canvas, tint.current, { width: canvasWidth, height: canvasHeight });
  }, [canvas, revision, canvasWidth, canvasHeight]);

  function pointOnFrame(event: PointerEvent<HTMLElement>): Point {
    const box = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - box.left, y: event.clientY - box.top };
  }

  function toMask(point: Point): Point {
    return framePointToMask(point, frame, photo);
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>): void {
    if (stroke.current !== null || canvas === null || saving) {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    const at = toMask(pointOnFrame(event));
    mask.checkpoint();
    mask.paint(at, at, radius, tool);
    stroke.current = { pointerId: event.pointerId, last: at };
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>): void {
    const point = pointOnFrame(event);
    setCursor(point);
    const current = stroke.current;
    if (current?.pointerId !== event.pointerId) {
      return;
    }
    const at = toMask(point);
    mask.paint(current.last, at, radius, tool);
    current.last = at;
  }

  function onPointerEnd(event: PointerEvent<HTMLDivElement>): void {
    if (stroke.current?.pointerId === event.pointerId) {
      stroke.current = null;
    }
    if (event.pointerType !== 'mouse') {
      setCursor(null);
    }
  }

  function fill(hidden: boolean): void {
    mask.checkpoint();
    mask.fill(hidden);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDialogElement>): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      mask.undo();
    } else if (event.key === '[' || event.key === ']') {
      event.preventDefault();
      const factor = event.key === ']' ? KEY_BRUSH_STEP : 1 / KEY_BRUSH_STEP;
      setBrushShare((current) => clampBrushShare(current * factor));
    }
  }

  async function save(): Promise<void> {
    if (canvas === null) {
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await onSave(await encodeMask(canvas.mask));
    } catch (failure) {
      setSaveError(failure instanceof Error ? failure.message : 'The mask could not be saved.');
      setSaving(false);
    }
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      onKeyDown={onKeyDown}
      onCancel={(event) => {
        event.preventDefault();
        // React passes the event on to a dialog this one opened over, such as the piece form.
        event.stopPropagation();
        if (!saving) {
          onCancel();
        }
      }}
      className="bg-surface text-ink shadow-shade roomy:border-line roomy:m-auto roomy:h-fit roomy:w-fit roomy:max-w-[calc(100vw-2rem)] roomy:rounded-2xl roomy:border roomy:pt-0 m-0 h-dvh max-h-none w-full max-w-none p-0 pt-[env(safe-area-inset-top)] shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      <div className="roomy:p-5 flex h-full flex-col gap-4 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="space-y-1">
          <h2 id={titleId} className="text-lg font-semibold">
            Hide parts of {pieceName}
          </h2>
          <p className="text-soft roomy:max-w-md text-sm [@media(max-height:500px)]:hidden">
            Paint over what isn&apos;t the piece, such as the table around it. Hidden parts are
            see-through, so the board shows under them. Use Show to bring parts back.
          </p>
        </div>
        <div
          ref={frameAreaRef}
          className="roomy:h-[min(480px,calc(100dvh-20rem))] roomy:w-[480px] roomy:flex-none flex min-h-0 flex-1 items-center justify-center"
        >
          <div
            role="img"
            aria-label={`Photo of ${pieceName}. Hidden parts are tinted red.`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
            onPointerLeave={() => {
              setCursor(null);
            }}
            style={{ width: frame.width, height: frame.height }}
            className="relative mx-auto cursor-crosshair touch-none overflow-hidden rounded-lg bg-stone-950"
          >
            <canvas
              ref={view}
              width={canvasSize.width}
              height={canvasSize.height}
              style={{ width: frame.width, height: frame.height }}
              className="block"
            />
            <svg
              viewBox={`0 0 ${String(frame.width)} ${String(frame.height)}`}
              className="pointer-events-none absolute inset-0 h-full w-full"
              aria-hidden="true"
            >
              {footprint.kind === 'ellipse' && (
                <path
                  fillRule="evenodd"
                  className="fill-black/55"
                  d={ovalMask(frame.width, frame.height)}
                />
              )}
              {cursor !== null && (
                <circle
                  cx={cursor.x}
                  cy={cursor.y}
                  r={radiusOnScreen}
                  className="fill-none stroke-white"
                  strokeWidth={1.5}
                  style={{ filter: 'drop-shadow(0 0 1px rgb(0 0 0 / 0.9))' }}
                />
              )}
            </svg>
            {canvas === null && mask.error === null && (
              <p className="absolute inset-0 grid place-items-center text-sm text-stone-300">
                Opening…
              </p>
            )}
          </div>
        </div>
        <div className="roomy:max-w-[480px] flex flex-wrap items-center gap-x-4 gap-y-3">
          <SegmentedControl
            legend="Brush"
            segments={TOOLS}
            value={tool}
            onChange={setTool}
            className="pointer-coarse:[&_label]:py-2"
          />
          <div className="flex min-w-40 flex-1 items-center gap-3">
            <label htmlFor={sizeId} className="text-soft text-sm">
              Size
            </label>
            <input
              id={sizeId}
              type="range"
              min={MIN_BRUSH_SHARE}
              max={MAX_BRUSH_SHARE}
              step={0.005}
              value={brushShare}
              onChange={(event) => {
                setBrushShare(clampBrushShare(Number(event.target.value)));
              }}
              className="accent-accent roomy:h-auto h-11 flex-1"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!mask.canUndo || saving}
            onClick={mask.undo}
            className={`${BUTTON_STYLES.secondary} text-sm`}
          >
            <Undo2Icon className="size-4" aria-hidden="true" />
            Undo
          </button>
          <button
            type="button"
            disabled={canvas === null || saving}
            onClick={() => {
              fill(true);
            }}
            className={`${BUTTON_STYLES.quiet} text-sm`}
          >
            Hide all
          </button>
          <button
            type="button"
            disabled={canvas === null || saving}
            onClick={() => {
              fill(false);
            }}
            className={`${BUTTON_STYLES.quiet} text-sm`}
          >
            Show all
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
            disabled={saving || canvas === null}
            onClick={() => {
              void save();
            }}
            className={`${BUTTON_STYLES.primary} roomy:flex-none flex-1`}
          >
            {saving ? 'Saving…' : 'Done'}
          </button>
        </div>
      </div>
    </dialog>
  );
}

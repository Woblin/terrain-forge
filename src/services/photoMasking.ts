import type { Point } from '../domain/geometry';
import { PHOTO_MASK_MAX_BYTES, type EncodedPhoto, type Size } from '../domain/imageCrop';
import { maskIsEmpty, type MaskTool } from '../domain/photoMask';

/** A photo opened for hiding parts of it, and the mask painted over it. */
export interface MaskCanvas {
  readonly image: ImageBitmap;
  /** Opaque where the photo is hidden, the size of the photo. */
  readonly mask: HTMLCanvasElement;
}

/** The colour that marks hidden parts while painting. */
const HIDDEN_TINT = 'rgb(225 29 72)';
const HIDDEN_TINT_ALPHA = 0.6;

/** Decodes a saved or cropped photo and its mask, ready to paint on. */
export async function openMaskCanvas(photo: EncodedPhoto): Promise<MaskCanvas> {
  const mask = blankCanvas(photo);
  const context = mask.getContext('2d');
  if (context === null) {
    throw new Error('This browser cannot edit photos.');
  }
  const image = await decodeBlob(photo.blob);
  if (photo.mask !== null) {
    try {
      const saved = await decodeBlob(photo.mask);
      context.drawImage(saved, 0, 0, mask.width, mask.height);
      saved.close();
    } catch (error) {
      image.close();
      throw error;
    }
  }
  return { image, mask };
}

/** Paints a round-ended line on the mask, hiding or showing the photo under it. */
export function paintStroke(
  mask: HTMLCanvasElement,
  from: Point,
  to: Point,
  radius: number,
  tool: MaskTool,
): void {
  const context = mask.getContext('2d');
  if (context === null) {
    return;
  }
  context.save();
  context.globalCompositeOperation = tool === 'hide' ? 'source-over' : 'destination-out';
  context.strokeStyle = 'black';
  context.fillStyle = 'black';
  context.lineCap = 'round';
  context.lineWidth = radius * 2;
  context.beginPath();
  if (from.x === to.x && from.y === to.y) {
    context.arc(to.x, to.y, radius, 0, Math.PI * 2);
    context.fill();
  } else {
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();
  }
  context.restore();
}

/** Hides the whole photo, or shows all of it. */
export function fillMask(mask: HTMLCanvasElement, hidden: boolean): void {
  const context = mask.getContext('2d');
  if (context === null) {
    return;
  }
  context.clearRect(0, 0, mask.width, mask.height);
  if (hidden) {
    context.fillStyle = 'black';
    context.fillRect(0, 0, mask.width, mask.height);
  }
}

/** A copy of the mask's pixels, to undo back to. */
export function copyMask(mask: HTMLCanvasElement): ImageData | null {
  return mask.getContext('2d')?.getImageData(0, 0, mask.width, mask.height) ?? null;
}

export function restoreMask(mask: HTMLCanvasElement, pixels: ImageData): void {
  mask.getContext('2d')?.putImageData(pixels, 0, 0);
}

/**
 * Draws the photo to fill `target`, with the hidden parts tinted so the player can still see
 * what is under them. `tint` is a spare canvas the size of the mask.
 */
export function drawMaskedPhoto(
  context: CanvasRenderingContext2D,
  { image, mask }: MaskCanvas,
  tint: HTMLCanvasElement,
  target: Size,
): void {
  const tintContext = tint.getContext('2d');
  if (tintContext === null) {
    return;
  }
  tintContext.save();
  tintContext.globalCompositeOperation = 'copy';
  tintContext.drawImage(mask, 0, 0);
  tintContext.globalCompositeOperation = 'source-in';
  tintContext.fillStyle = HIDDEN_TINT;
  tintContext.fillRect(0, 0, tint.width, tint.height);
  tintContext.restore();

  context.save();
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.clearRect(0, 0, target.width, target.height);
  context.drawImage(image, 0, 0, target.width, target.height);
  context.globalAlpha = HIDDEN_TINT_ALPHA;
  context.drawImage(tint, 0, 0, target.width, target.height);
  context.restore();
}

/** Encodes the mask as a PNG, or gives null when it hides nothing. */
export async function encodeMask(mask: HTMLCanvasElement): Promise<Blob | null> {
  const pixels = copyMask(mask);
  if (pixels === null) {
    throw new Error('This browser cannot edit photos.');
  }
  if (maskIsEmpty(pixels.data)) {
    return null;
  }
  const blob = await toPng(mask);
  if (blob.size > PHOTO_MASK_MAX_BYTES) {
    throw new Error(
      'The hidden parts have too much detail to save. Try fewer, larger brush strokes.',
    );
  }
  return blob;
}

/**
 * The picture to show for a photo: the photo itself, or when parts are hidden, a PNG with those
 * parts see-through. It is only shown, never saved.
 */
export async function shownPhotoBlob(photo: EncodedPhoto): Promise<Blob> {
  if (photo.mask === null) {
    return photo.blob;
  }
  const { image, mask } = await openMaskCanvas(photo);
  try {
    const canvas = blankCanvas(photo);
    const context = canvas.getContext('2d');
    if (context === null) {
      throw new Error('This browser cannot show this photo.');
    }
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    context.globalCompositeOperation = 'destination-out';
    context.drawImage(mask, 0, 0);
    return await toPng(canvas);
  } finally {
    image.close();
  }
}

function blankCanvas(size: Size): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  return canvas;
}

async function decodeBlob(blob: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(blob);
  } catch (error) {
    throw new Error('A saved photo could not be opened.', { cause: error });
  }
}

function toPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob === null) {
        reject(new Error('The photo could not be encoded.'));
      } else {
        resolve(blob);
      }
    }, 'image/png');
  });
}

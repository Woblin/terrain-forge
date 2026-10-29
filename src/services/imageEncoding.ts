import {
  cropRegion,
  outputSize,
  PHOTO_MAX_BYTES,
  PHOTO_QUALITIES,
  workingSize,
  type CropView,
  type EncodedPhoto,
  type Size,
} from '../domain/imageCrop';

/** Photos larger than this are refused before decoding. */
const MAX_FILE_BYTES = 20 * 1024 * 1024;

/**
 * Decodes a photo the right way up and scales it down to a working size for cropping. Decoding
 * and re-encoding later also drops EXIF data such as the GPS position.
 */
export async function loadWorkingImage(file: File): Promise<ImageBitmap> {
  if (!file.type.startsWith('image/')) {
    throw new Error(`"${file.name}" is not an image. Pick a photo instead.`);
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`"${file.name}" is larger than 20 MB. Pick a smaller photo.`);
  }
  const original = await decode(file);
  const size = workingSize(original);
  if (size.width === original.width && size.height === original.height) {
    return original;
  }
  try {
    return await createImageBitmap(original, {
      resizeWidth: size.width,
      resizeHeight: size.height,
      resizeQuality: 'high',
    });
  } finally {
    original.close();
  }
}

async function decode(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch (error) {
    throw new Error(`"${file.name}" could not be opened. Try a JPEG or PNG photo.`, {
      cause: error,
    });
  }
}

/**
 * Draws the cropped area of the photo so it fills `target`. Quarter turns are clockwise, and
 * the crop region is measured in the turned photo, as `cropRegion` gives it.
 */
export function drawCrop(
  context: CanvasRenderingContext2D,
  image: ImageBitmap,
  view: CropView,
  ratio: number,
  target: Size,
): void {
  const region = cropRegion(view, image, ratio);
  const scale = target.width / region.width;
  context.save();
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.clearRect(0, 0, target.width, target.height);
  context.scale(scale, scale);
  context.translate(-region.x, -region.y);
  turn(context, image, view.turns);
  context.drawImage(image, 0, 0);
  context.restore();
}

/** Maps the unturned photo into the turned photo's pixels. */
function turn(context: CanvasRenderingContext2D, image: Size, turns: CropView['turns']): void {
  const { width, height } = image;
  const offsets = [
    { x: 0, y: 0 },
    { x: height, y: 0 },
    { x: width, y: height },
    { x: 0, y: width },
  ] as const;
  context.translate(offsets[turns].x, offsets[turns].y);
  context.rotate((turns * Math.PI) / 2);
}

/**
 * Crops and resizes the photo to the saved size, then encodes it as WebP, or JPEG where the
 * browser cannot encode WebP, lowering the quality until it fits in the size limit.
 */
export async function encodeCrop(
  image: ImageBitmap,
  view: CropView,
  ratio: number,
): Promise<EncodedPhoto> {
  const size = outputSize(ratio);
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext('2d');
  if (context === null) {
    throw new Error('This browser cannot edit photos.');
  }
  drawCrop(context, image, view, ratio, size);
  for (const quality of PHOTO_QUALITIES) {
    const blob = await encodeSmallest(canvas, quality);
    if (blob.size <= PHOTO_MAX_BYTES) {
      return {
        blob,
        ...size,
        mimeType: blob.type === 'image/webp' ? 'image/webp' : 'image/jpeg',
        mask: null,
      };
    }
  }
  throw new Error(
    'This photo has too much detail to save small enough. Try a closer crop or a plainer background.',
  );
}

async function encodeSmallest(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  const webp = await toBlob(canvas, 'image/webp', quality);
  // Browsers that cannot encode WebP hand back a PNG instead.
  return webp.type === 'image/webp' ? webp : toBlob(canvas, 'image/jpeg', quality);
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob === null) {
          reject(new Error('The photo could not be encoded.'));
        } else {
          resolve(blob);
        }
      },
      type,
      quality,
    );
  });
}

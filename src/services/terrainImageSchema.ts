import { Bytes } from 'firebase/firestore';
import { z } from 'zod';
import {
  PHOTO_LONG_SIDE,
  PHOTO_MASK_MAX_BYTES,
  PHOTO_MAX_BYTES,
  type EncodedPhoto,
} from '../domain/imageCrop';

const pixels = z.int().min(1).max(PHOTO_LONG_SIDE);
const bytes = z.custom<Bytes>((value) => value instanceof Bytes);

/**
 * A photo as stored in `users/{uid}/terrainImages/{pieceId}`. The timestamp is not read. Photos
 * saved before parts could be hidden have no mask.
 */
const imageDocumentSchema = z.object({
  data: bytes,
  mimeType: z.enum(['image/webp', 'image/jpeg']),
  width: pixels,
  height: pixels,
  ratio: z.number().positive(),
  mask: bytes.optional(),
});

/** Checks a stored photo before it is shown. Throws a message for the player when it is broken. */
export function parseImageDocument(pieceId: string, data: unknown): EncodedPhoto {
  const result = imageDocumentSchema.safeParse(data);
  if (
    !result.success ||
    result.data.data.toUint8Array().byteLength > PHOTO_MAX_BYTES ||
    (result.data.mask?.toUint8Array().byteLength ?? 0) > PHOTO_MASK_MAX_BYTES
  ) {
    throw new Error(`The photo of a saved piece (${pieceId}) could not be read.`);
  }
  const { data: photo, mimeType, width, height, mask } = result.data;
  return {
    blob: blobOf(photo, mimeType),
    mimeType,
    width,
    height,
    mask: mask === undefined ? null : blobOf(mask, 'image/png'),
  };
}

/** The fields written for a photo, without its timestamp. A photo with nothing hidden has no mask. */
export async function imageDocument(photo: EncodedPhoto, ratio: number) {
  const fields = {
    data: await bytesOf(photo.blob),
    mimeType: photo.mimeType,
    width: photo.width,
    height: photo.height,
    ratio,
  };
  return photo.mask === null ? fields : { ...fields, mask: await bytesOf(photo.mask) };
}

function blobOf(stored: Bytes, type: string): Blob {
  return new Blob([Uint8Array.from(stored.toUint8Array())], { type });
}

async function bytesOf(blob: Blob): Promise<Bytes> {
  return Bytes.fromUint8Array(new Uint8Array(await blob.arrayBuffer()));
}

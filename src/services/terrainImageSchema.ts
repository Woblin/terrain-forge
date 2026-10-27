import { Bytes } from 'firebase/firestore';
import { z } from 'zod';
import { PHOTO_LONG_SIDE, PHOTO_MAX_BYTES, type EncodedPhoto } from '../domain/imageCrop';

const pixels = z.int().min(1).max(PHOTO_LONG_SIDE);

/** A photo as stored in `users/{uid}/terrainImages/{pieceId}`. The timestamp is not read. */
const imageDocumentSchema = z.object({
  data: z.custom<Bytes>((value) => value instanceof Bytes),
  mimeType: z.enum(['image/webp', 'image/jpeg']),
  width: pixels,
  height: pixels,
  ratio: z.number().positive(),
});

/** Checks a stored photo before it is shown. Throws a message for the player when it is broken. */
export function parseImageDocument(pieceId: string, data: unknown): EncodedPhoto {
  const result = imageDocumentSchema.safeParse(data);
  if (!result.success || result.data.data.toUint8Array().byteLength > PHOTO_MAX_BYTES) {
    throw new Error(`The photo of a saved piece (${pieceId}) could not be read.`);
  }
  const { data: bytes, mimeType, width, height } = result.data;
  const copy = Uint8Array.from(bytes.toUint8Array());
  return { blob: new Blob([copy], { type: mimeType }), mimeType, width, height };
}

/** The fields written for a photo, without its timestamp. */
export async function imageDocument(photo: EncodedPhoto, ratio: number) {
  return {
    data: Bytes.fromUint8Array(new Uint8Array(await photo.blob.arrayBuffer())),
    mimeType: photo.mimeType,
    width: photo.width,
    height: photo.height,
    ratio,
  };
}

import type { z } from 'zod';

/** What a reader says about a document that a newer version of the app saved. */
export const NEWER_VERSION_PROBLEM =
  'was saved by a newer version of Terrain Forge. Reload the page to see it.';

/** The `schemaVersion` a stored document says it has, or null when it has none that can be read. */
export function storedVersion(data: unknown): number | null {
  if (typeof data !== 'object' || data === null || !('schemaVersion' in data)) {
    return null;
  }
  const { schemaVersion } = data;
  return typeof schemaVersion === 'number' && Number.isInteger(schemaVersion)
    ? schemaVersion
    : null;
}

/**
 * Picks the schema for the version a document says it has. A document from a newer version of
 * the app gives `newer`, for example when another tab already runs one; a document without a
 * version this app knows is read with the current schema, which names what is wrong with it.
 */
export function schemaFor<Schema extends z.ZodType>(
  data: unknown,
  readers: Readonly<Record<number, Schema>>,
  current: number,
): { readonly newer: true } | { readonly newer: false; readonly schema: Schema } {
  const version = storedVersion(data);
  if (version !== null && version > current) {
    return { newer: true };
  }
  const schema = (version === null ? undefined : readers[version]) ?? readers[current];
  if (schema === undefined) {
    throw new Error(`There is no reader for schema version ${String(current)}.`);
  }
  return { newer: false, schema };
}

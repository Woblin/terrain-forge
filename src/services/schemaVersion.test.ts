import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import { schemaFor, storedVersion } from './schemaVersion';

describe('storedVersion', () => {
  it.each([
    [{ schemaVersion: 1 }, 1],
    [{ schemaVersion: 3 }, 3],
    [{ schemaVersion: '1' }, null],
    [{ schemaVersion: 1.5 }, null],
    [{}, null],
    [null, null],
    ['settings', null],
  ])('reads %j as %j', (data, version) => {
    expect(storedVersion(data)).toBe(version);
  });
});

describe('schemaFor', () => {
  const v1 = z.object({ schemaVersion: z.literal(1) });
  const readers = { 1: v1 };

  it('reads version 1 with its own schema', () => {
    expect(schemaFor({ schemaVersion: 1 }, readers, 1)).toEqual({ newer: false, schema: v1 });
  });

  it('says when a newer version saved the document', () => {
    expect(schemaFor({ schemaVersion: 2 }, readers, 1)).toEqual({ newer: true });
  });

  it('reads a document without a known version with the current schema', () => {
    expect(schemaFor({ schemaVersion: 0 }, readers, 1)).toEqual({ newer: false, schema: v1 });
    expect(schemaFor({}, readers, 1)).toEqual({ newer: false, schema: v1 });
  });
});

import { describe, expect, it } from 'vitest';
import { documentTitle } from './navItems';

describe('documentTitle', () => {
  it.each([
    ['/library', 'Your terrain · Terrain Forge'],
    ['/boards', 'My boards · Terrain Forge'],
    ['/sign-in', 'Sign in · Terrain Forge'],
    ['/', 'Terrain Forge'],
    ['/no-such-page', 'Terrain Forge'],
  ])('names %s as %j', (pathname, title) => {
    expect(documentTitle(pathname)).toBe(title);
  });
});

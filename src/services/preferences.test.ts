import { describe, expect, it, vi } from 'vitest';
import page from '../../index.html?raw';
import { loadLengthUnit, parseOpenPanels, THEME_KEY } from './preferences';

describe('parseOpenPanels', () => {
  it.each([
    ['both panels as stored', { setup: false, details: true }, { setup: false, details: true }],
    ['a missing panel as open', { setup: false }, { setup: false, details: true }],
    [
      'a panel that is not true or false as open',
      { details: 'no' },
      { setup: true, details: true },
    ],
    ['a list as both open', [false, false], { setup: true, details: true }],
    ['nothing as both open', null, { setup: true, details: true }],
  ])('reads %s', (_, stored, panels) => {
    expect(parseOpenPanels(stored)).toEqual(panels);
  });
});

describe('the theme key', () => {
  it('is the one the script in index.html reads before the page draws', () => {
    expect(page).toContain(`localStorage.getItem('${THEME_KEY}')`);
  });
});

describe('loadLengthUnit', () => {
  it('uses inches and warns when the browser has no storage', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(loadLengthUnit()).toBe('in');
    expect(warn).toHaveBeenCalledWith(
      'Could not read the saved length unit; using inches.',
      expect.anything(),
    );
    warn.mockRestore();
  });
});

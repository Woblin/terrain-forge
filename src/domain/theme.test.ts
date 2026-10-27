import { describe, expect, it } from 'vitest';
import { parseThemeChoice, resolveTheme } from './theme';

describe('resolveTheme', () => {
  it('follows the device when the choice is system', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
  });

  it('keeps an explicit choice whatever the device prefers', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });
});

describe('parseThemeChoice', () => {
  it('reads the stored choices', () => {
    expect(parseThemeChoice('light')).toBe('light');
    expect(parseThemeChoice('dark')).toBe('dark');
    expect(parseThemeChoice('system')).toBe('system');
  });

  it('falls back to system for anything else', () => {
    expect(parseThemeChoice(null)).toBe('system');
    expect(parseThemeChoice('sepia')).toBe('system');
    expect(parseThemeChoice(1)).toBe('system');
  });
});

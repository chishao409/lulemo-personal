import { describe, expect, it } from 'vitest';

import { parseStoredThemeMode, resolveDarkMode } from '../utils/theme';

describe('theme helpers', () => {
  it('prefers explicit theme mode values over legacy boolean storage', () => {
    expect(parseStoredThemeMode('system', 'true')).toBe('system');
    expect(parseStoredThemeMode('dark', 'false')).toBe('dark');
    expect(parseStoredThemeMode('light', 'true')).toBe('light');
  });

  it('falls back to legacy dark mode values when theme mode is missing', () => {
    expect(parseStoredThemeMode(null, 'true')).toBe('dark');
    expect(parseStoredThemeMode(null, 'false')).toBe('light');
    expect(parseStoredThemeMode(null, null)).toBe('system');
  });

  it('resolves system mode using the current system preference', () => {
    expect(resolveDarkMode('system', true)).toBe(true);
    expect(resolveDarkMode('system', false)).toBe(false);
    expect(resolveDarkMode('dark', false)).toBe(true);
    expect(resolveDarkMode('light', true)).toBe(false);
  });
});

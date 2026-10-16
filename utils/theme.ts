export type ThemeMode = 'light' | 'dark' | 'system';

export function parseStoredThemeMode(
  storedThemeMode: string | null,
  legacyDarkModeValue: string | null
): ThemeMode {
  if (storedThemeMode === 'light' || storedThemeMode === 'dark' || storedThemeMode === 'system') {
    return storedThemeMode;
  }

  if (legacyDarkModeValue === 'true') return 'dark';
  if (legacyDarkModeValue === 'false') return 'light';
  return 'system';
}

export function resolveDarkMode(themeMode: ThemeMode, systemPrefersDark: boolean): boolean {
  if (themeMode === 'dark') return true;
  if (themeMode === 'light') return false;
  return systemPrefersDark;
}

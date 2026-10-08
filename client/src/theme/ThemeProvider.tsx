import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { ThemeContext, type ThemePreference, type ThemeState } from './ThemeContext';

const STORAGE_KEY = 'ck-theme';
const media = () => window.matchMedia('(prefers-color-scheme: dark)');

function readPreference(): ThemePreference {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readPreference);
  const [systemDark, setSystemDark] = useState(() => media().matches);
  const resolved = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;

  useEffect(() => {
    const query = media();
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolved === 'dark');
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', resolved === 'dark' ? '#070915' : '#5f3bf0');
  }, [resolved]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private mode: the choice just won't persist.
    }
  }, []);

  const value = useMemo<ThemeState>(
    () => ({
      preference,
      resolved,
      setPreference,
      toggle: () => setPreference(resolved === 'dark' ? 'light' : 'dark'),
    }),
    [preference, resolved, setPreference],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

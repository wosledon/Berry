import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

type ThemeMode = 'light' | 'dark';
export type ThemePreset = 'blue' | 'green' | 'purple' | 'orange' | 'red';

export const themePresets: Record<ThemePreset, { name: string; primary: string; primaryHover: string }> = {
  blue:   { name: '蓝', primary: '#2563eb', primaryHover: '#1d4ed8' },
  green:  { name: '绿', primary: '#16a34a', primaryHover: '#15803d' },
  purple: { name: '紫', primary: '#7c3aed', primaryHover: '#6d28d9' },
  orange: { name: '橙', primary: '#ea580c', primaryHover: '#c2410c' },
  red:    { name: '红', primary: '#dc2626', primaryHover: '#b91c1c' },
};

interface ThemeContextValue {
  theme: ThemeMode;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (t: ThemeMode) => void;
  preset: ThemePreset;
  setPreset: (p: ThemePreset) => void;
  colors: { primary: string; primaryHover: string };
  presets: Array<{ key: ThemePreset; name: string; color: string }>; // 用于渲染切换器
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY_THEME = 'theme';
const STORAGE_KEY_PRESET = 'theme.preset';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_THEME) as ThemeMode | null;
    return saved ?? 'light';
  });
  const [preset, setPreset] = useState<ThemePreset>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PRESET) as ThemePreset | null;
    return saved ?? 'blue';
  });

  // 应用明暗
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark'); else root.classList.remove('dark');
    localStorage.setItem(STORAGE_KEY_THEME, theme);
  }, [theme]);

  // 应用主题色到 CSS 变量
  useEffect(() => {
    const colors = themePresets[preset];
    const root = document.documentElement;
    root.style.setProperty('--primary-600', colors.primary);
    root.style.setProperty('--primary-700', colors.primaryHover);
    localStorage.setItem(STORAGE_KEY_PRESET, preset);
  }, [preset]);

  const value = useMemo<ThemeContextValue>(() => ({
    theme,
    isDark: theme === 'dark',
    toggleTheme: () => setTheme(t => (t === 'dark' ? 'light' : 'dark')),
    setTheme,
    preset,
    setPreset,
    colors: { primary: themePresets[preset].primary, primaryHover: themePresets[preset].primaryHover },
    presets: (Object.keys(themePresets) as ThemePreset[]).map(k => ({ key: k, name: themePresets[k].name, color: themePresets[k].primary }))
  }), [theme, preset]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

type ThemeMode = 'light' | 'dark';
export type LayoutStyle = 'comfortable' | 'compact';
export type NotificationPlacement = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
export type ThemePreset = 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'gray';
export type LayoutMode = 'side' | 'top' | 'mix';

export const themePresets: Record<ThemePreset, { name: string; primary: string; primaryHover: string }> = {
  blue:   { name: '蓝', primary: '#2563eb', primaryHover: '#1d4ed8' },
  green:  { name: '绿', primary: '#16a34a', primaryHover: '#15803d' },
  purple: { name: '紫', primary: '#7c3aed', primaryHover: '#6d28d9' },
  orange: { name: '橙', primary: '#ea580c', primaryHover: '#c2410c' },
  red:    { name: '红', primary: '#dc2626', primaryHover: '#b91c1c' },
  gray:   { name: '灰', primary: '#64748b', primaryHover: '#475569' },
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
  layoutStyle: LayoutStyle;
  setLayoutStyle: (v: LayoutStyle) => void;
  notificationPlacement: NotificationPlacement;
  setNotificationPlacement: (p: NotificationPlacement) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
  layoutMode: LayoutMode;
  setLayoutMode: (m: LayoutMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY_THEME = 'theme';
const STORAGE_KEY_PRESET = 'theme.preset';
const STORAGE_KEY_LAYOUT = 'theme.layoutStyle';
const STORAGE_KEY_NOTIFY = 'theme.notificationPlacement';
const STORAGE_KEY_SIDEBAR = 'theme.sidebarCollapsed';
const STORAGE_KEY_LAYOUTMODE = 'theme.layoutMode';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_THEME) as ThemeMode | null;
    return saved ?? 'light';
  });
  const [preset, setPreset] = useState<ThemePreset>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PRESET) as ThemePreset | null;
    return saved ?? 'blue';
  });
  const [layoutStyle, setLayoutStyle] = useState<LayoutStyle>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_LAYOUT) as LayoutStyle | null;
    return saved ?? 'comfortable';
  });
  const [notificationPlacement, setNotificationPlacement] = useState<NotificationPlacement>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_NOTIFY) as NotificationPlacement | null;
    return saved ?? 'topRight';
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_SIDEBAR);
    return saved === '1';
  });
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_LAYOUTMODE) as LayoutMode | null;
    return saved ?? 'side';
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

  // 持久化布局与通知设置
  useEffect(() => { localStorage.setItem(STORAGE_KEY_LAYOUT, layoutStyle); }, [layoutStyle]);
  useEffect(() => { localStorage.setItem(STORAGE_KEY_NOTIFY, notificationPlacement); }, [notificationPlacement]);
  useEffect(() => { localStorage.setItem(STORAGE_KEY_SIDEBAR, sidebarCollapsed ? '1' : '0'); }, [sidebarCollapsed]);
  useEffect(() => { localStorage.setItem(STORAGE_KEY_LAYOUTMODE, layoutMode); }, [layoutMode]);

  const value = useMemo<ThemeContextValue>(() => ({
    theme,
    isDark: theme === 'dark',
    toggleTheme: () => setTheme(t => (t === 'dark' ? 'light' : 'dark')),
    setTheme,
    preset,
    setPreset,
    colors: { primary: themePresets[preset].primary, primaryHover: themePresets[preset].primaryHover },
    presets: (Object.keys(themePresets) as ThemePreset[]).map(k => ({ key: k, name: themePresets[k].name, color: themePresets[k].primary })),
    layoutStyle,
    setLayoutStyle,
    notificationPlacement,
    setNotificationPlacement,
    sidebarCollapsed,
    setSidebarCollapsed,
    layoutMode,
    setLayoutMode,
  }), [theme, preset, layoutStyle, notificationPlacement, sidebarCollapsed, layoutMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

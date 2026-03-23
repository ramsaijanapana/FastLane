import React, { createContext, useContext, useMemo, useState } from 'react';

import type { ThemeKey } from './types';

export type ThemePalette = {
  key: ThemeKey;
  label: string;
  statusBarStyle: 'light' | 'dark';
  background: string;
  backgroundAlt: string;
  surface: string;
  surfaceStrong: string;
  surfaceMuted: string;
  border: string;
  borderSoft: string;
  track: string;
  text: string;
  textStrong: string;
  textMuted: string;
  textSoft: string;
  amber: string;
  amberSoft: string;
  teal: string;
  cyan: string;
  purple: string;
  green: string;
  red: string;
  redSurface: string;
};

const themes: Record<ThemeKey, ThemePalette> = {
  midnight: {
    key: 'midnight',
    label: 'Dark',
    statusBarStyle: 'light',
    background: '#0b0907',
    backgroundAlt: '#140f0b',
    surface: 'rgba(20, 16, 11, 0.9)',
    surfaceStrong: '#17120c',
    surfaceMuted: '#221c15',
    border: 'rgba(255, 255, 255, 0.06)',
    borderSoft: '#2d2419',
    track: '#2a231a',
    text: '#fff8ef',
    textStrong: '#fff9f0',
    textMuted: '#b09e8c',
    textSoft: '#dccab7',
    amber: '#f59e0b',
    amberSoft: '#f5b147',
    teal: '#2dd4bf',
    cyan: '#38bdf8',
    purple: '#c084fc',
    green: '#8ef3d7',
    red: '#fda4af',
    redSurface: '#351719',
  },
  daylight: {
    key: 'daylight',
    label: 'Light',
    statusBarStyle: 'dark',
    background: '#f7f2e8',
    backgroundAlt: '#efe5d5',
    surface: 'rgba(255, 252, 246, 0.92)',
    surfaceStrong: '#fffaf2',
    surfaceMuted: '#ede1cf',
    border: 'rgba(66, 45, 18, 0.12)',
    borderSoft: '#d8c7af',
    track: '#e5d9c8',
    text: '#2d2014',
    textStrong: '#1f130a',
    textMuted: '#7c6857',
    textSoft: '#5e4c3b',
    amber: '#d97706',
    amberSoft: '#b45309',
    teal: '#0f766e',
    cyan: '#0369a1',
    purple: '#7c3aed',
    green: '#15803d',
    red: '#dc2626',
    redSurface: '#fee2e2',
  },
  forest: {
    key: 'forest',
    label: 'Forest',
    statusBarStyle: 'light',
    background: '#07110d',
    backgroundAlt: '#0d1b15',
    surface: 'rgba(11, 28, 20, 0.9)',
    surfaceStrong: '#102219',
    surfaceMuted: '#163127',
    border: 'rgba(175, 255, 223, 0.08)',
    borderSoft: '#204538',
    track: '#17352b',
    text: '#eefdf5',
    textStrong: '#f5fff9',
    textMuted: '#98b7aa',
    textSoft: '#c0ded0',
    amber: '#eab308',
    amberSoft: '#facc15',
    teal: '#34d399',
    cyan: '#22d3ee',
    purple: '#a78bfa',
    green: '#86efac',
    red: '#fb7185',
    redSurface: '#3f1a1d',
  },
  sunrise: {
    key: 'sunrise',
    label: 'Sunrise',
    statusBarStyle: 'dark',
    background: '#fff5ef',
    backgroundAlt: '#ffe8d9',
    surface: 'rgba(255, 251, 247, 0.95)',
    surfaceStrong: '#fff7f0',
    surfaceMuted: '#ffe4d5',
    border: 'rgba(179, 77, 18, 0.12)',
    borderSoft: '#f1c8b1',
    track: '#f6dac7',
    text: '#392016',
    textStrong: '#27130c',
    textMuted: '#90634d',
    textSoft: '#744d3a',
    amber: '#ea580c',
    amberSoft: '#f97316',
    teal: '#14b8a6',
    cyan: '#0ea5e9',
    purple: '#9333ea',
    green: '#16a34a',
    red: '#e11d48',
    redSurface: '#ffe4e6',
  },
};

export const themeOptions = Object.values(themes).map(
  ({ key, label, backgroundAlt, amber, teal, purple }) => ({
    key,
    label,
    description:
      key === 'midnight'
        ? 'Low-glare dark mode'
        : key === 'daylight'
          ? 'Bright and clean'
          : key === 'forest'
            ? 'Cool, calm contrast'
            : 'Warm and energetic',
    previewBackground: backgroundAlt,
    swatches: [amber, teal, purple],
  }),
);

type ThemeContextValue = {
  theme: ThemePalette;
  themeKey: ThemeKey;
  setThemeKey: (themeKey: ThemeKey) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [themeKey, setThemeKey] = useState<ThemeKey>('midnight');
  const value = useMemo(
    () => ({
      theme: themes[themeKey],
      themeKey,
      setThemeKey,
    }),
    [themeKey],
  );

  return React.createElement(ThemeContext.Provider, { value }, children);
};

export const useTheme = () => {
  const value = useContext(ThemeContext);

  if (!value) {
    throw new Error('useTheme must be used inside ThemeProvider.');
  }

  return value;
};

export const resolveTheme = (themeKey: ThemeKey) => themes[themeKey] ?? themes.midnight;

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#FFFFFF',
    background: '#0A0A0A',
    backgroundElement: '#141414',
    backgroundSelected: '#1E1E1E',
    textSecondary: '#5A5A5A',
  },
  dark: {
    text: '#FFFFFF',
    background: '#0A0A0A',
    backgroundElement: '#141414',
    backgroundSelected: '#1E1E1E',
    textSecondary: '#5A5A5A',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const MeridianColors = {
  accent: '#44C760',
  border: '#1E1E1E',
  tabBar: '#0D0D0D',
  card: '#141414',
} as const;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = 0;
export const MaxContentWidth = 800;

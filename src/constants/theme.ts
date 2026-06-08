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
  accent:        '#44C760',  // tab indicator
  border:        '#1E1E1E',  // internal dividers
  tabBar:        '#0D0D0D',  // tab bar bg
  card:          '#141414',  // base card surface
  surface:       '#181818',  // elevated screen cards
  surfaceBorder: '#2A2A2A',  // screen card borders
  scoreGreen:    '#5CAD83',  // recovery / on-target (muted sage)
  scoreAmber:    '#C49A50',  // moderate / caution (warm gold)
  scoreRed:      '#B86262',  // caution / under target (dusty rose)
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

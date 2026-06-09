import '@/global.css';

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
  bg:         '#0A0A0A',
  card:       '#181818',
  border:     '#2A2A2A',
  tabBar:     '#0D0D0D',
  accent:     '#9FB89A',   // muted sage — only emphasis colour on Home
  text:       '#F2F2F0',   // warm off-white
  textMuted:  '#777777',
  textFaint:  '#555555',
} as const;

export const fonts = {
  serif:       'Newsreader_400Regular',
  serifMedium: 'Newsreader_500Medium',
  sans:        'Inter_400Regular',
  sansMedium:  'Inter_500Medium',
  sansSemiBold:'Inter_600SemiBold',
} as const;

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

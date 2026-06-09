import '@/global.css';

export const Colors = {
  light: {
    text: '#FFFFFF',
    background: '#0F1012',
    backgroundElement: '#181B20',
    backgroundSelected: '#212530',
    textSecondary: '#4D5565',
  },
  dark: {
    text: '#FFFFFF',
    background: '#0F1012',
    backgroundElement: '#181B20',
    backgroundSelected: '#212530',
    textSecondary: '#4D5565',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const MeridianColors = {
  bg:         '#0F1012',
  card:       '#181B20',
  cardBorder: '#212530',
  divider:    '#191C22',
  text:       '#EEEDE8',
  textMuted:  '#4D5565',
  textFaint:  '#2E3340',
  gold:       '#C9A96B',
  blue:       '#4A7FA5',
  green:      '#4D9A78',
  red:        '#C16E5A',
  // legacy aliases kept for onboarding
  border:     '#212530',
  tabBar:     '#0F1012',
  accent:     '#C9A96B',
} as const;

export const fonts = {
  sans:        'DMSans_400Regular',
  sansMedium:  'DMSans_500Medium',
  sansSemiBold:'DMSans_600SemiBold',
  sansBold:    'DMSans_700Bold',
  serif:       'Newsreader_500Medium',
  // legacy aliases used by onboarding
  serifMedium: 'Newsreader_500Medium',
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

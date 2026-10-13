import { StyleSheet } from 'react-native';

import { useSettings } from '@/store/settings';

const dark = {
  bg: '#0C0C0F',
  canvas: '#070709',
  surface: '#15151A',
  surfaceHigh: '#1E1E25',
  surfaceHigher: '#2A2A33',
  border: '#2C2C36',
  text: '#F5F3EE',
  textDim: '#A3A2AE',
  textFaint: '#6E6D7A',
  accent: '#FF6B4A',
  // Editor controls are neutral so the only colour on screen is the artist's picture.
  grid: '#ECECF0',
  doodle: '#ECECF0',
  success: '#4ADE80',
  danger: '#FF5470',
  /** Text and icons on top of an accent-coloured fill. */
  onTint: '#14110F',
  /** Slider and switch knobs. */
  thumb: '#F5F3EE',
  /** Selected segment in a segmented control. */
  pill: '#2A2A33',
  scrim: 'rgba(0,0,0,0.6)',
  shadow: 'rgba(0,0,0,0.5)',
};

export type Colors = typeof dark;

const light: Colors = {
  bg: '#F4F5F7',
  canvas: '#DDE0E7',
  surface: '#FFFFFF',
  // Controls sit on both the grey page and white cards, so they are a clear step darker than either.
  surfaceHigh: '#E2E5EB',
  surfaceHigher: '#CBD0D9',
  border: '#CDD2DA',
  text: '#101217',
  textDim: '#4A5262',
  textFaint: '#6F7788',
  accent: '#EE5230',
  grid: '#1B1D23',
  doodle: '#1B1D23',
  success: '#1E9E55',
  danger: '#DC3350',
  onTint: '#FFFFFF',
  thumb: '#FFFFFF',
  pill: '#FFFFFF',
  scrim: 'rgba(16,18,23,0.45)',
  shadow: 'rgba(16,18,23,0.16)',
};

export const themes = { dark, light };

/** The logo's amber-to-coral gradient, also used for the main action button. */
export const brandGradient = ['#FFC24A', '#FF6B4A'] as const;

/** Colours drawn on top of the user's photo. They stay the same in both themes. */
export const sceneColors = { done: '#4ADE80', focus: '#FF6B4A', handle: '#8C7BFF' } as const;

/** For chips and buttons that sit on a photo, where the background is dark in both themes. */
export const onPhoto = { chip: 'rgba(12,12,15,0.72)', text: '#F5F3EE' } as const;

export function useThemeName(): 'light' | 'dark' {
  // Anything but an explicit 'light' is dark, which also covers the 'system' value older versions saved.
  return useSettings((s) => s.themeMode) === 'light' ? 'light' : 'dark';
}

export function useColors(): Colors {
  return themes[useThemeName()];
}

type NamedStyles<T> = StyleSheet.NamedStyles<T>;

/**
 * Like StyleSheet.create, but the styles are built from the active theme's colours.
 * Returns a hook; each theme's sheet is created once.
 */
export function makeStyles<T extends NamedStyles<T> | NamedStyles<any>>(factory: (colors: Colors) => T & NamedStyles<any>) {
  const cache = new Map<Colors, T>();
  return function useStyles(): T {
    const colors = useColors();
    let sheet = cache.get(colors);
    if (!sheet) {
      sheet = StyleSheet.create(factory(colors));
      cache.set(colors, sheet);
    }
    return sheet;
  };
}

export const fonts = {
  regular: 'Outfit_400Regular',
  medium: 'Outfit_500Medium',
  semibold: 'Outfit_600SemiBold',
  bold: 'Outfit_700Bold',
} as const;

export const radius = { sm: 8, md: 12, lg: 18, xl: 26, pill: 999 } as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const MaxContentWidth = 1040;

/** Width at which editors move their controls into a side panel. */
export const WideBreakpoint = 700;

export function withAlpha(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

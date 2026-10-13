import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { AppText } from '@/components/ui/app-text';
import { fonts, space } from '@/constants/theme';

/** The violet of the app icon, top-left to bottom-right. The native splash screen uses the middle one. */
const VIOLET = ['#8876FF', '#6253EC', '#3B2BC4'] as const;
const WHITE = '#FFFFFF';
const CELL = 56;
const INTRO = 1900;
const HOLD = 2600;
const OUTRO = 380;
const LINE_OPACITY = 0.16;
/** Darker violet laid over the top and bottom edges, so the grid fades out and the picture holds the eye. */
const SHADE = ['rgba(36,22,128,0.55)', 'rgba(36,22,128,0)'] as const;
/** The yellow of the pencil in the icon. */
const PENCIL = '#FFC933';

type LineProps = { vertical: boolean; offset: number; start: number; progress: SharedValue<number> };

/** One line of the background grid. It grows from the middle of the screen, a little after the line before it. */
function GridLine({ vertical, offset, start, progress }: LineProps) {
  const style = useAnimatedStyle(() => {
    const grown = interpolate(progress.get(), [start, start + 0.4], [0, 1], Extrapolation.CLAMP);
    return { opacity: grown * LINE_OPACITY, transform: [vertical ? { scaleY: grown } : { scaleX: grown }] };
  });
  return <Animated.View style={[vertical ? styles.vertical : styles.horizontal, vertical ? { left: offset } : { top: offset }, style]} />;
}

/**
 * Shown over the app for a few seconds after launch: a drawing grid rules itself across a violet screen,
 * the gridded portrait drops in, the pencil arrives and underlines the name. Tapping skips it.
 * The native splash screen can only show a still image, so the motion lives here.
 */
export function SplashOverlay({ onDone }: { onDone?: () => void }) {
  const { width, height } = useWindowDimensions();
  const still = useReducedMotion();
  const [gone, setGone] = useState(false);
  const progress = useSharedValue(still ? 1 : 0);
  const loaded = useSharedValue(0);
  const sway = useSharedValue(0);
  const leaving = useSharedValue(0);

  const art = Math.min(width * 0.78, height * 0.4, 340);

  useEffect(() => {
    progress.set(withTiming(1, { duration: INTRO, easing: Easing.linear }));
    loaded.set(withTiming(1, { duration: INTRO + HOLD, easing: Easing.linear }));
    // The pencil rocks gently once it has arrived, as if it were drawing.
    sway.set(withDelay(INTRO * 0.75, withRepeat(withSequence(withTiming(1, { duration: 420 }), withTiming(-1, { duration: 420 })), -1, true)));
    leaving.set(
      withDelay(
        INTRO + HOLD,
        withTiming(1, { duration: OUTRO, easing: Easing.in(Easing.quad) }, (finished) => {
          if (finished) scheduleOnRN(setGone, true);
        }),
      ),
    );
  }, [progress, loaded, sway, leaving]);

  const skip = () => {
    leaving.set(
      withTiming(1, { duration: OUTRO * 0.7 }, (finished) => {
        if (finished) scheduleOnRN(setGone, true);
      }),
    );
  };

  const screen = useAnimatedStyle(() => ({ opacity: 1 - leaving.get() }));
  const glow = useAnimatedStyle(() => {
    const p = interpolate(progress.get(), [0.1, 0.6], [0, 1], Extrapolation.CLAMP);
    return { opacity: p * 0.13, transform: [{ scale: 0.6 + 0.4 * p + 0.25 * leaving.get() }] };
  });
  const photo = useAnimatedStyle(() => {
    const p = interpolate(progress.get(), [0.05, 0.45], [0, 1], Extrapolation.CLAMP);
    // Ease out with a small overshoot, so the photo lands rather than stops.
    const landed = 1 + 2.70158 * (p - 1) ** 3 + 1.70158 * (p - 1) ** 2;
    return {
      opacity: interpolate(p, [0, 0.35], [0, 1], Extrapolation.CLAMP),
      transform: [{ translateY: (1 - landed) * -40 }, { scale: 0.8 + 0.2 * landed + 0.08 * leaving.get() }, { rotate: `${(1 - landed) * -12}deg` }],
    };
  });
  const pencil = useAnimatedStyle(() => {
    const p = interpolate(progress.get(), [0.4, 0.72], [0, 1], Extrapolation.CLAMP);
    const eased = 1 - (1 - p) ** 3;
    return {
      opacity: interpolate(p, [0, 0.3], [0, 1], Extrapolation.CLAMP),
      transform: [{ translateX: (1 - eased) * 70 + sway.get() * 2.5 }, { translateY: (1 - eased) * 70 - sway.get() * 2 }, { scale: 1 + 0.08 * leaving.get() }],
    };
  });
  const title = useAnimatedStyle(() => {
    const p = interpolate(progress.get(), [0.55, 0.82], [0, 1], Extrapolation.CLAMP);
    return { opacity: p, transform: [{ translateY: (1 - p) * 16 }] };
  });
  const tagline = useAnimatedStyle(() => {
    const p = interpolate(progress.get(), [0.68, 0.95], [0, 1], Extrapolation.CLAMP);
    return { opacity: p * 0.86, transform: [{ translateY: (1 - p) * 12 }] };
  });
  // The pencil stroke under the name doubles as the loading line: a faint track appears, then fills with yellow.
  const track = useAnimatedStyle(() => ({ opacity: interpolate(progress.get(), [0.7, 0.9], [0, 1], Extrapolation.CLAMP) }));
  const stroke = useAnimatedStyle(() => ({ transform: [{ scaleX: interpolate(loaded.get(), [0.42, 1], [0, 1], Extrapolation.CLAMP) }] }));

  useEffect(() => {
    if (gone) onDone?.();
  }, [gone, onDone]);

  if (gone) return null;

  // Lines are placed outward from the centre, so the picture always sits on a crossing.
  const columns = Math.ceil(width / CELL / 2);
  const rows = Math.ceil(height / CELL / 2);
  const lines: LineProps[] = [];
  for (let i = -columns; i <= columns; i++) {
    lines.push({ vertical: true, offset: width / 2 + i * CELL, start: (Math.abs(i) / (columns + 1)) * 0.35, progress });
  }
  for (let i = -rows; i <= rows; i++) {
    lines.push({ vertical: false, offset: height / 2 + i * CELL, start: (Math.abs(i) / (rows + 1)) * 0.35, progress });
  }

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.screen, screen]}>
      <StatusBar style="light" />
      <Pressable style={styles.fill} onPress={skip} accessibilityRole="button" accessibilityLabel="GridSketch is starting. Tap to skip.">
        <LinearGradient colors={VIOLET} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {lines.map((line) => (
            <GridLine key={`${line.vertical ? 'v' : 'h'}${line.offset}`} {...line} />
          ))}
        </View>
        <LinearGradient pointerEvents="none" colors={SHADE} style={[styles.shade, styles.shadeTop]} />
        <LinearGradient pointerEvents="none" colors={SHADE} start={{ x: 0, y: 1 }} end={{ x: 0, y: 0 }} style={[styles.shade, styles.shadeBottom]} />

        <View style={styles.centre}>
          <View style={{ width: art, height: art }}>
            <Animated.View style={[styles.glow, { borderRadius: art }, glow]} />
            <Animated.View style={[StyleSheet.absoluteFill, photo]}>
              <Image source={require('@/assets/images/splash-photo.png')} style={styles.fill} contentFit="contain" />
            </Animated.View>
            <Animated.View style={[StyleSheet.absoluteFill, pencil]}>
              <Image source={require('@/assets/images/splash-pencil.png')} style={styles.fill} contentFit="contain" />
            </Animated.View>
          </View>
          <Animated.View style={title}>
            <AppText variant="display" color={WHITE} style={styles.name}>
              GridSketch
            </AppText>
          </Animated.View>
          <Animated.View style={[styles.track, track]}>
            <Animated.View style={[styles.stroke, stroke]} />
          </Animated.View>
          <Animated.View style={tagline}>
            <AppText variant="body" color={WHITE} style={styles.tagline}>
              Draw anything, one square at a time
            </AppText>
          </Animated.View>
        </View>

      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { zIndex: 100, backgroundColor: VIOLET[1] },
  fill: { flex: 1 },
  vertical: { position: 'absolute', top: 0, bottom: 0, width: 1.5, backgroundColor: WHITE, opacity: 0 },
  horizontal: { position: 'absolute', left: 0, right: 0, height: 1.5, backgroundColor: WHITE, opacity: 0 },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xl },
  glow: { position: 'absolute', top: '4%', left: '4%', right: '4%', bottom: '4%', backgroundColor: WHITE },
  name: { textAlign: 'center', fontFamily: fonts.bold, fontSize: 44, lineHeight: 50, letterSpacing: -1, marginTop: space.lg },
  track: { width: 88, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.22)', marginTop: space.sm, overflow: 'hidden' },
  stroke: { flex: 1, borderRadius: 2, backgroundColor: PENCIL, transformOrigin: 'left' },
  tagline: { textAlign: 'center', marginTop: space.md, fontSize: 16, lineHeight: 22 },
  shade: { position: 'absolute', left: 0, right: 0, height: '32%' },
  shadeTop: { top: 0 },
  shadeBottom: { bottom: 0 },
});

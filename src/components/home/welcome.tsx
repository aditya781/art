import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AppText } from '@/components/ui/app-text';
import type { IconName } from '@/components/ui/buttons';
import { PressableScale } from '@/components/ui/pressable-scale';
import { fonts, makeStyles, radius, space, useColors } from '@/constants/theme';
import type { Project } from '@/store/projects';

import { DoodleArt, GridArt } from './mode-art';
import { ModeCard } from './mode-card';

/** The violet of the app icon and splash screen. */
const VIOLET = ['#8876FF', '#6253EC', '#3B2BC4'] as const;
const VIOLET_TEXT = '#3B2BC4';
const WHITE = '#FFFFFF';
const CELL = 34;
/** Enough lines to cover the hero at any width; the card clips the rest. */
const RULES = Array.from({ length: 34 }, (_, i) => i * CELL);

const steps: { icon: IconName; title: string; text: string }[] = [
  { icon: 'image-outline', title: 'Pick a photo', text: 'From your library, or straight from the camera.' },
  { icon: 'grid-outline', title: 'Set your grid', text: 'Choose the squares, or match them to your paper size.' },
  { icon: 'pencil-outline', title: 'Draw one square at a time', text: 'Focus mode zooms into each square and ticks off the ones you finish.' },
];

type Props = { wide: boolean; onStart: (kind: Project['kind']) => void; onPrivacy: () => void };

/** What a first-time user sees instead of a list of drawings: what the app is for, one clear way in, and the two methods. */
export function Welcome({ wide, onStart, onPrivacy }: Props) {
  const colors = useColors();
  const styles = useStyles();

  return (
    <>
      <Animated.View entering={FadeInDown.duration(320)}>
        <View style={styles.hero}>
          <LinearGradient colors={VIOLET} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {RULES.map((at) => (
              <View key={`v${at}`} style={[styles.ruleV, { left: at }]} />
            ))}
            {RULES.map((at) => (
              <View key={`h${at}`} style={[styles.ruleH, { top: at }]} />
            ))}
          </View>
          <View style={[styles.heroRow, wide && styles.heroRowWide]}>
            <View style={styles.heroText}>
              <AppText variant="caption" color={WHITE} style={styles.eyebrow}>
                WELCOME TO GRIDSKETCH
              </AppText>
              <AppText color={WHITE} style={[styles.heroTitle, wide && styles.heroTitleWide]}>
                Draw anything, one square at a time.
              </AppText>
              <AppText color={WHITE} style={styles.heroLead}>
                Put a grid over a photo and copy it square by square. The proportions come out right, even on your first try.
              </AppText>
            </View>
            <Image source={require('@/assets/images/splash-art.png')} style={wide ? styles.heroArtWide : styles.heroArt} contentFit="contain" accessible={false} />
          </View>
          <PressableScale accessibilityRole="button" haptic scaleTo={0.97} onPress={() => onStart('grid')} style={[styles.cta, wide && styles.ctaWide]}>
            <Ionicons name="image-outline" size={20} color={VIOLET_TEXT} />
            <AppText variant="heading" color={VIOLET_TEXT}>
              Start with a photo
            </AppText>
          </PressableScale>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(320).delay(90)} style={styles.section}>
        <AppText variant="title">Two ways to draw</AppText>
        <View style={[styles.modes, wide && styles.row]}>
          <View style={styles.flex}>
            <ModeCard
              badge="Best to start with"
              title="Classic grid"
              description="Even squares over your photo, sized to your paper."
              tint={colors.grid}
              art={<GridArt />}
              onPress={() => onStart('grid')}
            />
          </View>
          <View style={styles.flex}>
            <ModeCard
              badge="No ruler needed"
              title="Doodle grid"
              description="For walls and big canvases. Your own scribbles become the guide."
              tint={colors.doodle}
              art={<DoodleArt />}
              onPress={() => onStart('doodle')}
            />
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(320).delay(180)} style={styles.section}>
        <AppText variant="title">How it works</AppText>
        <View style={[styles.steps, wide && styles.row]}>
          {steps.map((step, index) => (
            <View key={step.title} style={[styles.step, wide && styles.stepWide]}>
              <View style={styles.stepIcon}>
                <Ionicons name={step.icon} size={20} color={colors.text} />
              </View>
              <View style={styles.flex}>
                <AppText variant="heading">
                  {index + 1}. {step.title}
                </AppText>
                <AppText dim>{step.text}</AppText>
              </View>
            </View>
          ))}
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(320).delay(260)} style={styles.note}>
        <Ionicons name="lock-closed-outline" size={15} color={colors.textFaint} />
        <AppText variant="caption" color={colors.textFaint}>
          Your photos and drawings stay on this device.{' '}
          <AppText variant="caption" color={colors.textDim} accessibilityRole="link" onPress={onPrivacy} style={styles.link}>
            Privacy policy
          </AppText>
        </AppText>
      </Animated.View>
    </>
  );
}

const useStyles = makeStyles((colors) => ({
  link: { textDecorationLine: 'underline' },
  flex: { flex: 1 },
  row: { flexDirection: 'row' },
  hero: { borderRadius: radius.xl, overflow: 'hidden', padding: space.xl, gap: space.lg, backgroundColor: VIOLET[1] },
  ruleV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  ruleH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  heroRow: { gap: space.sm },
  heroRowWide: { flexDirection: 'row', alignItems: 'center', gap: space.xl },
  heroText: { flexShrink: 1, gap: space.sm },
  eyebrow: { letterSpacing: 1.2, opacity: 0.8 },
  heroTitle: { fontFamily: fonts.bold, fontSize: 30, lineHeight: 35, letterSpacing: -0.6 },
  heroTitleWide: { fontSize: 42, lineHeight: 47, maxWidth: 520 },
  heroLead: { fontSize: 16, lineHeight: 23, opacity: 0.88, maxWidth: 480 },
  heroArt: { alignSelf: 'center', width: 190, height: 190, marginVertical: -space.sm },
  heroArtWide: { width: 250, height: 250, marginVertical: -space.lg },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, height: 54, borderRadius: radius.pill, backgroundColor: WHITE },
  ctaWide: { alignSelf: 'flex-start', paddingHorizontal: space.xxl },
  section: { gap: space.md },
  modes: { gap: space.md },
  steps: { gap: space.md, padding: space.lg, borderRadius: radius.xl, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  step: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  stepWide: { flex: 1 },
  stepIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
  note: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xs },
}));

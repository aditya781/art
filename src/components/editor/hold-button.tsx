import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { AppText } from '@/components/ui/app-text';
import { makeStyles, radius, space, useColors, withAlpha } from '@/constants/theme';
import { thud } from '@/lib/haptics';

type Props = { label: string; onComplete: () => void; duration?: number };

/** Fills while held and fires at the end, so a stray touch cannot unlock the canvas. */
export function HoldButton({ label, onComplete, duration = 900 }: Props) {
  const colors = useColors();
  const styles = useStyles();
  const progress = useSharedValue(0);
  const fillStyle = useAnimatedStyle(() => ({ width: `${progress.get() * 100}%` }));

  const complete = () => {
    thud();
    onComplete();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Press and hold"
      onPressIn={() => {
        progress.set(
          withTiming(1, { duration, easing: Easing.linear }, (finished) => {
            if (finished) scheduleOnRN(complete);
          }),
        );
      }}
      onPressOut={() => {
        cancelAnimation(progress);
        progress.set(withTiming(0, { duration: 160 }));
      }}
      style={styles.button}>
      <Animated.View style={[styles.fill, fillStyle]} />
      <Ionicons name="lock-closed" size={16} color={colors.text} />
      <AppText variant="label">{label}</AppText>
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    height: 46,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    backgroundColor: withAlpha(colors.surfaceHigh, 0.92),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: withAlpha(colors.accent, 0.55) },
}));

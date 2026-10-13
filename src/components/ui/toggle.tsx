import { Pressable, View } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useDerivedValue, withTiming } from 'react-native-reanimated';

import { makeStyles, space, useColors } from '@/constants/theme';
import { tick } from '@/lib/haptics';

import { AppText } from './app-text';

type Props = {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  tint?: string;
};

export function ToggleRow({ label, hint, value, onChange, tint: tintProp }: Props) {
  const colors = useColors();
  const tint = tintProp ?? colors.accent;
  const off = colors.surfaceHigher;
  const styles = useStyles();
  const progress = useDerivedValue(() => withTiming(value ? 1 : 0, { duration: 180 }), [value]);
  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.get(), [0, 1], [off, tint]),
  }));
  const knobOff = colors.thumb;
  const knobOn = colors.onTint;
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.get() * 18 }],
    backgroundColor: interpolateColor(progress.get(), [0, 1], [knobOff, knobOn]),
  }));

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={() => {
        tick();
        onChange(!value);
      }}
      style={styles.row}>
      <View style={styles.text}>
        <AppText variant="label">{label}</AppText>
        {hint && (
          <AppText variant="caption" color={colors.textFaint}>
            {hint}
          </AppText>
        )}
      </View>
      <Animated.View style={[styles.track, trackStyle]}>
        <Animated.View style={[styles.thumb, thumbStyle]} />
      </Animated.View>
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 44 },
  text: { flex: 1, gap: 2 },
  track: { width: 46, height: 28, borderRadius: 14, padding: 3 },
  thumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.thumb },
}));

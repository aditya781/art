import { useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useDerivedValue, withSpring } from 'react-native-reanimated';

import { makeStyles, radius, useColors } from '@/constants/theme';

import { AppText } from './app-text';
import { PressableScale } from './pressable-scale';

type Props<T extends string | number> = {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  tint?: string;
  style?: StyleProp<ViewStyle>;
};

const PAD = 3;

export function Segmented<T extends string | number>({ options, value, onChange, tint, style }: Props<T>) {
  const colors = useColors();
  const styles = useStyles();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const itemWidth = width > 0 ? (width - PAD * 2) / options.length : 0;

  const x = useDerivedValue(() => withSpring(index * itemWidth, { damping: 20, stiffness: 240 }), [index, itemWidth]);
  const pillStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));

  return (
    <View style={[styles.wrap, style]} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {itemWidth > 0 && <Animated.View style={[styles.pill, { width: itemWidth, backgroundColor: tint ?? colors.pill }, pillStyle]} />}
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <PressableScale
            key={String(option.value)}
            haptic
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={styles.item}>
            <AppText variant="label" color={selected ? colors.text : colors.textDim} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
              {option.label}
            </AppText>
          </PressableScale>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  wrap: { flexDirection: 'row', backgroundColor: colors.surfaceHigh, borderRadius: radius.md, padding: PAD, minHeight: 40 },
  pill: { position: 'absolute', top: PAD, bottom: PAD, left: PAD, borderRadius: radius.md - PAD },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 1 },
}));

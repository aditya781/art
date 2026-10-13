import { View } from 'react-native';

import { makeStyles, radius, space, useColors, withAlpha } from '@/constants/theme';

import { AppText } from './app-text';
import { PressableScale } from './pressable-scale';

type Props<T extends string> = {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  tint?: string;
};

export function Chips<T extends string>({ options, value, onChange, tint: tintProp }: Props<T>) {
  const colors = useColors();
  const tint = tintProp ?? colors.accent;
  const styles = useStyles();
  return (
    <View style={styles.row}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <PressableScale
            key={option.value}
            haptic
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[styles.chip, selected && { backgroundColor: withAlpha(tint, 0.18), borderColor: tint }]}>
            <AppText variant="label" color={selected ? tint : colors.textDim}>
              {option.label}
            </AppText>
          </PressableScale>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    minHeight: 38,
    paddingHorizontal: space.md,
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: colors.surfaceHigh,
  },
}));

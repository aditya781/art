import { StyleSheet, View } from 'react-native';

import { makeStyles, space, useColors } from '@/constants/theme';

import { PressableScale } from './pressable-scale';

type Props = { options: string[]; value: string; onChange: (color: string) => void };

export function Swatches({ options, value, onChange }: Props) {
  const colors = useColors();
  const styles = useStyles();
  return (
    <View style={styles.row}>
      {options.map((color) => {
        const selected = color.toLowerCase() === value.toLowerCase();
        return (
          <PressableScale
            key={color}
            haptic
            scaleTo={0.85}
            accessibilityRole="button"
            accessibilityLabel={`Colour ${color}`}
            accessibilityState={{ selected }}
            onPress={() => onChange(color)}
            style={[styles.ring, selected && { borderColor: colors.text }]}>
            <View style={[styles.dot, { backgroundColor: color }]} />
          </PressableScale>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  ring: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  dot: { width: 28, height: 28, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.textFaint },
}));

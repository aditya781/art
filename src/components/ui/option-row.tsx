import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';

import { makeStyles, radius, space, useColors, withAlpha } from '@/constants/theme';

import { AppText } from './app-text';
import type { IconName } from './buttons';
import { PressableScale } from './pressable-scale';

type Props = { icon: IconName; title: string; hint?: string; tint: string; onPress: () => void };

/** A choice inside a sheet: icon tile, title and a line of explanation. */
export function OptionRow({ icon, title, hint, tint, onPress }: Props) {
  const colors = useColors();
  const styles = useStyles();
  return (
    <PressableScale accessibilityRole="button" haptic scaleTo={0.98} onPress={onPress} style={styles.row}>
      <View style={[styles.tile, { backgroundColor: withAlpha(tint, 0.16) }]}>
        <Ionicons name={icon} size={22} color={tint} />
      </View>
      <View style={styles.text}>
        <AppText variant="heading">{title}</AppText>
        {hint && (
          <AppText variant="caption" dim>
            {hint}
          </AppText>
        )}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
    </PressableScale>
  );
}

const useStyles = makeStyles((colors) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceHigh,
  },
  tile: { width: 46, height: 46, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
}));

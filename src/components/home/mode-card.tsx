import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { PressableScale } from '@/components/ui/pressable-scale';
import { makeStyles, radius, space, useColors, withAlpha } from '@/constants/theme';

type Props = {
  /** A short reason to pick this mode, shown above the title. */
  badge?: string;
  title: string;
  description: string;
  tint: string;
  art: ReactNode;
  onPress: () => void;
};

export function ModeCard({ badge, title, description, tint, art, onPress }: Props) {
  const colors = useColors();
  const styles = useStyles();
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={`${title}. ${description}`} haptic scaleTo={0.975} onPress={onPress} style={styles.card}>
      <View style={[styles.art, { backgroundColor: withAlpha(tint, 0.1) }]}>{art}</View>
      <View style={styles.body}>
        <View style={styles.text}>
          {badge && (
            <View style={styles.badge}>
              <AppText variant="caption" dim>
                {badge}
              </AppText>
            </View>
          )}
          <AppText variant="title">{title}</AppText>
          <AppText dim>{description}</AppText>
        </View>
        <View style={[styles.go, { backgroundColor: tint }]}>
          <Ionicons name="arrow-forward" size={20} color={colors.onTint} />
        </View>
      </View>
    </PressableScale>
  );
}

const useStyles = makeStyles((colors) => ({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  art: { paddingVertical: space.md },
  body: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
  text: { flex: 1, gap: space.xs },
  badge: { alignSelf: 'flex-start', paddingHorizontal: space.sm, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: colors.surfaceHigh, marginBottom: 2 },
  go: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
}));

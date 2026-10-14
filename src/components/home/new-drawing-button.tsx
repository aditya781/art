import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { PressableScale } from '@/components/ui/pressable-scale';
import { brandGradient, makeStyles, radius, space, useColors, withAlpha } from '@/constants/theme';

/** Floating action at the bottom of the home screen. The list fades out behind it. */
export function NewDrawingButton({ onPress }: { onPress: () => void }) {
  const colors = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();

  return (
    <View pointerEvents="box-none" style={styles.wrap}>
      <LinearGradient pointerEvents="none" colors={[withAlpha(colors.bg, 0), withAlpha(colors.bg, 0.92), colors.bg]} locations={[0, 0.55, 1]} style={[styles.fade, { height: 132 + insets.bottom }]} />
      <Animated.View entering={FadeInUp.duration(320).delay(200)} style={{ marginBottom: insets.bottom + space.lg }}>
        <PressableScale accessibilityRole="button" accessibilityLabel="New drawing" haptic scaleTo={0.95} onPress={onPress} style={styles.button}>
          <LinearGradient colors={brandGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <View style={styles.plus}>
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </View>
          <AppText variant="heading" color="#14110F" style={styles.label}>
            New drawing
          </AppText>
        </PressableScale>
      </Animated.View>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'flex-end' },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    height: 60,
    paddingLeft: 10,
    paddingRight: 28,
    borderRadius: radius.pill,
    overflow: 'hidden',
    boxShadow: '0 10px 28px rgba(255,107,74,0.38)',
  },
  plus: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(20,17,15,0.88)', alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 18, letterSpacing: -0.2 },
}));

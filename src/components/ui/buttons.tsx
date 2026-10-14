import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { makeStyles, radius, space, useColors, withAlpha } from '@/constants/theme';

import { AppText } from './app-text';
import { PressableScale } from './pressable-scale';

export type IconName = keyof typeof Ionicons.glyphMap;

type IconButtonProps = {
  icon: IconName;
  label: string;
  onPress: () => void;
  size?: number;
  color?: string;
  background?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function IconButton({ icon, label, onPress, size = 42, color, background, disabled, style }: IconButtonProps) {
  const colors = useColors();
  const styles = useStyles();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      haptic
      scaleTo={0.9}
      disabled={disabled}
      onPress={onPress}
      style={[styles.icon, { width: size, height: size, backgroundColor: background ?? colors.surfaceHigh }, background !== undefined && styles.plain, style]}>
      <Ionicons name={icon} size={size * 0.48} color={color ?? colors.text} />
    </PressableScale>
  );
}

type ButtonProps = {
  label: string;
  onPress?: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  icon?: IconName;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  tint?: string;
  loading?: boolean;
  disabled?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, onPress, onPressIn, onPressOut, icon, variant = 'secondary', tint, loading, disabled, compact, style }: ButtonProps) {
  const colors = useColors();
  const styles = useStyles();
  const background =
    variant === 'primary' ? (tint ?? colors.accent) : variant === 'danger' ? withAlpha(colors.danger, 0.16) : variant === 'ghost' ? 'transparent' : colors.surfaceHigh;
  const foreground = variant === 'primary' ? colors.onTint : variant === 'danger' ? colors.danger : colors.text;

  return (
    <PressableScale
      accessibilityRole="button"
      haptic
      disabled={disabled || loading}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={[styles.button, compact && styles.compact, { backgroundColor: background }, variant === 'secondary' && { borderColor: colors.border }, style]}>
      {loading ? (
        <ActivityIndicator size="small" color={foreground} />
      ) : (
        icon && <Ionicons name={icon} size={compact ? 16 : 18} color={foreground} />
      )}
      <AppText variant="label" color={foreground} numberOfLines={1}>
        {label}
      </AppText>
    </PressableScale>
  );
}

const useStyles = makeStyles((colors) => ({
  // The thin outline keeps neutral buttons visible on light backgrounds, where the fill alone is faint.
  icon: { borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth * 2, borderColor: colors.border },
  button: {
    minHeight: 48,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: 'transparent',
  },
  plain: { borderColor: 'transparent' },
  compact: { minHeight: 40, paddingHorizontal: space.md },
}));

import { View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { IconButton, type IconName } from '@/components/ui/buttons';
import { Logo } from '@/components/ui/logo';
import { makeStyles, MaxContentWidth, space, useColors, useThemeName } from '@/constants/theme';
import { useSettings, type ThemeMode } from '@/store/settings';

type Props = { subtitle: string; sidePadding: number; onSettings: () => void };

const themeIcons: Record<ThemeMode, IconName> = {
  light: 'sunny-outline',
  dark: 'moon-outline',
};

/** App bar that stays in place while the drawings scroll under it. */
export function HomeHeader({ subtitle, sidePadding, onSettings }: Props) {
  const colors = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const theme = useThemeName();
  const setMode = useSettings((s) => s.setThemeMode);
  const next = theme === 'dark' ? 'light' : 'dark';

  return (
    <View style={[styles.bar, { paddingTop: insets.top + space.sm, paddingLeft: insets.left + sidePadding, paddingRight: insets.right + sidePadding }]}>
      <View style={styles.inner}>
        <Logo size={44} />
        <View style={styles.text}>
          <AppText variant="heading" style={styles.name}>
            GridSketch
          </AppText>
          <AppText variant="caption" dim>
            {subtitle}
          </AppText>
        </View>
        <Animated.View key={theme} entering={ZoomIn.duration(220)}>
          <IconButton
            icon={themeIcons[theme]}
            label={`Switch to ${next} theme`}
            color={colors.text}
            onPress={() => setMode(next)}
          />
        </Animated.View>
        <IconButton icon="settings-outline" label="Settings" color={colors.text} onPress={onSettings} />
      </View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  bar: {
    alignItems: 'center',
    paddingBottom: space.md,
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  inner: { width: '100%', maxWidth: MaxContentWidth - space.xxl * 2, flexDirection: 'row', alignItems: 'center', gap: space.md },
  text: { flex: 1 },
  name: { fontSize: 19, lineHeight: 24, letterSpacing: -0.2 },
}));

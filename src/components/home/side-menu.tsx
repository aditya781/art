import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import { BackHandler, Linking, Platform, Pressable, ScrollView, Share, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, Extrapolation, interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { AppText } from '@/components/ui/app-text';
import { Button, IconButton, type IconName } from '@/components/ui/buttons';
import { Logo } from '@/components/ui/logo';
import { PressableScale } from '@/components/ui/pressable-scale';
import { ToggleRow } from '@/components/ui/toggle';
import { makeStyles, radius, space, useColors, useThemeName } from '@/constants/theme';
import { allowReminders, remindersSupported } from '@/lib/reminders';
import { useSettings } from '@/store/settings';
import { toastError } from '@/store/toast';

const APP_ID = 'com.adityasonawane.gridsketch';
const STORE_PAGE = `https://play.google.com/store/apps/details?id=${APP_ID}`;

/** `covered` is true while a page opened from the menu is on top of it. */
type Props = { visible: boolean; covered?: boolean; onClose: () => void; onPrivacy: () => void };

/**
 * The app's menu: a panel that slides in from the left edge with the few settings there are,
 * sharing and rating the app, and the privacy policy. Render it as a direct child of a full-screen view.
 */
export function SideMenu(props: Props) {
  // Mounted only while open, so every opening starts from the edge.
  return props.visible ? <OpenSideMenu {...props} /> : null;
}

function OpenSideMenu({ covered, onClose, onPrivacy }: Props) {
  const colors = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const panel = Math.min(Math.round(width * 0.84), 340);
  const hidden = -panel;

  const theme = useThemeName();
  const setThemeMode = useSettings((s) => s.setThemeMode);
  const on = useSettings((s) => s.reminders.on);
  const setReminders = useSettings((s) => s.setReminders);
  const [blocked, setBlocked] = useState(false);

  // How far the panel is pushed off the left edge: 0 is fully in view.
  const x = useSharedValue(hidden);
  const dragStart = useSharedValue(0);

  useEffect(() => {
    x.set(withTiming(0, { duration: 260, easing: Easing.out(Easing.cubic) }));
  }, [x]);

  /** Slides the panel away, then does what was asked for. */
  const leave = (then: () => void) => {
    x.set(
      withTiming(hidden, { duration: 200, easing: Easing.in(Easing.quad) }, (finished) => {
        if (finished) scheduleOnRN(then);
      }),
    );
  };

  useEffect(() => {
    // The page on top handles the back button while it is open.
    if (covered) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      x.set(
        withTiming(hidden, { duration: 200 }, (finished) => {
          if (finished) scheduleOnRN(onClose);
        }),
      );
      return true;
    });
    return () => subscription.remove();
  }, [covered, hidden, onClose, x]);

  // The panel follows a finger pushing it back towards the edge it came from.
  const drag = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-16, 16])
    .onStart(() => dragStart.set(x.get()))
    .onUpdate((e) => x.set(Math.min(0, Math.max(hidden, dragStart.get() + e.translationX))))
    .onEnd((e) => {
      const away = e.velocityX < -500 || (e.velocityX < 500 && x.get() < hidden * 0.35);
      x.set(
        withTiming(away ? hidden : 0, { duration: 200, easing: Easing.out(Easing.cubic) }, (finished) => {
          if (finished && away) scheduleOnRN(onClose);
        }),
      );
    });

  const slide = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));
  const backdrop = useAnimatedStyle(() => ({ opacity: interpolate(x.get(), [hidden, 0], [0, 1], Extrapolation.CLAMP) }));

  // Permission is asked for at the moment reminders are switched on, when the reason is obvious.
  const turn = async (next: boolean) => {
    if (!next) return setReminders({ on: false, asked: true });
    try {
      if (await allowReminders()) {
        setBlocked(false);
        setReminders({ on: true, asked: true });
      } else {
        setBlocked(true);
      }
    } catch (error) {
      toastError(error);
    }
  };

  const share = async () => {
    try {
      await Share.share({ message: `GridSketch puts a grid over any photo so you can draw it square by square. Get it here: ${STORE_PAGE}` });
    } catch (error) {
      toastError(error);
    }
  };

  // Opens the Play Store app on the review page; the web page is the fallback where there is no store app.
  const review = async () => {
    try {
      await Linking.openURL(Platform.OS === 'android' ? `market://details?id=${APP_ID}` : STORE_PAGE);
    } catch {
      Linking.openURL(STORE_PAGE).catch(toastError);
    }
  };

  const links: { icon: IconName; title: string; onPress: () => void }[] = [
    { icon: 'share-social-outline', title: 'Share the app', onPress: share },
    { icon: 'star-outline', title: 'Rate the app', onPress: review },
    { icon: 'shield-checkmark-outline', title: 'Privacy policy', onPress: onPrivacy },
  ];

  return (
    <>
      <Animated.View style={[styles.backdrop, backdrop]}>
        <Pressable accessibilityLabel="Close menu" style={StyleSheet.absoluteFill} onPress={() => leave(onClose)} />
      </Animated.View>
      <GestureDetector gesture={drag}>
        <Animated.View
          accessibilityViewIsModal
          style={[styles.panel, { width: panel, paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + space.lg, paddingLeft: insets.left }, slide]}>
          <View style={styles.head}>
            <Logo size={48} />
            <View style={styles.flex}>
              <AppText variant="heading" style={styles.name}>
                GridSketch
              </AppText>
              <AppText variant="caption" dim>
                Drawing aid for artists
              </AppText>
            </View>
            <IconButton icon="close" label="Close menu" size={36} onPress={() => leave(onClose)} />
          </View>

          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            <AppText variant="caption" dim style={styles.eyebrow}>
              SETTINGS
            </AppText>
            <View style={styles.group}>
              <View style={styles.setting}>
                <Ionicons name="moon-outline" size={20} color={colors.text} />
                <View style={styles.flex}>
                  <ToggleRow label="Dark theme" value={theme === 'dark'} onChange={(dark) => setThemeMode(dark ? 'dark' : 'light')} tint={colors.accent} />
                </View>
              </View>
              {remindersSupported && (
                <View style={[styles.setting, styles.divided]}>
                  <Ionicons name="notifications-outline" size={20} color={colors.text} />
                  <View style={styles.flex}>
                    <ToggleRow label="Drawing reminders" hint="A nudge to carry on with your drawing" value={on} onChange={turn} tint={colors.accent} />
                  </View>
                </View>
              )}
            </View>
            {blocked && (
              <View style={styles.note}>
                <AppText>Notifications are turned off for GridSketch.</AppText>
                <AppText dim>Allow them in your phone&apos;s settings, then switch reminders on again.</AppText>
                <Button compact icon="settings-outline" label="Open settings" onPress={() => Linking.openSettings()} />
              </View>
            )}

            <AppText variant="caption" dim style={styles.eyebrow}>
              ABOUT
            </AppText>
            <View style={styles.group}>
              {links.map((link, index) => (
                <PressableScale key={link.title} accessibilityRole="button" haptic scaleTo={0.98} onPress={link.onPress} style={[styles.link, index > 0 && styles.divided]}>
                  <Ionicons name={link.icon} size={20} color={colors.text} />
                  <AppText variant="label" style={styles.flex}>
                    {link.title}
                  </AppText>
                  <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
                </PressableScale>
              ))}
            </View>
          </ScrollView>

          <AppText variant="caption" color={colors.textFaint} style={styles.version}>
            Version {Constants.expoConfig?.version ?? ''}
          </AppText>
        </Animated.View>
      </GestureDetector>
    </>
  );
}

const useStyles = makeStyles((colors) => ({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: colors.scrim },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.surface,
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
    borderRightWidth: 1,
    borderColor: colors.border,
    boxShadow: `12px 0 40px ${colors.shadow}`,
    overflow: 'hidden',
  },
  flex: { flex: 1 },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingBottom: space.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  name: { fontSize: 19, lineHeight: 24, letterSpacing: -0.2 },
  body: { paddingHorizontal: space.lg, paddingTop: space.lg, gap: space.sm },
  eyebrow: { letterSpacing: 1.2, marginLeft: space.xs, marginTop: space.sm },
  group: { borderRadius: radius.lg, backgroundColor: colors.surfaceHigh, paddingHorizontal: space.md },
  setting: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
  link: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 54 },
  divided: { borderTopWidth: 1, borderTopColor: colors.border },
  note: { gap: space.sm, padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.surfaceHigh },
  version: { textAlign: 'center', paddingTop: space.md },
}));

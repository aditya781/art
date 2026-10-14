import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fonts, makeStyles, radius, space, useColors, withAlpha } from '@/constants/theme';
import { exit } from '@/lib/motion';
import { dismissToast, useToast } from '@/store/toast';

import { AppText } from './app-text';
import { PressableScale } from './pressable-scale';

/** Every screen has a title bar of about this height; the message sits just under it, clear of its buttons. */
const BAR = 72;
/** Dark in both themes, so the message reads the same over a photo, a white card or the dark canvas. */
const INK = '#1F2129';
const ON_INK = '#F5F3EE';
const ON_INK_DIM = '#B4B7C2';

const actions = {
  settings: { label: 'Open Settings', run: () => Linking.openSettings() },
};

export function ToastHost() {
  const colors = useColors();
  const styles = useStyles();
  const { id, title, message, tone, action } = useToast();
  const insets = useSafeAreaInsets();
  const error = tone === 'error';

  useEffect(() => {
    if (!message) return;
    // Confirmations only need noticing, errors need reading, and a button needs time to be reached.
    const timer = setTimeout(dismissToast, action ? 9000 : error ? 5000 : 2400);
    return () => clearTimeout(timer);
  }, [id, message, error, action]);

  if (!message) return null;
  const tint = error ? colors.danger : colors.success;
  const button = action && actions[action];

  return (
    <View pointerEvents="box-none" style={[styles.host, { top: insets.top + BAR, paddingLeft: insets.left + space.lg, paddingRight: insets.right + space.lg }]}>
      <Animated.View key={id} entering={FadeInUp.springify().damping(18).stiffness(220)} exiting={exit(FadeOutUp.duration(160))} style={title ? styles.wide : undefined}>
        <Pressable
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          accessibilityHint="Tap to dismiss"
          onPress={dismissToast}
          style={[styles.toast, title ? styles.detailed : undefined]}>
          <View style={[title ? styles.badgeLarge : styles.badge, { backgroundColor: title ? withAlpha(tint, 0.18) : tint }]}>
            <Ionicons name={error ? 'alert' : 'checkmark'} size={title ? 18 : 15} color={title ? tint : INK} />
          </View>
          {title ? (
            <View style={styles.body}>
              <AppText color={ON_INK} style={styles.title}>
                {title}
              </AppText>
              <AppText color={ON_INK_DIM} style={styles.detail}>
                {message}
              </AppText>
              {button && (
                <PressableScale
                  accessibilityRole="button"
                  haptic
                  onPress={() => {
                    dismissToast();
                    button.run();
                  }}
                  style={styles.action}>
                  <AppText color={INK} style={styles.actionLabel}>
                    {button.label}
                  </AppText>
                  <Ionicons name="arrow-forward" size={15} color={INK} />
                </PressableScale>
              )}
            </View>
          ) : (
            <AppText variant="label" color={ON_INK} style={styles.text}>
              {message}
            </AppText>
          )}
          {title && <Ionicons name="close" size={18} color={ON_INK_DIM} style={styles.close} />}
        </Pressable>
      </Animated.View>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  host: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 50 },
  wide: { width: '100%', maxWidth: 440 },
  toast: {
    maxWidth: 420,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingLeft: space.md,
    paddingRight: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.lg,
    backgroundColor: INK,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: 'rgba(255,255,255,0.14)',
    boxShadow: '0 10px 28px rgba(0,0,0,0.35)',
  },
  detailed: { maxWidth: 440, alignItems: 'flex-start', padding: space.md, paddingRight: space.md },
  badge: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  badgeLarge: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  text: { flexShrink: 1, fontSize: 15, lineHeight: 20 },
  body: { flex: 1, gap: 2, paddingTop: 1 },
  title: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 21 },
  detail: { fontSize: 14, lineHeight: 19 },
  action: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    marginTop: space.sm,
    height: 36,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    backgroundColor: ON_INK,
  },
  actionLabel: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 18 },
  close: { marginTop: 2 },
}));

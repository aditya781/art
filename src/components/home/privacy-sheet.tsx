import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, Extrapolation, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { AppText } from '@/components/ui/app-text';
import { IconButton, type IconName } from '@/components/ui/buttons';
import { makeStyles, radius, space, useColors, withAlpha } from '@/constants/theme';

const UPDATED = '10 October 2026';
const CORNER = 30;
/** A flick faster than this decides where the sheet goes, whatever its position. */
const FLICK = 500;
const settle = { duration: 260, easing: Easing.out(Easing.cubic) };

/** The whole policy in three lines, for the reader who stops here. */
const promises: { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'phone-portrait-outline',
    title: 'Stays on your phone',
    text: 'Photos and drawings are never uploaded.',
  },
  {
    icon: 'person-outline',
    title: 'No account',
    text: 'No sign-in, no email, no profile.',
  },
  {
    icon: 'eye-off-outline',
    title: 'No ads, no tracking',
    text: 'No advertising and no analytics.',
  },
];

const permissions: { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'camera-outline',
    title: 'Camera',
    text: 'Only when you tap the camera button, to photograph a reference or your doodles.',
  },
  {
    icon: 'images-outline',
    title: 'Photos',
    text: 'To let you pick a picture, and to save an exported image when you ask for it.',
  },
  {
    icon: 'notifications-outline',
    title: 'Notifications',
    text: 'For drawing reminders. They are scheduled on the phone itself; no server is involved.',
  },
];

const details: { title: string; body: string[] }[] = [
  {
    title: 'Introduction',
    body: ['GridSketch respects your privacy. This policy explains what the app does, and does not do, with your information.'],
  },
  {
    title: 'What the app collects',
    body: [
      'Nothing. GridSketch does not collect personal information such as your name or email, and it does not send, sell or share anything about you or your device.',
    ],
  },
  {
    title: 'Your photos and drawings',
    body: [
      'The photos you pick or take, and everything you do with them (grids, adjustments, progress), are stored only on this device, inside the app.',
      'Deleting a drawing removes its pictures from the app. Uninstalling the app removes everything.',
      'An image leaves the app only when you save it to your photo library or share it. What happens after that is up to the app you share it with.',
    ],
  },
  {
    title: 'Advertising and analytics',
    body: ['The app shows no advertisements and measures nothing about how you use it. It does not read your device’s advertising ID.'],
  },
  {
    title: 'Third-party services',
    body: ['The app contains no advertising, analytics or tracking tools from other companies, so no one else’s privacy policy applies inside it.'],
  },
  {
    title: 'Children’s privacy',
    body: ['The app is intended for general audiences and is suitable for all ages. Because it collects no information, it collects none from children.'],
  },
  {
    title: 'Changes to this policy',
    body: ['If the app ever starts to handle data differently, this page is updated first and the date below changes.'],
  },
  {
    title: 'Contact us',
    body: ['If you have a question about this policy, you can reach the developer through the contact details on the app’s store page.'],
  },
];

type Props = { visible: boolean; onClose: () => void };

/**
 * The privacy policy as a sheet that rises to the middle of the screen with the short version,
 * and is pulled up to fill the screen for the rest. Render it as a direct child of a full-screen view.
 */
export function PrivacySheet(props: Props) {
  // Mounted only while open, so every opening starts from the bottom edge.
  return props.visible ? <OpenPrivacySheet {...props} /> : null;
}

function OpenPrivacySheet({ onClose }: Props) {
  const colors = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  // The window can be shorter than the screen the sheet is drawn in (system bars), so the real height is measured.
  const [height, setHeight] = useState(window.height);
  const half = Math.round(height * 0.5);
  const top = insets.top;

  // How far the sheet is pushed down: 0 fills the screen, `half` is the resting place, `height` is off screen.
  const y = useSharedValue(height);
  const dragStart = useSharedValue(0);
  const scrolled = useSharedValue(0);
  /** Finger travel that went into scrolling the text, so it is not also applied to the sheet. */
  const spent = useSharedValue(0);
  const headerHeight = useSharedValue(0);
  /** A drag that starts on the title bar always moves the sheet, wherever the text is scrolled to. */
  const onHeader = useSharedValue(false);
  // The text scrolls only once the sheet fills the screen; before that, a drag moves the sheet.
  const [full, setFull] = useState(false);

  useEffect(() => {
    y.set(withTiming(half, { duration: 300, easing: Easing.out(Easing.cubic) }));
  }, [half, y]);

  const close = () => {
    y.set(
      withTiming(height, { duration: 220, easing: Easing.in(Easing.quad) }, (finished) => {
        if (finished) scheduleOnRN(onClose);
      }),
    );
  };

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      y.set(
        withTiming(height, { duration: 220 }, (finished) => {
          if (finished) scheduleOnRN(onClose);
        }),
      );
      return true;
    });
    return () => subscription.remove();
  }, [height, onClose, y]);

  const toggle = () => {
    y.set(withTiming(full ? half : 0, settle));
    setFull(!full);
  };

  const onScroll = useAnimatedScrollHandler((event) => {
    scrolled.set(event.contentOffset.y);
  });

  const scroll = Gesture.Native();
  const drag = Gesture.Pan()
    .simultaneousWithExternalGesture(scroll)
    .activeOffsetY([-8, 8])
    .onStart((e) => {
      dragStart.set(y.get());
      spent.set(0);
      onHeader.set(e.y < headerHeight.get());
    })
    .onUpdate((e) => {
      // While the text is away from its top, the finger moves the text and the sheet stays put.
      if (!onHeader.get() && y.get() <= 0 && scrolled.get() > 0) {
        spent.set(e.translationY);
        return;
      }
      y.set(Math.min(height, Math.max(0, dragStart.get() + e.translationY - spent.get())));
    })
    .onEnd((e) => {
      const at = y.get();
      if (at <= 0) {
        // Dragged all the way to the top by hand.
        scheduleOnRN(setFull, true);
        return;
      }
      const up = e.velocityY < -FLICK;
      const down = e.velocityY > FLICK;
      let target = half;
      if (at < half) {
        // Between full screen and the middle.
        if (up || (!down && at < half / 2)) target = 0;
      } else if (up) {
        target = 0;
      } else if (down || at > half + (height - half) * 0.35) {
        target = height;
      }
      y.set(
        withTiming(target, settle, (finished) => {
          if (finished && target >= height) scheduleOnRN(onClose);
        }),
      );
      scheduleOnRN(setFull, target === 0);
    });

  const sheet = useAnimatedStyle(() => {
    const corner = interpolate(y.get(), [0, 48], [0, CORNER], Extrapolation.CLAMP);
    return {
      transform: [{ translateY: y.get() }],
      borderTopLeftRadius: corner,
      borderTopRightRadius: corner,
    };
  });
  // Clears the status bar as the sheet reaches the top edge.
  const statusBar = useAnimatedStyle(() => ({
    height: interpolate(y.get(), [0, 48], [top, 0], Extrapolation.CLAMP),
  }));
  const backdrop = useAnimatedStyle(() => ({
    opacity: interpolate(y.get(), [half, height], [1, 0], Extrapolation.CLAMP),
  }));

  return (
    <>
      <Animated.View style={[styles.backdrop, backdrop]}>
        <Pressable accessibilityLabel="Close" style={StyleSheet.absoluteFill} onPress={close} />
      </Animated.View>
      <View pointerEvents="box-none" style={styles.anchor} onLayout={(e) => setHeight(Math.round(e.nativeEvent.layout.height))}>
        <GestureDetector gesture={drag}>
          <Animated.View accessibilityViewIsModal style={[styles.sheet, sheet]}>
            <View onLayout={(e) => headerHeight.set(e.nativeEvent.layout.height)}>
              <Animated.View style={statusBar} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={full ? 'Make the privacy policy smaller' : 'Show the whole privacy policy'}
                onPress={toggle}
                style={styles.handle}>
                <View style={styles.grabber} />
              </Pressable>
              <View style={styles.bar}>
                <AppText variant="heading" style={styles.barTitle}>
                  Privacy policy
                </AppText>
                <IconButton icon="close" label="Close" size={36} onPress={close} />
              </View>
            </View>
            <GestureDetector gesture={scroll}>
              <Animated.ScrollView
                scrollEnabled={full}
                bounces={false}
                overScrollMode="never"
                onScroll={onScroll}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + space.xxl }]}>
                <View style={styles.hero}>
                  <View style={styles.shield}>
                    <Ionicons name="shield-checkmark" size={26} color={colors.success} />
                  </View>
                  <View style={styles.flex}>
                    <AppText variant="heading" style={styles.heroTitle}>
                      Your pictures stay yours
                    </AppText>
                    <AppText dim>GridSketch works entirely on your phone. Nothing is sent anywhere.</AppText>
                  </View>
                </View>

                <View style={styles.card}>
                  {promises.map((item, index) => (
                    <View key={item.title} style={[styles.row, index > 0 && styles.divided]}>
                      <View style={[styles.tile, { backgroundColor: withAlpha(colors.success, 0.14) }]}>
                        <Ionicons name={item.icon} size={20} color={colors.success} />
                      </View>
                      <View style={styles.flex}>
                        <AppText variant="heading">{item.title}</AppText>
                        <AppText dim>{item.text}</AppText>
                      </View>
                    </View>
                  ))}
                </View>

                <View style={styles.group}>
                  <AppText variant="caption" dim style={styles.eyebrow}>
                    PERMISSIONS, AND WHY
                  </AppText>
                  <View style={styles.card}>
                    {permissions.map((item, index) => (
                      <View key={item.title} style={[styles.row, index > 0 && styles.divided]}>
                        <View style={[styles.tile, { backgroundColor: colors.surfaceHigher }]}>
                          <Ionicons name={item.icon} size={20} color={colors.text} />
                        </View>
                        <View style={styles.flex}>
                          <AppText variant="heading">{item.title}</AppText>
                          <AppText dim>{item.text}</AppText>
                        </View>
                      </View>
                    ))}
                  </View>
                  <AppText variant="caption" dim>
                    You can switch any of these off in your phone&apos;s settings. The rest of the app keeps working.
                  </AppText>
                </View>

                <View style={styles.group}>
                  <AppText variant="caption" dim style={styles.eyebrow}>
                    THE DETAILS
                  </AppText>
                  <View style={styles.card}>
                    {details.map((section, index) => (
                      <View key={section.title} style={[styles.detail, index > 0 && styles.divided]}>
                        <AppText variant="heading">{section.title}</AppText>
                        {section.body.map((paragraph) => (
                          <AppText key={paragraph} dim style={styles.paragraph}>
                            {paragraph}
                          </AppText>
                        ))}
                      </View>
                    ))}
                  </View>
                </View>

                <AppText variant="caption" dim style={styles.centred}>
                  Last updated {UPDATED}
                </AppText>
              </Animated.ScrollView>
            </GestureDetector>
          </Animated.View>
        </GestureDetector>
      </View>
    </>
  );
}

const useStyles = makeStyles((colors) => ({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: colors.scrim },
  anchor: { ...StyleSheet.absoluteFill, alignItems: 'center' },
  sheet: {
    width: '100%',
    maxWidth: 640,
    flex: 1,
    // A step lighter than the page behind it, with an edge, so the sheet stands out in the dark theme too.
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderColor: colors.border,
    boxShadow: `0 -12px 40px ${colors.shadow}`,
    overflow: 'hidden',
  },
  flex: { flex: 1, gap: 2 },
  handle: {
    alignItems: 'center',
    paddingTop: space.sm,
    paddingBottom: space.sm,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textFaint,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  barTitle: { flex: 1, fontSize: 19, lineHeight: 24 },
  scroll: { paddingHorizontal: space.lg, paddingTop: space.lg, gap: space.lg },
  hero: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  heroTitle: { fontSize: 18, lineHeight: 23 },
  shield: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withAlpha(colors.success, 0.14),
  },
  centred: { textAlign: 'center' },
  group: { gap: space.sm },
  eyebrow: { letterSpacing: 1.2, marginLeft: space.xs },
  card: {
    borderRadius: radius.xl,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
  },
  divided: { borderTopWidth: 1, borderTopColor: colors.border },
  tile: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detail: { gap: space.xs, paddingVertical: space.lg },
  paragraph: { lineHeight: 22 },
}));

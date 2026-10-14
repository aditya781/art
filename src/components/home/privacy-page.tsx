import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect } from 'react';
import { BackHandler, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { AppText } from '@/components/ui/app-text';
import { IconButton, type IconName } from '@/components/ui/buttons';
import { makeStyles, radius, space, useColors } from '@/constants/theme';

const UPDATED = '10 October 2026';

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
    body: ['If the app ever starts to handle data differently, this page is updated first and the date at the top changes.'],
  },
  {
    title: 'Contact us',
    body: ['If you have a question about this policy, you can reach the developer through the contact details on the app’s store page.'],
  },
];

type Props = { visible: boolean; onClose: () => void };

/**
 * The privacy policy as a full-screen page that slides in from the right, like any page opened from a menu,
 * and goes back with the arrow, a swipe to the right or the back button. Render it as a direct child of a full-screen view.
 */
export function PrivacyPage(props: Props) {
  // Mounted only while open, so every opening starts from the right edge.
  return props.visible ? <OpenPrivacyPage {...props} /> : null;
}

function OpenPrivacyPage({ onClose }: Props) {
  const colors = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  // How far the page is pushed off to the right: 0 is fully in view.
  const x = useSharedValue(width);
  const dragStart = useSharedValue(0);

  useEffect(() => {
    x.set(withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) }));
  }, [x]);

  const back = () => {
    x.set(
      withTiming(width, { duration: 220, easing: Easing.in(Easing.quad) }, (finished) => {
        if (finished) scheduleOnRN(onClose);
      }),
    );
  };

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      x.set(
        withTiming(width, { duration: 220 }, (finished) => {
          if (finished) scheduleOnRN(onClose);
        }),
      );
      return true;
    });
    return () => subscription.remove();
  }, [width, onClose, x]);

  // A sideways drag pushes the page back the way it came; up and down is left to the text.
  const drag = Gesture.Pan()
    .activeOffsetX(14)
    .failOffsetY([-14, 14])
    .onStart(() => dragStart.set(x.get()))
    .onUpdate((e) => x.set(Math.min(width, Math.max(0, dragStart.get() + e.translationX))))
    .onEnd((e) => {
      const away = e.velocityX > 500 || (e.velocityX > -500 && x.get() > width * 0.35);
      x.set(
        withTiming(away ? width : 0, { duration: 200, easing: Easing.out(Easing.cubic) }, (finished) => {
          if (finished && away) scheduleOnRN(onClose);
        }),
      );
    });

  const slide = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));

  return (
    <GestureDetector gesture={drag}>
      <Animated.View accessibilityViewIsModal style={[styles.page, slide]}>
        <View style={[styles.bar, { paddingTop: insets.top + space.sm, paddingLeft: insets.left + space.md, paddingRight: insets.right + space.lg }]}>
          <IconButton icon="arrow-back" label="Back" color={colors.text} onPress={back} />
          <AppText variant="heading" style={styles.barTitle}>
            Privacy policy
          </AppText>
        </View>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scroll,
            { paddingLeft: insets.left + space.lg, paddingRight: insets.right + space.lg, paddingBottom: insets.bottom + space.xxl },
          ]}>
          <View style={styles.column}>
            <View style={styles.intro}>
              <AppText variant="caption" dim style={styles.eyebrow}>
                LAST UPDATED {UPDATED.toUpperCase()}
              </AppText>
              <AppText variant="title" style={styles.headline}>
                Your pictures stay yours
              </AppText>
              <AppText dim style={styles.text}>
                GridSketch works entirely on your phone. Nothing you draw or photograph is sent anywhere.
              </AppText>
            </View>

            <View style={styles.group}>
              <AppText variant="caption" dim style={styles.eyebrow}>
                AT A GLANCE
              </AppText>
              <View style={styles.card}>
                {promises.map((item, index) => (
                  <View key={item.title} style={[styles.row, index > 0 && styles.divided]}>
                    <View style={styles.tile}>
                      <Ionicons name={item.icon} size={18} color={colors.text} />
                    </View>
                    <View style={styles.flex}>
                      <AppText variant="heading" style={styles.heading}>
                        {item.title}
                      </AppText>
                      <AppText dim style={styles.text}>
                        {item.text}
                      </AppText>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.group}>
              <AppText variant="caption" dim style={styles.eyebrow}>
                PERMISSIONS, AND WHY
              </AppText>
              <View style={styles.card}>
                {permissions.map((item, index) => (
                  <View key={item.title} style={[styles.row, index > 0 && styles.divided]}>
                    <View style={styles.tile}>
                      <Ionicons name={item.icon} size={18} color={colors.text} />
                    </View>
                    <View style={styles.flex}>
                      <AppText variant="heading" style={styles.heading}>
                        {item.title}
                      </AppText>
                      <AppText dim style={styles.text}>
                        {item.text}
                      </AppText>
                    </View>
                  </View>
                ))}
              </View>
              <AppText variant="caption" dim style={styles.footnote}>
                You can switch any of these off in your phone&apos;s settings. The rest of the app keeps working.
              </AppText>
            </View>

            <View style={styles.group}>
              <AppText variant="caption" dim style={styles.eyebrow}>
                THE FULL POLICY
              </AppText>
              <View>
                {details.map((section, index) => (
                  <View key={section.title} style={[styles.section, index > 0 && styles.divided]}>
                    <AppText variant="label" color={colors.textFaint} style={styles.number}>
                      {String(index + 1).padStart(2, '0')}
                    </AppText>
                    <View style={styles.sectionText}>
                      <AppText variant="heading" style={styles.heading}>
                        {section.title}
                      </AppText>
                      {section.body.map((paragraph) => (
                        <AppText key={paragraph} dim style={styles.text}>
                          {paragraph}
                        </AppText>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </ScrollView>
      </Animated.View>
    </GestureDetector>
  );
}

const useStyles = makeStyles((colors) => ({
  page: { ...StyleSheet.absoluteFill, backgroundColor: colors.bg },
  flex: { flex: 1, gap: 2 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingBottom: space.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  barTitle: { flex: 1 },
  scroll: { alignItems: 'center', paddingTop: space.xl },
  column: { width: '100%', maxWidth: 640, gap: space.xl },
  intro: { gap: space.xs, paddingHorizontal: space.xs },
  // Three sizes on the whole page: the headline, the headings and the text.
  headline: { fontSize: 20, lineHeight: 26, letterSpacing: -0.2 },
  heading: { fontSize: 15, lineHeight: 20 },
  text: { fontSize: 14, lineHeight: 21 },
  group: { gap: space.sm },
  eyebrow: { letterSpacing: 1.2, marginLeft: space.xs },
  footnote: { marginLeft: space.xs },
  card: { borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingHorizontal: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  divided: { borderTopWidth: 1, borderTopColor: colors.border },
  tile: { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceHigh },
  // Numbered like a document, so a section can be pointed to.
  section: { flexDirection: 'row', gap: space.md, paddingVertical: space.lg, paddingHorizontal: space.xs },
  number: { width: 22, fontSize: 13, lineHeight: 20, fontVariant: ['tabular-nums'] },
  sectionText: { flex: 1, gap: space.xs },
}));

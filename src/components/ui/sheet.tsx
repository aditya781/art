import { useEffect, type ReactNode } from 'react';
import { BackHandler, KeyboardAvoidingView, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, SlideOutDown, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { makeStyles, radius, space, WideBreakpoint } from '@/constants/theme';
import { exit } from '@/lib/motion';

import { AppText } from './app-text';
import { IconButton } from './buttons';

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
};

/**
 * Bottom sheet on phones, centred dialog on wide screens. Drawn as an overlay inside the screen
 * rather than a native modal window, so it always reaches the bottom edge under the system
 * navigation bar. Render it as a direct child of a full-screen view.
 */
export function Sheet(props: Props) {
  // Mounted only while open, so every opening starts its arrival from the beginning.
  return props.visible ? <OpenSheet {...props} /> : null;
}

function OpenSheet({ onClose, title, description, children }: Props) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const wide = width >= WideBreakpoint;
  // The card arrives with a plain transform, not an `entering` layout animation: on Android a layout
  // animation leaves the buttons' touch areas behind when the content changes height while it plays.
  const shown = useSharedValue(0);
  const arrive = useAnimatedStyle(() => {
    const p = shown.get();
    return wide ? { opacity: p, transform: [{ scale: 0.92 + 0.08 * p }] } : { transform: [{ translateY: (1 - p) * height }] };
  });

  useEffect(() => {
    shown.set(withTiming(1, { duration: wide ? 180 : 280, easing: Easing.out(Easing.cubic) }));
  }, [wide, shown]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => subscription.remove();
  }, [onClose]);

  const card = (
    <>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <AppText variant="title">{title}</AppText>
          {description && <AppText dim>{description}</AppText>}
        </View>
        <IconButton icon="close" label="Close" size={36} onPress={onClose} />
      </View>
      <View style={styles.body}>{children}</View>
    </>
  );

  return (
    <>
      <Animated.View entering={FadeIn.duration(180)} exiting={exit(FadeOut.duration(180))} style={styles.backdrop}>
        <Pressable accessibilityLabel="Close" style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      {wide ? (
        <View pointerEvents="box-none" style={styles.centered}>
          <Animated.View accessibilityViewIsModal exiting={exit(FadeOut.duration(140))} style={[styles.card, styles.cardWide, arrive]}>
            {card}
          </Animated.View>
        </View>
      ) : (
        // Lifts the sheet above the keyboard when it contains a text field.
        <KeyboardAvoidingView behavior="padding" pointerEvents="box-none" style={styles.bottomAnchor}>
          <Animated.View
            accessibilityViewIsModal
            exiting={exit(SlideOutDown.duration(220))}
            style={[styles.card, styles.cardBottom, { paddingBottom: insets.bottom + space.lg }, arrive]}>
            <View style={styles.grabber} />
            {card}
          </Animated.View>
        </KeyboardAvoidingView>
      )}
    </>
  );
}

const useStyles = makeStyles((colors) => ({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: colors.scrim },
  centered: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  card: {
    backgroundColor: colors.surface,
    boxShadow: `0 -12px 40px ${colors.shadow}`,
  },
  bottomAnchor: { ...StyleSheet.absoluteFill, justifyContent: 'flex-end' },
  cardBottom: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
  },
  cardWide: { width: '100%', maxWidth: 460, borderRadius: radius.xl, padding: space.xl },
  grabber: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: colors.surfaceHigher, marginBottom: space.md },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  headerText: { flex: 1, gap: space.xs },
  body: { marginTop: space.lg, gap: space.sm },
}));

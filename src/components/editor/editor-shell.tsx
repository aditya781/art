import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, StyleSheet, useWindowDimensions, View } from 'react-native';
// The gesture-handler scroll view lets sliders inside it claim horizontal drags.
import { Gesture, GestureDetector, ScrollView } from 'react-native-gesture-handler';
import Animated, { FadeIn, FadeInDown, FadeOut, ZoomIn, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { IconButton } from '@/components/ui/buttons';
import { PressableScale } from '@/components/ui/pressable-scale';
import { fonts, makeStyles, radius, space, useColors, WideBreakpoint, withAlpha } from '@/constants/theme';
import { exit } from '@/lib/motion';

import { HoldButton } from './hold-button';

type TabIcon = keyof typeof MaterialCommunityIcons.glyphMap;

/** `icon` is the outline drawn when idle, `activeIcon` the filled one drawn when selected. */
export type EditorTab<T extends string> = { key: T; label: string; icon: TabIcon; activeIcon: TabIcon };

type Props<T extends string> = {
  title: string;
  accent: string;
  tabs: EditorTab<T>[];
  tab: T;
  onTab: (tab: T) => void;
  locked: boolean;
  onLock: (locked: boolean) => void;
  onBack: () => void;
  onExport: () => void;
  /** Open with the controls tucked away, for a drawing that is already set up. */
  startCollapsed?: boolean;
  busy?: boolean;
  canvas: ReactNode;
  /** Floats over the bottom of the canvas. */
  overlay?: ReactNode;
  /** Controls for the active tab. */
  children: ReactNode;
};

const SIDE_PANEL = 360;

/**
 * Frame shared by both editors: top bar, canvas, and tabbed controls. The controls sit under the
 * canvas on phones and move to a side panel on tablets, landscape phones and desktop browsers.
 */
export function EditorShell<T extends string>(props: Props<T>) {
  const colors = useColors();
  const styles = useStyles();
  const { title, accent, tabs, tab, onTab, locked, onLock, onBack, onExport, startCollapsed, busy, canvas, overlay, children } = props;
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const wide = width >= WideBreakpoint || (width > height && width >= 560);
  const [open, setOpen] = useState(!startCollapsed);
  // Image only: every control is hidden but the picture can still be zoomed and moved.
  const [imageOnly, setImageOnly] = useState(false);
  const bare = locked || imageOnly;

  const panelHeight = Math.round(Math.min(320, Math.max(190, height * 0.36)));
  const animatedHeight = useSharedValue(open ? panelHeight : 0);
  const dragStart = useSharedValue(0);
  const panelStyle = useAnimatedStyle(() => ({ height: animatedHeight.get() }));
  useEffect(() => {
    animatedHeight.set(withTiming(open ? panelHeight : 0, { duration: 220 }));
  }, [open, panelHeight, animatedHeight]);

  // The handle follows the finger: drag down to tuck the settings away, up to bring them back.
  const dragPanel = Gesture.Pan()
    .activeOffsetY([-6, 6])
    .onStart(() => dragStart.set(animatedHeight.get()))
    .onUpdate((e) => animatedHeight.set(Math.min(panelHeight, Math.max(0, dragStart.get() - e.translationY))))
    .onEnd((e) => {
      const h = animatedHeight.get();
      const shouldOpen = Math.abs(e.velocityY) > 400 ? e.velocityY < 0 : h > panelHeight / 2;
      animatedHeight.set(withTiming(shouldOpen ? panelHeight : 0, { duration: 180 }));
      scheduleOnRN(setOpen, shouldOpen);
    });
  const tapHandle = Gesture.Tap().onEnd(() => scheduleOnRN(setOpen, !open));

  const selectTab = (key: T) => {
    if (!wide && key === tab) {
      setOpen((value) => !value);
      return;
    }
    setOpen(true);
    onTab(key);
  };

  const topBar = !bare && (
    <Animated.View
      entering={FadeIn.duration(180)}
      exiting={exit(FadeOut.duration(120))}
      style={[styles.topBar, { paddingTop: insets.top + space.sm, paddingLeft: insets.left + space.md, paddingRight: (wide ? 0 : insets.right) + space.md }]}>
      <IconButton icon="chevron-back" label="Back to projects" onPress={onBack} />
      <AppText variant="heading" numberOfLines={1} style={styles.title}>
        {title}
      </AppText>
      <IconButton icon="expand-outline" label="Show image only" onPress={() => setImageOnly(true)} />
      <IconButton icon="lock-open-outline" label="Lock canvas" onPress={() => onLock(true)} />
      <IconButton icon="share-outline" label="Export image" onPress={onExport} background={accent} color={colors.onTint} />
    </Animated.View>
  );

  const tabBar = (
    <View style={[styles.tabBar, wide ? styles.tabBarWide : { paddingBottom: Math.max(insets.bottom, space.sm) }]}>
      {tabs.map((item) => {
        const selected = item.key === tab && (wide || open);
        return (
          <PressableScale
            key={item.key}
            haptic
            scaleTo={0.94}
            accessibilityRole="tab"
            accessibilityLabel={item.label}
            accessibilityState={{ selected }}
            onPress={() => selectTab(item.key)}
            style={styles.tab}>
            <View style={styles.tabIcon}>
              {selected && <Animated.View entering={ZoomIn.duration(180)} style={[styles.tabPill, { backgroundColor: withAlpha(accent, 0.2) }]} />}
              <MaterialCommunityIcons name={selected ? item.activeIcon : item.icon} size={23} color={selected ? accent : colors.textDim} />
            </View>
            <AppText variant="caption" color={selected ? colors.text : colors.textDim} style={selected && styles.tabLabelActive}>
              {item.label}
            </AppText>
          </PressableScale>
        );
      })}
    </View>
  );

  const panelContent = (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.panelContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>
      <Animated.View key={tab} entering={FadeInDown.duration(200)} style={styles.panelInner}>
        {children}
      </Animated.View>
    </ScrollView>
  );

  const canvasArea = (
    <View style={styles.canvas}>
      {canvas}
      {!bare && overlay && (
        <Animated.View entering={FadeIn.duration(180)} exiting={exit(FadeOut.duration(120))} pointerEvents="box-none" style={styles.overlay}>
          {overlay}
        </Animated.View>
      )}
      {locked && (
        <Animated.View
          entering={FadeInDown.duration(220)}
          exiting={exit(FadeOut.duration(120))}
          pointerEvents="box-none"
          style={[styles.overlay, { bottom: Math.max(insets.bottom, space.lg) + space.sm }]}>
          <HoldButton label="Hold to unlock" onComplete={() => onLock(false)} />
        </Animated.View>
      )}
      {imageOnly && !locked && (
        <Animated.View
          entering={FadeInDown.duration(220)}
          exiting={exit(FadeOut.duration(120))}
          pointerEvents="box-none"
          style={[styles.overlay, { bottom: Math.max(insets.bottom, space.lg) + space.sm }]}>
          <PressableScale accessibilityRole="button" haptic onPress={() => setImageOnly(false)} style={styles.showControls}>
            <Ionicons name="options-outline" size={18} color={colors.text} />
            <AppText variant="label">Show controls</AppText>
          </PressableScale>
        </Animated.View>
      )}
      {busy && (
        <Animated.View entering={FadeIn.duration(120)} exiting={exit(FadeOut.duration(120))} style={styles.busy}>
          <ActivityIndicator size="large" color={accent} />
        </Animated.View>
      )}
    </View>
  );

  if (wide) {
    return (
      <View style={[styles.root, styles.row]}>
        <View style={styles.flex}>
          {topBar}
          {canvasArea}
        </View>
        {!bare && (
          <Animated.View
            entering={FadeIn.duration(180)}
            exiting={exit(FadeOut.duration(120))}
            style={[styles.side, { paddingTop: insets.top + space.sm, paddingBottom: insets.bottom, paddingRight: insets.right }]}>
            {tabBar}
            <View style={styles.sideGap} />
            {panelContent}
          </Animated.View>
        )}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.root}>
      {topBar}
      {canvasArea}
      {!bare && (
        <Animated.View entering={FadeIn.duration(180)} exiting={exit(FadeOut.duration(120))} style={styles.bottomBack}>
          <View style={styles.bottom}>
            <GestureDetector gesture={Gesture.Race(dragPanel, tapHandle)}>
              <View collapsable={false} accessibilityRole="button" accessibilityLabel={open ? 'Hide settings' : 'Show settings'} style={styles.grabberArea}>
                <View style={styles.grabber} />
              </View>
            </GestureDetector>
            <Animated.View style={[styles.panel, panelStyle]}>{panelContent}</Animated.View>
            {tabBar}
          </View>
        </Animated.View>
      )}
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.bg },
  row: { flexDirection: 'row' },
  flex: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingBottom: space.sm, backgroundColor: colors.bg },
  title: { flex: 1, marginLeft: space.xs },
  canvas: { flex: 1, backgroundColor: colors.canvas, overflow: 'hidden' },
  overlay: { position: 'absolute', left: 0, right: 0, bottom: space.md, alignItems: 'center' },
  busy: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.scrim },
  // The canvas colour shows behind the panel's rounded corners.
  bottomBack: { backgroundColor: colors.canvas },
  bottom: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
  },
  panel: { overflow: 'hidden' },
  sideGap: { height: space.sm },
  grabberArea: { alignItems: 'center', justifyContent: 'center', height: 28 },
  grabber: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.surfaceHigher },
  showControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    height: 46,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    backgroundColor: withAlpha(colors.surfaceHigh, 0.94),
    borderWidth: 1,
    borderColor: colors.border,
  },
  scroll: { flex: 1 },
  panelContent: { paddingHorizontal: space.lg, paddingTop: space.xs, paddingBottom: space.xl },
  panelInner: { gap: space.xl },
  tabBar: { flexDirection: 'row', paddingHorizontal: space.sm, paddingTop: space.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  tabBarWide: { borderTopWidth: 0, paddingTop: 0, paddingBottom: space.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  tab: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: space.xs },
  tabIcon: { width: 60, height: 32, alignItems: 'center', justifyContent: 'center' },
  tabPill: { ...StyleSheet.absoluteFill, borderRadius: 16 },
  tabLabelActive: { fontFamily: fonts.semibold },
  side: { width: SIDE_PANEL, backgroundColor: colors.surface, borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.border },
}));

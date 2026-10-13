import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { makeStyles, radius, space, useColors } from '@/constants/theme';
import { tick } from '@/lib/haptics';

import { AppText } from './app-text';

type Props = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  /** Tapping the value restores this. */
  defaultValue?: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
  tint?: string;
  disabled?: boolean;
  /** Fill grows from the middle, for values centred on zero. */
  bipolar?: boolean;
};

/** Delivers only the newest pushed value, once per animation frame. */
function frameThrottle<T>() {
  let handler: (value: T) => void = () => {};
  let pending: { value: T } | null = null;
  let frame = 0;
  return {
    handle: (next: (value: T) => void) => {
      handler = next;
    },
    push: (value: T) => {
      pending = { value };
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (pending) handler(pending.value);
        pending = null;
      });
    },
    cancel: () => cancelAnimationFrame(frame),
  };
}

const HEIGHT = 48;

/**
 * A bar that fills as the value grows, with the name and value written on it. The fill follows the
 * finger on the UI thread, so it stays smooth even while the canvas is redrawing. Value changes
 * reach React at most once per frame.
 */
export function Slider({ label, value, min, max, step = 0, defaultValue, onChange, format, tint: tintProp, disabled, bipolar }: Props) {
  const colors = useColors();
  const tint = tintProp ?? colors.accent;
  const styles = useStyles();
  const ratio = Math.min(1, Math.max(0, (value - min) / (max - min)));
  const width = useSharedValue(0);
  const position = useSharedValue(ratio);
  const active = useSharedValue(0);
  const dragging = useSharedValue(false);
  const lastSent = useSharedValue(value);

  // Follow outside changes (reset, another control), but never fight the finger.
  useEffect(() => {
    if (dragging.get()) return;
    position.set(ratio);
    lastSent.set(value);
  }, [ratio, value, dragging, position, lastSent]);

  const [changes] = useState(() => frameThrottle<number>());
  useEffect(() => {
    changes.handle(onChange);
  });
  useEffect(() => changes.cancel, [changes]);
  const emit = changes.push;

  const moveTo = (x: number) => {
    'worklet';
    const w = width.get();
    if (w <= 0) return;
    const t = Math.min(1, Math.max(0, x / w));
    let next = min + t * (max - min);
    if (step > 0) next = Math.round(next / step) * step;
    next = Math.round(Math.min(max, Math.max(min, next)) * 10000) / 10000;
    position.set((next - min) / (max - min));
    if (next !== lastSent.get()) {
      lastSent.set(next);
      scheduleOnRN(emit, next);
    }
  };

  const pan = Gesture.Pan()
    .enabled(!disabled)
    .activeOffsetX([-4, 4])
    .failOffsetY([-12, 12])
    .onStart((e) => {
      dragging.set(true);
      active.set(withSpring(1));
      moveTo(e.x);
    })
    .onUpdate((e) => moveTo(e.x))
    .onFinalize(() => {
      dragging.set(false);
      active.set(withSpring(0));
    });
  const tap = Gesture.Tap()
    .enabled(!disabled)
    .onEnd((e) => moveTo(e.x));

  const fillStyle = useAnimatedStyle(() => {
    const w = width.get();
    const t = position.get();
    const opacity = 0.34 + active.get() * 0.16;
    if (bipolar) return { left: Math.min(t, 0.5) * w, width: Math.abs(t - 0.5) * w, opacity };
    return { left: 0, width: t * w, opacity };
  });
  const canReset = defaultValue !== undefined && value !== defaultValue && !disabled;

  return (
    <View style={[styles.row, disabled && styles.disabled]}>
      <GestureDetector gesture={Gesture.Race(pan, tap)}>
        <View
          collapsable={false}
          style={styles.bar}
          onLayout={(e) => width.set(e.nativeEvent.layout.width)}
          accessibilityRole="adjustable"
          accessibilityLabel={label}
          accessibilityValue={{ min, max, now: value }}>
          <Animated.View style={[styles.fill, { backgroundColor: tint }, fillStyle]} />
          {bipolar && <View style={styles.centerMark} />}
          <View pointerEvents="none" style={styles.texts}>
            <AppText variant="label" numberOfLines={1} style={styles.label}>
              {label}
            </AppText>
            <AppText variant="label" style={styles.value}>
              {format ? format(value) : String(value)}
            </AppText>
          </View>
        </View>
      </GestureDetector>
      {defaultValue !== undefined && (
        <Pressable
          hitSlop={6}
          disabled={!canReset}
          accessibilityRole="button"
          accessibilityLabel={`Reset ${label}`}
          onPress={() => {
            tick();
            onChange(defaultValue);
          }}
          style={[styles.reset, !canReset && styles.resetIdle]}>
          <Ionicons name="refresh" size={18} color={canReset ? tint : colors.textFaint} />
        </Pressable>
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  disabled: { opacity: 0.4 },
  bar: { flex: 1, height: HEIGHT, borderRadius: radius.md, backgroundColor: colors.surfaceHigh, overflow: 'hidden', justifyContent: 'center' },
  fill: { position: 'absolute', top: 0, bottom: 0 },
  centerMark: { position: 'absolute', left: '50%', marginLeft: -1, top: 0, bottom: 0, width: 2, backgroundColor: colors.surfaceHigher },
  texts: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, paddingHorizontal: space.lg },
  label: { flexShrink: 1 },
  value: { fontVariant: ['tabular-nums'] },
  reset: { width: 40, height: HEIGHT, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceHigh },
  resetIdle: { opacity: 0.45 },
}));

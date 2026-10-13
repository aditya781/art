import { Group, Points, Rect, type SkImage } from '@shopify/react-native-skia';
import { useEffect, useState } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import Animated, { FadeIn, FadeOut, useDerivedValue, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { AdjustedImage } from '@/components/editor/adjusted-image';
import { EditorCanvas } from '@/components/editor/editor-canvas';
import { AppText } from '@/components/ui/app-text';
import { Button, IconButton } from '@/components/ui/buttons';
import { Chips } from '@/components/ui/chips';
import { Segmented } from '@/components/ui/segmented';
import { makeStyles, space } from '@/constants/theme';
import { exit } from '@/lib/motion';
import { defaultAdjust } from '@/store/projects';

export type CropRect = { x: number; y: number; width: number; height: number };

/** A crop proportion, given as width / height of the upright (portrait) shape. */
export type CropShape = { key: string; label: string; ratio: number };

const standardShapes: CropShape[] = [
  { key: '4:5', label: '4:5', ratio: 4 / 5 },
  { key: '3:4', label: '3:4', ratio: 3 / 4 },
  { key: '2:3', label: '2:3', ratio: 2 / 3 },
  { key: '9:16', label: '9:16', ratio: 9 / 16 },
];

type Props = {
  image: SkImage;
  width: number;
  height: number;
  title: string;
  tint: string;
  /** Extra proportions listed first, such as the paper the drawing will be made on. */
  shapes?: CropShape[];
  onCancel: () => void;
  onDone: (rect: CropRect) => void;
};

/** Space kept between the picture and the edge of the screen, so the corner handles are easy to reach. */
const MARGIN = 28;
/** Screen distance within which a touch grabs a corner or a side. */
const REACH = 26;
const MOVE = -1;
const NONE = -2;

/** Full-screen cropping: drag the frame's corners and sides, or drag inside it to move it. */
export function CropView({ image, width: W, height: H, title, tint, shapes = [], onCancel, onDone }: Props) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [shape, setShape] = useState('free');
  const [landscape, setLandscape] = useState(W > H);
  const [box, setBox] = useState({ width: W, height: H });

  const options = [{ key: 'free', label: 'Free', ratio: 0 }, { key: 'original', label: 'Original', ratio: W / H }, ...shapes, { key: 'square', label: 'Square', ratio: 1 }, ...standardShapes];
  const turnable = shape !== 'free' && shape !== 'original' && shape !== 'square';
  const ratioOf = (key: string, wide: boolean) => {
    const upright = options.find((o) => o.key === key)?.ratio ?? 0;
    return key === 'free' || key === 'original' || key === 'square' || !wide ? upright : 1 / upright;
  };
  const ratio = ratioOf(shape, landscape);

  const k = Math.max(0.0001, Math.min((size.width - MARGIN * 2) / W, (size.height - MARGIN * 2) / H));
  const fitX = (size.width - W * k) / 2;
  const fitY = (size.height - H * k) / 2;
  const minSide = Math.min(W, H, Math.max(48, Math.min(W, H) * 0.06));

  /** Left, top, right, bottom in the picture's pixels. */
  const frame = useSharedValue([0, 0, W, H]);
  const start = useSharedValue([0, 0, W, H]);
  const handle = useSharedValue(NONE);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onCancel();
      return true;
    });
    return () => subscription.remove();
  }, [onCancel]);

  const report = (f: number[]) => setBox({ width: Math.round(f[2] - f[0]), height: Math.round(f[3] - f[1]) });

  const applyShape = (key: string, wide: boolean) => {
    setShape(key);
    setLandscape(wide);
    const next = ratioOf(key, wide);
    if (next <= 0) return;
    const w = Math.min(W, H * next);
    const h = w / next;
    const f = [(W - w) / 2, (H - h) / 2, (W + w) / 2, (H + h) / 2];
    frame.set(withTiming(f, { duration: 220 }));
    report(f);
  };

  const drag = Gesture.Pan()
    .maxPointers(1)
    .onBegin((e) => {
      const x = (e.x - fitX) / k;
      const y = (e.y - fitY) / k;
      const f = frame.get();
      const reach = REACH / k;
      start.set(f);
      const xs = [f[0], f[2], f[2], f[0]];
      const ys = [f[1], f[1], f[3], f[3]];
      let found = NONE;
      let nearest = reach;
      for (let i = 0; i < 4; i++) {
        const distance = Math.hypot(xs[i] - x, ys[i] - y);
        if (distance < nearest) {
          nearest = distance;
          found = i;
        }
      }
      if (found === NONE) {
        const insideX = x > f[0] && x < f[2];
        const insideY = y > f[1] && y < f[3];
        // Sides in the order top, right, bottom, left.
        const gaps = [insideX ? Math.abs(y - f[1]) : reach, insideY ? Math.abs(x - f[2]) : reach, insideX ? Math.abs(y - f[3]) : reach, insideY ? Math.abs(x - f[0]) : reach];
        for (let i = 0; i < 4; i++) {
          if (gaps[i] < nearest) {
            nearest = gaps[i];
            found = i + 4;
          }
        }
        if (found === NONE && insideX && insideY) found = MOVE;
      }
      handle.set(found);
    })
    .onChange((e) => {
      const h = handle.get();
      if (h === NONE) return;
      const s = start.get();
      const dx = e.translationX / k;
      const dy = e.translationY / k;
      if (h === MOVE) {
        const mx = Math.min(W - s[2], Math.max(-s[0], dx));
        const my = Math.min(H - s[3], Math.max(-s[1], dy));
        frame.set([s[0] + mx, s[1] + my, s[2] + mx, s[3] + my]);
        return;
      }
      const movesLeft = h === 0 || h === 3 || h === 7;
      const movesRight = h === 1 || h === 2 || h === 5;
      const movesTop = h === 0 || h === 1 || h === 4;
      const movesBottom = h === 2 || h === 3 || h === 6;
      let left = movesLeft ? Math.min(s[2] - minSide, Math.max(0, s[0] + dx)) : s[0];
      let right = movesRight ? Math.max(s[0] + minSide, Math.min(W, s[2] + dx)) : s[2];
      let top = movesTop ? Math.min(s[3] - minSide, Math.max(0, s[1] + dy)) : s[1];
      let bottom = movesBottom ? Math.max(s[1] + minSide, Math.min(H, s[3] + dy)) : s[3];

      if (ratio > 0) {
        if (h < 4) {
          // A corner: the opposite corner stays put and the frame keeps its shape.
          const roomW = movesLeft ? s[2] : W - s[0];
          const roomH = movesTop ? s[3] : H - s[1];
          const w = Math.min(Math.max(right - left, (bottom - top) * ratio), roomW, roomH * ratio);
          const hh = w / ratio;
          if (movesLeft) left = s[2] - w;
          else right = s[0] + w;
          if (movesTop) top = s[3] - hh;
          else bottom = s[1] + hh;
        } else if (h === 5 || h === 7) {
          // A left or right side: the height follows, growing evenly above and below.
          const cy = (s[1] + s[3]) / 2;
          const w = Math.min(right - left, 2 * Math.min(cy, H - cy) * ratio);
          if (movesLeft) left = s[2] - w;
          else right = s[0] + w;
          top = cy - w / ratio / 2;
          bottom = cy + w / ratio / 2;
        } else {
          const cx = (s[0] + s[2]) / 2;
          const hh = Math.min(bottom - top, (2 * Math.min(cx, W - cx)) / ratio);
          if (movesTop) top = s[3] - hh;
          else bottom = s[1] + hh;
          left = cx - (hh * ratio) / 2;
          right = cx + (hh * ratio) / 2;
        }
      }
      frame.set([left, top, right, bottom]);
    })
    .onEnd(() => scheduleOnRN(report, frame.get()));

  const outline = useDerivedValue(() => {
    const f = frame.get();
    return { x: f[0], y: f[1], width: f[2] - f[0], height: f[3] - f[1] };
  });
  const shadeTop = useDerivedValue(() => ({ x: 0, y: 0, width: W, height: frame.get()[1] }), [W]);
  const shadeBottom = useDerivedValue(() => ({ x: 0, y: frame.get()[3], width: W, height: H - frame.get()[3] }), [W, H]);
  const shadeLeft = useDerivedValue(() => {
    const f = frame.get();
    return { x: 0, y: f[1], width: f[0], height: f[3] - f[1] };
  });
  const shadeRight = useDerivedValue(() => {
    const f = frame.get();
    return { x: f[2], y: f[1], width: W - f[2], height: f[3] - f[1] };
  }, [W]);
  const thirds = useDerivedValue(() => {
    const [l, t, r, b] = frame.get();
    const w = (r - l) / 3;
    const h = (b - t) / 3;
    return [
      { x: l + w, y: t },
      { x: l + w, y: b },
      { x: l + w * 2, y: t },
      { x: l + w * 2, y: b },
      { x: l, y: t + h },
      { x: r, y: t + h },
      { x: l, y: t + h * 2 },
      { x: r, y: t + h * 2 },
    ];
  });
  // Corner brackets and a short bar on each side, as pairs of points for thick lines.
  const grips = useDerivedValue(() => {
    const [l, t, r, b] = frame.get();
    const arm = Math.min(20 / k, (r - l) / 4, (b - t) / 4);
    const bar = Math.min(11 / k, (r - l) / 8, (b - t) / 8);
    const cx = (l + r) / 2;
    const cy = (t + b) / 2;
    // No helper function in here: a function defined inside a worklet does not run on the UI thread.
    const xy = [
      l, t + arm, l, t, l, t, l + arm, t,
      r - arm, t, r, t, r, t, r, t + arm,
      r, b - arm, r, b, r, b, r - arm, b,
      l + arm, b, l, b, l, b, l, b - arm,
      cx - bar, t, cx + bar, t, r, cy - bar, r, cy + bar,
      cx - bar, b, cx + bar, b, l, cy - bar, l, cy + bar,
    ];
    const points: { x: number; y: number }[] = [];
    for (let i = 0; i < xy.length; i += 2) points.push({ x: xy[i], y: xy[i + 1] });
    return points;
  }, [k]);

  const finish = () => {
    const f = frame.get();
    const x = Math.max(0, Math.round(f[0]));
    const y = Math.max(0, Math.round(f[1]));
    onDone({ x, y, width: Math.min(W - x, Math.round(f[2] - f[0])), height: Math.min(H - y, Math.round(f[3] - f[1])) });
  };

  const shade = 'rgba(0,0,0,0.62)';

  return (
    <Animated.View entering={FadeIn.duration(180)} exiting={exit(FadeOut.duration(140))} style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.bar}>
        <IconButton icon="close" label="Cancel crop" onPress={onCancel} />
        <View style={styles.heading}>
          <AppText variant="heading" numberOfLines={1}>
            {title}
          </AppText>
          <AppText variant="caption" dim>
            {box.width} × {box.height} px
          </AppText>
        </View>
        <Button compact variant="primary" tint={tint} icon="checkmark" label="Done" onPress={finish} />
      </View>

      <View style={styles.stage}>
        <EditorCanvas gesture={drag} onWheel={() => {}} onSize={setSize}>
          {size.width > 0 && (
            <Group transform={[{ translateX: fitX }, { translateY: fitY }, { scale: k }]}>
              <AdjustedImage image={image} width={W} height={H} adjust={defaultAdjust} />
              <Rect rect={shadeTop} color={shade} />
              <Rect rect={shadeBottom} color={shade} />
              <Rect rect={shadeLeft} color={shade} />
              <Rect rect={shadeRight} color={shade} />
              <Points points={thirds} mode="lines" strokeWidth={1 / k} color="rgba(255,255,255,0.38)" />
              <Rect rect={outline} style="stroke" strokeWidth={1.25 / k} color="rgba(255,255,255,0.9)" />
              <Points points={grips} mode="lines" strokeCap="round" strokeWidth={4.5 / k} color="#FFFFFF" />
            </Group>
          )}
        </EditorCanvas>
      </View>

      <View style={styles.controls}>
        <Chips options={options.map((o) => ({ value: o.key, label: o.label }))} value={shape} onChange={(key) => applyShape(key, landscape)} tint={tint} />
        {turnable && (
          <Segmented
            options={[
              { value: 'portrait', label: 'Upright' },
              { value: 'landscape', label: 'Sideways' },
            ]}
            value={landscape ? 'landscape' : 'portrait'}
            onChange={(next) => applyShape(shape, next === 'landscape')}
          />
        )}
        <AppText variant="caption" dim>
          Drag a corner or a side to resize the frame, or drag inside it to move it.
        </AppText>
      </View>
    </Animated.View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { ...StyleSheet.absoluteFill, backgroundColor: colors.bg, zIndex: 20 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.sm },
  heading: { flex: 1, alignItems: 'center', gap: 2 },
  stage: { flex: 1, backgroundColor: colors.canvas },
  controls: { gap: space.md, padding: space.lg },
}));

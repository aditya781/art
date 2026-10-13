import { Gesture } from 'react-native-gesture-handler';
import { Easing, useDerivedValue, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

const MAX_SCALE = 12;
const settle = { duration: 220, easing: Easing.out(Easing.cubic) };
const glide = { duration: 420, easing: Easing.inOut(Easing.cubic) };

type Options = {
  /** Size of the canvas area in points. */
  width: number;
  height: number;
  enabled: boolean;
  /** Called with a point in canvas coordinates, before zoom and pan. */
  onTap?: (x: number, y: number) => void;
};

function clampOffset(offset: number, size: number, scale: number) {
  'worklet';
  if (scale <= 1) return (size * (1 - scale)) / 2;
  return Math.min(0, Math.max(size * (1 - scale), offset));
}

/** Pinch, pan and double-tap zoom for a canvas, kept on the UI thread. */
export function useViewTransform({ width, height, enabled, onTap }: Options) {
  const scale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const start = useSharedValue({ scale: 1, tx: 0, ty: 0, fx: 0, fy: 0 });

  const transform = useDerivedValue(() => [{ translateX: tx.get() }, { translateY: ty.get() }, { scale: scale.get() }]);

  const settleInBounds = () => {
    'worklet';
    const s = Math.min(MAX_SCALE, Math.max(1, scale.get()));
    scale.set(withTiming(s, settle));
    tx.set(withTiming(clampOffset(tx.get(), width, s), settle));
    ty.set(withTiming(clampOffset(ty.get(), height, s), settle));
  };

  const pinch = Gesture.Pinch()
    .enabled(enabled)
    .onStart((e) => {
      start.set({ scale: scale.get(), tx: tx.get(), ty: ty.get(), fx: e.focalX, fy: e.focalY });
    })
    .onUpdate((e) => {
      // When one finger lifts, the focal point jumps to the finger that is left, which would throw the picture sideways.
      if (e.numberOfPointers < 2) return;
      const from = start.get();
      const s = Math.min(MAX_SCALE, Math.max(0.6, from.scale * e.scale));
      const k = s / from.scale;
      scale.set(s);
      tx.set(e.focalX - (from.fx - from.tx) * k);
      ty.set(e.focalY - (from.fy - from.ty) * k);
    })
    .onEnd(settleInBounds);

  const pan = Gesture.Pan()
    .enabled(enabled)
    .maxPointers(1)
    .onChange((e) => {
      tx.set(tx.get() + e.changeX);
      ty.set(ty.get() + e.changeY);
    })
    .onEnd(settleInBounds);

  const doubleTap = Gesture.Tap()
    .enabled(enabled)
    .numberOfTaps(2)
    .onEnd((e) => {
      if (scale.get() > 1.05) {
        scale.set(withTiming(1, glide));
        tx.set(withTiming(0, glide));
        ty.set(withTiming(0, glide));
        return;
      }
      const s = 3;
      const k = s / scale.get();
      scale.set(withTiming(s, glide));
      tx.set(withTiming(clampOffset(e.x - (e.x - tx.get()) * k, width, s), glide));
      ty.set(withTiming(clampOffset(e.y - (e.y - ty.get()) * k, height, s), glide));
    });

  const singleTap = Gesture.Tap()
    .enabled(enabled && !!onTap)
    .onEnd((e) => {
      if (onTap) scheduleOnRN(onTap, (e.x - tx.get()) / scale.get(), (e.y - ty.get()) / scale.get());
    });

  const gesture = Gesture.Race(Gesture.Simultaneous(pinch, pan), Gesture.Exclusive(doubleTap, singleTap));

  /** Wheel and trackpad zoom on web, around the pointer position in canvas points. */
  const zoomAt = (fx: number, fy: number, deltaY: number) => {
    if (!enabled) return;
    const from = scale.get();
    const s = Math.min(MAX_SCALE, Math.max(1, from * Math.exp(-deltaY * 0.0015)));
    const k = s / from;
    scale.set(s);
    tx.set(clampOffset(fx - (fx - tx.get()) * k, width, s));
    ty.set(clampOffset(fy - (fy - ty.get()) * k, height, s));
  };

  const reset = () => {
    scale.set(withTiming(1, glide));
    tx.set(withTiming(0, glide));
    ty.set(withTiming(0, glide));
  };

  /** Glides so the given canvas-space rectangle fills most of the view. */
  const zoomTo = (rect: { x: number; y: number; width: number; height: number }) => {
    const s = Math.min(MAX_SCALE, Math.max(1, Math.min(width / rect.width, height / rect.height) * 0.72));
    scale.set(withTiming(s, glide));
    tx.set(withTiming(width / 2 - (rect.x + rect.width / 2) * s, glide));
    ty.set(withTiming(height / 2 - (rect.y + rect.height / 2) * s, glide));
  };

  return { scale, tx, ty, transform, gesture, reset, zoomTo, zoomAt };
}

export type ViewTransform = ReturnType<typeof useViewTransform>;

/** Scale and offset that centre content of the given size inside the canvas with a margin. */
export function fitContent(canvasW: number, canvasH: number, contentW: number, contentH: number, margin = 12) {
  const scale = Math.max(0.0001, Math.min((canvasW - margin * 2) / contentW, (canvasH - margin * 2) / contentH));
  return { scale, x: (canvasW - contentW * scale) / 2, y: (canvasH - contentH * scale) / 2 };
}

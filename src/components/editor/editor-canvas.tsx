import { Canvas } from '@shopify/react-native-skia';
import { useEffect, useRef, type ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { GestureDetector, type ComposedGesture, type GestureType } from 'react-native-gesture-handler';

type Props = {
  gesture: GestureType | ComposedGesture;
  /** Web only: mouse wheel or trackpad scroll at a point in canvas coordinates. */
  onWheel: (x: number, y: number, deltaY: number) => void;
  onSize: (size: { width: number; height: number }) => void;
  children: ReactNode;
};

/** Full-size Skia canvas that reports its size and receives the editor's touch gestures. */
export function EditorCanvas({ gesture, onWheel, onSize, children }: Props) {
  const container = useRef<View>(null);
  const wheel = useRef(onWheel);
  useEffect(() => {
    wheel.current = onWheel;
  });

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const element = container.current as unknown as HTMLElement | null;
    if (!element?.addEventListener) return;
    const listener = (event: WheelEvent) => {
      event.preventDefault();
      const bounds = element.getBoundingClientRect();
      wheel.current(event.clientX - bounds.left, event.clientY - bounds.top, event.deltaY);
    };
    element.addEventListener('wheel', listener, { passive: false });
    return () => element.removeEventListener('wheel', listener);
  }, []);

  return (
    <View
      ref={container}
      style={StyleSheet.absoluteFill}
      onLayout={(e) => onSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}>
      <GestureDetector gesture={gesture}>
        <View collapsable={false} style={StyleSheet.absoluteFill}>
          <Canvas style={StyleSheet.absoluteFill}>{children}</Canvas>
        </View>
      </GestureDetector>
    </View>
  );
}

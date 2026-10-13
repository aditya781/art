import { Canvas, Circle, Group, LinearGradient, Path, RoundedRect, Skia, vec } from '@shopify/react-native-skia';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Easing, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';

import { makeStyles } from '@/constants/theme';

const BOX_W = 300;
const ART_HEIGHT = 132;

const draw = { duration: 1100, easing: Easing.out(Easing.cubic) };

/** Canvas that scales a 300×132 drawing down to fit narrow cards and centres it. */
function ArtCanvas({ children }: { children: React.ReactNode }) {
  const styles = useStyles();
  const [width, setWidth] = useState(0);
  const scale = Math.min(1, width / BOX_W);
  return (
    <View style={styles.art} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && (
        <Canvas style={StyleSheet.absoluteFill}>
          <Group transform={[{ translateX: (width - BOX_W * scale) / 2 }, { scale }]}>{children}</Group>
        </Canvas>
      )}
    </View>
  );
}

function Picture({ from, to, opacity = 1 }: { from: string; to: string; opacity?: number | ReturnType<typeof useSharedValue<number>> }) {
  return (
    <Group opacity={opacity} clip={Skia.RRectXY(Skia.XYWHRect(60, 12, 180, 108), 10, 10)}>
      <RoundedRect x={60} y={12} width={180} height={108} r={10}>
        <LinearGradient start={vec(60, 12)} end={vec(240, 120)} colors={[from, to]} />
      </RoundedRect>
      <Circle cx={196} cy={46} r={17} color="rgba(255,255,255,0.85)" />
      <Path path="M60 120 L60 92 L104 58 L140 90 L164 72 L240 120 Z" color="rgba(20,16,30,0.55)" />
      <Path path="M60 120 L60 106 L96 84 L150 120 Z" color="rgba(20,16,30,0.45)" />
    </Group>
  );
}

const gridLines = (() => {
  let d = '';
  for (let x = 90; x < 240; x += 30) d += `M${x} 12 L${x} 120 `;
  for (let y = 39; y < 120; y += 27) d += `M60 ${y} L240 ${y} `;
  return d;
})();

export function GridArt() {
  const end = useSharedValue(0);
  useEffect(() => {
    end.set(withDelay(350, withTiming(1, draw)));
  }, [end]);

  return (
    <ArtCanvas>
      <Picture from="#FFC24A" to="#FF6B4A" />
      <Path path={gridLines} style="stroke" strokeWidth={1.5} color="rgba(255,255,255,0.92)" end={end} />
    </ArtCanvas>
  );
}

const doodles =
  'M22 44 C40 12 58 76 78 42 S116 12 134 44 ' +
  'M168 26 L182 52 L196 26 L210 52 L224 26 L238 52 L252 26 L266 52 ' +
  'M42 98 a18 18 0 1 0 36 0 a12 12 0 1 0 -24 0 a6 6 0 1 0 12 0 ' +
  'M150 70 L156 88 L175 88 L160 99 L166 117 L150 106 L134 117 L140 99 L125 88 L144 88 Z ' +
  'M196 84 q10 -14 20 0 t20 0 t20 0 t20 0 ' +
  'M200 108 q10 -14 20 0 t20 0 t20 0 ' +
  'M96 78 l16 16 m0 -16 l-16 16 ' +
  'M20 70 l14 0 M27 63 l0 14';

export function DoodleArt() {
  const end = useSharedValue(0);
  const overlay = useSharedValue(0.15);
  useEffect(() => {
    end.set(withDelay(350, withTiming(1, { ...draw, duration: 1500 })));
    overlay.set(withDelay(1200, withRepeat(withTiming(0.8, { duration: 1800, easing: Easing.inOut(Easing.quad) }), -1, true)));
  }, [end, overlay]);

  return (
    <ArtCanvas>
      <RoundedRect x={8} y={6} width={284} height={120} r={12} color="#26252E" />
      <Picture from="#8C7BFF" to="#FF6BB5" opacity={overlay} />
      <Path path={doodles} style="stroke" strokeWidth={2} strokeCap="round" strokeJoin="round" color="rgba(255,255,255,0.9)" end={end} />
    </ArtCanvas>
  );
}

const useStyles = makeStyles((colors) => ({
  // Sized by ratio so the height is right on the first layout pass and never changes after the card is on screen.
  art: { overflow: 'hidden', width: '100%', aspectRatio: BOX_W / ART_HEIGHT, maxHeight: ART_HEIGHT },
}));

import { Ionicons } from '@expo/vector-icons';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/buttons';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Sheet } from '@/components/ui/sheet';
import { makeStyles, radius, space, useColors, withAlpha } from '@/constants/theme';
import type { ImageSource } from '@/lib/images';
import type { Project } from '@/store/projects';

import { DoodleArt, GridArt } from './mode-art';

type Kind = Project['kind'];

type Props = { visible: boolean; onClose: () => void; onStart: (kind: Kind, source: ImageSource) => void };

const methods: Record<Kind, { title: string; upload: string; how: string; library: string }> = {
  grid: {
    title: 'Classic grid',
    upload: 'The photo you want to draw',
    how: 'Even squares are laid over it, sized to your paper, so you can copy it square by square.',
    library: 'Choose photo',
  },
  doodle: {
    title: 'Doodle grid',
    upload: 'A photo of your doodles',
    how: 'Scribble all over your wall or paper and photograph it straight on. The picture you want to draw is added in the next step.',
    library: 'Choose doodle photo',
  },
};

/** One step to start a drawing: pick the method, then where the photo comes from. */
export function NewDrawingSheet({ visible, onClose, onStart }: Props) {
  const colors = useColors();
  const styles = useStyles();
  const [kind, setKind] = useState<Kind>('grid');
  const method = methods[kind];

  return (
    <Sheet visible={visible} onClose={onClose} title="New drawing">
      <View style={styles.methods}>
        <MethodCard kind="grid" selected={kind === 'grid'} onSelect={setKind} art={<GridArt />} />
        <MethodCard kind="doodle" selected={kind === 'doodle'} onSelect={setKind} art={<DoodleArt />} />
      </View>
      <Animated.View key={kind} entering={FadeIn.duration(180)} style={styles.about}>
        <AppText variant="caption" dim style={styles.eyebrow}>
          {kind === 'doodle' ? 'UPLOAD FIRST' : 'UPLOAD'}
        </AppText>
        <AppText variant="heading">{method.upload}</AppText>
        <AppText variant="caption" dim>
          {method.how}
        </AppText>
      </Animated.View>
      <View style={styles.actions}>
        <Button variant="primary" tint={colors[kind]} icon="images-outline" label={method.library} onPress={() => onStart(kind, 'library')} style={styles.primary} />
        <Button icon="camera-outline" label="Camera" onPress={() => onStart(kind, 'camera')} style={styles.secondary} />
      </View>
    </Sheet>
  );
}

function MethodCard({ kind, selected, onSelect, art }: { kind: Kind; selected: boolean; onSelect: (kind: Kind) => void; art: ReactNode }) {
  const colors = useColors();
  const styles = useStyles();
  const { title } = methods[kind];
  const tint = colors[kind];
  return (
    <PressableScale
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={title}
      haptic
      scaleTo={0.97}
      onPress={() => onSelect(kind)}
      style={[styles.method, selected && { borderColor: tint, backgroundColor: withAlpha(tint, 0.1) }]}>
      <View style={styles.art}>{art}</View>
      <View style={styles.methodFooter}>
        <AppText variant="label" color={selected ? colors.text : colors.textDim} style={styles.methodTitle}>
          {title}
        </AppText>
        <View style={[styles.radio, selected && { backgroundColor: tint, borderColor: tint }]}>
          {selected && <Ionicons name="checkmark" size={13} color={colors.onTint} />}
        </View>
      </View>
    </PressableScale>
  );
}

const useStyles = makeStyles((colors) => ({
  methods: { flexDirection: 'row', gap: space.md },
  method: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceHigh,
    overflow: 'hidden',
  },
  art: { paddingTop: space.md, paddingHorizontal: space.sm },
  methodFooter: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md },
  methodTitle: { flex: 1 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: colors.textFaint, alignItems: 'center', justifyContent: 'center' },
  // Tall enough for the longer of the two methods, so the sheet keeps its height when the method changes.
  about: { gap: space.xs, minHeight: 104, paddingVertical: space.sm },
  eyebrow: { letterSpacing: 1.2 },
  actions: { flexDirection: 'row', gap: space.sm },
  primary: { flex: 1.6, minHeight: 54 },
  secondary: { flex: 1, minHeight: 54 },
}));

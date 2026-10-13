import { useState } from 'react';
import { View } from 'react-native';

import { AdjustControls } from '@/components/editor/adjust-controls';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/buttons';
import { Chips } from '@/components/ui/chips';
import { Section } from '@/components/ui/section';
import { Segmented } from '@/components/ui/segmented';
import { Slider } from '@/components/ui/slider';
import { Swatches } from '@/components/ui/swatches';
import { ToggleRow } from '@/components/ui/toggle';
import { makeStyles, space, useColors } from '@/constants/theme';
import type { Adjust, BlendId, DoodleProject, LineSettings } from '@/store/projects';

export type AlignAction = 'fit' | 'fill' | 'reset' | 'rotate' | 'flip';

type AlignProps = { hasReference: boolean; onAction: (action: AlignAction) => void; onCrop: () => void; onReplace: () => void; onSwap: () => void };

export function AlignPanel({ hasReference, onAction, onCrop, onReplace, onSwap }: AlignProps) {
  const colors = useColors();
  const tint = colors.doodle;
  const styles = useStyles();
  if (!hasReference) {
    return (
      <Section>
        <AppText dim>Add the picture you want to draw. It is laid over your doodle photo so the doodles become your landmarks.</AppText>
        <Button variant="primary" tint={tint} icon="image-outline" label="Add the picture to draw" onPress={onReplace} />
      </Section>
    );
  }
  return (
    <Section title="Position">
      <AppText dim>Drag the picture to move it, pinch to resize and turn it, and pull a corner dot to match the angle of your wall or paper. Pull the small bar on a side to move just that side.</AppText>
      <View style={styles.row}>
        <Button compact icon="contract-outline" label="Fit" onPress={() => onAction('fit')} style={styles.flex} />
        <Button compact icon="expand-outline" label="Fill" onPress={() => onAction('fill')} style={styles.flex} />
        <Button compact icon="refresh" label="Reset" onPress={() => onAction('reset')} style={styles.flex} />
      </View>
      <View style={styles.row}>
        <Button compact icon="refresh-outline" label="Rotate" onPress={() => onAction('rotate')} style={styles.flex} />
        <Button compact icon="swap-horizontal" label="Flip" onPress={() => onAction('flip')} style={styles.flex} />
        <Button compact icon="crop-outline" label="Crop" onPress={onCrop} style={styles.flex} />
      </View>
      <Button compact variant="ghost" icon="image-outline" label="Replace the picture to draw" onPress={onReplace} />
      <Button compact variant="ghost" icon="swap-vertical" label="Swap the two pictures" onPress={onSwap} />
    </Section>
  );
}

const blends: { value: BlendId; label: string }[] = [
  { value: 'srcOver', label: 'Normal' },
  { value: 'multiply', label: 'Multiply' },
  { value: 'screen', label: 'Screen' },
  { value: 'overlay', label: 'Overlay' },
  { value: 'darken', label: 'Darken' },
  { value: 'lighten', label: 'Lighten' },
  { value: 'difference', label: 'Difference' },
];

const lineColors = ['#111111', '#FFFFFF', '#E5484D', '#2F6FED', '#12A594', '#F5A524'];

type BlendProps = {
  opacity: number;
  blend: BlendId;
  lines: LineSettings;
  onLines: (patch: Partial<LineSettings>) => void;
  onOpacity: (opacity: number) => void;
  onBlend: (blend: BlendId) => void;
  onPeek: (peeking: boolean) => void;
};

export function BlendPanel({ opacity, blend, lines, onLines, onOpacity, onBlend, onPeek }: BlendProps) {
  const colors = useColors();
  const tint = colors.doodle;
  return (
    <>
      <Section title="See-through">
        <Slider
          label="Reference opacity"
          value={opacity}
          min={0}
          max={1}
          step={0.01}
          defaultValue={0.55}
          tint={tint}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={onOpacity}
        />
        <Button icon="eye-off-outline" label="Hold to hide the reference" onPressIn={() => onPeek(true)} onPressOut={() => onPeek(false)} />
      </Section>
      <Section title="Doodles">
        <ToggleRow
          label="Lines only"
          hint="Removes the wall or paper and keeps just your doodle marks"
          value={lines.on}
          tint={tint}
          onChange={(on) => onLines({ on })}
        />
        {lines.on && (
          <>
            <Slider
              label="Sensitivity"
              value={lines.sensitivity}
              min={0}
              max={1}
              step={0.01}
              defaultValue={0.6}
              tint={tint}
              format={(v) => `${Math.round(v * 100)}%`}
              onChange={(sensitivity) => onLines({ sensitivity })}
            />
            <ToggleRow
              label="Light marks on a dark surface"
              hint="For chalk or light paint"
              value={lines.light}
              tint={tint}
              onChange={(light) => onLines({ light })}
            />
            <Swatches options={lineColors} value={lines.color} onChange={(color) => onLines({ color })} />
          </>
        )}
      </Section>
      {!lines.on && (
        <Section title="Blend" hint="Multiply keeps dark doodle lines visible through the picture on light paper or walls.">
          <Chips options={blends} value={blend} onChange={onBlend} tint={tint} />
        </Section>
      )}
    </>
  );
}

type AdjustProps = {
  project: DoodleProject;
  onReference: (patch: Partial<Adjust>) => void;
  onDoodle: (patch: Partial<Adjust>) => void;
  onCropDoodle: () => void;
  onReplaceDoodle: () => void;
};

export function AdjustPanel({ project, onReference, onDoodle, onCropDoodle, onReplaceDoodle }: AdjustProps) {
  const colors = useColors();
  const tint = colors.doodle;
  const styles = useStyles();
  const [layer, setLayer] = useState<'reference' | 'doodle'>(project.reference ? 'reference' : 'doodle');
  return (
    <>
      <Segmented
        options={[
          { value: 'reference', label: 'Reference' },
          { value: 'doodle', label: 'Doodle photo' },
        ]}
        value={layer}
        onChange={setLayer}
      />
      {layer === 'reference' ? (
        <AdjustControls value={project.refAdjust} onChange={onReference} tint={tint} />
      ) : (
        <>
          <AdjustControls value={project.doodleAdjust} onChange={onDoodle} tint={tint} />
          <Section title="Doodle photo">
            <View style={styles.row}>
              <Button compact icon="crop-outline" label="Crop" onPress={onCropDoodle} style={styles.flex} />
              <Button compact icon="camera-outline" label="Replace" onPress={onReplaceDoodle} style={styles.flex} />
            </View>
          </Section>
        </>
      )}
    </>
  );
}

const useStyles = makeStyles((colors) => ({
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: space.sm },
  group: { gap: space.sm },
}));

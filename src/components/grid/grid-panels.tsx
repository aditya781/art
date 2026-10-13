import { View } from 'react-native';
import Animated, { useAnimatedStyle, useDerivedValue, withTiming } from 'react-native-reanimated';

import { AppText } from '@/components/ui/app-text';
import { Button, IconButton } from '@/components/ui/buttons';
import { NumberField } from '@/components/ui/number-field';
import { Section } from '@/components/ui/section';
import { Segmented } from '@/components/ui/segmented';
import { Slider } from '@/components/ui/slider';
import { Swatches } from '@/components/ui/swatches';
import { ToggleRow } from '@/components/ui/toggle';
import { makeStyles, space, useColors } from '@/constants/theme';
import { cellName, type GridLayout } from '@/lib/grid';
import { CM_PER_INCH, drawArea, formatLength, papers } from '@/lib/paper';
import type { GridSettings, ImageAsset } from '@/store/projects';

import type { Cell } from './grid-scene';

type GridProps = { grid: GridSettings; layout: GridLayout; onChange: (patch: Partial<GridSettings>) => void };

export function GridPanel({ grid, layout, onChange }: GridProps) {
  const colors = useColors();
  const tint = colors.grid;
  return (
    <>
      <Section title="Cells">
      <Slider label="Columns" value={grid.cols} min={2} max={30} step={1} defaultValue={6} tint={tint} onChange={(cols) => onChange({ cols })} />
      <Slider
        label="Rows"
        value={grid.square ? layout.rows : grid.rows}
        min={2}
        max={30}
        step={1}
        tint={tint}
        disabled={grid.square}
        onChange={(rows) => onChange({ rows })}
      />
      <ToggleRow
        label="Square cells"
        hint="Rows follow the column count, so the grid matches one drawn with a ruler"
        value={grid.square}
        tint={tint}
        onChange={(square) => onChange({ square, rows: layout.rows })}
      />
      </Section>
    </>
  );
}

const lineColors = ['#FFFFFF', '#111111', '#FF3B30', '#FFC24A', '#34C759', '#32ADE6', '#FF2D95', '#8C7BFF'];

export function StylePanel({ grid, onChange }: Omit<GridProps, 'layout'>) {
  const colors = useColors();
  const tint = colors.grid;
  return (
    <>
      <Section title="Line colour">
        <Swatches options={lineColors} value={grid.color} onChange={(color) => onChange({ color })} />
      </Section>
      <Section title="Stroke">
        <Slider
          label="Thickness"
          value={grid.lineWidth}
          min={0.5}
          max={6}
          step={0.25}
          defaultValue={1.5}
          tint={tint}
          format={(v) => `${v.toFixed(2)} pt`}
          onChange={(lineWidth) => onChange({ lineWidth })}
        />
        <Slider
          label="Opacity"
          value={grid.opacity}
          min={0.1}
          max={1}
          step={0.05}
          defaultValue={0.9}
          tint={tint}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(opacity) => onChange({ opacity })}
        />
      </Section>
      <Section title="Guides">
      <ToggleRow label="Diagonals" hint="Cross lines in every cell for finer placement" value={grid.diagonals} tint={tint} onChange={(diagonals) => onChange({ diagonals })} />
      <ToggleRow label="Labels" hint="Letters across, numbers down" value={grid.labels} tint={tint} onChange={(labels) => onChange({ labels })} />
      </Section>
    </>
  );
}

type SizeProps = GridProps & { image: ImageAsset };

export function SizePanel({ grid, layout, image, onChange }: SizeProps) {
  const styles = useStyles();
  const paper = papers.find((p) => p.id === grid.paper) ?? papers[1];
  const custom = paper.id === 'custom';
  const area = drawArea(custom ? grid.customW : paper.w, custom ? grid.customH : paper.h, image.width, image.height);
  const cellW = area.w / layout.cols;
  const cellH = grid.square ? cellW : area.h / layout.rows;
  const toUnit = (cm: number) => (grid.unit === 'cm' ? cm : cm / CM_PER_INCH);
  const fromUnit = (v: number) => (grid.unit === 'cm' ? v : v * CM_PER_INCH);

  return (
    <>
      <Section title="Your paper or canvas">
        <Segmented options={papers.map((p) => ({ value: p.id, label: p.label }))} value={grid.paper} onChange={(id) => onChange({ paper: id })} />
        {custom && (
          <View style={styles.row}>
            <NumberField key={`w-${grid.unit}`} label="Width" suffix={grid.unit} value={toUnit(grid.customW)} onChange={(v) => onChange({ customW: fromUnit(v) })} />
            <NumberField key={`h-${grid.unit}`} label="Height" suffix={grid.unit} value={toUnit(grid.customH)} onChange={(v) => onChange({ customH: fromUnit(v) })} />
          </View>
        )}
        <Segmented
          options={[
            { value: 'cm', label: 'Centimetres' },
            { value: 'in', label: 'Inches' },
          ]}
          value={grid.unit}
          onChange={(unit) => onChange({ unit })}
        />
      </Section>
      <Section title="Draw this on your paper">
        <Fact label="Grid" value={`${layout.cols} × ${layout.rows} cells`} />
        <Fact
          label="Each cell"
          value={grid.square ? formatLength(cellW, grid.unit) : `${formatLength(cellW, grid.unit)} × ${formatLength(cellH, grid.unit)}`}
          strong
        />
        <Fact label="Drawing area" value={`${formatLength(area.w, grid.unit)} × ${formatLength(area.h, grid.unit)}`} />
      </Section>
    </>
  );
}

function Fact({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  const colors = useColors();
  const tint = colors.grid;
  const styles = useStyles();
  return (
    <View style={styles.fact}>
      <AppText variant="label" dim>
        {label}
      </AppText>
      <AppText variant={strong ? 'heading' : 'label'} color={strong ? tint : colors.text} style={styles.factValue}>
        {value}
      </AppText>
    </View>
  );
}

type FocusProps = {
  layout: GridLayout;
  focus: Cell | null;
  done: string[];
  isDone: boolean;
  onStart: () => void;
  onStep: (delta: number) => void;
  onToggleDone: () => void;
  onExit: () => void;
  onClear: () => void;
};

export function FocusPanel({ layout, focus, done, isDone, onStart, onStep, onToggleDone, onExit, onClear }: FocusProps) {
  const colors = useColors();
  const tint = colors.grid;
  const styles = useStyles();
  const total = layout.cols * layout.rows;
  const count = Math.min(done.length, total);
  const progress = useDerivedValue(() => withTiming(total ? count / total : 0, { duration: 300 }), [count, total]);
  const barStyle = useAnimatedStyle(() => ({ width: `${progress.get() * 100}%` }));

  const progressBlock = (
    <View style={styles.group}>
      <View style={styles.fact}>
        <AppText variant="label" dim>
          Progress
        </AppText>
        <AppText variant="label" style={styles.factValue}>
          {count} of {total} cells
        </AppText>
      </View>
      <View style={styles.bar}>
        <Animated.View style={[styles.barFill, barStyle]} />
      </View>
    </View>
  );

  if (!focus) {
    return (
      <Section>
        <AppText dim>Work through the drawing one cell at a time. The rest of the photo is dimmed so you only copy what is in front of you.</AppText>
        {progressBlock}
        <Button variant="primary" tint={tint} icon="locate-outline" label={count > 0 ? 'Continue' : 'Start with the first cell'} onPress={onStart} />
        {count > 0 && <Button variant="ghost" icon="trash-outline" label="Clear progress" onPress={onClear} />}
      </Section>
    );
  }

  return (
    <Section>
      <View style={styles.stepper}>
        <IconButton icon="chevron-back" label="Previous cell" size={48} onPress={() => onStep(-1)} />
        <View style={styles.cellName}>
          <AppText variant="display" color={tint}>
            {cellName(focus.col, focus.row)}
          </AppText>
          <AppText variant="caption" dim>
            Column {focus.col + 1}, row {focus.row + 1} · tap any cell to jump
          </AppText>
        </View>
        <IconButton icon="chevron-forward" label="Next cell" size={48} onPress={() => onStep(1)} />
      </View>
      {progressBlock}
      <View style={styles.row}>
        <Button
          variant={isDone ? 'secondary' : 'primary'}
          tint={colors.success}
          icon={isDone ? 'arrow-undo-outline' : 'checkmark'}
          label={isDone ? 'Mark not done' : 'Done, next cell'}
          onPress={onToggleDone}
          style={styles.flex}
        />
        <Button icon="close" label="Exit" onPress={onExit} />
      </View>
    </Section>
  );
}

const useStyles = makeStyles((colors) => ({
  flex: { flex: 1 },
  group: { gap: space.sm },
  row: { flexDirection: 'row', gap: space.sm },
  fact: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, minHeight: 32 },
  factValue: { fontVariant: ['tabular-nums'], flexShrink: 1, textAlign: 'right' },
  bar: { height: 6, borderRadius: 3, backgroundColor: colors.surfaceHigher, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3, backgroundColor: colors.success },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  cellName: { flex: 1, alignItems: 'center' },
}));

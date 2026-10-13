import { drawAsImage, Group, useFont, useImage } from '@shopify/react-native-skia';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Platform, View } from 'react-native';
import { useDerivedValue } from 'react-native-reanimated';

import { AdjustControls } from '@/components/editor/adjust-controls';
import { CropView, type CropRect } from '@/components/editor/crop-view';
import { EditorCanvas } from '@/components/editor/editor-canvas';
import { EditorShell, type EditorTab } from '@/components/editor/editor-shell';
import { KeepAwake } from '@/components/editor/keep-awake';
import { SourceSheet } from '@/components/editor/source-sheet';
import { FocusPanel, GridPanel, SizePanel, StylePanel } from '@/components/grid/grid-panels';
import { GridScene, type Cell } from '@/components/grid/grid-scene';
import { Button } from '@/components/ui/buttons';
import { OptionRow } from '@/components/ui/option-row';
import { Section } from '@/components/ui/section';
import { Sheet } from '@/components/ui/sheet';
import { space, useColors } from '@/constants/theme';
import { useHydrated } from '@/hooks/use-hydrated';
import { fitContent, useViewTransform } from '@/hooks/use-view-transform';
import { exportImage, type ExportAction } from '@/lib/export';
import { cellKey, computeGrid } from '@/lib/grid';
import { success } from '@/lib/haptics';
import { cropImage, deleteImage, flipImage, imageUri, pickImage, rotateImage, type ImageSource } from '@/lib/images';
import { papers } from '@/lib/paper';
import { afterSheetCloses } from '@/lib/wait';
import { useProjects, type Adjust, type GridProject, type GridSettings, type ImageAsset } from '@/store/projects';
import { toast, toastError, UserError } from '@/store/toast';

type TabKey = 'grid' | 'style' | 'image' | 'focus';

const tabs: EditorTab<TabKey>[] = [
  { key: 'grid', label: 'Grid', icon: 'grid', activeIcon: 'grid-large' },
  { key: 'style', label: 'Lines', icon: 'palette-outline', activeIcon: 'palette' },
  { key: 'image', label: 'Image', icon: 'image-edit-outline', activeIcon: 'image-edit' },
  { key: 'focus', label: 'Focus', icon: 'target', activeIcon: 'target-variant' },
];

const labelFont = require('@expo-google-fonts/outfit/600SemiBold/Outfit_600SemiBold.ttf');

export default function GridEditorScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const hydrated = useHydrated();
  const project = useProjects((s) => s.projects.find((p) => p.id === id));

  if (!hydrated) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  if (!project || project.kind !== 'grid') return <Redirect href="/" />;
  return <GridEditor project={project} />;
}

function GridEditor({ project }: { project: GridProject }) {
  const colors = useColors();
  const update = useProjects((s) => s.update);
  const { id, grid, adjust, done } = project;
  const { width: W, height: H } = project.image;

  const image = useImage(imageUri(project.image));
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [tab, setTab] = useState<TabKey>('grid');
  // A drawing made earlier is already set up, so it opens with the picture large and the settings tucked away.
  const [reopened] = useState(() => Date.now() - project.createdAt > 60_000);
  const [locked, setLocked] = useState(false);
  const [focus, setFocus] = useState<Cell | null>(null);
  const [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState<'export' | 'replace' | null>(null);
  const [cropping, setCropping] = useState(false);

  const layout = computeGrid(W, H, grid);
  const fit = fitContent(size.width, size.height, W, H);
  const focusing = tab === 'focus' && focus !== null;
  const labelSize = Math.max(6, Math.round(Math.min(layout.cellW, layout.cellH) * 0.2));
  const font = useFont(labelFont, labelSize);

  const selectCell = (cell: Cell) => {
    setFocus(cell);
    view.zoomTo({
      x: fit.x + layout.xs[cell.col] * fit.scale,
      y: fit.y + layout.ys[cell.row] * fit.scale,
      width: layout.cellW * fit.scale,
      height: Math.min(layout.cellH, H - layout.ys[cell.row]) * fit.scale,
    });
  };

  const onTap = (x: number, y: number) => {
    const col = Math.floor((x - fit.x) / fit.scale / layout.cellW);
    const row = Math.floor((y - fit.y) / fit.scale / layout.cellH);
    if (col >= 0 && col < layout.cols && row >= 0 && row < layout.rows) selectCell({ col, row });
  };

  const view = useViewTransform({ width: size.width, height: size.height, enabled: !locked, onTap: tab === 'focus' ? onTap : undefined });
  const lineWidth = grid.lineWidth;
  const fitScale = fit.scale;
  // Only the shared value may be captured here: the whole `view` object holds gestures, which cannot cross to the UI thread.
  const viewScale = view.scale;
  const strokeWidth = useDerivedValue(() => lineWidth / (fitScale * viewScale.get()), [lineWidth, fitScale]);

  const setGrid = (patch: Partial<GridSettings>) => {
    update(id, { grid: { ...grid, ...patch } });
    // Cells no longer line up once the grid changes shape.
    if (focus && ('cols' in patch || 'rows' in patch || 'square' in patch)) exitFocus();
  };
  const setAdjust = (patch: Partial<Adjust>) => update(id, { adjust: { ...adjust, ...patch } });

  const exitFocus = () => {
    setFocus(null);
    view.reset();
  };

  const changeTab = (next: TabKey) => {
    if (tab === 'focus' && next !== 'focus' && focus) exitFocus();
    setTab(next);
  };

  const cellAt = (index: number): Cell => {
    const total = layout.cols * layout.rows;
    const wrapped = ((index % total) + total) % total;
    return { col: wrapped % layout.cols, row: Math.floor(wrapped / layout.cols) };
  };
  const indexOf = (cell: Cell) => cell.row * layout.cols + cell.col;

  const startFocus = () => {
    const total = layout.cols * layout.rows;
    let index = 0;
    while (index < total - 1 && done.includes(cellKey(cellAt(index).col, cellAt(index).row))) index++;
    selectCell(cellAt(index));
  };

  const toggleDone = () => {
    if (!focus) return;
    const key = cellKey(focus.col, focus.row);
    if (done.includes(key)) {
      update(id, { done: done.filter((k) => k !== key) });
      return;
    }
    success();
    update(id, { done: [...done, key] });
    selectCell(cellAt(indexOf(focus) + 1));
  };

  const replaceImage = async (work: () => Promise<ImageAsset | null>) => {
    setBusy(true);
    try {
      const next = await work();
      if (next) {
        update(id, { image: next, done: [] });
        setFocus(null);
        view.reset();
      }
    } catch (error) {
      toastError(error);
    } finally {
      setBusy(false);
    }
  };

  const paper = papers.find((p) => p.id === grid.paper) ?? papers[1];
  const paperW = paper.id === 'custom' ? grid.customW : paper.w;
  const paperH = paper.id === 'custom' ? grid.customH : paper.h;
  const paperShape = { key: 'paper', label: paper.id === 'custom' ? 'Your paper' : `${paper.label} paper`, ratio: Math.min(paperW, paperH) / Math.max(paperW, paperH) };

  const applyCrop = (area: CropRect) => {
    setCropping(false);
    if (area.width === W && area.height === H) return;
    replaceImage(() => cropImage(project.image, area));
  };

  const pickReplacement = async (source: ImageSource) => {
    setSheet(null);
    await afterSheetCloses();
    await replaceImage(async () => {
      const next = await pickImage(source);
      if (next) deleteImage(project.image);
      return next;
    });
  };

  const runExport = async (action: ExportAction) => {
    setSheet(null);
    if (!image) return;
    setBusy(true);
    try {
      await afterSheetCloses();
      const scene = (
        <GridScene
          image={image}
          width={W}
          height={H}
          adjust={adjust}
          grid={grid}
          layout={layout}
          strokeWidth={lineWidth / fitScale}
          font={font}
          labelSize={labelSize}
        />
      );
      const rendered = await drawAsImage(scene, { width: W, height: H });
      if (!rendered) throw new UserError('Could not make the image', 'Please try again.');
      toast(await exportImage(rendered, action, 'grid'));
    } catch (error) {
      toastError(error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {Platform.OS !== 'web' && <KeepAwake />}
      <EditorShell
        title={project.name}
        accent={colors.grid}
        tabs={tabs}
        tab={tab}
        onTab={changeTab}
        locked={locked}
        onLock={setLocked}
        onBack={() => router.back()}
        onExport={() => setSheet('export')}
        startCollapsed={reopened}
        busy={busy || !image}
        canvas={
          <EditorCanvas gesture={view.gesture} onWheel={view.zoomAt} onSize={setSize}>
            {image && size.width > 0 && (
              <Group transform={view.transform}>
                <Group transform={[{ translateX: fit.x }, { translateY: fit.y }, { scale: fit.scale }]}>
                  <GridScene
                    image={image}
                    width={W}
                    height={H}
                    adjust={adjust}
                    grid={grid}
                    layout={layout}
                    strokeWidth={strokeWidth}
                    font={font}
                    labelSize={labelSize}
                    done={tab === 'focus' ? done : undefined}
                    focus={focusing ? focus : null}
                  />
                </Group>
              </Group>
            )}
          </EditorCanvas>
        }>
        {tab === 'grid' && (
          <>
            <GridPanel grid={grid} layout={layout} onChange={setGrid} />
            <SizePanel grid={grid} layout={layout} image={project.image} onChange={setGrid} />
          </>
        )}
        {tab === 'style' && <StylePanel grid={grid} onChange={setGrid} />}
        {tab === 'image' && (
          <>
            <AdjustControls value={adjust} onChange={setAdjust} tint={colors.grid} />
            <Section title="Photo">
              <View style={{ flexDirection: 'row', gap: space.sm }}>
                <Button compact icon="crop-outline" label="Crop" onPress={() => setCropping(true)} style={{ flex: 1 }} />
                <Button compact icon="refresh-outline" label="Rotate" onPress={() => replaceImage(() => rotateImage(project.image))} style={{ flex: 1 }} />
                <Button compact icon="swap-horizontal" label="Flip" onPress={() => replaceImage(() => flipImage(project.image))} style={{ flex: 1 }} />
              </View>
              <Button compact variant="ghost" icon="image-outline" label="Replace photo" onPress={() => setSheet('replace')} />
            </Section>
          </>
        )}
        {tab === 'focus' && (
          <FocusPanel
            layout={layout}
            focus={focus}
            done={done}
            isDone={!!focus && done.includes(cellKey(focus.col, focus.row))}
            onStart={startFocus}
            onStep={(delta) => focus && selectCell(cellAt(indexOf(focus) + delta))}
            onToggleDone={toggleDone}
            onExit={exitFocus}
            onClear={() => update(id, { done: [] })}
          />
        )}
      </EditorShell>

      <Sheet visible={sheet === 'export'} onClose={() => setSheet(null)} title="Export" description="The photo with its grid at full resolution, ready to print or keep on a second screen.">
        {Platform.OS === 'web' ? (
          <OptionRow icon="download-outline" title="Download image" hint="Saves a JPEG to your downloads" tint={colors.grid} onPress={() => runExport('save')} />
        ) : (
          <>
            <OptionRow icon="download-outline" title="Save to Photos" hint="Keeps a copy in your photo library" tint={colors.grid} onPress={() => runExport('save')} />
            <OptionRow icon="share-outline" title="Share" hint="Send it, print it or open it in another app" tint={colors.grid} onPress={() => runExport('share')} />
          </>
        )}
      </Sheet>

      {cropping && image && (
        <CropView
          image={image}
          width={W}
          height={H}
          title="Crop photo"
          tint={colors.grid}
          shapes={[paperShape]}
          onCancel={() => setCropping(false)}
          onDone={applyCrop}
        />
      )}

      <SourceSheet
        visible={sheet === 'replace'}
        onClose={() => setSheet(null)}
        onPick={pickReplacement}
        title="Replace photo"
        description="Grid settings stay as they are. Focus progress starts over."
        tint={colors.grid}
      />
    </>
  );
}

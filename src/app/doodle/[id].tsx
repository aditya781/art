import { drawAsImage, Group, useImage } from '@shopify/react-native-skia';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import Animated, { FadeInDown, useDerivedValue, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { AdjustPanel, AlignPanel, BlendPanel, type AlignAction } from '@/components/doodle/doodle-panels';
import { DoodleScene } from '@/components/doodle/doodle-scene';
import { CropView, type CropRect } from '@/components/editor/crop-view';
import { EditorCanvas } from '@/components/editor/editor-canvas';
import { EditorShell, type EditorTab } from '@/components/editor/editor-shell';
import { KeepAwake } from '@/components/editor/keep-awake';
import { SourceSheet } from '@/components/editor/source-sheet';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/buttons';
import { Segmented } from '@/components/ui/segmented';
import { OptionRow } from '@/components/ui/option-row';
import { Sheet } from '@/components/ui/sheet';
import { makeStyles, radius, space, useColors, withAlpha } from '@/constants/theme';
import { useHydrated } from '@/hooks/use-hydrated';
import { fitContent, useViewTransform } from '@/hooks/use-view-transform';
import { exportImage, type ExportAction } from '@/lib/export';
import { flipQuad, mapPoint, placeQuad, rectToQuad, rotateQuad } from '@/lib/homography';
import { cropImage, deleteImage, imageUri, pickImage, type ImageSource } from '@/lib/images';
import { afterSheetCloses } from '@/lib/wait';
import { defaultLines, useProjects, type Adjust, type DoodleProject, type LineSettings } from '@/store/projects';
import { toast, toastError, UserError } from '@/store/toast';

type TabKey = 'align' | 'blend' | 'adjust';
type Mode = 'view' | 'align';

const tabs: EditorTab<TabKey>[] = [
  { key: 'align', label: 'Align', icon: 'cursor-move', activeIcon: 'cursor-move' },
  { key: 'blend', label: 'Blend', icon: 'layers-outline', activeIcon: 'layers' },
  { key: 'adjust', label: 'Adjust', icon: 'image-edit-outline', activeIcon: 'image-edit' },
];

/** Screen distance within which a touch grabs a corner dot or side bar. */
const CORNER_REACH = 30;
const unitQuad = [0, 0, 1, 0, 1, 1, 0, 1];

export default function DoodleEditorScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const hydrated = useHydrated();
  const project = useProjects((s) => s.projects.find((p) => p.id === id));

  if (!hydrated) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  if (!project || project.kind !== 'doodle') return <Redirect href="/" />;
  return <DoodleEditor project={project} />;
}

function DoodleEditor({ project }: { project: DoodleProject }) {
  const colors = useColors();
  const styles = useStyles();
  const update = useProjects((s) => s.update);
  const { id } = project;
  const { width: W, height: H } = project.doodle;
  const refW = project.reference?.width ?? 1;
  const refH = project.reference?.height ?? 1;

  const doodle = useImage(imageUri(project.doodle));
  const reference = useImage(project.reference ? imageUri(project.reference) : null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [tab, setTab] = useState<TabKey>('align');
  // A drawing made earlier is already set up, so it opens with the picture large and the settings tucked away.
  const [reopened] = useState(() => !!project.reference && Date.now() - project.createdAt > 60_000);
  const [mode, setMode] = useState<Mode>(project.reference ? 'view' : 'align');
  const [locked, setLocked] = useState(false);
  const [peek, setPeek] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState<'export' | 'reference' | 'doodle' | null>(null);
  const [cropping, setCropping] = useState<'reference' | 'doodle' | null>(null);

  const fit = fitContent(size.width, size.height, W, H);
  const fitScale = fit.scale;
  const fitX = fit.x;
  const fitY = fit.y;
  const view = useViewTransform({ width: size.width, height: size.height, enabled: !locked });
  const { scale, tx, ty } = view;

  const quad = useSharedValue<number[]>(project.quad ?? unitQuad);
  /** What a drag moves: -1 the whole picture, 0-3 one corner, 4-7 the side that starts at corner (n - 4). */
  const activeCorner = useSharedValue(-1);

  const matrix = useDerivedValue(() => rectToQuad(refW, refH, quad.get()), [refW, refH]);
  const corners = useDerivedValue(() => {
    const q = quad.get();
    return [
      { x: q[0], y: q[1] },
      { x: q[2], y: q[3] },
      { x: q[4], y: q[5] },
      { x: q[6], y: q[7] },
    ];
  });
  const outline = useDerivedValue(() => {
    const c = corners.get();
    return [c[0], c[1], c[2], c[3], c[0]];
  });
  const outlineWidth = useDerivedValue(() => 1.5 / (fitScale * scale.get()), [fitScale]);
  // Each side handle is a short bar lying along its side: two end points per side, drawn as a thick line.
  const edges = useDerivedValue(() => {
    const c = corners.get();
    const half = 8 / (fitScale * scale.get());
    const points: { x: number; y: number }[] = [];
    for (let i = 0; i < 4; i++) {
      const a = c[i];
      const b = c[(i + 1) % 4];
      const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const ux = ((b.x - a.x) / length) * half;
      const uy = ((b.y - a.y) / length) * half;
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      points.push({ x: mx - ux, y: my - uy }, { x: mx + ux, y: my + uy });
    }
    return points;
  }, [fitScale]);
  const edgeOuter = useDerivedValue(() => 10 / (fitScale * scale.get()), [fitScale]);
  const edgeInner = useDerivedValue(() => 5 / (fitScale * scale.get()), [fitScale]);
  const outerSize = useDerivedValue(() => 22 / (fitScale * scale.get()), [fitScale]);
  const innerSize = useDerivedValue(() => 13 / (fitScale * scale.get()), [fitScale]);

  const saveQuad = (next: number[]) => update(id, { quad: next });

  // Touch positions arrive in screen points; the quad lives in doodle-photo pixels.
  const move = Gesture.Pan()
    .enabled(!locked)
    .maxPointers(1)
    .onBegin((e) => {
      const k = fitScale * scale.get();
      const x = ((e.x - tx.get()) / scale.get() - fitX) / fitScale;
      const y = ((e.y - ty.get()) / scale.get() - fitY) / fitScale;
      const q = quad.get();
      let nearest = -1;
      let reach = CORNER_REACH / k;
      for (let i = 0; i < 4; i++) {
        const distance = Math.hypot(q[i * 2] - x, q[i * 2 + 1] - y);
        if (distance < reach) {
          reach = distance;
          nearest = i;
        }
      }
      // Corners win over sides when both are within reach.
      if (nearest === -1) {
        for (let i = 0; i < 4; i++) {
          const j = (i + 1) % 4;
          const distance = Math.hypot((q[i * 2] + q[j * 2]) / 2 - x, (q[i * 2 + 1] + q[j * 2 + 1]) / 2 - y);
          if (distance < reach) {
            reach = distance;
            nearest = i + 4;
          }
        }
      }
      activeCorner.set(nearest);
    })
    .onChange((e) => {
      const k = fitScale * scale.get();
      const dx = e.changeX / k;
      const dy = e.changeY / k;
      const q = quad.get().slice();
      const corner = activeCorner.get();
      for (let i = 0; i < 4; i++) {
        if (corner === -1 || corner === i || corner === i + 4 || corner === ((i + 3) % 4) + 4) {
          q[i * 2] += dx;
          q[i * 2 + 1] += dy;
        }
      }
      quad.set(q);
    })
    .onEnd(() => scheduleOnRN(saveQuad, quad.get()));

  const resize = Gesture.Pinch()
    .enabled(!locked)
    .onChange((e) => {
      if (e.numberOfPointers < 2) return;
      const fx = ((e.focalX - tx.get()) / scale.get() - fitX) / fitScale;
      const fy = ((e.focalY - ty.get()) / scale.get() - fitY) / fitScale;
      const q = quad.get().slice();
      for (let i = 0; i < 8; i += 2) {
        q[i] = fx + (q[i] - fx) * e.scaleChange;
        q[i + 1] = fy + (q[i + 1] - fy) * e.scaleChange;
      }
      quad.set(q);
    })
    .onEnd(() => scheduleOnRN(saveQuad, quad.get()));

  const turn = Gesture.Rotation()
    .enabled(!locked)
    .onChange((e) => {
      if (e.numberOfPointers < 2) return;
      const ax = ((e.anchorX - tx.get()) / scale.get() - fitX) / fitScale;
      const ay = ((e.anchorY - ty.get()) / scale.get() - fitY) / fitScale;
      const cos = Math.cos(e.rotationChange);
      const sin = Math.sin(e.rotationChange);
      const q = quad.get().slice();
      for (let i = 0; i < 8; i += 2) {
        const dx = q[i] - ax;
        const dy = q[i + 1] - ay;
        q[i] = ax + dx * cos - dy * sin;
        q[i + 1] = ay + dx * sin + dy * cos;
      }
      quad.set(q);
    })
    .onEnd(() => scheduleOnRN(saveQuad, quad.get()));

  const alignGesture = Gesture.Simultaneous(move, resize, turn);
  const aligning = mode === 'align' && !!project.reference && !locked;

  const applyQuad = (next: number[]) => {
    quad.set(withTiming(next, { duration: 260 }));
    saveQuad(next);
  };

  const onAlignAction = (action: AlignAction) => {
    const current = project.quad ?? placeQuad(refW, refH, W, H, 'contain', 0.8);
    if (action === 'fit') applyQuad(placeQuad(refW, refH, W, H, 'contain'));
    if (action === 'fill') applyQuad(placeQuad(refW, refH, W, H, 'cover'));
    if (action === 'reset') applyQuad(placeQuad(refW, refH, W, H, 'contain', 0.8));
    if (action === 'rotate') applyQuad(rotateQuad(current, Math.PI / 2));
    if (action === 'flip') applyQuad(flipQuad(current));
  };

  const changeTab = (next: TabKey) => {
    setTab(next);
    setMode(next === 'align' ? 'align' : 'view');
  };

  const pickLayer = async (layer: 'reference' | 'doodle', source: ImageSource) => {
    setSheet(null);
    setBusy(true);
    try {
      await afterSheetCloses();
      const next = await pickImage(source);
      if (!next) return;
      if (layer === 'reference') {
        if (project.reference) deleteImage(project.reference);
        const placed = placeQuad(next.width, next.height, W, H, 'contain', 0.8);
        quad.set(placed);
        update(id, { reference: next, quad: placed });
        setTab('align');
        setMode('align');
      } else {
        deleteImage(project.doodle);
        const placed = project.reference ? placeQuad(refW, refH, next.width, next.height, 'contain', 0.8) : null;
        if (placed) quad.set(placed);
        update(id, { doodle: next, quad: placed });
        view.reset();
      }
    } catch (error) {
      toastError(error);
    } finally {
      setBusy(false);
    }
  };

  /** Makes the reference the base photo and the doodle photo the overlay, each keeping its own adjustments. */
  const swapLayers = () => {
    const overlay = project.reference;
    if (!overlay) return;
    const placed = placeQuad(W, H, overlay.width, overlay.height, 'contain', 0.8);
    quad.set(placed);
    update(id, { doodle: overlay, reference: project.doodle, quad: placed, doodleAdjust: project.refAdjust, refAdjust: project.doodleAdjust });
    view.reset();
    toast('Pictures swapped');
  };

  const applyCrop = async (area: CropRect) => {
    const layer = cropping;
    setCropping(null);
    if (!layer) return;
    const current = project.quad ?? unitQuad;
    setBusy(true);
    try {
      if (layer === 'reference' && project.reference) {
        if (area.width === refW && area.height === refH) return;
        // The part that is kept stays exactly where it was on the doodle photo.
        const m = rectToQuad(refW, refH, current);
        const right = area.x + area.width;
        const bottom = area.y + area.height;
        const kept = [...mapPoint(m, area.x, area.y), ...mapPoint(m, right, area.y), ...mapPoint(m, right, bottom), ...mapPoint(m, area.x, bottom)];
        const next = await cropImage(project.reference, area);
        quad.set(kept);
        update(id, { reference: next, quad: kept });
      } else if (layer === 'doodle') {
        if (area.width === W && area.height === H) return;
        const next = await cropImage(project.doodle, area);
        const moved = project.reference ? current.map((v, i) => v - (i % 2 === 0 ? area.x : area.y)) : null;
        if (moved) quad.set(moved);
        update(id, { doodle: next, quad: moved });
        view.reset();
      }
    } catch (error) {
      toastError(error);
    } finally {
      setBusy(false);
    }
  };

  const lines = project.lines ?? defaultLines;
  const setLines = (patch: Partial<LineSettings>) => update(id, { lines: { ...lines, ...patch } });

  const referenceLayer = reference && project.reference ? { image: reference, width: refW, height: refH } : null;

  const runExport = async (action: ExportAction) => {
    setSheet(null);
    if (!doodle) return;
    setBusy(true);
    try {
      await afterSheetCloses();
      const scene = (
        <DoodleScene
          doodle={doodle}
          width={W}
          height={H}
          doodleAdjust={project.doodleAdjust}
          reference={referenceLayer}
          refAdjust={project.refAdjust}
          opacity={project.opacity}
          blend={project.blend}
          lines={lines}
          matrix={rectToQuad(refW, refH, project.quad ?? unitQuad)}
        />
      );
      const rendered = await drawAsImage(scene, { width: W, height: H });
      if (!rendered) throw new UserError('Could not make the image', 'Please try again.');
      toast(await exportImage(rendered, action, 'doodle-grid'));
    } catch (error) {
      toastError(error);
    } finally {
      setBusy(false);
    }
  };

  const setRefAdjust = (patch: Partial<Adjust>) => update(id, { refAdjust: { ...project.refAdjust, ...patch } });
  const setDoodleAdjust = (patch: Partial<Adjust>) => update(id, { doodleAdjust: { ...project.doodleAdjust, ...patch } });

  return (
    <>
      {Platform.OS !== 'web' && <KeepAwake />}
      <EditorShell
        title={project.name}
        accent={colors.doodle}
        tabs={tabs}
        tab={tab}
        onTab={changeTab}
        locked={locked}
        onLock={setLocked}
        onBack={() => router.back()}
        onExport={() => setSheet('export')}
        startCollapsed={reopened}
        busy={busy || !doodle || (!!project.reference && !reference)}
        overlay={
          project.reference && (
            <View style={styles.overlayRow}>
              <Segmented
                options={[
                  { value: 'view', label: 'Zoom & pan' },
                  { value: 'align', label: 'Move picture' },
                ]}
                value={mode}
                onChange={setMode}
                style={styles.modeSwitch}
              />
              {/* In reach straight after adding the pictures, for when they went in the wrong way round. */}
              <Button compact icon="swap-vertical" label="Swap" onPress={swapLayers} style={styles.swap} />
            </View>
          )
        }
        canvas={
          <>
            <EditorCanvas gesture={aligning ? alignGesture : view.gesture} onWheel={view.zoomAt} onSize={setSize}>
              {doodle && size.width > 0 && (
                <Group transform={view.transform}>
                  <Group transform={[{ translateX: fitX }, { translateY: fitY }, { scale: fitScale }]}>
                    <DoodleScene
                      doodle={doodle}
                      width={W}
                      height={H}
                      doodleAdjust={project.doodleAdjust}
                      reference={referenceLayer}
                      refAdjust={project.refAdjust}
                      opacity={peek ? 0 : project.opacity}
                      blend={project.blend}
                      lines={lines}
                      matrix={matrix}
                      handles={aligning ? { corners, edges, outline, outlineWidth, outerSize, innerSize, edgeOuter, edgeInner } : null}
                    />
                  </Group>
                </Group>
              )}
            </EditorCanvas>
            {!project.reference && doodle && !locked && !busy && (
              <View pointerEvents="box-none" style={styles.center}>
                <Animated.View entering={FadeInDown.duration(260).delay(120)} style={styles.prompt}>
                  <AppText variant="heading">Now add the picture you want to draw</AppText>
                  <AppText dim>It is laid over this photo so you can line it up with your doodles.</AppText>
                  <Button variant="primary" tint={colors.doodle} icon="image-outline" label="Add the picture to draw" onPress={() => setSheet('reference')} />
                </Animated.View>
              </View>
            )}
          </>
        }>
        {tab === 'align' && <AlignPanel hasReference={!!project.reference} onAction={onAlignAction} onCrop={() => setCropping('reference')} onReplace={() => setSheet('reference')} onSwap={swapLayers} />}
        {tab === 'blend' && (
          <BlendPanel
            opacity={project.opacity}
            blend={project.blend}
            lines={lines}
            onLines={setLines}
            onOpacity={(opacity) => update(id, { opacity })}
            onBlend={(blend) => update(id, { blend })}
            onPeek={setPeek}
          />
        )}
        {tab === 'adjust' && (
          <AdjustPanel project={project} onReference={setRefAdjust} onDoodle={setDoodleAdjust} onCropDoodle={() => setCropping('doodle')} onReplaceDoodle={() => setSheet('doodle')} />
        )}
      </EditorShell>

      <Sheet visible={sheet === 'export'} onClose={() => setSheet(null)} title="Export" description="Your doodle photo with the reference laid over it, exactly as aligned.">
        {Platform.OS === 'web' ? (
          <OptionRow icon="download-outline" title="Download image" hint="Saves a JPEG to your downloads" tint={colors.doodle} onPress={() => runExport('save')} />
        ) : (
          <>
            <OptionRow icon="download-outline" title="Save to Photos" hint="Keeps a copy in your photo library" tint={colors.doodle} onPress={() => runExport('save')} />
            <OptionRow icon="share-outline" title="Share" hint="Send it, print it or open it in another app" tint={colors.doodle} onPress={() => runExport('share')} />
          </>
        )}
      </Sheet>

      {cropping === 'reference' && reference && (
        <CropView image={reference} width={refW} height={refH} title="Crop reference" tint={colors.doodle} onCancel={() => setCropping(null)} onDone={applyCrop} />
      )}
      {cropping === 'doodle' && doodle && (
        <CropView image={doodle} width={W} height={H} title="Crop doodle photo" tint={colors.doodle} onCancel={() => setCropping(null)} onDone={applyCrop} />
      )}

      <SourceSheet
        visible={sheet === 'reference'}
        onClose={() => setSheet(null)}
        onPick={(source) => pickLayer('reference', source)}
        title={project.reference ? 'Replace the picture to draw' : 'The picture to draw'}
        description="The photo or artwork you want to draw or paint. It is laid over your doodle photo."
        tint={colors.doodle}
        libraryLabel="Choose picture"
      />
      <SourceSheet
        visible={sheet === 'doodle'}
        onClose={() => setSheet(null)}
        onPick={(source) => pickLayer('doodle', source)}
        title="Replace doodle photo"
        description="Photograph the whole surface straight on, with every doodle in view."
        tint={colors.doodle}
        libraryLabel="Choose doodle photo"
        libraryHint="A photo of your doodles you already took"
        cameraLabel="Photograph your doodles"
      />
    </>
  );
}

const useStyles = makeStyles((colors) => ({
  overlayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, maxWidth: '94%' },
  swap: { borderRadius: radius.pill, backgroundColor: withAlpha(colors.surface, 0.94) },
  modeSwitch: { width: 250, flexShrink: 1, backgroundColor: withAlpha(colors.surface, 0.94) },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  prompt: {
    maxWidth: 360,
    gap: space.md,
    padding: space.xl,
    borderRadius: radius.lg,
    backgroundColor: withAlpha(colors.surface, 0.96),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
}));

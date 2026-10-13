import { FillType, Group, Path, rect, RoundedRect, Skia, Text, type SkFont, type SkImage } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import type { SharedValue } from 'react-native-reanimated';

import { AdjustedImage } from '@/components/editor/adjusted-image';
import { sceneColors } from '@/constants/theme';
import { columnName, type GridLayout } from '@/lib/grid';
import type { Adjust, GridSettings } from '@/store/projects';

export type Cell = { col: number; row: number };

type Props = {
  image: SkImage;
  width: number;
  height: number;
  adjust: Adjust;
  grid: GridSettings;
  layout: GridLayout;
  /** Line width in image pixels; a shared value keeps lines the same thickness while zooming. */
  strokeWidth: number | SharedValue<number>;
  font: SkFont | null;
  labelSize: number;
  done?: string[];
  focus?: Cell | null;
};

const CHIP_HEIGHT = 1.55;

/** A dark rounded tag with white text, readable on any photo and any line colour. */
function LabelChip({ font, size, text, cx, cy }: { font: SkFont; size: number; text: string; cx: number; cy: number }) {
  // Summing glyph widths works on every platform; measureText is missing on web.
  const textWidth = font.getGlyphWidths(font.getGlyphIDs(text)).reduce((sum, w) => sum + w, 0);
  const h = size * CHIP_HEIGHT;
  const w = Math.max(h, textWidth + size * 0.9);
  return (
    <Group>
      <RoundedRect x={cx - w / 2} y={cy - h / 2} width={w} height={h} r={h / 2} color="rgba(12,12,15,0.68)" />
      <Text font={font} text={text} x={cx - textWidth / 2} y={cy + size * 0.35} color="#FFFFFF" />
    </Group>
  );
}

/** The photo with its grid, drawn in image pixels. Used on screen and for full-resolution export. */
export function GridScene({ image, width, height, adjust, grid, layout, strokeWidth, font, labelSize, done, focus }: Props) {
  const { xs, ys, cellW, cellH } = layout;

  const lines = useMemo(() => {
    const path = Skia.PathBuilder.Make();
    for (const x of xs.slice(1)) path.moveTo(x, 0).lineTo(x, height);
    for (const y of ys.slice(1)) path.moveTo(0, y).lineTo(width, y);
    path.addRect(rect(0, 0, width, height));
    return path.build();
  }, [xs, ys, width, height]);

  const diagonals = useMemo(() => {
    const path = Skia.PathBuilder.Make();
    for (const x of xs) {
      for (const y of ys) {
        path.moveTo(x, y).lineTo(x + cellW, y + cellH);
        path.moveTo(x + cellW, y).lineTo(x, y + cellH);
      }
    }
    return path.build();
  }, [xs, ys, cellW, cellH]);

  const donePath = useMemo(() => {
    const path = Skia.PathBuilder.Make();
    for (const key of done ?? []) {
      const [col, row] = key.split('-').map(Number);
      if (col < xs.length && row < ys.length) path.addRect(rect(xs[col], ys[row], cellW, cellH));
    }
    return path.build();
  }, [done, xs, ys, cellW, cellH]);

  const dimPath = useMemo(() => {
    if (!focus) return null;
    return Skia.PathBuilder.Make()
      .addRect(rect(0, 0, width, height))
      .addRect(rect(xs[focus.col] ?? 0, ys[focus.row] ?? 0, cellW, cellH))
      .setFillType(FillType.EvenOdd)
      .build();
  }, [focus, xs, ys, cellW, cellH, width, height]);

  const pad = labelSize * 0.3;
  const chipH = labelSize * CHIP_HEIGHT;

  return (
    <Group clip={rect(0, 0, width, height)}>
      <AdjustedImage image={image} width={width} height={height} adjust={adjust} />
      {done && done.length > 0 && <Path path={donePath} color={sceneColors.done} opacity={0.32} />}
      {grid.diagonals && (
        <Path path={diagonals} style="stroke" strokeWidth={strokeWidth} color={grid.color} opacity={grid.opacity * 0.55} />
      )}
      <Path path={lines} style="stroke" strokeWidth={strokeWidth} color={grid.color} opacity={grid.opacity} />
      {grid.labels && font && (
        <Group>
          {xs.map((x, i) => (
            <LabelChip key={`c${i}`} font={font} size={labelSize} text={columnName(i)} cx={x + cellW / 2} cy={pad + chipH / 2} />
          ))}
          {ys.map((y, i) => (
            <LabelChip key={`r${i}`} font={font} size={labelSize} text={String(i + 1)} cx={pad + chipH / 2} cy={y + cellH / 2} />
          ))}
        </Group>
      )}
      {dimPath && focus && (
        <>
          <Path path={dimPath} color="rgba(0,0,0,0.62)" />
          <Path
            path={Skia.Path.Rect(rect(xs[focus.col] ?? 0, ys[focus.row] ?? 0, cellW, cellH))}
            style="stroke"
            strokeWidth={strokeWidth}
            color={sceneColors.focus}
          />
        </>
      )}
    </Group>
  );
}

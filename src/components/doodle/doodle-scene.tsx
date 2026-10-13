import { Group, ImageShader, Points, Rect, rect, Shader, Skia, type SkImage, type SkPoint } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';

import { AdjustedImage } from '@/components/editor/adjusted-image';
import { sceneColors } from '@/constants/theme';
import { linesEffect } from '@/lib/shaders';
import type { Adjust, BlendId, LineSettings } from '@/store/projects';

/** The surface shown where the picture does not reach, chosen so the lines stay visible on it. */
const PAPER = '#FFFFFF';
const BOARD = '#17181C';

type LinesProps = { image: SkImage; width: number; height: number; lines: LineSettings };

/** Only the doodle marks, in one colour, with nothing behind them. */
function DoodleLines({ image, width, height, lines }: LinesProps) {
  return (
    <Rect x={0} y={0} width={width} height={height}>
      <Shader
        source={linesEffect()}
        uniforms={{
          reach: Math.max(width, height) * 0.025,
          threshold: 0.3 - lines.sensitivity * 0.27,
          light: lines.light ? 1 : 0,
          color: Array.from(Skia.Color(lines.color)),
        }}>
        <ImageShader image={image} fit="fill" tx="clamp" ty="clamp" rect={{ x: 0, y: 0, width, height }} />
      </Shader>
    </Rect>
  );
}

function isLight(color: string) {
  const [r, g, b] = Skia.Color(color);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.6;
}

export type Handles = {
  corners: SharedValue<SkPoint[]>;
  /** The two ends of the bar on each side. */
  edges: SharedValue<SkPoint[]>;
  outline: SharedValue<SkPoint[]>;
  outlineWidth: SharedValue<number>;
  outerSize: SharedValue<number>;
  innerSize: SharedValue<number>;
  edgeOuter: SharedValue<number>;
  edgeInner: SharedValue<number>;
};

type Props = {
  doodle: SkImage;
  width: number;
  height: number;
  doodleAdjust: Adjust;
  reference: { image: SkImage; width: number; height: number } | null;
  refAdjust: Adjust;
  opacity: number;
  blend: BlendId;
  lines: LineSettings;
  /** Maps the reference image onto its four corners in the doodle photo. */
  matrix: number[] | SharedValue<number[]>;
  handles?: Handles | null;
};

/** The doodle photo with the reference laid over it, drawn in the doodle photo's pixels. */
export function DoodleScene({ doodle, width, height, doodleAdjust, reference, refAdjust, opacity, blend, lines, matrix, handles }: Props) {
  return (
    <Group>
      <Group clip={rect(0, 0, width, height)}>
        {lines.on ? (
          <Rect x={0} y={0} width={width} height={height} color={isLight(lines.color) ? BOARD : PAPER} />
        ) : (
          <AdjustedImage image={doodle} width={width} height={height} adjust={doodleAdjust} />
        )}
        {reference && (
          <Group matrix={matrix}>
            <AdjustedImage
              image={reference.image}
              width={reference.width}
              height={reference.height}
              adjust={refAdjust}
              opacity={opacity}
              blendMode={lines.on ? 'srcOver' : blend}
            />
          </Group>
        )}
        {lines.on && <DoodleLines image={doodle} width={width} height={height} lines={lines} />}
      </Group>
      {reference && handles && (
        <>
          <Points points={handles.outline} mode="polygon" style="stroke" strokeWidth={handles.outlineWidth} color={sceneColors.handle} />
          <Points points={handles.edges} mode="lines" strokeCap="round" strokeWidth={handles.edgeOuter} color="#FFFFFF" />
          <Points points={handles.edges} mode="lines" strokeCap="round" strokeWidth={handles.edgeInner} color={sceneColors.handle} />
          <Points points={handles.corners} mode="points" strokeCap="round" strokeWidth={handles.outerSize} color="#FFFFFF" />
          <Points points={handles.corners} mode="points" strokeCap="round" strokeWidth={handles.innerSize} color={sceneColors.handle} />
        </>
      )}
    </Group>
  );
}

import { ImageShader, Rect, Shader, type SkImage } from '@shopify/react-native-skia';

import { adjustEffect } from '@/lib/shaders';
import type { Adjust, BlendId } from '@/store/projects';

/** Cubic resampling: sharp when zoomed in, no shimmer when the photo is shown smaller than its pixels. */
const MITCHELL = { B: 1 / 3, C: 1 / 3 };

type Props = {
  image: SkImage;
  width: number;
  height: number;
  adjust: Adjust;
  opacity?: number;
  blendMode?: BlendId;
};

/** Draws an image at (0,0) with the brightness, contrast, saturation and tone-step adjustments applied. */
export function AdjustedImage({ image, width, height, adjust, opacity = 1, blendMode = 'srcOver' }: Props) {
  return (
    <Rect x={0} y={0} width={width} height={height} opacity={opacity} blendMode={blendMode}>
      <Shader
        source={adjustEffect()}
        uniforms={{
          brightness: adjust.brightness,
          contrast: adjust.contrast,
          saturation: adjust.saturation,
          tones: adjust.tones,
        }}>
        <ImageShader
          image={image}
          fit="fill"
          tx="clamp"
          ty="clamp"
          rect={{ x: 0, y: 0, width, height }}
          sampling={MITCHELL}
        />
      </Shader>
    </Rect>
  );
}

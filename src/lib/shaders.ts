import { Skia, type SkRuntimeEffect } from '@shopify/react-native-skia';

const source = `
uniform shader image;
uniform float brightness;
uniform float contrast;
uniform float saturation;
uniform float tones;

half4 main(float2 xy) {
  half4 c = image.eval(xy);
  float3 rgb = c.rgb;
  float gain = 1.0 + contrast * (contrast > 0.0 ? 1.2 : 1.0);
  rgb = (rgb - 0.5) * gain + 0.5 + brightness * 0.5;
  float luma = dot(rgb, float3(0.2126, 0.7152, 0.0722));
  rgb = mix(float3(luma), rgb, 1.0 + saturation);
  rgb = clamp(rgb, 0.0, 1.0);
  if (tones > 1.5) {
    rgb = min(floor(rgb * tones), float3(tones - 1.0)) / (tones - 1.0);
  }
  return half4(rgb * c.a, c.a);
}`;

let effect: SkRuntimeEffect | null = null;

/** Brightness, contrast, saturation and tone steps in one pass. Built on first use, after Skia has loaded on web. */
export function adjustEffect() {
  if (!effect) effect = Skia.RuntimeEffect.Make(source);
  if (!effect) throw new Error('Could not compile the image adjustment shader');
  return effect;
}

const linesSource = `
uniform shader image;
uniform float reach;
uniform float threshold;
uniform float light;
uniform float4 color;

float luma(float2 xy) {
  return dot(image.eval(xy).rgb, float3(0.2126, 0.7152, 0.0722));
}

half4 main(float2 xy) {
  // The surface brightness around this spot, so shadows and uneven light are not taken for lines.
  float around = 0.0;
  for (int i = 0; i < 8; i++) {
    float a = float(i) * 0.7853982;
    float2 dir = float2(cos(a), sin(a));
    around += luma(xy + dir * reach) + luma(xy + dir.yx * float2(-1.0, 1.0) * reach * 0.5);
  }
  around /= 16.0;
  float diff = around - luma(xy);
  if (light > 0.5) diff = -diff;
  float a = smoothstep(threshold, threshold + 0.05, diff) * color.a;
  return half4(color.rgb * a, a);
}`;

let lines: SkRuntimeEffect | null = null;

/** Keeps the marks that stand out from the surface around them and makes everything else transparent. */
export function linesEffect() {
  if (!lines) lines = Skia.RuntimeEffect.Make(linesSource);
  if (!lines) throw new Error('Could not compile the line shader');
  return lines;
}

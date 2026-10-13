export type PaperId = 'a5' | 'a4' | 'a3' | 'a2' | 'letter' | 'custom';
export type Unit = 'cm' | 'in';

/** Portrait sizes in centimetres. */
export const papers: { id: PaperId; label: string; w: number; h: number }[] = [
  { id: 'a5', label: 'A5', w: 14.8, h: 21 },
  { id: 'a4', label: 'A4', w: 21, h: 29.7 },
  { id: 'a3', label: 'A3', w: 29.7, h: 42 },
  { id: 'a2', label: 'A2', w: 42, h: 59.4 },
  { id: 'letter', label: 'Letter', w: 21.59, h: 27.94 },
  { id: 'custom', label: 'Custom', w: 0, h: 0 },
];

export const CM_PER_INCH = 2.54;

export function formatLength(cm: number, unit: Unit) {
  const v = unit === 'cm' ? cm : cm / CM_PER_INCH;
  return `${v.toFixed(v >= 100 ? 0 : v >= 10 ? 1 : 2)} ${unit}`;
}

/**
 * Largest area with the image's proportions that fits the paper. The paper is turned to match the
 * image, so a landscape photo uses the sheet in landscape.
 */
export function drawArea(paperW: number, paperH: number, imageW: number, imageH: number) {
  const landscape = imageW > imageH;
  const long = Math.max(paperW, paperH);
  const short = Math.min(paperW, paperH);
  const pw = landscape ? long : short;
  const ph = landscape ? short : long;
  const aspect = imageW / imageH;
  const w = Math.min(pw, ph * aspect);
  return { w, h: w / aspect };
}

/**
 * 3×3 matrix (row-major) that maps the rectangle (0,0)-(w,h) onto the quad
 * [x0,y0, x1,y1, x2,y2, x3,y3] given as top-left, top-right, bottom-right, bottom-left.
 */
export function rectToQuad(w: number, h: number, q: number[]): number[] {
  'worklet';
  const [x0, y0, x1, y1, x2, y2, x3, y3] = q;
  const dx1 = x1 - x2;
  const dx2 = x3 - x2;
  const dy1 = y1 - y2;
  const dy2 = y3 - y2;
  const sx = x0 - x1 + x2 - x3;
  const sy = y0 - y1 + y2 - y3;
  const den = dx1 * dy2 - dy1 * dx2;
  const g = Math.abs(den) < 1e-9 ? 0 : (sx * dy2 - sy * dx2) / den;
  const k = Math.abs(den) < 1e-9 ? 0 : (dx1 * sy - dy1 * sx) / den;
  const a = x1 - x0 + g * x1;
  const b = x3 - x0 + k * x3;
  const d = y1 - y0 + g * y1;
  const e = y3 - y0 + k * y3;
  return [a / w, b / h, x0, d / w, e / h, y0, g / w, k / h, 1];
}

/** Where a 3×3 matrix (row-major) sends the point (x, y). */
export function mapPoint(m: number[], x: number, y: number) {
  const w = m[6] * x + m[7] * y + m[8] || 1;
  return [(m[0] * x + m[1] * y + m[2]) / w, (m[3] * x + m[4] * y + m[5]) / w];
}

export function quadCenter(q: number[]) {
  'worklet';
  return { x: (q[0] + q[2] + q[4] + q[6]) / 4, y: (q[1] + q[3] + q[5] + q[7]) / 4 };
}

/** Places a w×h image centred inside a W×H frame, scaled by `fill` of the contain (or cover) size. */
export function placeQuad(w: number, h: number, W: number, H: number, mode: 'contain' | 'cover', fill = 1) {
  const s = (mode === 'contain' ? Math.min(W / w, H / h) : Math.max(W / w, H / h)) * fill;
  const x = (W - w * s) / 2;
  const y = (H - h * s) / 2;
  return [x, y, x + w * s, y, x + w * s, y + h * s, x, y + h * s];
}

export function rotateQuad(q: number[], radians: number) {
  const c = quadCenter(q);
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const out: number[] = [];
  for (let i = 0; i < 8; i += 2) {
    const dx = q[i] - c.x;
    const dy = q[i + 1] - c.y;
    out.push(c.x + dx * cos - dy * sin, c.y + dx * sin + dy * cos);
  }
  return out;
}

/** Mirrors the image left-to-right without moving its outline. */
export function flipQuad(q: number[]) {
  return [q[2], q[3], q[0], q[1], q[6], q[7], q[4], q[5]];
}

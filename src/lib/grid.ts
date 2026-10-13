import type { GridSettings } from '@/store/projects';

export type GridLayout = {
  cols: number;
  rows: number;
  cellW: number;
  cellH: number;
  /** Left edge of each column. */
  xs: number[];
  /** Top edge of each row. */
  ys: number[];
};

/** With square cells the column count sets the cell size and the last row may be cut short. */
export function computeGrid(width: number, height: number, grid: GridSettings): GridLayout {
  const cols = Math.max(1, Math.round(grid.cols));
  const cellW = width / cols;
  const cellH = grid.square ? cellW : height / Math.max(1, Math.round(grid.rows));
  const rows = Math.max(1, Math.ceil(height / cellH - 1e-6));
  return {
    cols,
    rows,
    cellW,
    cellH,
    xs: Array.from({ length: cols }, (_, i) => i * cellW),
    ys: Array.from({ length: rows }, (_, i) => i * cellH),
  };
}

/** A, B … Z, AA, AB … */
export function columnName(index: number) {
  let n = index;
  let name = '';
  do {
    name = String.fromCharCode(65 + (n % 26)) + name;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return name;
}

export const cellKey = (col: number, row: number) => `${col}-${row}`;
export const cellName = (col: number, row: number) => `${columnName(col)}${row + 1}`;

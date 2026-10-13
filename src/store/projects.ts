import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

import type { PaperId, Unit } from '@/lib/paper';

export type ImageAsset = { uri: string; width: number; height: number };

export type Adjust = {
  /** -1..1 */
  brightness: number;
  /** -1..1 */
  contrast: number;
  /** -1..1, -1 is black & white */
  saturation: number;
  /** Number of tonal steps for a value study; 0 turns it off. */
  tones: number;
};

export type GridSettings = {
  cols: number;
  rows: number;
  square: boolean;
  lineWidth: number;
  color: string;
  opacity: number;
  diagonals: boolean;
  labels: boolean;
  paper: PaperId;
  unit: Unit;
  customW: number;
  customH: number;
};

/** Corner points of the reference image on the doodle photo: TL, TR, BR, BL as x,y pairs. */
export type Quad = number[];

export type BlendId = 'srcOver' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten' | 'difference';

/** Shows only the doodle marks, with the wall or paper behind them removed. */
export type LineSettings = {
  on: boolean;
  /** 0..1, how faint a mark may be and still count as a line. */
  sensitivity: number;
  /** Chalk or paint lighter than the surface, instead of dark marks on a light surface. */
  light: boolean;
  color: string;
};

type Base = { id: string; name: string; createdAt: number; updatedAt: number };

export type GridProject = Base & {
  kind: 'grid';
  image: ImageAsset;
  adjust: Adjust;
  grid: GridSettings;
  /** Finished cells in focus mode, stored as "col-row". */
  done: string[];
};

export type DoodleProject = Base & {
  kind: 'doodle';
  doodle: ImageAsset;
  reference: ImageAsset | null;
  quad: Quad | null;
  opacity: number;
  blend: BlendId;
  doodleAdjust: Adjust;
  refAdjust: Adjust;
  /** Missing on drawings saved before this setting existed. */
  lines?: LineSettings;
};

export type Project = GridProject | DoodleProject;

export const defaultAdjust: Adjust = { brightness: 0, contrast: 0, saturation: 0, tones: 0 };

export const defaultLines: LineSettings = { on: false, sensitivity: 0.6, light: false, color: '#111111' };

export const defaultGrid: GridSettings = {
  cols: 6,
  rows: 8,
  square: true,
  lineWidth: 1.5,
  color: '#FFFFFF',
  opacity: 0.9,
  diagonals: false,
  labels: true,
  paper: 'a4',
  unit: 'cm',
  customW: 30,
  customH: 40,
};

type State = {
  projects: Project[];
  createGrid: (image: ImageAsset) => string;
  createDoodle: (doodle: ImageAsset) => string;
  update: (id: string, patch: Partial<GridProject> | Partial<DoodleProject>) => void;
  remove: (id: string) => void;
};

const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const dateLabel = () => new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

/** Sliders update the store every frame, so writes to disk are batched. */
function debounced(storage: StateStorage, delay = 400): StateStorage {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return {
    getItem: (name) => storage.getItem(name),
    removeItem: (name) => storage.removeItem(name),
    setItem: (name, value) => {
      clearTimeout(timer);
      timer = setTimeout(() => storage.setItem(name, value), delay);
    },
  };
}

// Web keeps picked images as in-memory URLs that do not survive a reload, so projects stay in memory there.
const memory = new Map<string, string>();
const memoryStorage: StateStorage = {
  getItem: (name) => memory.get(name) ?? null,
  setItem: (name, value) => void memory.set(name, value),
  removeItem: (name) => void memory.delete(name),
};

export const useProjects = create<State>()(
  persist(
    (set) => ({
      projects: [],
      createGrid: (image) => {
        const id = newId();
        const now = Date.now();
        const project: GridProject = {
          id,
          kind: 'grid',
          name: `Grid · ${dateLabel()}`,
          createdAt: now,
          updatedAt: now,
          image,
          adjust: defaultAdjust,
          grid: { ...defaultGrid, cols: image.width > image.height ? 8 : 6 },
          done: [],
        };
        set((s) => ({ projects: [project, ...s.projects] }));
        return id;
      },
      createDoodle: (doodle) => {
        const id = newId();
        const now = Date.now();
        const project: DoodleProject = {
          id,
          kind: 'doodle',
          name: `Doodle · ${dateLabel()}`,
          createdAt: now,
          updatedAt: now,
          doodle,
          reference: null,
          quad: null,
          opacity: 0.55,
          blend: 'srcOver',
          doodleAdjust: defaultAdjust,
          refAdjust: defaultAdjust,
        };
        set((s) => ({ projects: [project, ...s.projects] }));
        return id;
      },
      update: (id, patch) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id ? ({ ...p, ...patch, updatedAt: Date.now() } as Project) : p,
          ),
        })),
      remove: (id) => set((s) => ({ projects: s.projects.filter((p) => p.id !== id) })),
    }),
    {
      name: 'gridsketch-projects',
      version: 1,
      storage: createJSONStorage(() => (Platform.OS === 'web' ? memoryStorage : debounced(AsyncStorage))),
      partialize: (s) => ({ projects: s.projects }),
    },
  ),
);

export function projectImages(project: Project): ImageAsset[] {
  if (project.kind === 'grid') return [project.image];
  return project.reference ? [project.doodle, project.reference] : [project.doodle];
}

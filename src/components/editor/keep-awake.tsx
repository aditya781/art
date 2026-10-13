import { useKeepAwake } from 'expo-keep-awake';

/** Keeps the screen on while mounted, so the reference does not go dark mid-drawing. */
export function KeepAwake() {
  useKeepAwake();
  return null;
}

import { useSyncExternalStore } from 'react';

import { useProjects } from '@/store/projects';

/** True once saved projects have been read from disk. */
export function useHydrated() {
  return useSyncExternalStore(
    (onChange) => useProjects.persist.onFinishHydration(onChange),
    () => useProjects.persist.hasHydrated(),
    () => false,
  );
}

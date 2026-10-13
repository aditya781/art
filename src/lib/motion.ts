import { Platform } from 'react-native';

/**
 * Use for every `exiting` prop. On web Reanimated plays exit animations by moving copies of DOM
 * nodes around, which can collide with React updating the same parent and crash the page, so
 * views simply disappear there. Native plays the animation.
 */
export function exit<T>(animation: T): T | undefined {
  return Platform.OS === 'web' ? undefined : animation;
}

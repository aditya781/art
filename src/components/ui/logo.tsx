import { Image } from 'expo-image';

/** The GridSketch mark: a pencil portrait in an instant photo, under a drawing grid, with a pencil. */
export function Logo({ size = 42 }: { size?: number }) {
  return <Image source={require('@/assets/images/logo.png')} style={{ width: size, height: size }} contentFit="contain" accessibilityLabel="GridSketch" />;
}

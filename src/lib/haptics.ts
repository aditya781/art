import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export function tick() {
  if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
}

export function thud() {
  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

export function success() {
  if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

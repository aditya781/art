// Each piece is imported by itself on purpose. The package's main entry also starts push-token
// registration, which throws in Expo Go on Android; local reminders need none of it.
import { cancelAllScheduledNotificationsAsync } from 'expo-notifications/build/cancelAllScheduledNotificationsAsync';
import { AndroidImportance, AndroidNotificationVisibility } from 'expo-notifications/build/NotificationChannelManager.types';
import { getPermissionsAsync, requestPermissionsAsync } from 'expo-notifications/build/NotificationPermissions';
import { SchedulableTriggerInputTypes } from 'expo-notifications/build/Notifications.types';
import { setNotificationHandler } from 'expo-notifications/build/NotificationsHandler';
import { scheduleNotificationAsync } from 'expo-notifications/build/scheduleNotificationAsync';
import { setNotificationChannelAsync } from 'expo-notifications/build/setNotificationChannelAsync';
import { Platform } from 'react-native';

import type { Project } from '@/store/projects';

/** Reminders are scheduled on the phone itself, so they need no server. Browsers have no equivalent. */
export const remindersSupported = Platform.OS !== 'web';

const CHANNEL = 'reminders';

/**
 * When to remind, counted from the last time the app was open: the next evening, then less and
 * less often, then not at all. Someone who has been away for two weeks does not want a daily nudge.
 */
const SLOTS = [
  { days: 1, hour: 18, minute: 30 },
  { days: 3, hour: 18, minute: 30 },
  { days: 7, hour: 11, minute: 0 },
  { days: 14, hour: 11, minute: 0 },
];

/** What the drawings look like right now, reduced to what a reminder needs. A string, so it is cheap to compare. */
export type ReminderTarget = string;

type Target =
  | { state: 'none' }
  | { state: 'finished' }
  | { state: 'grid'; id: string; name: string; done: number; total: number }
  | { state: 'doodle'; id: string; name: string };

type Planned = { title: string; body: string; data: Record<string, string> };

/** The most recent drawing that still has work left, or why there is none. */
export function reminderTarget(projects: Project[]): ReminderTarget {
  const sorted = [...projects].sort((a, b) => b.updatedAt - a.updatedAt);
  let target: Target = sorted.length ? { state: 'finished' } : { state: 'none' };
  for (const project of sorted) {
    if (project.kind === 'doodle') {
      target = { state: 'doodle', id: project.id, name: project.name };
      break;
    }
    const total = project.grid.cols * project.grid.rows;
    if (project.done.length < total) {
      target = { state: 'grid', id: project.id, name: project.name, done: project.done.length, total };
      break;
    }
  }
  return JSON.stringify(target);
}

/** The wording changes with each reminder, so the second one is not a copy of the first. */
function message(target: Target, turn: number): Planned {
  if (target.state === 'none') {
    const lines = [
      ['Draw something today', 'Pick a photo and start with a single square.'],
      ['Your first drawing is one photo away', 'Choose a picture you like and GridSketch does the measuring.'],
    ];
    const [title, body] = lines[turn % lines.length];
    return { title, body, data: {} };
  }
  if (target.state === 'finished') {
    const lines = [
      ['Ready for a new drawing?', 'You finished your last one. Pick the next photo.'],
      ['What will you draw next?', 'A new photo, a fresh grid, one square at a time.'],
    ];
    const [title, body] = lines[turn % lines.length];
    return { title, body, data: {} };
  }
  const { id, name } = target;
  if (target.state === 'doodle') {
    const lines = [
      [`${name} is waiting`, 'Open your doodle grid and carry on where you stopped.'],
      ['Back to the wall?', `${name} is set up and ready when you are.`],
    ];
    const [title, body] = lines[turn % lines.length];
    return { title, body, data: { kind: 'doodle', id } };
  }
  const left = target.total - target.done;
  const percent = Math.round((target.done / target.total) * 100);
  const squares = left === 1 ? 'square' : 'squares';
  let lines: string[][];
  if (target.done === 0) {
    lines = [
      [`${name} is ready`, 'Start with the first square. One is enough for today.'],
      ['Pick up your pencil', `${name} is gridded and waiting for its first square.`],
    ];
  } else if (left <= 3) {
    lines = [
      ['Almost there', `Only ${left} ${squares} left on ${name}.`],
      [`${name} is nearly finished`, `${left} more ${squares} and it is done.`],
    ];
  } else {
    lines = [
      [`${name}: ${target.done} of ${target.total} squares done`, 'Ready for the next one?'],
      [`${left} squares left on ${name}`, 'A few squares today keeps it moving.'],
      ['Pick up your pencil', `${name} is ${percent}% done. Carry on where you stopped.`],
    ];
  }
  const [title, body] = lines[turn % lines.length];
  return { title, body, data: { kind: 'grid', id } };
}

/** Call once at startup. Without a handler, a reminder that fires while the app is open is dropped. */
export function initReminders() {
  if (!remindersSupported) return;
  setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
}

/**
 * Makes sure the app's own Android channel exists and returns its id. Expo Go cannot create channels,
 * so there (and on iOS, which has none) this returns undefined and Android falls back to its default channel.
 */
async function ensureChannel(): Promise<string | undefined> {
  if (Platform.OS !== 'android') return undefined;
  try {
    // Android 13 only shows its permission prompt once a channel exists.
    await setNotificationChannelAsync(CHANNEL, {
      name: 'Drawing reminders',
      importance: AndroidImportance.DEFAULT,
      lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
    });
    return CHANNEL;
  } catch {
    return undefined;
  }
}

/** Asks for permission if it has not been decided yet. Returns whether notifications can be shown. */
export async function allowReminders(): Promise<boolean> {
  if (!remindersSupported) return false;
  await ensureChannel();
  const current = await getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await requestPermissionsAsync()).granted;
}

/**
 * Replaces everything that is scheduled. Called whenever the app comes to the front or a drawing
 * changes, so every reminder counts from the last visit: someone who drew today hears nothing today.
 */
export async function syncReminders(on: boolean, target: ReminderTarget) {
  if (!remindersSupported) return;
  try {
    await cancelAllScheduledNotificationsAsync();
    if (!on) return;
    if (!(await getPermissionsAsync()).granted) return;
    const channelId = await ensureChannel();
    const parsed = JSON.parse(target) as Target;
    // Starting from a different line each day keeps the first reminder from always being the same one.
    const start = Math.floor(Date.now() / 86_400_000);
    for (const [index, slot] of SLOTS.entries()) {
      const date = new Date();
      date.setDate(date.getDate() + slot.days);
      date.setHours(slot.hour, slot.minute, 0, 0);
      const { title, body, data } = message(parsed, start + index);
      await scheduleNotificationAsync({ content: { title, body, data }, trigger: { type: SchedulableTriggerInputTypes.DATE, date, channelId } });
    }
  } catch {
    // A reminder that could not be scheduled is not worth interrupting the artist for.
  }
}

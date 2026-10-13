import { addNotificationResponseReceivedListener, clearLastNotificationResponse, getLastNotificationResponse } from 'expo-notifications/build/NotificationsEmitter';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { allowReminders, remindersSupported, reminderTarget, syncReminders } from '@/lib/reminders';
import { useProjects } from '@/store/projects';
import { useSettings } from '@/store/settings';

/** Keeps the phone's scheduled reminders in step with the switch and the most recent drawing. */
export function useReminders() {
  const on = useSettings((s) => s.reminders.on);
  // A string, so this only changes when the reminder's wording would, not on every slider move in an editor.
  const target = useProjects((s) => reminderTarget(s.projects));

  useEffect(() => {
    syncReminders(on, target);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncReminders(on, target);
    });
    return () => subscription.remove();
  }, [on, target]);
}

/** Opens the drawing a reminder was about. Drawings load from storage a moment after launch, so this waits for them. */
async function openDrawing(data: Record<string, unknown> | undefined) {
  const { kind, id } = data ?? {};
  if (typeof id !== 'string' || (kind !== 'grid' && kind !== 'doodle')) return;
  if (!useProjects.persist.hasHydrated()) {
    await new Promise<void>((resolve) => useProjects.persist.onFinishHydration(() => resolve()));
  }
  // The drawing may have been deleted since the reminder was scheduled; the home screen is the right place then.
  if (!useProjects.getState().projects.some((p) => p.id === id)) return;
  router.push({ pathname: kind === 'grid' ? '/grid/[id]' : '/doodle/[id]', params: { id } });
}

/** Tapping a reminder goes straight to its drawing, whether the app was open, in the background or closed. */
export function useReminderTaps(ready: boolean) {
  useEffect(() => {
    if (!ready || !remindersSupported) return;
    try {
      // Set when the tap is what started the app.
      const launch = getLastNotificationResponse();
      if (launch) {
        clearLastNotificationResponse();
        openDrawing(launch.notification.request.content.data);
      }
      const subscription = addNotificationResponseReceivedListener((response) => {
        clearLastNotificationResponse();
        openDrawing(response.notification.request.content.data);
      });
      return () => subscription.remove();
    } catch {
      // Without this the reminder still arrives; it just opens the home screen.
    }
  }, [ready]);
}

/**
 * Reminders are on unless the user turns them off, so the phone's permission question is asked once,
 * on first launch, after the opening animation. A "no" switches reminders off rather than leaving a
 * switch that says on while nothing can arrive.
 */
export function useReminderPermission(ready: boolean) {
  useEffect(() => {
    if (!ready || !remindersSupported) return;
    let cancelled = false;
    const ask = async () => {
      if (!useSettings.persist.hasHydrated()) {
        await new Promise<void>((resolve) => useSettings.persist.onFinishHydration(() => resolve()));
      }
      const { reminders, setReminders } = useSettings.getState();
      if (cancelled || reminders.asked || !reminders.on) return;
      try {
        setReminders({ asked: true, on: await allowReminders() });
      } catch {
        // Asking failed, which is not an answer; the switch in Settings asks again.
        setReminders({ asked: true, on: false });
      }
    };
    ask();
    return () => {
      cancelled = true;
    };
  }, [ready]);
}

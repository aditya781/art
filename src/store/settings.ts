import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark';

export type ReminderSettings = {
  /** The only choice the user makes. When and what to remind about is decided by the app. */
  on: boolean;
  /** Whether the phone's permission question has been put to the user yet. It is asked once, on first launch. */
  asked: boolean;
};

type Settings = {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  reminders: ReminderSettings;
  setReminders: (patch: Partial<ReminderSettings>) => void;
};

export const useSettings = create<Settings>()(
  persist(
    (set) => ({
      themeMode: 'dark',
      setThemeMode: (themeMode) => set({ themeMode }),
      reminders: { on: true, asked: false },
      setReminders: (patch) => set((s) => ({ reminders: { ...s.reminders, ...patch } })),
    }),
    {
      name: 'gridsketch-settings',
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
      // Reminders became on by default in version 2, so anything saved earlier starts from that default.
      migrate: (saved) => ({ ...(saved as Settings), reminders: { on: true, asked: false } }),
    },
  ),
);

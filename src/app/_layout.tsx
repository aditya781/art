// Each weight is imported from its own folder: the package's main entry would bundle all nine.
import { Outfit_400Regular } from '@expo-google-fonts/outfit/400Regular';
import { Outfit_500Medium } from '@expo-google-fonts/outfit/500Medium';
import { Outfit_600SemiBold } from '@expo-google-fonts/outfit/600SemiBold';
import { Outfit_700Bold } from '@expo-google-fonts/outfit/700Bold';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { enableFreeze } from 'react-native-screens';

import { SplashOverlay } from '@/components/ui/splash-overlay';
import { ToastHost } from '@/components/ui/toast-host';
import { useColors, useThemeName } from '@/constants/theme';
import { useReminderPermission, useReminders, useReminderTaps } from '@/hooks/use-reminders';
import { initReminders } from '@/lib/reminders';

SplashScreen.preventAutoHideAsync();
initReminders();

// Screens under the current one stop re-rendering, so the home list is not rebuilt on every slider move in an editor.
enableFreeze(true);

export default function RootLayout() {
  const colors = useColors();
  const dark = useThemeName() === 'dark';
  const base = dark ? DarkTheme : DefaultTheme;
  const theme = {
    ...base,
    colors: { ...base.colors, background: colors.bg, card: colors.bg, primary: colors.accent, text: colors.text, border: colors.border },
  };
  useReminders();
  const [loaded, error] = useFonts({ Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold });

  useReminderTaps(loaded || Boolean(error));
  const [splashDone, setSplashDone] = useState(false);
  useReminderPermission(splashDone);

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ThemeProvider value={theme}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
          <Stack.Screen name="index" />
          {/* Swipe-back would fight with panning the canvas. */}
          <Stack.Screen name="grid/[id]" options={{ gestureEnabled: false }} />
          <Stack.Screen name="doodle/[id]" options={{ gestureEnabled: false }} />
        </Stack>
        <ToastHost />
        <SplashOverlay onDone={() => setSplashDone(true)} />
        <StatusBar style={dark ? 'light' : 'dark'} />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

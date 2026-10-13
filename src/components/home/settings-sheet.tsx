import Constants from 'expo-constants';
import { useState } from 'react';
import { Linking, Platform, Share, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/buttons';
import { OptionRow } from '@/components/ui/option-row';
import { Sheet } from '@/components/ui/sheet';
import { ToggleRow } from '@/components/ui/toggle';
import { makeStyles, radius, space, useColors } from '@/constants/theme';
import { allowReminders, remindersSupported } from '@/lib/reminders';
import { useSettings } from '@/store/settings';
import { toastError } from '@/store/toast';

const APP_ID = 'com.adityasonawane.gridsketch';
const STORE_PAGE = `https://play.google.com/store/apps/details?id=${APP_ID}`;

type Props = { visible: boolean; onClose: () => void; onPrivacy: () => void };

/** Reminders on or off, sharing and rating the app, and where to read what it does with the user's data. */
export function SettingsSheet({ visible, onClose, onPrivacy }: Props) {
  const colors = useColors();
  const styles = useStyles();
  const on = useSettings((s) => s.reminders.on);
  const setReminders = useSettings((s) => s.setReminders);
  const [blocked, setBlocked] = useState(false);

  // Permission is asked for at the moment reminders are switched on, when the reason is obvious.
  const turn = async (next: boolean) => {
    if (!next) return setReminders({ on: false, asked: true });
    try {
      if (await allowReminders()) {
        setBlocked(false);
        setReminders({ on: true, asked: true });
      } else {
        setBlocked(true);
      }
    } catch (error) {
      toastError(error);
    }
  };

  const share = async () => {
    try {
      await Share.share({ message: `GridSketch puts a grid over any photo so you can draw it square by square. Get it here: ${STORE_PAGE}` });
    } catch (error) {
      toastError(error);
    }
  };

  // Opens the Play Store app on the review page; the web page is the fallback where there is no store app.
  const review = async () => {
    try {
      await Linking.openURL(Platform.OS === 'android' ? `market://details?id=${APP_ID}` : STORE_PAGE);
    } catch {
      Linking.openURL(STORE_PAGE).catch(toastError);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Settings">
      {remindersSupported ? (
        <>
          <ToggleRow label="Drawing reminders" hint="A nudge to carry on with your unfinished drawing" value={on} onChange={turn} tint={colors.accent} />
          {blocked && (
            <View style={styles.note}>
              <AppText>Notifications are turned off for GridSketch.</AppText>
              <AppText dim>Allow them in your phone&apos;s settings, then switch reminders on again.</AppText>
              <Button compact icon="settings-outline" label="Open settings" onPress={() => Linking.openSettings()} />
            </View>
          )}
        </>
      ) : (
        <View style={styles.note}>
          <AppText dim>Drawing reminders work in the phone app. A browser cannot show them.</AppText>
        </View>
      )}
      <OptionRow icon="share-social-outline" title="Share the app" hint="Send GridSketch to a friend who draws" tint={colors.text} onPress={share} />
      <OptionRow icon="star-outline" title="Rate the app" hint="Leave a review on the Play Store" tint={colors.text} onPress={review} />
      <OptionRow icon="shield-checkmark-outline" title="Privacy policy" hint="What happens to your photos and drawings" tint={colors.text} onPress={onPrivacy} />
      <AppText variant="caption" dim style={styles.version}>
        GridSketch {Constants.expoConfig?.version ?? ''}
      </AppText>
    </Sheet>
  );
}

const useStyles = makeStyles((colors) => ({
  note: { gap: space.sm, padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.surfaceHigh },
  version: { textAlign: 'center', marginTop: space.sm },
}));

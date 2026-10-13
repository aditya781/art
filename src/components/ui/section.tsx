import type { ReactNode } from 'react';
import { View } from 'react-native';

import { makeStyles, space } from '@/constants/theme';

import { AppText } from './app-text';

type Props = { title?: string; hint?: string; children: ReactNode };

/** A titled group of related controls inside an editor panel. Spacing separates groups; there is no box. */
export function Section({ title, hint, children }: Props) {
  const styles = useStyles();
  return (
    <View style={styles.group}>
      {title && (
        <AppText variant="caption" style={styles.title}>
          {title.toUpperCase()}
        </AppText>
      )}
      {children}
      {hint && (
        <AppText variant="caption" dim>
          {hint}
        </AppText>
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  group: { gap: space.md },
  title: { letterSpacing: 0.9, color: colors.textFaint },
}));

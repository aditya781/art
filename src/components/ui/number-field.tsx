import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { fonts, makeStyles, radius, space, useColors } from '@/constants/theme';

import { AppText } from './app-text';

type Props = { label: string; value: number; onChange: (value: number) => void; suffix: string };

export function NumberField({ label, value, onChange, suffix }: Props) {
  const colors = useColors();
  const styles = useStyles();
  const shown = String(Number(value.toFixed(2)));
  const [text, setText] = useState(shown);
  const [editing, setEditing] = useState(false);

  return (
    <View style={styles.wrap}>
      <AppText variant="caption" dim>
        {label}
      </AppText>
      <View style={styles.field}>
        <TextInput
          accessibilityLabel={label}
          value={editing ? text : shown}
          keyboardType="decimal-pad"
          returnKeyType="done"
          selectTextOnFocus
          selectionColor={colors.accent}
          onFocus={() => {
            setText(shown);
            setEditing(true);
          }}
          onBlur={() => setEditing(false)}
          onChangeText={(next) => {
            setText(next);
            const parsed = parseFloat(next.replace(',', '.'));
            if (Number.isFinite(parsed) && parsed > 0) onChange(parsed);
          }}
          style={styles.input}
        />
        <AppText variant="label" color={colors.textFaint}>
          {suffix}
        </AppText>
      </View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  wrap: { flex: 1, gap: space.xs },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHigh,
  },
  input: { flex: 1, minWidth: 0, height: 44, color: colors.text, fontFamily: fonts.medium, fontSize: 16, padding: 0 },
}));

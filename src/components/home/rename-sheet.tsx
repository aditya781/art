import { useState } from 'react';
import { TextInput } from 'react-native';

import { Button } from '@/components/ui/buttons';
import { Sheet } from '@/components/ui/sheet';
import { fonts, makeStyles, radius, space, useColors } from '@/constants/theme';

type Props = { name: string; onSave: (name: string) => void; onClose: () => void };

/** Mount it only while renaming, so the field starts from the current name each time. */
export function RenameSheet({ name, onSave, onClose }: Props) {
  const colors = useColors();
  const styles = useStyles();
  const [text, setText] = useState(name);
  const trimmed = text.trim();

  return (
    <Sheet visible onClose={onClose} title="Rename drawing">
      <TextInput
        accessibilityLabel="Drawing name"
        value={text}
        onChangeText={setText}
        autoFocus
        selectTextOnFocus
        maxLength={40}
        returnKeyType="done"
        placeholder="Name"
        placeholderTextColor={colors.textFaint}
        selectionColor={colors.accent}
        onSubmitEditing={() => trimmed && onSave(trimmed)}
        style={styles.input}
      />
      <Button variant="primary" label="Save" disabled={!trimmed} onPress={() => onSave(trimmed)} />
    </Sheet>
  );
}

const useStyles = makeStyles((colors) => ({
  input: {
    height: 52,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHigh,
    color: colors.text,
    fontFamily: fonts.medium,
    fontSize: 17,
  },
}));

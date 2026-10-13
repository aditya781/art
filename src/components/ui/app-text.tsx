import { Text, type TextProps, type TextStyle } from 'react-native';

import { fonts, useColors } from '@/constants/theme';

const variants = {
  display: { fontFamily: fonts.bold, fontSize: 34, lineHeight: 40, letterSpacing: -0.6 },
  title: { fontFamily: fonts.semibold, fontSize: 22, lineHeight: 28, letterSpacing: -0.3 },
  heading: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21 },
  label: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 18 },
  caption: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16 },
} satisfies Record<string, TextStyle>;

type Props = TextProps & { variant?: keyof typeof variants; color?: string; dim?: boolean };

export function AppText({ variant = 'body', color, dim, style, ...rest }: Props) {
  const colors = useColors();
  return (
    <Text
      {...rest}
      style={[variants[variant], { color: color ?? (dim ? colors.textDim : colors.text) }, style]}
    />
  );
}

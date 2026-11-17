import { Text as NativeText } from 'react-native';
import type { TextProps as NativeTextProps } from 'react-native';

import { useTheme } from './ThemeProvider';
import type { ColorToken, TextVariant } from './theme';

export type TextProps = NativeTextProps & {
  /** Style typographique de la spécification Riviera. */
  readonly variant?: TextVariant;
  /** Couleur, parmi les tokens du thème. */
  readonly color?: ColorToken;
};

/** Le seul composant de texte de l'app : il applique la police, le corps et la couleur du thème. */
export function Text({ variant = 'body', color = 'text', style, ...props }: TextProps) {
  const theme = useTheme();
  return (
    <NativeText
      {...props}
      style={[theme.typography[variant], { color: theme.colors[color] }, style]}
    />
  );
}

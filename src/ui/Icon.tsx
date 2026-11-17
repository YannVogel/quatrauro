import { View } from 'react-native';

import { useTheme } from './ThemeProvider';
import { ICON_STROKE_WIDTH, icons } from './icons';
import type { IconName } from './icons';
import type { ColorToken } from './theme';

const DEFAULT_SIZE = 24;

export type IconProps = {
  readonly name: IconName;
  readonly size?: number;
  /** Couleur, parmi les tokens du thème. */
  readonly color?: ColorToken;
  /**
   * Ce que l'icône veut dire, pour les lecteurs d'écran. Sans libellé, l'icône est décorative
   * et ils l'ignorent : le texte voisin porte alors l'information.
   */
  readonly accessibilityLabel?: string;
};

export function Icon({ name, size = DEFAULT_SIZE, color = 'text', accessibilityLabel }: IconProps) {
  const theme = useTheme();
  const Glyph = icons[name];
  const isDecorative = accessibilityLabel === undefined;
  // Le dessin lui-même est toujours masqué aux lecteurs d'écran : c'est le conteneur qui parle.
  return (
    <View
      accessible={!isDecorative}
      accessibilityRole={isDecorative ? undefined : 'image'}
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={isDecorative}
      importantForAccessibility={isDecorative ? 'no-hide-descendants' : 'yes'}
    >
      <Glyph size={size} color={theme.colors[color]} strokeWidth={ICON_STROKE_WIDTH} />
    </View>
  );
}

import { Pressable } from 'react-native';

import { Icon } from '../Icon';
import { makeStyles, useTheme } from '../ThemeProvider';
import type { IconName } from '../icons';

type IconButtonProps = {
  readonly icon: IconName;
  /** Ce que fait le bouton : obligatoire, puisqu'il n'a pas de texte. */
  readonly accessibilityLabel: string;
  readonly onPress: () => void;
  /** `hero` quand le bouton est posé sur le bloc d'état. */
  readonly surface?: 'card' | 'hero';
};

/** Bouton rond (retour, thème), à la taille de la cible tactile minimale. */
export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  surface = 'card',
}: IconButtonProps) {
  const theme = useTheme();
  const styles = useStyles();
  const onHero = surface === 'hero';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={[
        styles.button,
        { backgroundColor: onHero ? theme.colors.heroOverlay : theme.colors.card },
      ]}
    >
      <Icon name={icon} color={onHero ? 'onHero' : 'text'} />
    </Pressable>
  );
}

const useStyles = makeStyles((theme) => ({
  button: {
    width: theme.sizes.touchTarget,
    height: theme.sizes.touchTarget,
    borderRadius: theme.radii.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));

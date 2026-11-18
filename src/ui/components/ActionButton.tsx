import { Pressable } from 'react-native';

import { Text } from '../Text';
import { makeStyles } from '../ThemeProvider';

type ActionButtonProps = {
  readonly label: string;
  readonly onPress: () => void;
  /** Une action en cours ne se relance pas. */
  readonly disabled?: boolean;
};

/** Bouton plein, pour l'action qu'un état propose : « Réessayer ». */
export function ActionButton({ label, onPress, disabled = false }: ActionButtonProps) {
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, disabled ? styles.disabled : null]}
    >
      <Text variant="bodyStrong" color="onHero">
        {label}
      </Text>
    </Pressable>
  );
}

const useStyles = makeStyles((theme) => ({
  button: {
    minHeight: theme.sizes.touchTarget,
    minWidth: 160,
    paddingHorizontal: theme.spacing.card + 4,
    borderRadius: theme.radii.control,
    backgroundColor: theme.colors.heroClear,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.6 },
}));

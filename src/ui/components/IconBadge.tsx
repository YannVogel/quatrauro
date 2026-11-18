import { View } from 'react-native';

import { Icon } from '../Icon';
import { makeStyles } from '../ThemeProvider';
import type { IconName } from '../icons';

type IconBadgeProps = {
  readonly icon: IconName;
  readonly size?: 'small' | 'large';
};

const DIAMETER = { small: 40, large: 72 } as const;
const ICON_SIZE = { small: 20, large: 32 } as const;

/** Rond pâle qui porte l'icône d'un état. Décoratif : le texte voisin dit la même chose. */
export function IconBadge({ icon, size = 'small' }: IconBadgeProps) {
  const styles = useStyles();
  const diameter = DIAMETER[size];
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.badge, { width: diameter, height: diameter, borderRadius: diameter / 2 }]}
    >
      <Icon name={icon} color="onSun" size={ICON_SIZE[size]} />
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  badge: { backgroundColor: theme.colors.pale, alignItems: 'center', justifyContent: 'center' },
}));

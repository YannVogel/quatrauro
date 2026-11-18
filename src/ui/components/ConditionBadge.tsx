import { View } from 'react-native';

import { strings } from '@/i18n';
import type { Condition } from '@shared/conditions';

import { Icon } from '../Icon';
import { makeStyles, useTheme } from '../ThemeProvider';
import { conditionAppearance } from '../conditions';

/** L'icône occupe un peu moins de la moitié du rond, comme dans les maquettes. */
const ICON_RATIO = 0.46;

type ConditionBadgeProps = {
  readonly condition: Condition;
  readonly isNight?: boolean;
  /** `large` à l'accueil, `medium` sur le détail d'un jour. */
  readonly size?: 'large' | 'medium';
  /** Vrai quand le nom de la condition est écrit à côté : les lecteurs d'écran ignorent le rond. */
  readonly decorative?: boolean;
};

/** Rond coloré qui porte l'icône de la condition : jaune quand le soleil est visible, pâle sinon. */
export function ConditionBadge({
  condition,
  isNight = false,
  size = 'large',
  decorative = false,
}: ConditionBadgeProps) {
  const theme = useTheme();
  const styles = useStyles();
  const appearance = conditionAppearance(condition, isNight);
  const diameter = size === 'large' ? theme.sizes.sunLarge : theme.sizes.sunMedium;
  return (
    <View
      style={[
        styles.badge,
        {
          width: diameter,
          height: diameter,
          borderRadius: diameter / 2,
          backgroundColor: theme.colors[appearance.badge],
        },
      ]}
    >
      <Icon
        name={appearance.icon}
        size={Math.round(diameter * ICON_RATIO)}
        color="onSun"
        accessibilityLabel={decorative ? undefined : strings.conditions[condition]}
      />
    </View>
  );
}

const useStyles = makeStyles(() => ({
  badge: { alignItems: 'center', justifyContent: 'center' },
}));

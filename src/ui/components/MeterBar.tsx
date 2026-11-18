import { View } from 'react-native';

import { strings } from '@/i18n';
import { formatPercent } from '@/lib/format';

import { makeStyles } from '../ThemeProvider';

type MeterBarProps = {
  /** Proportion de 0 à 1 ; `null` quand elle est inconnue. */
  readonly value: number | null;
  /** Ce que mesure la barre, pour les lecteurs d'écran : il reçoit le pourcentage mis en forme. */
  readonly describe?: (percent: string) => string;
  /** Vrai quand la ligne qui contient la barre dit déjà sa valeur : les lecteurs d'écran l'ignorent. */
  readonly decorative?: boolean;
};

/** Barre de proportion (poids d'un modèle, erreur relative). */
export function MeterBar({
  value,
  describe = strings.spoken.proportion,
  decorative = false,
}: MeterBarProps) {
  const styles = useStyles();
  const ratio = value === null ? null : Math.min(Math.max(value, 0), 1);
  const label = ratio === null ? strings.common.unavailable : describe(formatPercent(ratio * 100));
  return (
    <View
      accessible={!decorative}
      accessibilityRole={decorative ? undefined : 'image'}
      accessibilityLabel={decorative ? undefined : label}
      accessibilityElementsHidden={decorative}
      importantForAccessibility={decorative ? 'no-hide-descendants' : 'yes'}
      style={styles.track}
    >
      {ratio === null ? null : (
        <View testID="meter-bar-fill" style={[styles.fill, { width: `${ratio * 100}%` }]} />
      )}
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  track: {
    flex: 1,
    height: theme.sizes.bar,
    borderRadius: theme.sizes.bar / 2,
    backgroundColor: theme.colors.track,
    overflow: 'hidden',
  },
  fill: {
    height: theme.sizes.bar,
    borderRadius: theme.sizes.bar / 2,
    backgroundColor: theme.colors.bar,
  },
}));

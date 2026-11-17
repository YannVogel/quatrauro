import { View } from 'react-native';

import { strings } from '@/i18n';

import { Text } from '../Text';
import { makeStyles } from '../ThemeProvider';

type StatTileProps = {
  /** Ce que mesure la vignette : « Vent ». */
  readonly label: string;
  /** Valeur déjà mise en forme (`@/lib/format`) ; `null` quand elle est indisponible. */
  readonly value: string | null;
};

/** Vignette libellé + valeur. */
export function StatTile({ label, value }: StatTileProps) {
  const styles = useStyles();
  return (
    <View
      accessible
      accessibilityLabel={`${label}, ${value ?? strings.common.unavailable}`}
      style={styles.tile}
    >
      <Text variant="caption" color="textMuted" numberOfLines={1}>
        {label}
      </Text>
      <Text variant="stat" numberOfLines={1} adjustsFontSizeToFit>
        {value ?? strings.common.missing}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  tile: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.tile,
    paddingVertical: 10,
    paddingHorizontal: 4,
    gap: 2,
  },
}));

import { View } from 'react-native';

import { Text } from '../Text';
import { makeStyles } from '../ThemeProvider';

type PillProps = {
  /** Texte de la pastille jaune : « Fiabilité 95 % ». */
  readonly label: string;
  /** Court texte qui suit la pastille : « 4 modèles d'accord ». */
  readonly detail?: string;
};

/** Pastille jaune mise en avant dans le bloc d'état, suivie d'un court texte. */
export function Pill({ label, detail }: PillProps) {
  const styles = useStyles();
  return (
    <View style={styles.row}>
      <View style={styles.pill}>
        <Text variant="label" color="onSun">
          {label}
        </Text>
      </View>
      {detail === undefined ? null : (
        <Text variant="caption" color="onHero" style={styles.detail}>
          {detail}
        </Text>
      )}
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.item },
  pill: {
    backgroundColor: theme.colors.sun,
    borderRadius: theme.radii.pill,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  // Le texte qui suit peut être long : il passe à la ligne plutôt que de pousser la pastille.
  detail: { flexShrink: 1 },
}));

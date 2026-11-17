import { View } from 'react-native';

import { strings } from '@/i18n';
import { formatPercent } from '@/lib/format';

import { Text } from '../Text';
import { makeStyles } from '../ThemeProvider';
import { MeterBar } from './MeterBar';

type ModelRowProps = {
  /** Nom du modèle : « AROME ». */
  readonly name: string;
  /** Qui le produit, et ce qui le caractérise : « Météo-France · maille fine ». */
  readonly provider: string;
  /** Poids dans le mélange, de 0 à 1 ; `null` quand le modèle ne couvre pas l'échéance. */
  readonly weight: number | null;
  /** Valeur prévue par ce modèle, déjà mise en forme ; `null` quand il n'en donne pas. */
  readonly value: string | null;
};

/** Ligne d'un modèle : nom, fournisseur, poids, valeur. */
export function ModelRow({ name, provider, weight, value }: ModelRowProps) {
  const styles = useStyles();
  const { spoken, common } = strings;
  const percent = weight === null ? null : formatPercent(weight * 100);
  return (
    <View
      accessible
      accessibilityLabel={[
        name,
        provider,
        spoken.weight(percent ?? common.unavailable),
        value ?? common.unavailable,
      ].join(', ')}
      style={styles.row}
    >
      <View style={styles.details}>
        <View style={styles.heading}>
          <Text variant="section">{name}</Text>
          <Text variant="caption" color="textMuted" numberOfLines={1} style={styles.provider}>
            {provider}
          </Text>
        </View>
        <View style={styles.weight}>
          <MeterBar value={weight} describe={spoken.weight} />
          <Text variant="caption" color="textMuted" style={styles.percent}>
            {percent ?? common.missing}
          </Text>
        </View>
      </View>
      <Text variant="value" style={styles.value}>
        {value ?? common.missing}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.block,
    paddingVertical: theme.spacing.block,
  },
  details: { flex: 1, gap: 6 },
  heading: { flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.item },
  provider: { flexShrink: 1 },
  weight: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.item },
  percent: { width: 44, textAlign: 'right' },
  value: { minWidth: 64, textAlign: 'right' },
}));

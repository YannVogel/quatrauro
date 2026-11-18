import { View } from 'react-native';

import { strings } from '@/i18n';
import { formatNumber, formatTemperature } from '@/lib/format';
import { Card, Text, makeStyles } from '@/ui';

import type { ModelErrors } from '../models';

type ModelErrorsCardProps = { readonly errors: ModelErrors | null };

/** Erreur moyenne récente du mélange et de chaque modèle, du plus juste au moins juste. */
export function ModelErrorsCard({ errors }: ModelErrorsCardProps) {
  const styles = useStyles();
  const { models, spoken, common } = strings;
  if (errors === null) {
    return (
      <Card>
        <Text color="textMuted">{models.errorsNone}</Text>
      </Card>
    );
  }
  const rows = [
    { key: 'blend', name: models.errorsBlend, error: errors.blend, isBlend: true },
    ...errors.models.map((model) => ({
      key: model.id,
      name: model.name,
      error: model.error as number | null,
      isBlend: false,
    })),
  ];
  return (
    <Card testID="model-errors">
      <View style={styles.header}>
        <Text variant="section" accessibilityRole="header">
          {models.errorsTitle}
        </Text>
        <Text variant="caption" color="textMuted">
          {models.errorsPeriod(errors.lead, errors.periodDays)}
        </Text>
      </View>
      <View style={styles.rows}>
        {rows.map((row) => (
          <View
            key={row.key}
            accessible
            accessibilityLabel={`${row.name}, ${
              row.error === null ? common.unavailable : spoken.degrees(formatNumber(row.error, 1))
            }`}
            style={styles.row}
          >
            <Text variant={row.isBlend ? 'bodyStrong' : 'body'} style={styles.name}>
              {row.name}
            </Text>
            <Text variant={row.isBlend ? 'bodyStrong' : 'body'}>
              {formatTemperature(row.error, 1)}
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

const useStyles = makeStyles((theme) => ({
  header: { gap: 2 },
  rows: { gap: theme.spacing.item },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.item },
  name: { flex: 1 },
}));

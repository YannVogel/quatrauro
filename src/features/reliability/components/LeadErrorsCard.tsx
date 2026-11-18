import { View } from 'react-native';

import { strings } from '@/i18n';
import { formatNumber, formatTemperature } from '@/lib/format';
import { Card, MeterBar, Text, makeStyles, useTextScale } from '@/ui';

import type { LeadError } from '../reliability';

type LeadErrorsCardProps = { readonly leads: readonly LeadError[] };

/** Largeurs des colonnes à la taille de police normale. */
const LABEL_WIDTH = 112;
const VALUE_WIDTH = 44;

/** Erreur moyenne du mélange selon l'échéance : plus on prévoit loin, plus elle grandit. */
export function LeadErrorsCard({ leads }: LeadErrorsCardProps) {
  const styles = useStyles();
  const { fontScale, isLargeText } = useTextScale();
  const { reliability, spoken } = strings;
  return (
    <Card testID="lead-errors">
      <View style={styles.header}>
        <Text variant="section" accessibilityRole="header">
          {reliability.leadsTitle}
        </Text>
        <Text variant="caption" color="textMuted">
          {reliability.leadsCaption}
        </Text>
      </View>
      <View style={styles.rows}>
        {leads.map((lead) => {
          const label = reliability.lead(lead.lead);
          const spokenLabel = reliability.spokenLead(
            label,
            spoken.degrees(formatNumber(lead.error, 1)),
          );
          return (
            <View key={lead.lead} accessible accessibilityLabel={spokenLabel} style={styles.row}>
              <Text
                numberOfLines={1}
                style={isLargeText ? styles.label : { width: LABEL_WIDTH * fontScale }}
              >
                {label}
              </Text>
              {/* Avec une très grande police, le chiffre suffit : la barre s'efface. */}
              {isLargeText ? null : (
                <View style={styles.bar}>
                  <MeterBar value={lead.ratio} decorative />
                </View>
              )}
              <Text
                variant="bodyStrong"
                numberOfLines={1}
                style={[styles.value, { width: VALUE_WIDTH * fontScale }]}
              >
                {formatTemperature(lead.error, 1)}
              </Text>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const useStyles = makeStyles((theme) => ({
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: theme.spacing.item,
  },
  rows: { gap: theme.spacing.item },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.item },
  bar: { flex: 1, flexDirection: 'row' },
  label: { flex: 1 },
  value: { textAlign: 'right' },
}));

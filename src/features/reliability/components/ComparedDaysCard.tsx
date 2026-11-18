import { View, useWindowDimensions } from 'react-native';

import { strings } from '@/i18n';
import { formatNumber, formatTemperature } from '@/lib/format';
import { Card, Icon, Text, makeStyles } from '@/ui';

import type { ComparedDay } from '../reliability';

type ComparedDaysCardProps = { readonly days: readonly ComparedDay[] };

/** Largeurs des colonnes de chiffres à la taille de police normale. */
const VALUE_WIDTH = 60;
const GAP_WIDTH = 72;

const spokenDegrees = (value: number | null): string =>
  value === null ? strings.common.unavailable : strings.spoken.degrees(formatNumber(value, 1));

/** Prévu la veille contre observé, jour par jour. Un écart important porte une icône, pas seulement une couleur. */
export function ComparedDaysCard({ days }: ComparedDaysCardProps) {
  const styles = useStyles();
  const { fontScale } = useWindowDimensions();
  const { reliability } = strings;
  const value = { width: VALUE_WIDTH * fontScale };
  const gap = { width: GAP_WIDTH * fontScale };

  return (
    <Card testID="compared-days">
      <View>
        <Text variant="section" accessibilityRole="header">
          {reliability.daysTitle}
        </Text>
        <Text variant="caption" color="textMuted">
          {reliability.daysCaption}
        </Text>
      </View>
      <View>
        <View
          style={styles.row}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <View style={styles.day} />
          <Text variant="caption" color="textMuted" style={[styles.number, value]}>
            {reliability.forecast}
          </Text>
          <Text variant="caption" color="textMuted" style={[styles.number, value]}>
            {reliability.observed}
          </Text>
          <Text variant="caption" color="textMuted" style={[styles.number, gap]}>
            {reliability.gap}
          </Text>
        </View>
        {days.map((day) => (
          <View
            key={day.date}
            accessible
            accessibilityLabel={[
              reliability.spokenDay(
                day.spokenLabel,
                spokenDegrees(day.forecast),
                spokenDegrees(day.observed),
                spokenDegrees(day.gap),
              ),
              day.isLarge ? reliability.largeGap : null,
            ]
              .filter((part) => part !== null)
              .join(', ')}
            style={styles.row}
          >
            <Text variant="bodyStrong" numberOfLines={1} style={styles.day}>
              {day.label}
            </Text>
            <Text numberOfLines={1} style={[styles.number, value]}>
              {formatTemperature(day.forecast, 1)}
            </Text>
            <Text numberOfLines={1} style={[styles.number, value]}>
              {formatTemperature(day.observed, 1)}
            </Text>
            <View style={[styles.gap, gap]}>
              {day.isLarge ? <Icon name="alert" size={16} /> : null}
              <Text
                variant={day.isLarge ? 'bodyStrong' : 'body'}
                color={day.isLarge ? 'text' : 'textMuted'}
                numberOfLines={1}
              >
                {formatTemperature(day.gap, 1)}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
}

const useStyles = makeStyles((theme) => ({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 32, gap: theme.spacing.item },
  day: { flex: 1 },
  number: { textAlign: 'right' },
  gap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
}));

import { ScrollView, View } from 'react-native';

import { strings } from '@/i18n';
import { formatHour, formatNumber, formatPercent, formatTemperature } from '@/lib/format';

import { Text } from '../Text';
import { makeStyles } from '../ThemeProvider';
import { useTextScale } from '../textScale';

const BAR_HEIGHT = 60;
const BAR_WIDTH = 14;
/** Largeur minimale d'une colonne à la taille de police normale : en dessous, les chiffres se touchent. */
const COLUMN_MIN_WIDTH = 30;

export type HourlyColumn = {
  /** Heure de Paris, de 0 à 23. */
  readonly hour: number;
  readonly temperature: number | null;
  /** Risque de pluie, de 0 à 100 ; `null` quand il est indisponible. */
  readonly rainProbability: number | null;
};

type HourlyChartProps = { readonly columns: readonly HourlyColumn[] };

function describeColumn(column: HourlyColumn): string {
  const { spoken, common } = strings;
  const temperature =
    column.temperature === null
      ? common.unavailable
      : spoken.degrees(formatNumber(column.temperature));
  const rain = spoken.rainRisk(
    column.rainProbability === null ? common.unavailable : formatPercent(column.rainProbability),
  );
  return `${spoken.hour(formatNumber(column.hour))} : ${temperature}, ${rain}`;
}

/**
 * Colonnes d'une journée : température en chiffres, risque de pluie en barre verticale. Avec une
 * très grande police, les colonnes s'élargissent et le graphique défile de côté.
 */
export function HourlyChart({ columns }: HourlyChartProps) {
  const styles = useStyles();
  const { fontScale } = useTextScale();
  const columnWidth = { minWidth: COLUMN_MIN_WIDTH * fontScale };
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
    >
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={columns.map(describeColumn).join(' ; ')}
        style={styles.chart}
      >
        {columns.map((column) => {
          const ratio =
            column.rainProbability === null
              ? null
              : Math.min(Math.max(column.rainProbability, 0), 100);
          return (
            <View key={column.hour} style={[styles.column, columnWidth]}>
              <Text variant="bodyStrong" numberOfLines={1}>
                {formatTemperature(column.temperature)}
              </Text>
              <View style={styles.track}>
                {ratio === null ? null : (
                  <View testID="hourly-chart-fill" style={[styles.fill, { height: `${ratio}%` }]} />
                )}
              </View>
              <Text variant="micro" color="textMuted" numberOfLines={1}>
                {formatHour(column.hour)}
              </Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const useStyles = makeStyles((theme) => ({
  // Le contenu occupe au moins toute la largeur : sans défilement, rien ne change.
  scroll: { flexGrow: 1 },
  chart: { flex: 1, flexDirection: 'row' },
  column: { flex: 1, alignItems: 'center', gap: 5 },
  track: {
    height: BAR_HEIGHT,
    width: BAR_WIDTH,
    borderRadius: BAR_WIDTH / 2,
    backgroundColor: theme.colors.track,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  fill: {
    width: BAR_WIDTH,
    borderRadius: BAR_WIDTH / 2,
    backgroundColor: theme.colors.bar,
  },
}));

import { View, useWindowDimensions } from 'react-native';

import { strings } from '@/i18n';
import { formatHour, formatNumber, formatTemperature } from '@/lib/format';
import { Card, RangeBar, Text, makeStyles } from '@/ui';

import type { Disagreement, ModelOpinion } from '../day';

type DisagreementCardProps = { readonly disagreement: Disagreement };

const HOURS_PER_DAY = 24;
/** Marge de l'échelle des températures, de part et d'autre des avis, en °C. */
const TEMPERATURE_MARGIN = 1;
/** Largeurs des colonnes à la taille de police normale. */
const NAME_WIDTH = 68;
const VALUE_WIDTH = 88;

type Row = {
  readonly opinion: ModelOpinion;
  /** Ce qu'affiche la colonne de droite. */
  readonly text: string;
  /** Ce que lit un lecteur d'écran pour toute la ligne. */
  readonly spoken: string;
  readonly bar: { readonly min: number | null; readonly max: number | null };
};

function rainRows(opinions: readonly ModelOpinion[]): Row[] {
  const { day } = strings;
  return opinions.map((opinion) => {
    const { name, value } = opinion;
    return value === null
      ? {
          opinion,
          text: day.noRain,
          spoken: day.spokenNoRain(name),
          bar: { min: null, max: null },
        }
      : {
          opinion,
          text: formatHour(value),
          spoken: day.spokenRainStart(name, strings.spoken.hour(formatNumber(value))),
          // La barre part de l'heure où la pluie commence.
          bar: { min: value, max: HOURS_PER_DAY },
        };
  });
}

function temperatureRows(opinions: readonly ModelOpinion[]): Row[] {
  return opinions.map((opinion) => {
    const { name, value } = opinion;
    return {
      opinion,
      text: formatTemperature(value, 1),
      spoken: strings.day.spokenMaxTemperature(
        name,
        value === null
          ? strings.common.unavailable
          : strings.spoken.degrees(formatNumber(value, 1)),
      ),
      bar: { min: value, max: value },
    };
  });
}

function scaleOf(disagreement: Disagreement): { min: number; max: number } {
  if (disagreement.kind === 'rainStart') return { min: 0, max: HOURS_PER_DAY };
  const values = disagreement.opinions.flatMap((opinion) =>
    opinion.value === null ? [] : [opinion.value],
  );
  return {
    min: Math.min(...values) - TEMPERATURE_MARGIN,
    max: Math.max(...values) + TEMPERATURE_MARGIN,
  };
}

/** Ce que dit chaque modèle sur la grandeur où ils divergent le plus : une ligne par modèle. */
export function DisagreementCard({ disagreement }: DisagreementCardProps) {
  const styles = useStyles();
  const { fontScale } = useWindowDimensions();
  const isRain = disagreement.kind === 'rainStart';
  const rows = isRain ? rainRows(disagreement.opinions) : temperatureRows(disagreement.opinions);
  const scale = scaleOf(disagreement);

  return (
    <Card testID="disagreement-card">
      <Text variant="section" accessibilityRole="header">
        {isRain ? strings.day.rainStart : strings.day.maxTemperature}
      </Text>
      <View style={styles.rows}>
        {rows.map((row) => (
          <View
            key={row.opinion.modelId}
            accessible
            accessibilityLabel={row.spoken}
            style={styles.row}
          >
            <Text variant="label" numberOfLines={1} style={{ width: NAME_WIDTH * fontScale }}>
              {row.opinion.name}
            </Text>
            <View style={styles.bar}>
              <RangeBar
                min={row.bar.min}
                max={row.bar.max}
                scaleMin={scale.min}
                scaleMax={scale.max}
                accessibilityLabel={row.spoken}
              />
            </View>
            <Text
              variant="caption"
              color="textMuted"
              numberOfLines={1}
              style={[styles.value, { width: VALUE_WIDTH * fontScale }]}
            >
              {row.text}
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

const useStyles = makeStyles((theme) => ({
  rows: { gap: theme.spacing.item },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.item },
  bar: { flex: 1, flexDirection: 'row' },
  value: { textAlign: 'right' },
}));

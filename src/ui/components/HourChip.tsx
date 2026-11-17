import { View } from 'react-native';

import { strings } from '@/i18n';
import { formatHour, formatNumber, formatPercent, formatTemperature } from '@/lib/format';

import { Text } from '../Text';
import { makeStyles } from '../ThemeProvider';

type HourChipProps = {
  /** Heure de Paris, de 0 à 23. */
  readonly hour: number;
  readonly temperature: number | null;
  /** Risque de pluie, de 0 à 100. Sans cette prop, la vignette ne parle pas de pluie. */
  readonly rainProbability?: number | null;
};

/** Vignette d'une heure : heure, température, risque de pluie éventuel. */
export function HourChip({ hour, temperature, rainProbability }: HourChipProps) {
  const styles = useStyles();
  const { spoken, common } = strings;
  const spokenParts = [
    spoken.hour(formatNumber(hour)),
    temperature === null ? common.unavailable : spoken.degrees(formatNumber(temperature)),
    rainProbability === undefined
      ? null
      : spoken.rainRisk(
          rainProbability === null ? common.unavailable : formatPercent(rainProbability),
        ),
  ];
  return (
    <View
      accessible
      accessibilityLabel={spokenParts.filter((part) => part !== null).join(', ')}
      style={styles.chip}
    >
      <Text variant="caption" color="textMuted">
        {formatHour(hour)}
      </Text>
      <Text variant="stat">{formatTemperature(temperature)}</Text>
      {rainProbability === undefined ? null : (
        <Text variant="micro" color="textMuted">
          {formatPercent(rainProbability)}
        </Text>
      )}
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  chip: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.tile,
    paddingVertical: 10,
    gap: 2,
  },
}));

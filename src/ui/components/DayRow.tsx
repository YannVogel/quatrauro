import { Pressable, View } from 'react-native';

import { strings } from '@/i18n';
import { formatNumber, formatPercent, formatTemperature } from '@/lib/format';
import type { Condition } from '@shared/conditions';

import { Icon } from '../Icon';
import { Text } from '../Text';
import { makeStyles } from '../ThemeProvider';
import { conditionAppearance } from '../conditions';
import { RangeBar } from './RangeBar';

type DayRowProps = {
  /** Jour abrégé, affiché : « Mar. ». */
  readonly dayLabel: string;
  /** Jour en toutes lettres, lu par les lecteurs d'écran : « mardi ». */
  readonly spokenDay: string;
  readonly condition: Condition;
  readonly min: number | null;
  readonly max: number | null;
  /** Bornes de l'échelle, communes à toutes les lignes de la semaine. */
  readonly scaleMin: number;
  readonly scaleMax: number;
  /** Indice de fiabilité, de 0 à 100 ; `null` quand il est indisponible. */
  readonly reliability: number | null;
  readonly onPress?: () => void;
};

/** Ligne d'un jour : icône, jour, minimum, barre d'amplitude, maximum, fiabilité. */
export function DayRow({
  dayLabel,
  spokenDay,
  condition,
  min,
  max,
  scaleMin,
  scaleMax,
  reliability,
  onPress,
}: DayRowProps) {
  const styles = useStyles();
  const { spoken, common, conditions } = strings;
  const spokenRange =
    min === null || max === null
      ? common.unavailable
      : spoken.temperatureRange(formatNumber(min), formatNumber(max));
  const spokenReliability = spoken.reliability(
    reliability === null ? common.unavailable : formatPercent(reliability),
  );
  return (
    <Pressable
      accessibilityRole={onPress === undefined ? undefined : 'button'}
      accessibilityLabel={[spokenDay, conditions[condition], spokenRange, spokenReliability].join(
        ', ',
      )}
      disabled={onPress === undefined}
      onPress={onPress}
      style={styles.row}
    >
      <Icon name={conditionAppearance(condition, false).icon} />
      <Text variant="bodyStrong" style={styles.day}>
        {dayLabel}
      </Text>
      <Text color="textMuted" style={styles.temperature}>
        {formatTemperature(min)}
      </Text>
      <View style={styles.bar}>
        <RangeBar min={min} max={max} scaleMin={scaleMin} scaleMax={scaleMax} />
      </View>
      <Text variant="bodyStrong" style={styles.temperature}>
        {formatTemperature(max)}
      </Text>
      <Text variant="caption" color="textMuted" style={styles.reliability}>
        {formatPercent(reliability)}
      </Text>
    </Pressable>
  );
}

const useStyles = makeStyles((theme) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: theme.sizes.touchTarget,
    gap: theme.spacing.item,
  },
  day: { width: 40 },
  temperature: { width: 32, textAlign: 'right' },
  bar: { flex: 1, flexDirection: 'row' },
  reliability: { width: 44, textAlign: 'right' },
}));

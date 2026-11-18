import { Pressable, View } from 'react-native';

import { strings } from '@/i18n';
import { formatNumber, formatPercent, formatTemperature } from '@/lib/format';
import type { Condition } from '@shared/conditions';

import { Icon } from '../Icon';
import { Text } from '../Text';
import { makeStyles } from '../ThemeProvider';
import { conditionAppearance } from '../conditions';
import { useTextScale } from '../textScale';
import { RangeBar } from './RangeBar';

type DayRowProps = {
  /** Jour abrégé, affiché : « Mar. ». */
  readonly dayLabel: string;
  /** Jour en toutes lettres, lu par les lecteurs d'écran : « mardi ». */
  readonly spokenDay: string;
  /** `null` quand la condition du jour est indisponible : la place de l'icône reste vide. */
  readonly condition: Condition | null;
  readonly min: number | null;
  readonly max: number | null;
  /** Bornes de l'échelle, communes à toutes les lignes de la semaine. */
  readonly scaleMin: number;
  readonly scaleMax: number;
  /** Indice de fiabilité, de 0 à 100 ; `null` quand il est indisponible. */
  readonly reliability: number | null;
  readonly onPress?: () => void;
};

/** Largeurs des colonnes à la taille de police normale. */
const DAY_WIDTH = 40;
const TEMPERATURE_WIDTH = 32;
const RELIABILITY_WIDTH = 44;

/**
 * Ligne d'un jour : icône, jour, minimum, barre d'amplitude, maximum, fiabilité. Avec une très
 * grande police, la barre s'efface (les deux chiffres disent la même chose) et la fiabilité passe
 * sous la ligne : rien n'est coupé.
 */
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
  // Les colonnes ont une largeur fixe pour s'aligner d'une ligne à l'autre : elle suit la
  // taille de police choisie sur le téléphone, sinon « Mer. » passe à la ligne.
  const { fontScale, isLargeText } = useTextScale();
  const column = (width: number) => ({ width: width * fontScale });
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
      accessibilityLabel={[
        spokenDay,
        condition === null ? common.unavailable : conditions[condition],
        spokenRange,
        spokenReliability,
      ].join(', ')}
      disabled={onPress === undefined}
      onPress={onPress}
      style={styles.pressable}
    >
      <View style={styles.row}>
        {condition === null ? (
          <View style={styles.noIcon} />
        ) : (
          <Icon name={conditionAppearance(condition, false).icon} />
        )}
        <Text
          variant="bodyStrong"
          numberOfLines={1}
          style={isLargeText ? styles.day : column(DAY_WIDTH)}
        >
          {dayLabel}
        </Text>
        <Text
          color="textMuted"
          numberOfLines={1}
          style={[styles.number, column(TEMPERATURE_WIDTH)]}
        >
          {formatTemperature(min)}
        </Text>
        {isLargeText ? null : (
          <View style={styles.bar}>
            {/* La ligne dit déjà l'amplitude : la barre se tait. */}
            <RangeBar min={min} max={max} scaleMin={scaleMin} scaleMax={scaleMax} decorative />
          </View>
        )}
        <Text
          variant="bodyStrong"
          numberOfLines={1}
          style={[styles.number, column(TEMPERATURE_WIDTH)]}
        >
          {formatTemperature(max)}
        </Text>
        {isLargeText ? null : (
          <Text
            variant="caption"
            color="textMuted"
            numberOfLines={1}
            style={[styles.number, column(RELIABILITY_WIDTH)]}
          >
            {formatPercent(reliability)}
          </Text>
        )}
      </View>
      {isLargeText ? (
        <Text variant="caption" color="textMuted" style={styles.number}>
          {spoken.reliability(formatPercent(reliability))}
        </Text>
      ) : null}
    </Pressable>
  );
}

const useStyles = makeStyles((theme) => ({
  pressable: { minHeight: theme.sizes.touchTarget, justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.item },
  day: { flex: 1 },
  /** La place d'une icône, pour que les colonnes restent alignées. */
  noIcon: { width: 24, height: 24 },
  number: { textAlign: 'right' },
  bar: { flex: 1, flexDirection: 'row' },
}));

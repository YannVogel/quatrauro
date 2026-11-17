import { View } from 'react-native';

import { strings } from '@/i18n';
import { formatNumber, formatPercent, formatTemperature } from '@/lib/format';
import { ConditionBadge, HeroBlock, Pill, Text, conditionAppearance, makeStyles } from '@/ui';

import type { DayContent } from '../day';

type DayHeroProps = { readonly day: DayContent };

/** Bloc d'état d'un jour : maximum et minimum, condition, résumé, fiabilité, modèles qui le couvrent. */
export function DayHero({ day }: DayHeroProps) {
  const styles = useStyles();
  const { common, spoken, conditions } = strings;
  const spokenTemperature = (value: number | null): string =>
    value === null ? common.unavailable : spoken.degrees(formatNumber(value));

  return (
    <HeroBlock
      tone={day.condition === null ? undefined : conditionAppearance(day.condition, false).hero}
      testID="day-hero"
    >
      <View style={styles.spread}>
        <View
          accessible
          accessibilityLabel={`${strings.day.maximum} ${spokenTemperature(day.max)}, ${strings.day.minimum} ${spokenTemperature(day.min)}`}
          style={styles.temperatures}
        >
          <Text variant="displayL" color="onHero" numberOfLines={1} adjustsFontSizeToFit>
            {formatTemperature(day.max)}
          </Text>
          <Text variant="value" color="onHero">
            {formatTemperature(day.min)}
          </Text>
        </View>
        {day.condition === null ? null : <ConditionBadge condition={day.condition} size="medium" />}
      </View>
      <View>
        <Text variant="title" color="onHero">
          {day.condition === null ? strings.home.conditionUnavailable : conditions[day.condition]}
        </Text>
        {day.summary === null ? null : <Text color="onHero">{day.summary}</Text>}
      </View>
      <Pill
        label={strings.day.reliability(formatPercent(day.reliability))}
        detail={strings.day.coverage(day.modelsTotal)}
      />
    </HeroBlock>
  );
}

const useStyles = makeStyles((theme) => ({
  spread: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  temperatures: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: theme.spacing.block,
    flexShrink: 1,
  },
}));

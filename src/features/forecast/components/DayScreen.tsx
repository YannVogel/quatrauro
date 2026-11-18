import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { strings } from '@/i18n';
import { useCurrentCity } from '@/lib/currentCity';
import { formatMillimetres, formatPercent, formatSpeed, formatTemperature } from '@/lib/format';
import { useNow } from '@/lib/now';
import { useThemeSetting } from '@/lib/themePreference';
import { Card, HourlyChart, ScreenHeader, StatTile, Text, makeStyles } from '@/ui';

import { dayContent } from '../day';
import { ageLabel, forecastView } from '../freshness';
import { longDayOf } from '../home';
import { useForecast } from '../hooks/useForecast';
import { DayHero } from './DayHero';
import { DisagreementCard } from './DisagreementCard';
import { EmptyState } from './EmptyState';
import { StaleBanner } from './StaleBanner';

const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/;

/** Une valeur absente reste absente : la vignette l'écrit « — » et la lit « indisponible ». */
const shown = (value: number | null, format: (value: number) => string): string | null =>
  value === null ? null : format(value);

type DayScreenProps = {
  /** Le jour demandé par la route ; tout ce qui n'est pas `AAAA-MM-JJ` est traité comme un jour absent. */
  readonly date: string | undefined;
};

/** Détail d'un jour : son déroulé, ses chiffres clés, et ce sur quoi les modèles divergent. */
export function DayScreen({ date }: DayScreenProps) {
  const styles = useStyles();
  const router = useRouter();
  const now = useNow();
  const { city } = useCurrentCity();
  const { openThemeMenu } = useThemeSetting();
  const view = forecastView(useForecast(city.id), now);
  const isDate = date !== undefined && DATE_FORMAT.test(date);
  const day = view.status === 'ready' && isDate ? dayContent(view.forecast, date, now) : null;
  const { day: text } = strings;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader
          title={day?.title ?? (isDate ? longDayOf(date) : text.goneTitle)}
          subtitle={city.name}
          back={{ accessibilityLabel: text.back, onPress: () => router.back() }}
          theme={{ accessibilityLabel: strings.theme.open, onPress: openThemeMenu }}
        />

        {view.status === 'loading' ? (
          <Text color="textMuted" style={styles.centered}>
            {strings.states.loading}
          </Text>
        ) : null}
        {view.status === 'empty' ? <EmptyState reason={view.reason} /> : null}
        {view.status === 'ready' && day === null ? (
          <View style={styles.gone}>
            <Text variant="title" accessibilityRole="header" style={styles.centered}>
              {text.goneTitle}
            </Text>
            <Text color="textMuted" style={styles.centered}>
              {text.gone}
            </Text>
          </View>
        ) : null}

        {view.status === 'ready' && day !== null ? (
          <>
            <DayHero day={day} />
            {view.isStale ? <StaleBanner age={ageLabel(view.forecast.generatedAt, now)} /> : null}
            <Card>
              <View style={styles.cardHeader}>
                <Text variant="section" accessibilityRole="header">
                  {text.hourly}
                </Text>
                <Text variant="caption" color="textMuted">
                  {text.hourlyLegend}
                </Text>
              </View>
              <HourlyChart columns={day.columns} />
            </Card>
            <View style={styles.tiles}>
              <StatTile label={text.stats.wind} value={shown(day.stats.wind, formatSpeed)} />
              <StatTile label={text.stats.rain} value={shown(day.stats.rain, formatMillimetres)} />
              <StatTile
                label={text.stats.humidity}
                value={shown(day.stats.humidity, formatPercent)}
              />
              <StatTile
                label={text.stats.feelsLike}
                value={shown(day.stats.feelsLike, formatTemperature)}
              />
            </View>
            {day.disagreement === null ? null : (
              <DisagreementCard disagreement={day.disagreement} />
            )}
            <Text variant="caption" color="textMuted" style={styles.centered}>
              {view.updated}
            </Text>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((theme) => ({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { flexGrow: 1, gap: theme.spacing.block, padding: theme.spacing.screen },
  centered: { textAlign: 'center' },
  gone: { gap: theme.spacing.item },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: theme.spacing.item,
  },
  tiles: { flexDirection: 'row', gap: theme.spacing.item },
}));

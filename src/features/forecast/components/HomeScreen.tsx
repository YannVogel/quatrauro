import { Link } from 'expo-router';
import { RefreshControl, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { strings } from '@/i18n';
import { useNow } from '@/lib/now';
import { Text, makeStyles, useTheme } from '@/ui';
import { CITIES } from '@shared/cities';

import { forecastView } from '../freshness';
import { useForecast } from '../hooks/useForecast';
import { ForecastStatus } from './ForecastStatus';

const [toulon, nice] = CITIES;

/** Écran provisoire : il sera remplacé par l'accueil d'une ville (M2-03). */
export function HomeScreen() {
  const styles = useStyles();
  const theme = useTheme();
  const now = useNow();
  const forecasts = [
    { city: toulon, forecast: useForecast(toulon.id) },
    { city: nice, forecast: useForecast(nice.id) },
  ];
  const refreshAll = (): void => {
    for (const { forecast } of forecasts) void forecast.refresh();
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={forecasts.some(({ forecast }) => forecast.isRefreshing)}
            onRefresh={refreshAll}
            tintColor={theme.colors.heroClear}
            colors={[theme.colors.heroClear]}
            progressBackgroundColor={theme.colors.card}
          />
        }
      >
        <Text accessibilityRole="header" variant="displayL" numberOfLines={1} adjustsFontSizeToFit>
          {strings.app.name}
        </Text>
        <Text variant="title">{strings.app.tagline}</Text>
        <Text color="textMuted" style={styles.centered}>
          {strings.home.placeholder}
        </Text>
        {forecasts.map(({ city, forecast }) => (
          <ForecastStatus key={city.id} city={city} view={forecastView(forecast, now)} now={now} />
        ))}
        {__DEV__ ? (
          <Link href="/dev/catalog" style={styles.link}>
            <Text variant="bodyStrong">{strings.home.openCatalog}</Text>
          </Link>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((theme) => ({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.block,
    padding: theme.spacing.screen,
  },
  centered: { textAlign: 'center' },
  link: {
    minHeight: theme.sizes.touchTarget,
    paddingHorizontal: theme.spacing.card,
    textAlignVertical: 'center',
  },
}));

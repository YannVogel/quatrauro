import { useRouter } from 'expo-router';
import { RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { strings } from '@/i18n';
import { isCityId, useCurrentCity } from '@/lib/currentCity';
import { useNow } from '@/lib/now';
import { useThemeSetting } from '@/lib/themePreference';
import { Card, LoadingSkeleton, makeStyles, useTheme } from '@/ui';
import { CITIES } from '@shared/cities';

import { forecastView } from '../freshness';
import { homeContent } from '../home';
import { useForecast } from '../hooks/useForecast';
import { EmptyState } from './EmptyState';
import { FreshnessNotice } from './FreshnessNotice';
import { HomeHero } from './HomeHero';
import { LinkRow } from './LinkRow';
import { UpcomingHours } from './UpcomingHours';
import { WeekCard } from './WeekCard';

/** Le sélecteur est alimenté par la configuration : aucune ville n'est nommée ici. */
const CITY_OPTIONS = CITIES.map((city) => ({ id: city.id, label: city.name }));

/** Accueil d'une ville : le temps maintenant, dans les prochaines heures, et sur sept jours. */
export function HomeScreen() {
  const styles = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const now = useNow();
  const { city, selectCity } = useCurrentCity();
  const { openThemeMenu } = useThemeSetting();
  const forecast = useForecast(city.id);
  const view = forecastView(forecast, now);
  const content = view.status === 'ready' ? homeContent(view.hours, view.days) : null;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={forecast.isRefreshing}
            onRefresh={() => void forecast.refresh()}
            tintColor={theme.colors.heroClear}
            colors={[theme.colors.heroClear]}
            progressBackgroundColor={theme.colors.card}
          />
        }
      >
        <HomeHero
          cities={CITY_OPTIONS}
          cityId={city.id}
          onSelectCity={(cityId) => {
            if (isCityId(cityId)) selectCity(cityId);
          }}
          content={content?.hero ?? null}
          isLoading={view.status === 'loading'}
          updated={
            view.status === 'ready'
              ? view.isRefreshing
                ? strings.freshness.refreshing
                : view.updated
              : null
          }
          onOpenModels={() => router.push('/models')}
          onOpenTheme={openThemeMenu}
        />

        {view.status === 'loading' ? (
          <LoadingSkeleton label={strings.states.loading} withHero={false} />
        ) : null}
        {view.status === 'empty' ? (
          <EmptyState reason={view.reason} onRetry={() => void forecast.refresh()} />
        ) : null}

        {view.status === 'ready' && content !== null ? (
          <>
            <FreshnessNotice view={view} now={now} />
            <UpcomingHours hours={content.hours} />
            <WeekCard
              days={content.week}
              scale={content.scale}
              onOpenDay={(date) => router.push({ pathname: '/day/[date]', params: { date } })}
            />
          </>
        ) : null}

        <Card>
          <View>
            <LinkRow
              label={strings.home.links.reliability}
              onPress={() => router.push('/reliability')}
            />
            <LinkRow label={strings.home.links.about} onPress={() => router.push('/about')} />
            {__DEV__ ? (
              <LinkRow
                label={strings.home.links.catalog}
                onPress={() => router.push('/dev/catalog')}
              />
            ) : null}
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((theme) => ({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { flexGrow: 1, gap: theme.spacing.block, padding: theme.spacing.screen },
}));

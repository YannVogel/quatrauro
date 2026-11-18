import { useRouter } from 'expo-router';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useForecast } from '@/features/forecast';
import { strings } from '@/i18n';
import { appVersion } from '@/lib/appVersion';
import { useCurrentCity } from '@/lib/currentCity';
import { useThemeSetting } from '@/lib/themePreference';
import { Card, ScreenHeader, Text, makeStyles } from '@/ui';
import { CITIES } from '@shared/cities';

import { computedAt, listOf, modelSources, stationSources } from '../about';
import { LINKS } from '../links';
import { ExternalLink } from './ExternalLink';
import { SourcesCard } from './SourcesCard';

const MODEL_SOURCES = modelSources();
const STATION_SOURCES = stationSources();
const CITY_NAMES = listOf(CITIES.map((city) => city.name));

/** « À propos des données » : ce qu'est l'app, d'où viennent ses données, et ses limites. */
export function AboutScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { city } = useCurrentCity();
  const { openThemeMenu } = useThemeSetting();
  const forecast = useForecast(city.id);
  const { about } = strings;
  const computed = computedAt(forecast.data?.generatedAt ?? null);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader
          title={about.title}
          back={{ accessibilityLabel: about.back, onPress: () => router.back() }}
          theme={{ accessibilityLabel: strings.theme.open, onPress: openThemeMenu }}
        />

        <Card testID="about-principle">
          <Text variant="section" accessibilityRole="header">
            {about.principleTitle}
          </Text>
          {about.principle.map((sentence) => (
            <Text key={sentence}>{sentence}</Text>
          ))}
        </Card>

        <SourcesCard models={MODEL_SOURCES} stations={STATION_SOURCES} />

        <Card testID="about-limits">
          <Text variant="section" accessibilityRole="header">
            {about.limitsTitle}
          </Text>
          <Text>{about.personalTool}</Text>
          <Text>{about.coverage(CITY_NAMES)}</Text>
          <Text>{about.notOfficial}</Text>
          <ExternalLink label={about.vigilance} url={LINKS.vigilance} />
        </Card>

        <Text variant="caption" color="textMuted" style={styles.centered}>
          {appVersion === null ? about.versionUnknown : about.version(appVersion)}
          {'\n'}
          {computed === null ? about.computedUnknown : about.computed(city.name, computed)}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((theme) => ({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { flexGrow: 1, gap: theme.spacing.block, padding: theme.spacing.screen },
  centered: { textAlign: 'center' },
}));

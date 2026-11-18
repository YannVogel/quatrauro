import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  EmptyState,
  FreshnessNotice,
  forecastView,
  useForecast,
  useVerification,
} from '@/features/forecast';
import { strings } from '@/i18n';
import { useCurrentCity } from '@/lib/currentCity';
import { formatTemperature } from '@/lib/format';
import { useNow } from '@/lib/now';
import { useThemeSetting } from '@/lib/themePreference';
import {
  Card,
  CitySwitch,
  HeroBlock,
  LoadingSkeleton,
  ModelRow,
  Pill,
  ScreenHeader,
  Text,
  makeStyles,
} from '@/ui';

import { defaultModelsDate, modelsContent } from '../models';
import type { ModelLine } from '../models';
import { ModelErrorsCard } from './ModelErrorsCard';

/** Pourquoi le modèle n'a pas de valeur ; rien à dire quand il en a une. */
function noteOf(line: ModelLine): string | undefined {
  const { models } = strings;
  if (line.status === 'absent') return models.absent;
  if (line.status === 'outOfRange') return models.outOfRange;
  return undefined;
}

/** « Les modèles » : pour un jour, la prévision combinée, celle de chaque modèle, son poids et son erreur. */
export function ModelsScreen() {
  const styles = useStyles();
  const router = useRouter();
  const now = useNow();
  const { city } = useCurrentCity();
  const { openThemeMenu } = useThemeSetting();
  const forecast = useForecast(city.id);
  const view = forecastView(forecast, now);
  const verification = useVerification(city.id).data;
  const [chosenDate, setChosenDate] = useState<string | null>(null);
  const { models: text } = strings;

  const days = view.status === 'ready' ? view.days : [];
  // Le jour choisi peut être devenu « hier » : on revient alors au jour par défaut.
  const date =
    chosenDate !== null && days.some((day) => day.date === chosenDate)
      ? chosenDate
      : defaultModelsDate(days);
  const content =
    view.status === 'ready' && date !== null
      ? modelsContent(view.forecast, verification, days, date, now)
      : null;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader
          title={text.title}
          subtitle={city.name}
          back={{ accessibilityLabel: text.back, onPress: () => router.back() }}
          theme={{ accessibilityLabel: strings.theme.open, onPress: openThemeMenu }}
        />

        {view.status === 'loading' ? <LoadingSkeleton label={strings.states.loading} /> : null}
        {view.status === 'empty' ? (
          <EmptyState reason={view.reason} onRetry={() => void forecast.refresh()} />
        ) : null}

        {view.status === 'ready' && content !== null ? (
          <>
            <HeroBlock testID="models-hero">
              <CitySwitch
                options={content.days.map((day) => ({ id: day.date, label: day.label }))}
                selectedId={content.date}
                onSelect={setChosenDate}
                accessibilityLabel={text.daySelector}
              />
              <View>
                <Text color="onHero">{content.moment}</Text>
                <View style={styles.combined}>
                  <Text variant="displayL" color="onHero" numberOfLines={1} adjustsFontSizeToFit>
                    {formatTemperature(content.combined, 1)}
                  </Text>
                  <Text color="onHero" style={styles.combinedLabel}>
                    {text.combined}
                  </Text>
                </View>
              </View>
              {content.spread === null ? null : (
                <Pill
                  label={text.spread(formatTemperature(content.spread, 1))}
                  detail={text.spreadDetail}
                />
              )}
            </HeroBlock>

            <FreshnessNotice view={view} now={now} />

            <Card>
              <View style={styles.cardHeader}>
                <Text variant="section" accessibilityRole="header">
                  {text.listTitle}
                </Text>
                <Text variant="caption" color="textMuted">
                  {text.listCaption}
                </Text>
              </View>
              <View>
                {content.lines.map((line) => (
                  <ModelRow
                    key={line.id}
                    name={line.name}
                    provider={line.provider}
                    note={noteOf(line)}
                    weight={line.weight}
                    value={
                      line.temperature === null ? null : formatTemperature(line.temperature, 1)
                    }
                  />
                ))}
              </View>
            </Card>

            <ModelErrorsCard errors={content.errors} />
            <Text variant="caption" color="textMuted">
              {text.explanation(city.name)}
            </Text>
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
  combined: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    columnGap: theme.spacing.block,
  },
  combinedLabel: { flexShrink: 1 },
  cardHeader: { gap: 2 },
}));

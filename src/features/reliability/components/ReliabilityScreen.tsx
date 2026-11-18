import { useRouter } from 'expo-router';
import { RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useVerification } from '@/features/forecast';
import { strings } from '@/i18n';
import { useCurrentCity } from '@/lib/currentCity';
import { formatInParis } from '@/lib/dates';
import { formatTemperature } from '@/lib/format';
import { useThemeSetting } from '@/lib/themePreference';
import { HeroBlock, Pill, ScreenHeader, Text, makeStyles, useTheme } from '@/ui';
import { startOfParisDay } from '@shared/parisTime';

import { reliabilityContent } from '../reliability';
import type { ReliabilityContent } from '../reliability';
import { ComparedDaysCard } from './ComparedDaysCard';
import { LeadErrorsCard } from './LeadErrorsCard';

type Ready = Extract<ReliabilityContent, { status: 'ready' }>;

const HOUR_MS = 3_600_000;
/** « 17 octobre », le jour civil d'une date `AAAA-MM-JJ`. */
const dayAndMonth = (date: string): string =>
  formatInParis(new Date(startOfParisDay(date).getTime() + 12 * HOUR_MS), 'd MMMM');

/** Le mélange face au meilleur modèle seul : la phrase dit ce qui est, dans les trois cas. */
function verdictText(content: Ready): string {
  const { reliability } = strings;
  if (content.best === null || content.verdict === null) return reliability.noBest;
  const error = formatTemperature(content.best.error, 1);
  return reliability[content.verdict](error, content.best.name);
}

/** « Fiabilité » : le bilan du mélange, tel qu'il est. */
export function ReliabilityScreen() {
  const styles = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const { city } = useCurrentCity();
  const { openThemeMenu } = useThemeSetting();
  const verification = useVerification(city.id);
  const { reliability: text } = strings;
  const content = verification.data === null ? null : reliabilityContent(verification.data);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={verification.isRefreshing}
            onRefresh={() => void verification.refresh()}
            tintColor={theme.colors.heroClear}
            colors={[theme.colors.heroClear]}
            progressBackgroundColor={theme.colors.card}
          />
        }
      >
        <ScreenHeader
          title={text.title}
          subtitle={city.name}
          back={{ accessibilityLabel: text.back, onPress: () => router.back() }}
          theme={{ accessibilityLabel: strings.theme.open, onPress: openThemeMenu }}
        />

        {content === null ? (
          <Text color="textMuted" style={styles.centered}>
            {verification.isLoading ? text.loading : text.unavailable}
          </Text>
        ) : null}

        {content?.status === 'insufficient' ? (
          <View style={styles.message}>
            <Text variant="title" accessibilityRole="header" style={styles.centered}>
              {text.insufficientTitle}
            </Text>
            <Text color="textMuted" style={styles.centered}>
              {text.insufficient(content.verifiedHours)}
            </Text>
          </View>
        ) : null}

        {content?.status === 'ready' ? (
          <>
            <HeroBlock testID="reliability-hero">
              <View>
                <Text color="onHero">{text.heroCaption(content.periodDays)}</Text>
                <Text variant="displayL" color="onHero" numberOfLines={1} adjustsFontSizeToFit>
                  {formatTemperature(content.blendError, 1)}
                </Text>
                <Text variant={content.verdict === 'worse' ? 'bodyStrong' : 'body'} color="onHero">
                  {verdictText(content)}
                </Text>
              </View>
              {content.rain === null ? null : (
                <Pill
                  label={text.rain(content.rain.correct, content.rain.count)}
                  detail={text.rainDetail}
                />
              )}
            </HeroBlock>
            {content.days.length === 0 ? null : <ComparedDaysCard days={content.days} />}
            <LeadErrorsCard leads={content.leads} />
            <Text variant="caption" color="textMuted" style={styles.centered}>
              {text.period(dayAndMonth(content.period.from), dayAndMonth(content.period.to))}
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
  message: { gap: theme.spacing.item },
}));

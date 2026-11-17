import { Redirect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { strings } from '@/i18n';
import { formatMillimetres, formatPercent, formatSpeed, formatTemperature } from '@/lib/format';
import {
  Card,
  CitySwitch,
  ConditionBadge,
  DayRow,
  HeroBlock,
  HourChip,
  HourlyChart,
  IconButton,
  MeterBar,
  ModelRow,
  Pill,
  ScreenHeader,
  StatTile,
  Text,
  ThemeProvider,
  conditionAppearance,
  makeStyles,
  useTheme,
} from '@/ui';
import type { TextVariant, ThemeName } from '@/ui';
import { CONDITIONS } from '@shared/conditions';

import {
  fakeChart,
  fakeCities,
  fakeHero,
  fakeHours,
  fakeMeters,
  fakeModels,
  fakeStats,
  fakeWeek,
  fakeWeekScale,
} from '../__fixtures__/catalog';

const TEXT_VARIANTS: readonly TextVariant[] = [
  'displayXL',
  'displayL',
  'value',
  'title',
  'stat',
  'heading',
  'section',
  'body',
  'bodyStrong',
  'label',
  'caption',
  'micro',
];

const { catalog } = strings;

function Section({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.section}>
      <Text variant="section">{title}</Text>
      {children}
    </View>
  );
}

function ConditionBlocks() {
  const styles = useStyles();
  return (
    <>
      {CONDITIONS.flatMap((condition) =>
        [false, true].map((isNight) => (
          <HeroBlock
            key={`${condition}-${isNight ? 'night' : 'day'}`}
            tone={conditionAppearance(condition, isNight).hero}
          >
            <View style={styles.spread}>
              <View style={styles.heroTexts}>
                <Text variant="displayL" color="onHero">
                  {formatTemperature(fakeHero.temperature)}
                </Text>
                <Text variant="title" color="onHero">
                  {strings.conditions[condition]}
                </Text>
                <Text color="onHero">{isNight ? catalog.night : catalog.day}</Text>
              </View>
              <ConditionBadge condition={condition} isNight={isNight} size="medium" />
            </View>
            <Pill
              label={catalog.reliability(formatPercent(fakeHero.reliability))}
              detail={fakeHero.agreement}
            />
          </HeroBlock>
        )),
      )}
    </>
  );
}

function CatalogContent({ onToggleTheme }: { readonly onToggleTheme: () => void }) {
  const router = useRouter();
  const theme = useTheme();
  const styles = useStyles();
  const [cityId, setCityId] = useState(fakeCities[0]?.id ?? '');

  return (
    <SafeAreaView style={styles.screen}>
      {/* La bascule du catalogue ne change pas le thème de l'app : la barre d'état la suit ici. */}
      <StatusBar style={theme.name === 'dark' ? 'light' : 'dark'} />
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader
          title={catalog.title}
          subtitle={catalog.subtitle}
          back={{ accessibilityLabel: catalog.back, onPress: () => router.back() }}
          theme={{ accessibilityLabel: catalog.toggleTheme, onPress: onToggleTheme }}
        />

        <Section title={catalog.sections.controls}>
          <HeroBlock>
            <View style={styles.spread}>
              <CitySwitch
                options={fakeCities}
                selectedId={cityId}
                onSelect={setCityId}
                accessibilityLabel={catalog.city}
              />
              <IconButton
                icon="theme"
                surface="hero"
                accessibilityLabel={catalog.toggleTheme}
                onPress={onToggleTheme}
              />
            </View>
            <View style={styles.spread}>
              <Text variant="displayXL" color="onHero">
                {formatTemperature(fakeHero.temperature)}
              </Text>
              <ConditionBadge condition="clear" />
            </View>
          </HeroBlock>
        </Section>

        <Section title={catalog.sections.conditions}>
          <ConditionBlocks />
        </Section>

        <Section title={catalog.sections.hours}>
          <View style={styles.tiles}>
            {fakeHours.map((hour) => (
              <HourChip key={hour.hour} {...hour} />
            ))}
          </View>
        </Section>

        <Section title={catalog.sections.week}>
          <Card>
            {/* Les lignes se touchent : c'est leur hauteur de cible tactile qui les espace. */}
            <View>
              {fakeWeek.map((day) => (
                <DayRow
                  key={day.dayLabel}
                  {...day}
                  scaleMin={fakeWeekScale.min}
                  scaleMax={fakeWeekScale.max}
                  onPress={() => undefined}
                />
              ))}
            </View>
          </Card>
        </Section>

        <Section title={catalog.sections.chart}>
          <Card>
            <HourlyChart columns={fakeChart} />
          </Card>
          <Card>
            <Text variant="caption" color="textMuted">
              {catalog.notes.fewColumns}
            </Text>
            <HourlyChart columns={fakeChart.slice(4, 7)} />
          </Card>
        </Section>

        <Section title={catalog.sections.stats}>
          <View style={styles.tiles}>
            <StatTile label={catalog.stats.wind} value={formatSpeed(fakeStats.wind)} />
            <StatTile label={catalog.stats.rain} value={formatMillimetres(fakeStats.rain)} />
            <StatTile label={catalog.stats.humidity} value={formatPercent(fakeStats.humidity)} />
            <StatTile label={catalog.stats.feelsLike} value={null} />
          </View>
        </Section>

        <Section title={catalog.sections.models}>
          <Card>
            <View>
              {fakeModels.map((model) => (
                <ModelRow
                  key={model.name}
                  name={model.name}
                  provider={model.provider}
                  weight={model.weight}
                  value={
                    model.temperature === null ? null : formatTemperature(model.temperature, 1)
                  }
                />
              ))}
            </View>
          </Card>
        </Section>

        <Section title={catalog.sections.meters}>
          <Card>
            {fakeMeters.map((value, index) => (
              <View key={index} style={styles.meter}>
                <MeterBar value={value} />
              </View>
            ))}
          </Card>
        </Section>

        <Section title={catalog.sections.typography}>
          <Card>
            {TEXT_VARIANTS.map((variant) => (
              <Text key={variant} variant={variant} numberOfLines={1} adjustsFontSizeToFit>
                {`${variant} ${formatTemperature(fakeHero.temperature)}`}
              </Text>
            ))}
            <Text color="textMuted">{theme.name}</Text>
          </Card>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * Catalogue des composants : un écran de développement, avec sa propre bascule de thème.
 * Dans une app distribuée, il renvoie à l'accueil.
 */
export function CatalogScreen() {
  const systemTheme = useTheme().name;
  const [theme, setTheme] = useState<ThemeName>(systemTheme);
  if (!__DEV__) return <Redirect href="/" />;
  return (
    <ThemeProvider preference={theme}>
      <CatalogContent onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />
    </ThemeProvider>
  );
}

const useStyles = makeStyles((theme) => ({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.screen, gap: theme.spacing.card },
  section: { gap: theme.spacing.block },
  spread: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroTexts: { flexShrink: 1 },
  tiles: { flexDirection: 'row', gap: theme.spacing.item },
  meter: { flexDirection: 'row' },
}));

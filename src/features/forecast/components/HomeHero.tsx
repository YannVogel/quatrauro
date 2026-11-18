import { Pressable, View } from 'react-native';

import { strings } from '@/i18n';
import { formatPercent, formatSpeed, formatTemperature } from '@/lib/format';
import {
  CitySwitch,
  ConditionBadge,
  HeroBlock,
  IconButton,
  Pill,
  Skeleton,
  Text,
  conditionAppearance,
  makeStyles,
} from '@/ui';
import type { CityOption } from '@/ui';

import type { HomeHero as HomeHeroContent } from '../home';

type HomeHeroProps = {
  readonly cities: readonly CityOption[];
  readonly cityId: string;
  readonly onSelectCity: (cityId: string) => void;
  /** Le temps qu'il fait ; `null` tant qu'il n'y a pas de prévision à montrer. */
  readonly content: HomeHeroContent | null;
  /** Premier chargement : des formes tiennent la place du temps qu'il fait. */
  readonly isLoading?: boolean;
  /** « Mis à jour à 22 h 27 » : toujours visible, sans avoir à faire défiler. */
  readonly updated: string | null;
  /** Ouvre « Les modèles ». */
  readonly onOpenModels: () => void;
  /** Ouvre le menu du thème. */
  readonly onOpenTheme: () => void;
};

/** Bloc d'état de l'accueil : la ville, la température de l'heure, la condition, la fiabilité du jour. */
export function HomeHero({
  cities,
  cityId,
  onSelectCity,
  content,
  isLoading = false,
  updated,
  onOpenModels,
  onOpenTheme,
}: HomeHeroProps) {
  const styles = useStyles();
  const { home, conditions } = strings;
  const tone =
    content === null || content.condition === null
      ? undefined
      : conditionAppearance(content.condition, content.isNight).hero;

  return (
    <HeroBlock tone={tone} testID="home-hero">
      <View style={styles.controls}>
        <View style={styles.cities}>
          <CitySwitch
            options={cities}
            selectedId={cityId}
            onSelect={onSelectCity}
            accessibilityLabel={home.city}
          />
        </View>
        <IconButton
          icon="theme"
          surface="hero"
          accessibilityLabel={strings.theme.open}
          onPress={onOpenTheme}
        />
      </View>
      {content === null && isLoading ? (
        <View style={styles.loading}>
          <Skeleton surface="hero" height={84} width="45%" />
          <Skeleton surface="hero" height={20} width="55%" />
          <Skeleton surface="hero" height={14} width="70%" />
        </View>
      ) : null}
      {content === null ? null : (
        <>
          <View style={styles.spread}>
            <Text
              variant="displayXL"
              color="onHero"
              numberOfLines={1}
              adjustsFontSizeToFit
              style={styles.temperature}
            >
              {formatTemperature(content.temperature)}
            </Text>
            {content.condition === null ? null : (
              // Le nom de la condition est écrit juste dessous : le rond se tait.
              <ConditionBadge condition={content.condition} isNight={content.isNight} decorative />
            )}
          </View>
          <View>
            {/* Le seul titre de l'accueil : les lecteurs d'écran s'y repèrent. */}
            <Text variant="title" color="onHero" accessibilityRole="header">
              {content.condition === null
                ? home.conditionUnavailable
                : conditions[content.condition]}
            </Text>
            <Text color="onHero">
              {home.dateAndWind(content.day, formatSpeed(content.windSpeed))}
            </Text>
            {updated === null ? null : (
              <Text variant="caption" color="onHero">
                {updated}
              </Text>
            )}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={[
              strings.spoken.reliability(
                content.reliability === null
                  ? strings.common.unavailable
                  : formatPercent(content.reliability),
              ),
              content.agreement,
              home.openModels,
            ]
              .filter((part) => part !== null)
              .join(', ')}
            onPress={onOpenModels}
            style={styles.pill}
          >
            <Pill
              label={home.reliability(formatPercent(content.reliability))}
              detail={content.agreement ?? undefined}
            />
          </Pressable>
        </>
      )}
    </HeroBlock>
  );
}

const useStyles = makeStyles((theme) => ({
  spread: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  controls: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.item },
  // Le sélecteur prend la place qui reste : avec beaucoup de villes, c'est lui qui défile.
  cities: { flex: 1 },
  // Le chiffre rétrécit plutôt que de pousser le rond hors du bloc.
  temperature: { flexShrink: 1 },
  pill: { minHeight: theme.sizes.touchTarget, justifyContent: 'center' },
  loading: { gap: theme.spacing.block },
}));

import { View } from 'react-native';

import { strings } from '@/i18n';
import { Text, makeStyles } from '@/ui';
import type { City } from '@shared/cities';

import { ageLabel } from '../freshness';
import type { ForecastView } from '../freshness';
import { EmptyState } from './EmptyState';
import { StaleBanner } from './StaleBanner';

type ForecastStatusProps = {
  readonly city: City;
  readonly view: ForecastView;
  readonly now: Date;
};

/**
 * Provisoire : dit où en est la prévision d'une ville (chargement, rien, à jour, ancienne),
 * en attendant l'accueil (M2-03), qui reprendra ces mêmes éléments.
 */
export function ForecastStatus({ city, view, now }: ForecastStatusProps) {
  const styles = useStyles();
  return (
    <View style={styles.block}>
      <Text variant="bodyStrong">{city.name}</Text>
      {view.status === 'loading' ? <Text color="textMuted">{strings.states.loading}</Text> : null}
      {view.status === 'empty' ? <EmptyState reason={view.reason} /> : null}
      {view.status === 'ready' ? (
        <>
          <Text color="textMuted">
            {view.isRefreshing ? strings.freshness.refreshing : view.updated}
          </Text>
          <Text color="textMuted">
            {strings.home.upcoming(view.hours.length, view.days.length)}
          </Text>
          {view.isStale ? <StaleBanner age={ageLabel(view.forecast.generatedAt, now)} /> : null}
          {view.refreshError === null ? null : (
            <Text color="textMuted" style={styles.centered}>
              {strings.states.refreshFailed[view.refreshError]}
            </Text>
          )}
        </>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  block: { alignItems: 'center', alignSelf: 'stretch', gap: theme.spacing.item },
  centered: { textAlign: 'center' },
}));

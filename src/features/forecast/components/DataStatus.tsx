import { View } from 'react-native';

import { strings } from '@/i18n';
import { formatInParis } from '@/lib/dates';
import { Text, makeStyles } from '@/ui';
import type { City } from '@shared/cities';
import type { ForecastFile } from '@shared/schemas';

import type { PublishedData } from '../hooks/usePublishedFile';

type DataStatusProps = {
  readonly city: City;
  readonly forecast: PublishedData<ForecastFile>;
};

/** « le mardi 17 novembre à 22 h 27 », à l'heure de Paris. */
const whenOf = (generatedAt: string): string =>
  formatInParis(new Date(generatedAt), "'le' EEEE d MMMM 'à' H 'h' mm");

function describe({ data, isLoading }: PublishedData<ForecastFile>): string {
  if (data !== null) return strings.home.data.computedAt(whenOf(data.generatedAt));
  return isLoading ? strings.home.data.loading : strings.home.data.none;
}

/** Provisoire : dit de quand date la prévision reçue pour une ville, en attendant l'accueil (M2-03). */
export function DataStatus({ city, forecast }: DataStatusProps) {
  const styles = useStyles();
  return (
    <View style={styles.row}>
      <Text variant="bodyStrong">{city.name}</Text>
      <Text color="textMuted" style={styles.centered}>
        {describe(forecast)}
      </Text>
      {forecast.error !== null && !forecast.isLoading ? (
        <Text color="textMuted" style={styles.centered}>
          {strings.home.data.refreshFailed}
        </Text>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles(() => ({
  row: { alignItems: 'center' },
  centered: { textAlign: 'center' },
}));

import { View } from 'react-native';

import { strings } from '@/i18n';
import { HourChip, makeStyles } from '@/ui';

import type { HomeHour } from '../home';

type UpcomingHoursProps = { readonly hours: readonly HomeHour[] };

/** Les prochaines heures, une vignette chacune. */
export function UpcomingHours({ hours }: UpcomingHoursProps) {
  const styles = useStyles();
  if (hours.length === 0) return null;
  return (
    <View accessibilityLabel={strings.home.nextHours} style={styles.row}>
      {hours.map(({ time, ...hour }) => (
        <HourChip key={time} {...hour} />
      ))}
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  row: { flexDirection: 'row', gap: theme.spacing.item },
}));

import { View } from 'react-native';

import { strings } from '@/i18n';
import { Card, DayRow } from '@/ui';

import type { HomeDay } from '../home';

type WeekCardProps = {
  readonly days: readonly HomeDay[];
  readonly scale: { readonly min: number; readonly max: number };
  /** Ouvre le détail d'un jour (`AAAA-MM-JJ`). */
  readonly onOpenDay: (date: string) => void;
};

/** La semaine : une ligne par jour, sur une échelle de température commune. */
export function WeekCard({ days, scale, onOpenDay }: WeekCardProps) {
  return (
    <Card>
      {/* Les lignes se touchent : c'est leur hauteur de cible tactile qui les espace. */}
      <View accessibilityLabel={strings.home.week}>
        {days.map(({ date, ...day }) => (
          <DayRow
            key={date}
            {...day}
            scaleMin={scale.min}
            scaleMax={scale.max}
            onPress={() => onOpenDay(date)}
          />
        ))}
      </View>
    </Card>
  );
}

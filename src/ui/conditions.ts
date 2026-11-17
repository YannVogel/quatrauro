// Apparence de chaque condition météo : son icône, la couleur du bloc d'état et celle du rond
// qui porte l'icône, de jour comme de nuit. Tableau de référence : docs/design/riviera.md.

import type { Condition } from '@shared/conditions';

import type { IconName } from './icons';
import type { ColorToken, HeroToken } from './theme';

export type ConditionAppearance = {
  readonly icon: IconName;
  /** Couleur du bloc d'état. */
  readonly hero: HeroToken;
  /** Couleur du rond d'icône : jaune quand le soleil est visible, pâle sinon. */
  readonly badge: Extract<ColorToken, 'sun' | 'pale'>;
};

type DayAndNight = { readonly day: ConditionAppearance; readonly night: ConditionAppearance };

/** Une condition qui a la même apparence de jour et de nuit. */
const always = (appearance: ConditionAppearance): DayAndNight => ({
  day: appearance,
  night: appearance,
});

const APPEARANCES: Readonly<Record<Condition, DayAndNight>> = {
  clear: {
    day: { icon: 'sun', hero: 'heroClear', badge: 'sun' },
    night: { icon: 'moon', hero: 'heroNight', badge: 'pale' },
  },
  partlyCloudy: {
    day: { icon: 'cloudSun', hero: 'heroClear', badge: 'sun' },
    night: { icon: 'cloudMoon', hero: 'heroNight', badge: 'pale' },
  },
  cloudy: always({ icon: 'cloud', hero: 'heroCloudy', badge: 'pale' }),
  rain: always({ icon: 'rain', hero: 'heroRain', badge: 'pale' }),
  showers: {
    day: { icon: 'showersDay', hero: 'heroRain', badge: 'pale' },
    night: { icon: 'showersNight', hero: 'heroRain', badge: 'pale' },
  },
  thunderstorm: always({ icon: 'thunderstorm', hero: 'heroStorm', badge: 'pale' }),
  snow: always({ icon: 'snow', hero: 'heroCloudy', badge: 'pale' }),
  windy: always({ icon: 'wind', hero: 'heroWind', badge: 'pale' }),
};

export function conditionAppearance(condition: Condition, isNight: boolean): ConditionAppearance {
  return APPEARANCES[condition][isNight ? 'night' : 'day'];
}

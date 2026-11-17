import { BLEND_CONFIG } from '../../blendConfig';
import { CONDITIONS } from '../../conditions';
import type { Condition } from '../../conditions';
import { announcesThunderstorm, dayCondition, hourCondition, isWet } from '../condition';
import type { ConditionHour, ConditionSettings, DayHour } from '../condition';

const SETTINGS: ConditionSettings = {
  ...BLEND_CONFIG.condition,
  hourlyAnnouncement: BLEND_CONFIG.rain.hourlyAnnouncement,
  dailyAnnouncement: BLEND_CONFIG.rain.dailyAnnouncement,
};

const DRY = 0.05;
const WET = 0.6;

const hour = (values: Partial<ConditionHour>): ConditionHour => ({
  cloudCover: 10,
  precipitationProbability: DRY,
  temperature: 18,
  windSpeed: 10,
  windGusts: 20,
  thunderstorm: false,
  ...values,
});

describe("condition d'une heure", () => {
  const cases: readonly (readonly [string, Partial<ConditionHour>, Condition | null])[] = [
    ['ciel dégagé', { cloudCover: 10 }, 'clear'],
    ['juste sous le seuil des éclaircies', { cloudCover: 24.9 }, 'clear'],
    ['au seuil des éclaircies', { cloudCover: 25 }, 'partlyCloudy'],
    ['juste sous le seuil du ciel couvert', { cloudCover: 74.9 }, 'partlyCloudy'],
    ['au seuil du ciel couvert', { cloudCover: 75 }, 'cloudy'],
    ['pluie sous un ciel couvert', { precipitationProbability: WET, cloudCover: 95 }, 'rain'],
    ['pluie sans nébulosité connue', { precipitationProbability: WET, cloudCover: null }, 'rain'],
    ['averses sous un ciel partagé', { precipitationProbability: WET, cloudCover: 50 }, 'showers'],
    ['au seuil de l’annonce de pluie', { precipitationProbability: 0.2, cloudCover: 90 }, 'rain'],
    [
      'juste sous le seuil de l’annonce',
      { precipitationProbability: 0.19, cloudCover: 90 },
      'cloudy',
    ],
    ['orage', { precipitationProbability: WET, thunderstorm: true }, 'thunderstorm'],
    ['orage annoncé sans pluie', { thunderstorm: true, cloudCover: 90 }, 'cloudy'],
    ['neige', { precipitationProbability: WET, temperature: 0.5, cloudCover: 95 }, 'snow'],
    [
      'au seuil de la neige',
      { precipitationProbability: WET, temperature: 1, cloudCover: 95 },
      'snow',
    ],
    ['pluie froide', { precipitationProbability: WET, temperature: 1.1, cloudCover: 95 }, 'rain'],
    [
      'pluie sans température',
      { precipitationProbability: WET, temperature: null, cloudCover: 95 },
      'rain',
    ],
    ['vent moyen fort', { windSpeed: 40 }, 'windy'],
    ['rafales fortes', { windGusts: 60 }, 'windy'],
    ['vent juste sous les seuils', { windSpeed: 39.9, windGusts: 59.9 }, 'clear'],
    [
      'vent fort sous la pluie',
      { precipitationProbability: WET, windGusts: 90, cloudCover: 95 },
      'rain',
    ],
    ['vent fort sans nébulosité', { windGusts: 70, cloudCover: null }, 'windy'],
    ['temps sec sans nébulosité', { cloudCover: null }, null],
    ['sans probabilité de pluie', { precipitationProbability: null }, null],
  ];

  it.each(cases)('%s', (_name, values, expected) => {
    expect(hourCondition(hour(values), SETTINGS)).toBe(expected);
  });

  it('atteint chaque condition de la liste', () => {
    const reached = new Set(cases.map(([, , expected]) => expected));
    expect(CONDITIONS.filter((condition) => !reached.has(condition))).toEqual([]);
  });
});

describe('orage annoncé par les modèles', () => {
  it('demande une majorité stricte des modèles qui donnent un code', () => {
    expect(announcesThunderstorm([95, 96, 3, 61])).toBe(false);
    expect(announcesThunderstorm([95, 99, 97, 61])).toBe(true);
    expect(announcesThunderstorm([95, null, null])).toBe(true);
    expect(announcesThunderstorm([95, 61, null])).toBe(false);
  });

  it('ne dit rien sans code', () => {
    expect(announcesThunderstorm([])).toBe(false);
    expect(announcesThunderstorm([null, null])).toBe(false);
  });
});

/** Un jour de 24 heures : nuit de 0 h à 6 h et de 21 h à 24 h. */
function dayHours(at: (index: number) => Partial<DayHour>): DayHour[] {
  return Array.from({ length: 24 }, (_, index) => ({
    condition: 'clear' as Condition | null,
    cloudCover: 10 as number | null,
    isNight: index < 6 || index >= 21,
    ...at(index),
  }));
}
const wetBetween = (from: number, to: number, condition: Condition) => (index: number) =>
  index >= from && index < to ? { condition, cloudCover: 90 } : {};

describe("condition d'un jour", () => {
  const cases: readonly (readonly [string, number | null, DayHour[], Condition | null])[] = [
    ['jour dégagé', 0.05, dayHours(() => ({})), 'clear'],
    ['éclaircies', 0.05, dayHours(() => ({ cloudCover: 50 })), 'partlyCloudy'],
    ['couvert', 0.05, dayHours(() => ({ cloudCover: 90 })), 'cloudy'],
    [
      'nuit couverte, journée dégagée',
      0.05,
      dayHours((index) => (index < 6 || index >= 21 ? { cloudCover: 100 } : {})),
      'clear',
    ],
    ['pluie durable', 0.8, dayHours(wetBetween(8, 16, 'rain')), 'rain'],
    ['six heures de pluie', 0.8, dayHours(wetBetween(8, 14, 'rain')), 'rain'],
    ['cinq heures de pluie', 0.8, dayHours(wetBetween(8, 13, 'rain')), 'showers'],
    ['pluie annoncée sans heure précise', 0.4, dayHours(() => ({})), 'showers'],
    ['au seuil du jour de pluie', 0.3, dayHours(wetBetween(0, 10, 'rain')), 'rain'],
    ['une heure d’orage', 0.8, dayHours(wetBetween(17, 18, 'thunderstorm')), 'thunderstorm'],
    ['neige dominante', 0.8, dayHours(wetBetween(4, 10, 'snow')), 'snow'],
    [
      'une heure de neige puis de la pluie',
      0.8,
      dayHours((index) => (index === 5 ? { condition: 'snow' } : wetBetween(6, 14, 'rain')(index))),
      'rain',
    ],
    [
      'vent fort en journée',
      0.05,
      dayHours((index) => (index >= 10 && index < 13 ? { condition: 'windy' } : {})),
      'windy',
    ],
    [
      'deux heures de vent fort',
      0.05,
      dayHours((index) => (index >= 10 && index < 12 ? { condition: 'windy' } : {})),
      'clear',
    ],
    [
      'vent fort la nuit seulement',
      0.05,
      dayHours((index) => (index < 5 ? { condition: 'windy' } : {})),
      'clear',
    ],
    ['sans nébulosité', 0.05, dayHours(() => ({ cloudCover: null, condition: null })), null],
    ['sans probabilité de pluie', null, dayHours(wetBetween(8, 16, 'rain')), null],
    ['sans aucune heure', 0.05, [], null],
  ];

  it.each(cases)('%s', (_name, precipitationProbability, hours, expected) => {
    expect(dayCondition({ precipitationProbability, hours }, SETTINGS)).toBe(expected);
  });

  it('atteint chaque condition de la liste', () => {
    const reached = new Set(cases.map(([, , , expected]) => expected));
    expect(CONDITIONS.filter((condition) => !reached.has(condition))).toEqual([]);
  });

  it('n’annonce jamais de pluie un jour sec, ni de temps sec un jour de pluie', () => {
    const everyHourly: (Condition | null)[] = [...CONDITIONS, null];
    for (const condition of everyHourly) {
      for (const cloudCover of [0, 50, 100, null]) {
        const hours = dayHours(() => ({ condition, cloudCover }));
        const dry = dayCondition({ precipitationProbability: 0.29, hours }, SETTINGS);
        const wet = dayCondition({ precipitationProbability: 0.3, hours }, SETTINGS);
        expect(isWet(dry)).toBe(false);
        expect(isWet(wet)).toBe(true);
      }
    }
  });
});

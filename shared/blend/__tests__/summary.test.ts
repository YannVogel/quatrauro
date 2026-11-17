import { BLEND_CONFIG } from '../../blendConfig';
import type { Condition } from '../../conditions';
import { startOfParisDay } from '../../parisTime';
import { daySummary } from '../summary';
import type { SummaryHour, SummarySettings } from '../summary';

const SETTINGS: SummarySettings = { ...BLEND_CONFIG.condition, ...BLEND_CONFIG.summary };
const HOUR_MS = 3_600_000;
const SUMMER_DAY = '2026-07-14';
const WINTER_DAY = '2026-12-10';

type HourValues = { readonly condition?: Condition | null; readonly cloudCover?: number | null };

/** Les 24 heures d'un jour civil de Paris ; `at` reçoit l'heure de Paris. */
function parisDay(date: string, at: (hour: number) => HourValues): SummaryHour[] {
  const start = startOfParisDay(date).getTime();
  return Array.from({ length: 24 }, (_, hour) => ({
    time: new Date(start + hour * HOUR_MS).toISOString(),
    condition: 'clear' as Condition | null,
    cloudCover: 10 as number | null,
    ...at(hour),
  }));
}

/** Pluie aux heures de Paris données. */
const rainAt =
  (...wet: readonly number[]) =>
  (hour: number): HourValues =>
    wet.includes(hour) ? { condition: 'rain', cloudCover: 95 } : {};
const range = (from: number, to: number): number[] =>
  Array.from({ length: to - from + 1 }, (_, index) => from + index);

const summaryOf = (
  condition: Condition | null,
  hours: SummaryHour[],
  windGustsMax: number | null = 20,
): string | null => daySummary({ condition, windGustsMax, hours }, SETTINGS);

describe('résumé d’un jour de pluie', () => {
  const cases: readonly (readonly [string, readonly number[], string])[] = [
    ['pluie annoncée sans heure précise', [], 'Risque d’averses dans la journée'],
    ['pluie de 4 h à 19 h', range(4, 19), 'Pluie une grande partie de la journée'],
    ['pluie de 6 h à 18 h', range(6, 18), 'Pluie une grande partie de la journée'],
    ['pluie de 0 h à 17 h', range(0, 17), 'Pluie jusqu’à 17\u00a0h'],
    ['une seule heure', [16], 'Averse vers 16 h'],
    ['pluie le soir seulement', range(19, 23), 'Matinée sèche, soirée arrosée'],
    ['pluie à partir de 18 h', range(18, 22), 'Matinée sèche, soirée arrosée'],
    ['pluie du début du jour à 11 h', range(0, 11), 'Pluie jusqu’à 11 h'],
    ['pluie déjà là à 7 h', range(7, 10), 'Pluie jusqu’à 10 h'],
    ['pluie qui arrive à 15 h et dure', range(15, 23), 'Pluie dès 15 h'],
    [
      'pluie qui arrive à 8 h et dure jusqu’à 21 h',
      [...range(8, 12), ...range(17, 21)],
      'Pluie dès 8 h',
    ],
    ['pluie au milieu du jour', range(10, 16), 'Pluie entre 10 h et 16 h'],
    [
      'pluie de 8 h à 20 h, onze heures',
      [...range(8, 13), ...range(16, 20)],
      'Pluie entre 8 h et 20 h',
    ],
    ['averses éparses', [9, 14, 19], 'Averses entre 9 h et 19 h'],
  ];

  it.each(cases)('%s', (_name, wet, expected) => {
    expect(summaryOf('rain', parisDay(SUMMER_DAY, rainAt(...wet)))).toBe(expected);
  });

  it('cite les heures de Paris, en été comme en hiver', () => {
    // 15 h à Paris : 13 h UTC en juillet, 14 h UTC en décembre.
    const summer = parisDay(SUMMER_DAY, rainAt(...range(15, 23)));
    const winter = parisDay(WINTER_DAY, rainAt(...range(15, 23)));
    expect(summer[15]?.time).toBe('2026-07-14T13:00:00.000Z');
    expect(winter[15]?.time).toBe('2026-12-10T14:00:00.000Z');
    expect(summaryOf('rain', summer)).toBe('Pluie dès 15 h');
    expect(summaryOf('rain', winter)).toBe('Pluie dès 15 h');
  });

  it('dit l’heure de l’orage avant tout le reste', () => {
    const hours = parisDay(SUMMER_DAY, (hour) =>
      hour === 17 ? { condition: 'thunderstorm' } : rainAt(...range(12, 20))(hour),
    );
    expect(summaryOf('thunderstorm', hours)).toBe('Orage vers 17 h');
  });

  it('parle toujours de pluie, d’averse ou d’orage', () => {
    for (const condition of ['rain', 'showers', 'thunderstorm'] as const) {
      for (const wet of [[], [3], range(0, 23), range(18, 23), [2, 9, 21]]) {
        const summary = summaryOf(condition, parisDay(SUMMER_DAY, rainAt(...wet)), 80);
        expect(summary).toMatch(/pluie|averse|arrosée|orage/i);
      }
    }
  });
});

describe('résumé d’un jour sec', () => {
  const sky =
    (morning: number, afternoon: number) =>
    (hour: number): HourValues => ({ cloudCover: hour < 12 ? morning : afternoon });

  it('signale les fortes rafales, arrondies au km/h', () => {
    expect(
      summaryOf(
        'windy',
        parisDay(SUMMER_DAY, () => ({})),
        84.6,
      ),
    ).toBe('Rafales jusqu’à 85 km/h');
    expect(
      summaryOf(
        'clear',
        parisDay(SUMMER_DAY, () => ({})),
        60,
      ),
    ).toBe('Rafales jusqu’à 60 km/h');
  });

  it('oppose la matinée et l’après-midi quand le ciel change franchement', () => {
    expect(summaryOf('partlyCloudy', parisDay(SUMMER_DAY, sky(5, 95)))).toBe(
      'Matinée ensoleillée, après-midi nuageux',
    );
    expect(summaryOf('partlyCloudy', parisDay(SUMMER_DAY, sky(95, 5)))).toBe(
      'Matinée nuageuse, après-midi ensoleillé',
    );
  });

  it('ne dit rien quand il n’y a rien à ajouter', () => {
    expect(
      summaryOf(
        'clear',
        parisDay(SUMMER_DAY, () => ({})),
      ),
    ).toBeNull();
    expect(summaryOf('partlyCloudy', parisDay(SUMMER_DAY, sky(5, 60)))).toBeNull();
    expect(summaryOf('cloudy', parisDay(SUMMER_DAY, sky(90, 90)), 59.9)).toBeNull();
    expect(
      summaryOf(
        'clear',
        parisDay(SUMMER_DAY, () => ({ cloudCover: null })),
        null,
      ),
    ).toBeNull();
  });

  it('ne parle jamais de pluie, même si une heure isolée en annonce', () => {
    for (const condition of ['clear', 'partlyCloudy', 'cloudy', 'windy'] as const) {
      for (const gusts of [10, 90, null]) {
        for (const wet of [[], [15], range(0, 23)]) {
          const summary = summaryOf(condition, parisDay(SUMMER_DAY, rainAt(...wet)), gusts);
          expect(summary ?? '').not.toMatch(/pluie|averse|arrosée|orage/i);
        }
      }
    }
  });
});

describe('jours sans résumé', () => {
  it('ne résume ni un jour sans condition, ni un jour de neige', () => {
    const hours = parisDay(WINTER_DAY, rainAt(...range(8, 16)));
    expect(summaryOf(null, hours, 90)).toBeNull();
    expect(summaryOf('snow', hours, 90)).toBeNull();
  });
});

describe('jour de changement d’heure', () => {
  it('compte les deux heures « 2 h » du jour de 25 heures', () => {
    // Le 25 octobre 2026 : 2 h à Paris arrive deux fois, à 0 h puis à 1 h UTC.
    const start = startOfParisDay('2026-10-25').getTime();
    const hours: SummaryHour[] = Array.from({ length: 25 }, (_, index) => ({
      time: new Date(start + index * HOUR_MS).toISOString(),
      condition: index >= 2 && index <= 5 ? 'rain' : 'clear',
      cloudCover: 50,
    }));
    expect(hours[2]?.time).toBe('2026-10-25T00:00:00.000Z');
    expect(hours[3]?.time).toBe('2026-10-25T01:00:00.000Z');
    expect(summaryOf('showers', hours)).toBe('Pluie jusqu’à 4 h');
  });
});

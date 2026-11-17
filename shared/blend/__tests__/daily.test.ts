import { aggregateDaily } from '../daily';
import type { HourlyPoint } from '../daily';

const HOUR_MS = 3_600_000;
const MIN_COVERAGE = 0.75;

/** Heures consécutives à partir d'un instant, avec une température qui vaut l'heure UTC. */
function hoursFrom(
  start: string,
  count: number,
  overrides: Partial<HourlyPoint> = {},
): HourlyPoint[] {
  return Array.from({ length: count }, (_, index) => {
    const time = new Date(Date.parse(start) + index * HOUR_MS);
    return {
      time: time.toISOString(),
      temperature: time.getUTCHours(),
      apparentTemperature: time.getUTCHours() - 2,
      humidity: 60,
      windSpeed: 10 + (index % 5),
      windGusts: 20 + (index % 7),
      precipitation: 0.5,
      ...overrides,
    };
  });
}

describe('agrégats quotidiens', () => {
  it('range les heures par jour civil de Paris', () => {
    // Du 16 novembre 23 h UTC (minuit à Paris) au 18 novembre 22 h UTC : deux jours pleins.
    const days = aggregateDaily(hoursFrom('2026-11-16T23:00:00Z', 48), MIN_COVERAGE);
    expect(days.map((day) => day.date)).toEqual(['2026-11-17', '2026-11-18']);
  });

  it('calcule minimum, maximum, cumul, vent le plus fort et humidité moyenne', () => {
    const [day] = aggregateDaily(hoursFrom('2026-11-16T23:00:00Z', 24), MIN_COVERAGE);
    expect(day).toEqual({
      date: '2026-11-17',
      min: 0,
      max: 23,
      apparentMin: -2,
      apparentMax: 21,
      precipitation: 12,
      windSpeedMax: 14,
      windGustsMax: 26,
      humidity: 60,
    });
  });

  it("compte 23 heures le jour du passage à l'heure d'été", () => {
    // Le 29 mars 2026 va de 23 h UTC la veille à 22 h UTC : 23 heures.
    const days = aggregateDaily(hoursFrom('2026-03-28T23:00:00Z', 23 + 24), MIN_COVERAGE);
    expect(days.map((day) => day.date)).toEqual(['2026-03-29', '2026-03-30']);
    expect(days[0]?.precipitation).toBe(11.5);
    expect(days[1]?.precipitation).toBe(12);
  });

  it("compte 25 heures le jour du retour à l'heure d'hiver", () => {
    // Le 25 octobre 2026 va de 22 h UTC la veille à 23 h UTC : 25 heures.
    const days = aggregateDaily(hoursFrom('2026-10-24T22:00:00Z', 25 + 24), MIN_COVERAGE);
    expect(days.map((day) => day.date)).toEqual(['2026-10-25', '2026-10-26']);
    expect(days[0]?.precipitation).toBe(12.5);
    expect(days[1]?.precipitation).toBe(12);
  });

  it("n'agrège pas un jour dont trop d'heures manquent", () => {
    // Six heures seulement du 17 novembre : pas de minimum ni de cumul.
    const [partial] = aggregateDaily(hoursFrom('2026-11-17T17:00:00Z', 6), MIN_COVERAGE);
    expect(partial).toEqual({
      date: '2026-11-17',
      min: null,
      max: null,
      apparentMin: null,
      apparentMax: null,
      precipitation: null,
      windSpeedMax: null,
      windGustsMax: null,
      humidity: null,
    });
    // Dix-huit heures sur vingt-quatre : le seuil de 75 % est atteint.
    const [enough] = aggregateDaily(hoursFrom('2026-11-16T23:00:00Z', 18), MIN_COVERAGE);
    expect(enough?.max).toBe(23);
    expect(enough?.precipitation).toBe(9);
  });

  it('juge la couverture variable par variable', () => {
    const hours = hoursFrom('2026-11-16T23:00:00Z', 24).map((hour, index) => ({
      ...hour,
      windGusts: index < 20 ? null : hour.windGusts,
    }));
    const [day] = aggregateDaily(hours, MIN_COVERAGE);
    expect(day?.windGustsMax).toBeNull();
    expect(day?.windSpeedMax).toBe(14);
    expect(day?.max).toBe(23);
  });

  it('rend des jours vides quand rien n’est prévu', () => {
    const hours = hoursFrom('2026-11-16T23:00:00Z', 24, {
      temperature: null,
      apparentTemperature: null,
      humidity: null,
      windSpeed: null,
      windGusts: null,
      precipitation: null,
    });
    const [day] = aggregateDaily(hours, MIN_COVERAGE);
    expect(day?.min).toBeNull();
    expect(day?.precipitation).toBeNull();
    expect(aggregateDaily([], MIN_COVERAGE)).toEqual([]);
  });

  it('remet les jours dans l’ordre', () => {
    const hours = [
      ...hoursFrom('2026-11-17T23:00:00Z', 24),
      ...hoursFrom('2026-11-16T23:00:00Z', 24),
    ];
    expect(aggregateDaily(hours, MIN_COVERAGE).map((day) => day.date)).toEqual([
      '2026-11-17',
      '2026-11-18',
    ]);
  });
});

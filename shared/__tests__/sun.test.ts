import { CITIES } from '../cities';
import { isNight, solarElevation } from '../sun';

// Levers et couchers du soleil relevés chez Open-Meteo le 17 novembre 2026
// (`daily=sunrise,sunset&timezone=GMT`), aux points de prévision des deux villes. Heures UTC.
const REFERENCE = [
  { city: 'toulon', date: '2026-08-20', sunrise: '04:47', sunset: '18:31' },
  { city: 'toulon', date: '2026-09-23', sunrise: '05:24', sunset: '17:32' },
  { city: 'toulon', date: '2026-11-17', sunrise: '06:31', sunset: '16:10' },
  { city: 'nice', date: '2026-08-20', sunrise: '04:40', sunset: '18:26' },
  { city: 'nice', date: '2026-09-23', sunrise: '05:19', sunset: '17:26' },
  { city: 'nice', date: '2026-11-17', sunrise: '06:27', sunset: '16:03' },
] as const;

const MINUTE_MS = 60_000;
/** Marge autour de l'heure de référence : elle est arrondie à la minute et vient d'une autre formule. */
const MARGIN_MINUTES = 4;

const placeOf = (cityId: string) => {
  const city = CITIES.find((candidate) => candidate.id === cityId);
  if (city === undefined) throw new Error(`Ville inconnue : ${cityId}`);
  return { latitude: city.latitude, longitude: city.longitude };
};
const shifted = (date: string, time: string, minutes: number): Date =>
  new Date(Date.parse(`${date}T${time}:00Z`) + minutes * MINUTE_MS);

describe('jour ou nuit', () => {
  it.each(REFERENCE)('suit le lever et le coucher du soleil à $city le $date', (reference) => {
    const place = placeOf(reference.city);
    expect(isNight(shifted(reference.date, reference.sunrise, -MARGIN_MINUTES), place)).toBe(true);
    expect(isNight(shifted(reference.date, reference.sunrise, MARGIN_MINUTES), place)).toBe(false);
    expect(isNight(shifted(reference.date, reference.sunset, -MARGIN_MINUTES), place)).toBe(false);
    expect(isNight(shifted(reference.date, reference.sunset, MARGIN_MINUTES), place)).toBe(true);
  });

  it('place le soleil haut à midi et sous l’horizon à minuit', () => {
    const toulon = placeOf('toulon');
    expect(solarElevation(new Date('2026-06-21T11:40:00Z'), toulon)).toBeGreaterThan(68);
    expect(solarElevation(new Date('2026-06-21T23:40:00Z'), toulon)).toBeLessThan(-20);
    expect(solarElevation(new Date('2026-12-21T11:40:00Z'), toulon)).toBeLessThan(25);
  });
});

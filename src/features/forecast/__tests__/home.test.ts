// Contenu de l'accueil, tiré d'un vrai fichier publié (Toulon, calculé le 17 novembre 2026).

import { published } from '@/lib/testing/published';
import type { DailyForecast, HourlyForecast } from '@shared/schemas';

import { upcomingDays, upcomingHours } from '../freshness';
import { homeContent, longDayOf, shortDayOf, spokenDayOf } from '../home';

const forecast = published.forecast.toulon;

function contentAt(
  instant: string,
  change: (hour: HourlyForecast) => HourlyForecast = (hour) => hour,
) {
  const now = new Date(instant);
  const [today, ...next] = upcomingDays(forecast.daily, now);
  if (today === undefined) throw new Error('aucun jour à venir');
  return homeContent(upcomingHours(forecast.hourly, now).map(change), [today, ...next]);
}

describe('noms des jours', () => {
  it('se disent en français, à partir du jour civil', () => {
    expect(shortDayOf('2026-11-17')).toBe('Mar.');
    expect(spokenDayOf('2026-11-17')).toBe('mardi');
    expect(longDayOf('2026-11-17')).toBe('Mardi 17 novembre');
  });

  it('ne se décalent pas les jours de changement d’heure', () => {
    expect(spokenDayOf('2026-03-29')).toBe('dimanche');
    expect(spokenDayOf('2026-10-25')).toBe('dimanche');
  });
});

describe('contenu de l’accueil', () => {
  it('met l’heure en cours dans le bloc d’état et les cinq suivantes dans les vignettes', () => {
    const content = contentAt('2026-11-18T08:30:00Z');
    expect(content.hero).toMatchObject({
      temperature: 16.8,
      condition: 'clear',
      isNight: false,
      windSpeed: 14,
      day: 'Mercredi 18 novembre',
      reliability: 62,
      agreement: '5 modèles d’accord',
    });
    expect(content.hours.map((hour) => hour.hour)).toEqual([10, 11, 12, 13, 14]);
    expect(content.hours[0]).toEqual({ time: '2026-11-18T09:00:00Z', hour: 10, temperature: 18.3 });
  });

  it('donne les heures à l’heure de Paris, en hiver comme en été', () => {
    // 9 h UTC font 10 h à Paris en novembre.
    expect(contentAt('2026-11-18T08:30:00Z').hours[0]?.hour).toBe(10);
    // Passage de minuit : 23 h UTC font 0 h le lendemain.
    expect(contentAt('2026-11-18T21:30:00Z').hours.map((hour) => hour.hour)).toEqual([
      23, 0, 1, 2, 3,
    ]);
  });

  it('ne parle de pluie que si une des cinq heures atteint le seuil d’annonce', () => {
    expect(
      contentAt('2026-11-18T08:30:00Z').hours.every((hour) => !('rainProbability' in hour)),
    ).toBe(true);
    // 17 h 20 mardi : les heures suivantes sont à 51, 25, 12, 12 et 1 %.
    expect(contentAt('2026-11-17T16:20:00Z').hours.map((hour) => hour.rainProbability)).toEqual([
      51, 25, 12, 12, 1,
    ]);
  });

  it('affiche le risque pour toutes les vignettes dès qu’une seule atteint 20 %', () => {
    const atThreshold = contentAt('2026-11-18T08:30:00Z', (hour) =>
      hour.time === '2026-11-18T11:00:00Z' ? { ...hour, precipitationProbability: 20 } : hour,
    );
    expect(atThreshold.hours.map((hour) => hour.rainProbability)).toEqual([1, 1, 20, 1, 1]);
    const below = contentAt('2026-11-18T08:30:00Z', (hour) =>
      hour.time === '2026-11-18T11:00:00Z' ? { ...hour, precipitationProbability: 19 } : hour,
    );
    expect(below.hours.every((hour) => !('rainProbability' in hour))).toBe(true);
  });

  it('range la semaine sur une échelle commune, du plus froid au plus chaud', () => {
    const content = contentAt('2026-11-17T22:00:00Z');
    expect(content.week.map((day) => day.dayLabel)).toEqual([
      'Mar.',
      'Mer.',
      'Jeu.',
      'Ven.',
      'Sam.',
      'Dim.',
      'Lun.',
    ]);
    expect(content.scale).toEqual({ min: 10.3, max: 19 });
    expect(content.week[0]).toMatchObject({
      date: '2026-11-17',
      spokenDay: 'mardi',
      min: 13.8,
      max: 19,
    });
  });
});

describe('modèles d’accord', () => {
  const [today] = forecast.daily;
  const withModels = (modelsAgreeing: number | null, modelsTotal: number) => {
    const day = { ...today, modelsAgreeing, modelsTotal } as DailyForecast;
    return homeContent([], [day]).hero.agreement;
  };

  it('se disent selon le nombre de modèles', () => {
    expect(withModels(4, 4)).toBe('4 modèles d’accord');
    expect(withModels(3, 4)).toBe('3 modèles sur 4 d’accord');
    expect(withModels(0, 3)).toBe('0 modèles sur 3 d’accord');
    // Un modèle seul n'est « d'accord » avec personne.
    expect(withModels(1, 1)).toBe('1 modèle');
  });

  it('ne disent rien quand on ne sait pas', () => {
    expect(withModels(null, 4)).toBeNull();
    expect(withModels(0, 0)).toBeNull();
  });
});

describe('sans heure à venir', () => {
  it('laisse le bloc d’état sans température plutôt que d’en inventer une', () => {
    const [today] = forecast.daily;
    if (today === undefined) throw new Error('jour attendu');
    const content = homeContent([], [today]);
    expect(content.hero).toMatchObject({ temperature: null, condition: null, windSpeed: null });
    expect(content.hours).toEqual([]);
  });
});

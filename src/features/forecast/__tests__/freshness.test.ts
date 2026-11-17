// Fraîcheur d'une prévision, horloge figée : chaque cas passe son propre « maintenant ».
// La prévision est un vrai fichier, calculé le 17 novembre 2026 à 21 h 27 UTC (22 h 27 à Paris).

import { DataError } from '@/lib/data';
import { published } from '@/lib/testing/published';

import {
  ageInHours,
  ageLabel,
  forecastView,
  isStale,
  upcomingDays,
  upcomingHours,
  updatedLabel,
} from '../freshness';
import type { PublishedData } from '../hooks/usePublishedFile';

const forecast = published.forecast.toulon;
const GENERATED = '2026-11-17T21:27:43Z';
const at = (iso: string): Date => new Date(iso);

const from = (
  overrides: Partial<PublishedData<typeof forecast>> = {},
): PublishedData<typeof forecast> => ({
  data: forecast,
  error: null,
  isLoading: false,
  isRefreshing: false,
  refresh: () => Promise.resolve(),
  ...overrides,
});

describe('âge de la prévision', () => {
  it('se compte en heures entières', () => {
    expect(forecast.generatedAt).toBe(GENERATED);
    expect(ageInHours(GENERATED, at('2026-11-17T21:30:00Z'))).toBe(0);
    expect(ageInHours(GENERATED, at('2026-11-18T11:00:00Z'))).toBe(13);
    // Une horloge en retard ne donne pas un âge négatif.
    expect(ageInHours(GENERATED, at('2026-11-17T20:00:00Z'))).toBe(0);
  });

  it('se dit en heures, puis en jours au-delà de deux jours', () => {
    expect(ageLabel(GENERATED, at('2026-11-17T22:40:00Z'))).toBe('1 heure');
    expect(ageLabel(GENERATED, at('2026-11-18T11:00:00Z'))).toBe('13 heures');
    expect(ageLabel(GENERATED, at('2026-11-19T21:00:00Z'))).toBe('47 heures');
    expect(ageLabel(GENERATED, at('2026-11-19T22:00:00Z'))).toBe('2 jours');
    expect(ageLabel(GENERATED, at('2026-11-21T08:00:00Z'))).toBe('3 jours');
  });
});

describe('prévision ancienne', () => {
  it('ne l’est pas jusqu’à douze heures comprises', () => {
    expect(isStale(GENERATED, at('2026-11-17T23:27:43Z'))).toBe(false);
    expect(isStale(GENERATED, at('2026-11-18T09:27:43Z'))).toBe(false);
  });

  it('l’est au-delà de douze heures', () => {
    expect(isStale(GENERATED, at('2026-11-18T09:27:44Z'))).toBe(true);
    expect(isStale(GENERATED, at('2026-11-19T12:00:00Z'))).toBe(true);
  });
});

describe('heure de mise à jour', () => {
  it('se dit à l’heure de Paris, avec le jour quand ce n’est plus aujourd’hui', () => {
    expect(updatedLabel(GENERATED, at('2026-11-17T22:00:00Z'))).toBe('Mis à jour à 22 h 27');
    // Minuit passé à Paris : la prévision est d'hier.
    expect(updatedLabel(GENERATED, at('2026-11-17T23:05:00Z'))).toBe('Mis à jour hier à 22 h 27');
    expect(updatedLabel(GENERATED, at('2026-11-18T22:30:00Z'))).toBe('Mis à jour hier à 22 h 27');
    expect(updatedLabel(GENERATED, at('2026-11-19T08:00:00Z'))).toBe(
      'Mis à jour mardi 17 novembre à 22 h 27',
    );
  });
});

describe('heures à venir', () => {
  it('commencent à l’heure en cours', () => {
    const hours = upcomingHours(forecast.hourly, at('2026-11-18T08:40:00Z'));
    expect(hours[0]?.time).toBe('2026-11-18T08:00:00Z');
    expect(hours[1]?.time).toBe('2026-11-18T09:00:00Z');
    expect(hours.every((hour) => hour.time >= '2026-11-18T08:00:00Z')).toBe(true);
  });

  it('ne gardent rien quand toute la prévision est passée', () => {
    expect(upcomingHours(forecast.hourly, at('2026-11-24T00:00:00Z'))).toEqual([]);
  });
});

describe('jours à venir', () => {
  it('commencent aujourd’hui, jour civil de Paris', () => {
    expect(upcomingDays(forecast.daily, at('2026-11-17T22:00:00Z')).map((day) => day.date)).toEqual(
      [
        '2026-11-17',
        '2026-11-18',
        '2026-11-19',
        '2026-11-20',
        '2026-11-21',
        '2026-11-22',
        '2026-11-23',
      ],
    );
  });

  it('changent à minuit, heure de Paris, pas à minuit UTC', () => {
    // 23 h 05 UTC le 17, c'est 0 h 05 le 18 à Paris.
    const days = upcomingDays(forecast.daily, at('2026-11-17T23:05:00Z'));
    expect(days[0]?.date).toBe('2026-11-18');
    expect(days).toHaveLength(6);
  });
});

describe('ce qu’un écran doit montrer', () => {
  const morning = at('2026-11-18T07:00:00Z');

  it('annonce le premier chargement', () => {
    expect(forecastView(from({ data: null, isLoading: true }), morning)).toEqual({
      status: 'loading',
    });
  });

  it('dit pourquoi il n’y a rien, plutôt que de montrer du vide', () => {
    expect(forecastView(from({ data: null }), morning)).toEqual({
      status: 'empty',
      reason: 'none',
    });
    const offline = new DataError('network', 'Pas de réponse');
    expect(forecastView(from({ data: null, error: offline }), morning)).toEqual({
      status: 'empty',
      reason: 'network',
    });
    const tooNew = new DataError('version', 'Version inconnue');
    expect(forecastView(from({ data: null, error: tooNew }), morning)).toEqual({
      status: 'empty',
      reason: 'version',
    });
  });

  it('montre une prévision fraîche, sans avertissement', () => {
    const view = forecastView(from(), at('2026-11-17T22:00:00Z'));
    expect(view).toMatchObject({
      status: 'ready',
      isStale: false,
      isRefreshing: false,
      refreshError: null,
      updated: 'Mis à jour à 22 h 27',
    });
  });

  it('change de jour entre le calcul et l’affichage', () => {
    // Calculée mardi à 22 h 27, ouverte mercredi à 8 h : mardi n'est plus à venir.
    const view = forecastView(from(), morning);
    if (view.status !== 'ready') throw new Error('prévision attendue');
    expect(view.days[0]?.date).toBe('2026-11-18');
    expect(view.hours[0]?.time).toBe('2026-11-18T07:00:00Z');
    expect(view.updated).toBe('Mis à jour hier à 22 h 27');
    expect(view.isStale).toBe(false);
  });

  it('signale une prévision de plus de douze heures', () => {
    const view = forecastView(from(), at('2026-11-18T11:00:00Z'));
    expect(view).toMatchObject({ status: 'ready', isStale: true });
  });

  it('garde la prévision quand son rafraîchissement a échoué, et dit pourquoi', () => {
    const offline = new DataError('network', 'Pas de réponse');
    const view = forecastView(from({ error: offline }), morning);
    expect(view).toMatchObject({ status: 'ready', refreshError: 'network' });
  });

  it('transmet le rafraîchissement en cours', () => {
    expect(forecastView(from({ isRefreshing: true }), morning)).toMatchObject({
      status: 'ready',
      isRefreshing: true,
    });
  });

  it('ne montre plus une prévision dont tous les jours sont passés', () => {
    expect(forecastView(from(), at('2026-11-24T08:00:00Z'))).toEqual({
      status: 'empty',
      reason: 'expired',
    });
  });
});

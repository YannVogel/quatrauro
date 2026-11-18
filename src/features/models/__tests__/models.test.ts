// Écran « Les modèles », sur de vrais fichiers publiés (Toulon, calculés le 17 novembre 2026).

import { published } from '@/lib/testing/published';
import type { ForecastFile } from '@shared/schemas';

import { defaultModelsDate, modelsContent, wholePercents } from '../models';

const forecast = published.forecast.toulon;
const verification = published.verification.toulon;
/** Mercredi 18 novembre, 9 h 30 à Paris. */
const NOW = new Date('2026-11-18T08:30:00Z');
const days = forecast.daily.filter((day) => day.date >= '2026-11-18');

const content = (date: string, file: ForecastFile = forecast) => {
  const upcoming = file.daily.filter((day) => day.date >= '2026-11-18');
  const result = modelsContent(file, verification, upcoming, date, NOW);
  if (result === null) throw new Error(`jour attendu : ${date}`);
  return result;
};

describe('pourcentages entiers', () => {
  it('somment toujours à 100', () => {
    expect(wholePercents([1, 1, 1])).toEqual([34, 33, 33]);
    expect(wholePercents([0.167, 0.201, 0.243, 0.312, 0.077])).toEqual([17, 20, 24, 31, 8]);
    expect(wholePercents([0.7, 0.3])).toEqual([70, 30]);
    expect(wholePercents([1])).toEqual([100]);
    for (const weights of [
      [0.2, 0.2, 0.2, 0.2, 0.2],
      [0.05, 0.25, 0.7],
      [0.333, 0.333, 0.334],
    ]) {
      expect(wholePercents(weights).reduce((sum, value) => sum + value, 0)).toBe(100);
    }
  });

  it('ne donnent rien à distribuer sans poids', () => {
    expect(wholePercents([])).toEqual([]);
    expect(wholePercents([0, 0])).toEqual([0, 0]);
  });
});

describe('jour montré', () => {
  it('est demain par défaut, et aujourd’hui s’il n’y a pas de lendemain', () => {
    expect(defaultModelsDate(days)).toBe('2026-11-19');
    expect(defaultModelsDate(days.slice(0, 1))).toBe('2026-11-18');
    expect(defaultModelsDate([])).toBeNull();
  });

  it('se choisit parmi les jours à venir, nommés à partir d’aujourd’hui', () => {
    expect(content('2026-11-19').days.map((day) => day.label)).toEqual([
      'Auj.',
      'Dem.',
      'Ven.',
      'Sam.',
      'Dim.',
      'Lun.',
    ]);
    expect(modelsContent(forecast, verification, days, '2026-11-17', NOW)).toBeNull();
  });
});

describe('demain, cinq modèles', () => {
  const tomorrow = content('2026-11-19');

  it('compare les modèles à 15 h, heure de Paris', () => {
    // 15 h à Paris le 19 novembre, c'est 14 h UTC.
    expect(tomorrow.moment).toBe('Demain, 15 h');
    expect(tomorrow.combined).toBe(16.8);
  });

  it('donne l’écart entre le modèle le plus chaud et le plus frais', () => {
    // IFS 17,4 °C, GFS 15,6 °C.
    expect(tomorrow.spread).toBeCloseTo(1.8, 5);
  });

  it('range les modèles du plus lourd au plus léger, avec des poids qui somment à 100 %', () => {
    expect(tomorrow.lines.map((line) => [line.name, line.weight, line.temperature])).toEqual([
      ['ICON', 0.31, 17.1],
      ['IFS', 0.24, 17.4],
      ['ARPEGE', 0.2, 15.8],
      ['AROME', 0.17, 16.9],
      ['GFS', 0.08, 15.6],
    ]);
    const total = tomorrow.lines.reduce((sum, line) => sum + (line.weight ?? 0) * 100, 0);
    expect(Math.round(total)).toBe(100);
    expect(tomorrow.lines.every((line) => line.status === 'present')).toBe(true);
    expect(tomorrow.lines[0]?.provider).toBe('DWD');
  });

  it('donne l’erreur récente du mélange et de chaque modèle à cette échéance', () => {
    // Demain est à l'échéance de deux jours ; AROME n'y est pas noté.
    expect(tomorrow.errors).toEqual({
      lead: 2,
      periodDays: 31,
      blend: 1.09,
      models: [
        { id: 'icon', name: 'ICON', error: 1.21 },
        { id: 'ifs', name: 'IFS', error: 1.47 },
        { id: 'gfs', name: 'GFS', error: 1.58 },
        { id: 'arpege', name: 'ARPEGE', error: 1.63 },
      ],
    });
  });
});

describe('jour lointain', () => {
  const sunday = content('2026-11-22');

  it('nomme le jour et garde l’heure de l’après-midi', () => {
    expect(sunday.moment).toBe('Dimanche 22 novembre, 15 h');
  });

  it('dit que les modèles à courte portée ne vont pas jusque-là, sans valeur ni poids', () => {
    const byName = Object.fromEntries(sunday.lines.map((line) => [line.name, line]));
    expect(byName.AROME).toMatchObject({ status: 'outOfRange', temperature: null, weight: null });
    expect(byName.ARPEGE).toMatchObject({ status: 'outOfRange', temperature: null, weight: null });
    const weighted = sunday.lines.filter((line) => line.weight !== null);
    expect(weighted.map((line) => line.name).sort()).toEqual(['GFS', 'ICON', 'IFS']);
    expect(weighted.reduce((sum, line) => sum + Math.round((line.weight ?? 0) * 100), 0)).toBe(100);
    // Ceux qui ne pèsent pas ferment la liste.
    expect(sunday.lines.slice(3).map((line) => line.status)).toEqual(['outOfRange', 'outOfRange']);
  });

  it('prend les scores de l’échéance de cinq jours', () => {
    expect(sunday.errors?.lead).toBe(5);
    expect(sunday.errors?.models.map((model) => model.name)).toEqual(['ICON', 'IFS', 'GFS']);
  });
});

describe('modèle absent du dernier calcul', () => {
  const withoutGfs: ForecastFile = {
    ...forecast,
    models: forecast.models.map((model) =>
      model.id === 'gfs' ? { ...model, available: false } : model,
    ),
    hourly: forecast.hourly.map((hour) => {
      const { gfs: _gfs, ...models } = hour.models;
      return { ...hour, models };
    }),
    daily: forecast.daily.map((day) => {
      const { gfs: _gfs, ...weights } = day.weights;
      return { ...day, weights };
    }),
  };

  it('est visible, sans valeur ni poids, et les autres somment à 100 %', () => {
    const { lines } = content('2026-11-19', withoutGfs);
    expect(lines.find((line) => line.id === 'gfs')).toMatchObject({
      status: 'absent',
      temperature: null,
      weight: null,
    });
    const others = lines.filter((line) => line.id !== 'gfs');
    expect(others.reduce((sum, line) => sum + Math.round((line.weight ?? 0) * 100), 0)).toBe(100);
  });
});

describe('sans scores', () => {
  it('n’invente pas d’erreur tant que rien n’a été vérifié', () => {
    expect(modelsContent(forecast, null, days, '2026-11-19', NOW)?.errors).toBeNull();
    const empty = { ...verification, period: null, temperature: { byLead: [], recentDays: [] } };
    expect(modelsContent(forecast, empty, days, '2026-11-19', NOW)?.errors).toBeNull();
  });
});

describe('un seul modèle', () => {
  it('n’a pas d’écart à montrer', () => {
    const alone: ForecastFile = {
      ...forecast,
      hourly: forecast.hourly.map((hour) => ({
        ...hour,
        models: hour.models.ifs === undefined ? {} : { ifs: hour.models.ifs },
      })),
    };
    expect(content('2026-11-19', alone).spread).toBeNull();
  });
});

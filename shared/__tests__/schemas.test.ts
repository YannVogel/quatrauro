import { SCHEMA_VERSION, forecastFileSchema, verificationFileSchema } from '../schemas';
import type { ForecastFile, VerificationFile } from '../schemas';

// Exemples de forme seulement : les valeurs sont FICTIVES.
const forecast: ForecastFile = {
  schemaVersion: 1,
  city: 'toulon',
  generatedAt: '2026-11-17T15:00:00Z',
  models: [
    { id: 'arome', available: true },
    { id: 'gfs', available: false },
  ],
  hourly: [
    {
      time: '2026-11-17T16:00:00Z',
      temperature: 16.3,
      temperatureSpread: 0.6,
      apparentTemperature: 15.1,
      humidity: 62,
      cloudCover: 10,
      precipitation: 0,
      precipitationProbability: 2,
      windSpeed: 18,
      windGusts: 30,
      windDirection: 315,
      condition: 'clear',
      isNight: false,
      models: { arome: { temperature: 16.9, precipitation: 0 } },
    },
  ],
  daily: [
    {
      date: '2026-11-17',
      min: 9,
      max: 16,
      apparentMin: 7,
      apparentMax: 15,
      condition: 'clear',
      summary: 'Grand soleil',
      precipitation: 0,
      precipitationProbability: 3,
      windSpeedMax: 22,
      windGustsMax: 38,
      humidity: 58,
      reliability: 95,
      reliabilityLabel: 'sure',
      modelsAgreeing: 4,
      modelsTotal: 4,
      weights: { arome: 0.35, ifs: 0.24, arpege: 0.23, icon: 0.18 },
    },
  ],
};

const verification: VerificationFile = {
  schemaVersion: 1,
  city: 'nice',
  generatedAt: '2026-11-17T15:00:00Z',
  period: { from: '2026-10-18', to: '2026-11-16' },
  temperature: {
    byLead: [
      {
        leadDays: 1,
        count: 720,
        blend: 0.8,
        bestModel: { id: 'icon', error: 1.1 },
        models: { arome: 1.3, icon: 1.1, gfs: null },
      },
    ],
    recentDays: [
      { date: '2026-11-16', forecastMin: 9, forecastMax: 16, observedMin: 8.6, observedMax: 16.4 },
    ],
  },
  rain: { count: 30, hitRate: 90 },
};

const withHour = (changes: object): unknown => ({
  ...forecast,
  hourly: [{ ...forecast.hourly[0], ...changes }],
});
const withDay = (changes: object): unknown => ({
  ...forecast,
  daily: [{ ...forecast.daily[0], ...changes }],
});

describe('fichier de prévision', () => {
  it('accepte un fichier complet', () => {
    expect(forecastFileSchema.parse(forecast)).toEqual(forecast);
  });

  it('accepte que toute valeur météo soit absente', () => {
    const hour = {
      temperature: null,
      temperatureSpread: null,
      apparentTemperature: null,
      humidity: null,
      cloudCover: null,
      precipitation: null,
      precipitationProbability: null,
      windSpeed: null,
      windGusts: null,
      windDirection: null,
      condition: null,
      models: {},
    };
    const day = {
      min: null,
      max: null,
      apparentMin: null,
      apparentMax: null,
      condition: null,
      summary: null,
      precipitation: null,
      precipitationProbability: null,
      windSpeedMax: null,
      windGustsMax: null,
      humidity: null,
      reliability: null,
      reliabilityLabel: null,
      modelsAgreeing: null,
      modelsTotal: 0,
      weights: {},
    };
    expect(forecastFileSchema.safeParse(withHour(hour)).success).toBe(true);
    expect(forecastFileSchema.safeParse(withDay(day)).success).toBe(true);
  });

  it('accepte un fichier sans aucune heure ni aucun jour', () => {
    expect(forecastFileSchema.safeParse({ ...forecast, hourly: [], daily: [] }).success).toBe(true);
  });

  it('ignore un champ inconnu, pour rester lisible par une app plus ancienne', () => {
    const parsed = forecastFileSchema.parse({ ...forecast, nouveauChamp: 1 });
    expect(parsed).toEqual(forecast);
  });

  it('refuse une version inconnue', () => {
    expect(forecastFileSchema.safeParse({ ...forecast, schemaVersion: 2 }).success).toBe(false);
    expect(forecastFileSchema.safeParse({ ...forecast, schemaVersion: '1' }).success).toBe(false);
    expect(SCHEMA_VERSION).toBe(1);
  });

  it('refuse un champ manquant', () => {
    const { generatedAt: _generatedAt, ...withoutDate } = forecast;
    expect(forecastFileSchema.safeParse(withoutDate).success).toBe(false);
    const { temperature: _temperature, ...hourWithoutTemperature } = forecast.hourly[0] ?? {};
    expect(
      forecastFileSchema.safeParse({ ...forecast, hourly: [hourWithoutTemperature] }).success,
    ).toBe(false);
  });

  it.each([
    ['une ville inconnue', { ...forecast, city: 'marseille' }],
    ['un modèle inconnu', { ...forecast, models: [{ id: 'ukmo', available: true }] }],
    ['un instant sans fuseau', { ...forecast, generatedAt: '2026-11-17T15:00:00' }],
    ['une température qui n’est pas un nombre', withHour({ temperature: '16' })],
    ['une température infinie', withHour({ temperature: Number.POSITIVE_INFINITY })],
    ['une probabilité hors de 0 à 100', withHour({ precipitationProbability: 120 })],
    ['un cumul négatif', withHour({ precipitation: -1 })],
    ['une direction hors de 0 à 360', withHour({ windDirection: 400 })],
    ['une condition inconnue', withHour({ condition: 'fog' })],
    ['un jour mal écrit', withDay({ date: '17/11/2026' })],
    ['un libellé de fiabilité inconnu', withDay({ reliabilityLabel: 'certain' })],
    ['un poids supérieur à 1', withDay({ weights: { arome: 1.2 } })],
    ['un résumé vide', withDay({ summary: '' })],
  ])('refuse %s', (_, file) => {
    expect(forecastFileSchema.safeParse(file).success).toBe(false);
  });
});

describe('fichier de vérification', () => {
  it('accepte un fichier complet', () => {
    expect(verificationFileSchema.parse(verification)).toEqual(verification);
  });

  it("accepte qu'aucune vérification n'ait encore eu lieu", () => {
    const empty = {
      ...verification,
      period: null,
      temperature: { byLead: [], recentDays: [] },
      rain: { count: 0, hitRate: null },
    };
    expect(verificationFileSchema.safeParse(empty).success).toBe(true);
  });

  it('accepte des valeurs absentes dans les scores', () => {
    const file = {
      ...verification,
      temperature: {
        byLead: [{ leadDays: 7, count: 0, blend: null, bestModel: null, models: {} }],
        recentDays: [
          {
            date: '2026-11-16',
            forecastMin: null,
            forecastMax: null,
            observedMin: null,
            observedMax: null,
          },
        ],
      },
    };
    expect(verificationFileSchema.safeParse(file).success).toBe(true);
  });

  it.each([
    ['une version inconnue', { ...verification, schemaVersion: 0 }],
    ['une période manquante', { ...verification, period: undefined }],
    ['un taux de réussite hors de 0 à 100', { ...verification, rain: { count: 3, hitRate: 150 } }],
    ['un nombre de jours négatif', { ...verification, rain: { count: -1, hitRate: null } }],
    [
      'une erreur négative',
      {
        ...verification,
        temperature: {
          ...verification.temperature,
          byLead: [{ leadDays: 1, count: 1, blend: -0.5, bestModel: null, models: {} }],
        },
      },
    ],
    [
      'une échéance nulle',
      {
        ...verification,
        temperature: {
          ...verification.temperature,
          byLead: [{ leadDays: 0, count: 1, blend: 1, bestModel: null, models: {} }],
        },
      },
    ],
  ])('refuse %s', (_, file) => {
    expect(verificationFileSchema.safeParse(file).success).toBe(false);
  });
});

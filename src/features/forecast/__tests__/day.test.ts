// Détail d'un jour, tiré d'un vrai fichier publié (Toulon, calculé le 17 novembre 2026).

import { published } from '@/lib/testing/published';
import type { ForecastFile } from '@shared/schemas';

import { dayContent } from '../day';

const forecast = published.forecast.toulon;
const NOW = new Date('2026-11-18T08:30:00Z');
const day = (date: string, file: ForecastFile = forecast) => {
  const content = dayContent(file, date, NOW);
  if (content === null) throw new Error(`jour attendu : ${date}`);
  return content;
};

/** Le fichier, où `change` réécrit ce que dit un modèle à chaque heure du jour donné. */
function withModel(
  date: string,
  modelId: 'arome' | 'arpege' | 'ifs' | 'icon' | 'gfs',
  change: (values: { temperature: number | null; precipitation: number | null }) => {
    temperature: number | null;
    precipitation: number | null;
  },
): ForecastFile {
  return {
    ...forecast,
    hourly: forecast.hourly.map((hour) => {
      const values = hour.models[modelId];
      const isThatDay = new Date(Date.parse(hour.time) + 3_600_000).toISOString().startsWith(date);
      return isThatDay && values !== undefined
        ? { ...hour, models: { ...hour.models, [modelId]: change(values) } }
        : hour;
    }),
  };
}

describe('détail d’un jour', () => {
  it('donne le jour, ses températures, sa condition, son résumé et sa fiabilité', () => {
    expect(day('2026-11-19')).toMatchObject({
      title: 'Jeudi 19 novembre',
      max: 16.9,
      min: 13.4,
      condition: 'rain',
      summary: 'Pluie jusqu’à 6 h',
      reliability: 51,
      modelsTotal: 5,
    });
  });

  it('donne une colonne toutes les trois heures, à l’heure de Paris', () => {
    const { columns } = day('2026-11-19');
    expect(columns.map((column) => column.hour)).toEqual([0, 3, 6, 9, 12, 15, 18, 21]);
    // 0 h à Paris le 19, c'est 23 h UTC le 18.
    const midnight = forecast.hourly.find((hour) => hour.time === '2026-11-18T23:00:00Z');
    expect(columns[0]).toEqual({
      hour: 0,
      temperature: midnight?.temperature,
      rainProbability: midnight?.precipitationProbability,
    });
  });

  it('donne les quatre chiffres clés du jour', () => {
    const [published19] = forecast.daily.filter((entry) => entry.date === '2026-11-19');
    expect(day('2026-11-19').stats).toEqual({
      wind: published19?.windSpeedMax,
      rain: 7.7,
      humidity: published19?.humidity,
      feelsLike: published19?.apparentMax,
    });
  });

  it('n’existe pas pour un jour passé, absent ou mal écrit', () => {
    expect(dayContent(forecast, '2026-11-17', NOW)).toBeNull();
    expect(dayContent(forecast, '2026-11-30', NOW)).toBeNull();
    expect(dayContent(forecast, 'demain', NOW)).toBeNull();
    // Aujourd'hui reste consultable.
    expect(dayContent(forecast, '2026-11-18', NOW)?.title).toBe('Mercredi 18 novembre');
  });
});

describe('désaccord entre modèles', () => {
  it('montre le début de la pluie selon chaque modèle, un jour de pluie où ils divergent', () => {
    // Jeudi 19 : la pluie commence entre 0 h et 2 h selon les modèles.
    expect(day('2026-11-19').disagreement).toEqual({
      kind: 'rainStart',
      opinions: [
        { modelId: 'arome', name: 'AROME', value: 1 },
        { modelId: 'arpege', name: 'ARPEGE', value: 0 },
        { modelId: 'ifs', name: 'IFS', value: 2 },
        { modelId: 'icon', name: 'ICON', value: 0 },
        { modelId: 'gfs', name: 'GFS', value: 1 },
      ],
    });
  });

  it('ne cite que les modèles qui couvrent un jour lointain', () => {
    // Dimanche 22 : AROME et ARPEGE ne vont pas si loin.
    const content = day('2026-11-22');
    expect(content.modelsTotal).toBe(3);
    expect(content.disagreement?.kind).toBe('rainStart');
    expect(content.disagreement?.opinions.map((opinion) => opinion.name)).toEqual([
      'IFS',
      'ICON',
      'GFS',
    ]);
  });

  it('disparaît quand les modèles sont d’accord', () => {
    // Mercredi 18 : aucun n'annonce de pluie, et leurs maximums tiennent en 1,4 °C.
    expect(day('2026-11-18').disagreement).toBeNull();
    expect(day('2026-11-23').disagreement).toBeNull();
  });

  it('dit « pas de pluie » pour un modèle qui reste sec quand d’autres annoncent la pluie', () => {
    const dryGfs = withModel('2026-11-19', 'gfs', (values) => ({ ...values, precipitation: 0 }));
    const opinions = day('2026-11-19', dryGfs).disagreement?.opinions ?? [];
    expect(opinions.find((opinion) => opinion.modelId === 'gfs')?.value).toBeNull();
    expect(opinions).toHaveLength(5);
  });

  it('ne retient pas un écart d’une heure sur le début de la pluie', () => {
    // Tous les modèles font commencer la pluie à 0 h ou 1 h : ils sont d'accord.
    const all = ['arome', 'arpege', 'ifs', 'icon', 'gfs'] as const;
    let aligned = forecast;
    for (const modelId of all) {
      aligned = {
        ...aligned,
        hourly: aligned.hourly.map((hour) => {
          const values = hour.models[modelId];
          const isThatDay = new Date(Date.parse(hour.time) + 3_600_000)
            .toISOString()
            .startsWith('2026-11-19');
          if (!isThatDay || values === undefined) return hour;
          // IFS une heure après les autres, températures identiques pour tous.
          const startsAt = modelId === 'ifs' ? '2026-11-19T00' : '2026-11-18T23';
          return {
            ...hour,
            models: {
              ...hour.models,
              [modelId]: { temperature: 15, precipitation: hour.time >= startsAt ? 1 : 0 },
            },
          };
        }),
      };
    }
    expect(day('2026-11-19', aligned).disagreement).toBeNull();
  });

  it('montre la température maximale quand c’est elle qui divise, par temps sec', () => {
    // Mercredi 18, sec : on réchauffe GFS de trois degrés.
    const warmGfs = withModel('2026-11-18', 'gfs', (values) => ({
      ...values,
      temperature: values.temperature === null ? null : values.temperature + 3,
    }));
    const disagreement = day('2026-11-18', warmGfs).disagreement;
    expect(disagreement?.kind).toBe('maxTemperature');
    expect(disagreement?.opinions.find((opinion) => opinion.modelId === 'gfs')?.value).toBeCloseTo(
      21.7,
      5,
    );
    expect(disagreement?.opinions).toHaveLength(5);
  });

  it('n’existe pas quand un seul modèle couvre le jour', () => {
    let alone = forecast;
    for (const modelId of ['icon', 'gfs'] as const) {
      alone = {
        ...alone,
        hourly: alone.hourly.map((hour) => {
          const { [modelId]: _removed, ...models } = hour.models;
          return hour.time >= '2026-11-21T23' ? { ...hour, models } : hour;
        }),
      };
    }
    expect(day('2026-11-22', alone).disagreement).toBeNull();
  });
});

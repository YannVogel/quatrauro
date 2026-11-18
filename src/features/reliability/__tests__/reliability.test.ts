// Écran « Fiabilité », sur de vrais fichiers de vérification (calculés le 17 novembre 2026).

import { published } from '@/lib/testing/published';
import type { VerificationFile } from '@shared/schemas';

import { reliabilityContent } from '../reliability';

const toulon = published.verification.toulon;
const ready = (file: VerificationFile) => {
  const content = reliabilityContent(file);
  if (content.status !== 'ready') throw new Error('scores attendus');
  return content;
};
/** Le fichier de Toulon, avec un autre score pour les prévisions faites la veille. */
const withDayAhead = (
  change: (
    score: VerificationFile['temperature']['byLead'][number],
  ) => Partial<VerificationFile['temperature']['byLead'][number]>,
): VerificationFile => ({
  ...toulon,
  temperature: {
    ...toulon.temperature,
    byLead: toulon.temperature.byLead.map((score) =>
      score.leadDays === 1 ? { ...score, ...change(score) } : score,
    ),
  },
});

describe('bilan de Toulon', () => {
  const content = ready(toulon);

  it('reprend les chiffres du fichier, sans les recalculer', () => {
    expect(content.period).toEqual({ from: '2026-10-17', to: '2026-11-16' });
    expect(content.periodDays).toBe(31);
    expect(content.blendError).toBe(1.08);
    expect(content.best).toEqual({ name: 'ICON', error: 1.18 });
    expect(content.leads.map((lead) => [lead.lead, lead.error])).toEqual(
      toulon.temperature.byLead.map((score) => [score.leadDays, score.blend]),
    );
  });

  it('constate que le mélange fait mieux que le meilleur modèle seul', () => {
    expect(content.verdict).toBe('better');
  });

  it('compte les jours où l’annonce de pluie était juste', () => {
    // 80 % de 30 jours.
    expect(content.rain).toEqual({ correct: 24, count: 30 });
  });

  it('range les sept derniers jours du plus récent au plus ancien', () => {
    expect(content.days.map((day) => day.label)).toEqual([
      'Dim. 15',
      'Sam. 14',
      'Ven. 13',
      'Jeu. 12',
      'Mer. 11',
      'Mar. 10',
      'Lun. 9',
    ]);
    expect(content.days[0]).toMatchObject({
      spokenLabel: 'dimanche 15',
      forecast: 16.2,
      observed: 16.7,
    });
    expect(content.days[0]?.gap).toBeCloseTo(0.5, 5);
  });

  it('ne signale aucun écart quand tous sont sous deux degrés', () => {
    // Le plus grand : jeudi 12, 19 °C prévus pour 20,4 °C mesurés.
    expect(Math.max(...content.days.map((day) => day.gap ?? 0))).toBeCloseTo(1.4, 5);
    expect(content.days.some((day) => day.isLarge)).toBe(false);
  });

  it('donne à chaque échéance une barre à la mesure de son erreur', () => {
    expect(content.leads.at(-1)?.ratio).toBe(1);
    expect(content.leads[0]?.ratio).toBeCloseTo(1.08 / 1.76, 5);
  });
});

describe('quand le mélange ne fait pas mieux', () => {
  it('le dit : moins bien', () => {
    const content = ready(withDayAhead(() => ({ blend: 1.3 })));
    expect(content.verdict).toBe('worse');
    expect(content.blendError).toBe(1.3);
    expect(content.best).toEqual({ name: 'ICON', error: 1.18 });
  });

  it('le dit : à égalité', () => {
    expect(ready(withDayAhead(() => ({ blend: 1.18 }))).verdict).toBe('equal');
  });

  it('ne compare à personne quand aucun modèle n’a pu être noté', () => {
    const content = ready(withDayAhead(() => ({ bestModel: null })));
    expect(content.best).toBeNull();
    expect(content.verdict).toBeNull();
  });
});

describe('écarts des derniers jours', () => {
  const withDay = (forecastMax: number | null, observedMax: number | null) =>
    ready({
      ...toulon,
      temperature: {
        ...toulon.temperature,
        recentDays: [
          { date: '2026-11-15', forecastMin: 12, forecastMax, observedMin: 11, observedMax },
        ],
      },
    }).days[0];

  it('signale un écart à partir de deux degrés, dans un sens comme dans l’autre', () => {
    expect(withDay(16, 18)).toMatchObject({ gap: 2, isLarge: true });
    expect(withDay(19.5, 17)).toMatchObject({ gap: 2.5, isLarge: true });
    expect(withDay(16, 17.9)?.isLarge).toBe(false);
  });

  it('n’invente pas d’écart un jour sans observation', () => {
    expect(withDay(16, null)).toMatchObject({ observed: null, gap: null, isLarge: false });
    expect(withDay(null, 17)).toMatchObject({ forecast: null, gap: null, isLarge: false });
  });
});

describe('historique insuffisant', () => {
  it('quand rien n’a encore été vérifié', () => {
    const empty: VerificationFile = {
      ...toulon,
      period: null,
      temperature: { byLead: [], recentDays: [] },
      rain: { count: 0, hitRate: null },
    };
    expect(reliabilityContent(empty)).toEqual({ status: 'insufficient', verifiedHours: 0 });
  });

  it('en dessous d’une semaine de prévisions vérifiées', () => {
    expect(reliabilityContent(withDayAhead(() => ({ count: 167 })))).toEqual({
      status: 'insufficient',
      verifiedHours: 167,
    });
    expect(reliabilityContent(withDayAhead(() => ({ count: 168 }))).status).toBe('ready');
  });

  it('sans jours de pluie comparés, ne dit rien de la pluie', () => {
    expect(ready({ ...toulon, rain: { count: 0, hitRate: null } }).rain).toBeNull();
  });
});

import assert from 'node:assert/strict';

import { enumerateCandidates, marginalEffect, selectCandidate, toParams } from '../search.ts';
import type { Candidate } from '../search.ts';
import { selectRainCandidate } from '../searchRain.ts';

const candidate = (overrides: Partial<Candidate>): Candidate => ({
  biasHalfLifeDays: 20,
  errorHalfLifeDays: 60,
  weightExponent: 4,
  hourBlocksPerDay: 24,
  leadGrouping: 'par jour',
  ...overrides,
});

describe('choix des paramètres', () => {
  it('énumère toute la grille, sans doublon', () => {
    const candidates = enumerateCandidates();
    assert.equal(new Set(candidates.map((entry) => JSON.stringify(entry))).size, candidates.length);
    assert.ok(candidates.length > 100);
    assert.deepEqual(toParams(candidate({})).leadGrouping, [[1], [2], [3], [4], [5], [6], [7]]);
  });

  it('retient le meilleur candidat', () => {
    const results = [
      { candidate: candidate({ weightExponent: 1 }), meanError: 1.3 },
      { candidate: candidate({ weightExponent: 4 }), meanError: 1.2 },
    ];
    assert.equal(selectCandidate(results).candidate.weightExponent, 4);
  });

  it('entre candidats équivalents, préfère la fenêtre d’erreur la plus courte', () => {
    const results = [
      { candidate: candidate({ errorHalfLifeDays: 120 }), meanError: 1.2 },
      { candidate: candidate({ errorHalfLifeDays: 60 }), meanError: 1.2005 },
      { candidate: candidate({ errorHalfLifeDays: 10 }), meanError: 1.25 },
    ];
    assert.equal(selectCandidate(results).candidate.errorHalfLifeDays, 60);
  });

  it("mesure l'effet propre d'un paramètre", () => {
    const results = [
      { candidate: candidate({ weightExponent: 1, hourBlocksPerDay: 1 }), meanError: 1.4 },
      { candidate: candidate({ weightExponent: 1, hourBlocksPerDay: 24 }), meanError: 1.2 },
      { candidate: candidate({ weightExponent: 4, hourBlocksPerDay: 1 }), meanError: 1.3 },
    ];
    const effect = marginalEffect(results, 'weightExponent');
    assert.ok(Math.abs((effect.get('1') ?? Number.NaN) - 1.3) < 1e-12);
    assert.equal(effect.get('4'), 1.3);
  });
});

describe('réglage de la pluie', () => {
  it('prend la meilleure probabilité, puis le meilleur seuil, et départage par les bonnes annonces', () => {
    const results = [
      { priorStrength: 20, announcementProbability: 0.2, brier: 0.12, accuracy: 0.9, csi: 0.6 },
      { priorStrength: 5, announcementProbability: 0.2, brier: 0.1, accuracy: 0.81, csi: 0.511 },
      { priorStrength: 5, announcementProbability: 0.3, brier: 0.1, accuracy: 0.84, csi: 0.509 },
      { priorStrength: 5, announcementProbability: 0.5, brier: 0.1, accuracy: 0.85, csi: 0.4 },
    ];
    assert.deepEqual(selectRainCandidate(results), results[2]);
  });
});

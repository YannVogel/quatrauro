import assert from 'node:assert/strict';

import { dailyAvailabilityDelay, dailyMax, dailyMean, dailyMin, dailySum } from '../daily.ts';
import {
  formatGain,
  formatInteger,
  formatNumber,
  formatPercent,
  markdownTable,
} from '../markdown.ts';
import {
  EMPTY_CONTINGENCY,
  accuracy,
  addToContingency,
  brierScore,
  calibrationBins,
  criticalSuccessIndex,
  mergeContingencies,
} from '../rainScores.ts';
import { replay } from '../replay.ts';
import { commonPositions, scoreSeries } from '../score.ts';
import { gainOverBestPrevious, isRainDegraded, judgeTemperature } from '../verdict.ts';
import type { LeadEvaluation } from '../evaluate.ts';

describe('agrégats quotidiens', () => {
  const twoDays = Float64Array.from({ length: 48 }, (_, hour) => hour);

  it('agrège chaque jour UTC', () => {
    assert.deepEqual([...dailySum(twoDays)], [276, 852]);
    assert.deepEqual([...dailyMax(twoDays)], [23, 47]);
    assert.deepEqual([...dailyMin(twoDays)], [0, 24]);
    assert.deepEqual([...dailyMean(twoDays)], [11.5, 35.5]);
  });

  it('ne rend rien pour un jour auquel il manque une heure', () => {
    const holed = twoDays.map((value, hour) => (hour === 30 ? Number.NaN : value));
    assert.equal(dailySum(holed)[0], 276);
    assert.ok(Number.isNaN(dailySum(holed)[1]));
  });

  it('compte en jours le délai de publication', () => {
    // Avec 30 h de délai, la dernière heure d'un jour est publiée 53 h après le début de ce jour.
    assert.equal(dailyAvailabilityDelay(30), 3);
    assert.equal(dailyAvailabilityDelay(1), 1);
  });
});

describe('rejeu sans fuite', () => {
  it("n'apprend d'une position qu'une fois son observation publiée", () => {
    const learned: number[] = [];
    const seenAtPrediction = new Map<string, number>();
    replay({
      length: 10,
      leads: [1, 2],
      stepsPerLeadDay: 1,
      availabilityDelay: 3,
      learn: (position) => learned.push(position),
      predict: (lead, position) => seenAtPrediction.set(`${lead}:${position}`, learned.length),
    });
    // La prévision à J+1 pour la position 9 est émise à 8 : les positions 0 à 5 sont publiées.
    assert.equal(seenAtPrediction.get('1:9'), 6);
    // La prévision à J+2 pour la position 9 est émise à 7 : les positions 0 à 4 sont publiées.
    assert.equal(seenAtPrediction.get('2:9'), 5);
    assert.equal(seenAtPrediction.get('1:0'), 0);
    assert.equal(seenAtPrediction.size, 20);
  });
});

describe('mesures', () => {
  it('note une série sur les positions communes', () => {
    const observation = Float64Array.from([10, 10, Number.NaN, 10]);
    const forecast = Float64Array.from([11, 8, 10, Number.NaN]);
    const positions = commonPositions([forecast], observation, 0, 4);
    assert.deepEqual(positions, [0, 1]);
    assert.deepEqual(scoreSeries(forecast, observation, positions), {
      mae: 1.5,
      bias: -0.5,
      count: 2,
    });
    assert.ok(Number.isNaN(scoreSeries(forecast, observation, []).mae));
  });

  it('range les annonces de pluie et en tire les scores', () => {
    let table = EMPTY_CONTINGENCY;
    [
      [true, true],
      [true, false],
      [false, true],
      [false, false],
      [false, false],
    ].forEach(([announced, observed]) => {
      table = addToContingency(table, announced ?? false, observed ?? false);
    });
    assert.deepEqual(table, { hits: 1, misses: 1, falseAlarms: 1, correctNegatives: 2 });
    assert.equal(accuracy(table), 0.6);
    assert.equal(criticalSuccessIndex(table), 1 / 3);
    assert.deepEqual(mergeContingencies([table, table]), {
      hits: 2,
      misses: 2,
      falseAlarms: 2,
      correctNegatives: 4,
    });
  });

  it('calcule le score de Brier et la calibration par classe', () => {
    assert.equal(brierScore([1, 0, 0.5], [true, false, true]), 0.25 / 3);
    assert.throws(() => brierScore([1], []));
    const bins = calibrationBins(
      [0.05, 0.2, 0.25, 1],
      [false, true, false, true],
      [0, 0.1, 0.5, 1],
    );
    assert.deepEqual(
      bins.map((bin) => bin.count),
      [1, 2, 1],
    );
    assert.equal(bins[1]?.observed, 0.5);
    assert.ok(Math.abs((bins[1]?.announced ?? Number.NaN) - 0.225) < 1e-12);
  });
});

describe('critère du feu vert', () => {
  const evaluation = (lead: number, blend: number, best: number): LeadEvaluation => {
    const score = (mae: number) => ({ mae, bias: 0, count: 100 });
    return {
      lead,
      models: ['a', 'b'],
      count: 100,
      blend: score(blend),
      simpleMean: score(best),
      bestPrevious: score(best),
      bestAfterTheFact: { model: 'a', score: score(best) },
      raw: {},
      corrected: {},
    };
  };

  it('mesure le gain face au meilleur modèle de la fenêtre précédente', () => {
    assert.ok(Math.abs(gainOverBestPrevious(evaluation(1, 0.9, 1)) - 0.1) < 1e-12);
  });

  it('demande un gain de 5 % sur une majorité stricte des échéances', () => {
    const passed = judgeTemperature([
      evaluation(1, 0.9, 1),
      evaluation(2, 0.94, 1),
      evaluation(3, 0.99, 1),
    ]);
    assert.deepEqual(passed.leadsWithGain, [1, 2]);
    assert.equal(passed.passed, true);
    const tied = judgeTemperature([evaluation(1, 0.9, 1), evaluation(2, 0.96, 1)]);
    assert.equal(tied.passed, false);
  });

  it('juge la pluie dégradée au-delà des marges', () => {
    assert.equal(
      isRainDegraded({ accuracy: 0.9, csi: 0.5 }, { accuracy: 0.905, csi: 0.51 }),
      false,
    );
    assert.equal(isRainDegraded({ accuracy: 0.88, csi: 0.5 }, { accuracy: 0.9, csi: 0.5 }), true);
    assert.equal(isRainDegraded({ accuracy: 0.9, csi: 0.4 }, { accuracy: 0.9, csi: 0.5 }), true);
  });
});

describe('mise en forme du rapport', () => {
  it('écrit les nombres à la française', () => {
    assert.equal(formatNumber(1.234), '1,23');
    assert.equal(formatNumber(-0.5, 1), '−0,5');
    assert.equal(formatNumber(-0.001), '0,00');
    assert.equal(formatNumber(Number.NaN), '—');
    assert.equal(formatPercent(0.125, 1), '12,5 %');
    assert.equal(formatGain(0.1), '+10,0 %');
    assert.equal(formatGain(-0.034), '−3,4 %');
    assert.equal(formatGain(-0.0001), '+0,0 %');
    assert.equal(formatInteger(12345), '12 345');
  });

  it('construit un tableau markdown et refuse une ligne incomplète', () => {
    assert.equal(markdownTable(['A', 'B'], [['1', '2']]), '| A | B |\n| --- | --- |\n| 1 | 2 |');
    assert.throws(() => markdownTable(['A', 'B'], [['1']]));
  });
});

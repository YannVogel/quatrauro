// Calibration de l'indice de fiabilité, rejouée sur les situations quotidiennes du backtest
// (données dérivées de prévisions et d'observations réelles, régénérées par `npm run backtest`).

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { BLEND_CONFIG } from '../../../shared/blendConfig.ts';
import { CALIBRATION_FIXTURE_PATH, daysByLead } from '../calibrationFixture.ts';
import type { CalibrationFixture } from '../calibrationFixture.ts';
import { CALIBRATION_MIN_COUNT, calibrationOf } from '../evaluateReliability.ts';
import { replayReliabilityIndex } from '../simulateReliability.ts';

const fixture = JSON.parse(
  readFileSync(path.join(process.cwd(), CALIBRATION_FIXTURE_PATH), 'utf8'),
) as CalibrationFixture;
const { reliability, rain } = BLEND_CONFIG;

/** Indices annoncés et prévisions tenues, deux villes et toutes échéances confondues. */
function replayOn(days: { readonly from: number; readonly to: number }) {
  const announced: number[] = [];
  const outcomes: boolean[] = [];
  for (const city of Object.values(fixture.cities)) {
    const byLead = daysByLead(city);
    const indices = replayReliabilityIndex(byLead, {
      leadGrouping: BLEND_CONFIG.leadGrouping,
      options: reliability,
      observationDelayHours: BLEND_CONFIG.observationDelayHours,
    });
    for (const [lead, series] of byLead) {
      for (let day = days.from; day < days.to; day += 1) {
        const index = indices.get(lead)?.[day] ?? Number.NaN;
        const held = series.held[day] ?? Number.NaN;
        if (!Number.isFinite(index) || !Number.isFinite(held)) continue;
        announced.push(index);
        outcomes.push(held === 1);
      }
    }
  }
  return { announced, outcomes };
}

describe("calibration de l'indice de fiabilité sur le backtest", () => {
  it('rejoue des données établies avec les réglages en vigueur', () => {
    assert.deepEqual(fixture.derivedWith, {
      temperatureTolerance: reliability.temperatureTolerance,
      rainThreshold: rain.dailyThreshold,
      rainAnnouncementProbability: rain.dailyAnnouncement,
    });
    assert.deepEqual(Object.keys(fixture.cities).sort(), ['nice', 'toulon']);
  });

  it('tient le critère du rapport sur la période de validation', () => {
    const { announced, outcomes } = replayOn(fixture.validationDays);
    const { bins, calibrated } = calibrationOf(announced, outcomes);
    const judged = bins.filter((bin) => bin.count >= CALIBRATION_MIN_COUNT);

    assert.ok(announced.length > 1000, `seulement ${announced.length} jours rejoués`);
    assert.ok(judged.length >= 3, `seulement ${judged.length} classes assez fournies`);
    assert.equal(calibrated, true);
  });

  it("n'annonce jamais plus que le plafond quand un seul modèle couvre le jour", () => {
    for (const city of Object.values(fixture.cities)) {
      const byLead = new Map(
        [...daysByLead(city)].map(([lead, days]) => [lead, { ...days, modelCount: 1 }]),
      );
      const indices = replayReliabilityIndex(byLead, {
        leadGrouping: BLEND_CONFIG.leadGrouping,
        options: reliability,
        observationDelayHours: BLEND_CONFIG.observationDelayHours,
      });
      for (const series of indices.values()) {
        const announced = [...series].filter((index) => Number.isFinite(index));
        assert.ok(announced.length > 0);
        assert.ok(announced.every((index) => index <= reliability.singleModelCap));
      }
    }
  });
});

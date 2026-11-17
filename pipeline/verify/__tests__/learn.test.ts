import assert from 'node:assert/strict';

import { indexCells } from '../../archive/forecasts.ts';
import { DAY_MS, HOUR_MS } from '../../instant.ts';
import { emptyCityState } from '../../state/cityState.ts';
import { buildVerification } from '../scores.ts';
import { hoursOfParisDay, learn, nextParisDay } from '../learn.ts';

describe('jours civils de Paris', () => {
  it('comptent 24 heures, 23 au passage à l’heure d’été et 25 au retour', () => {
    assert.equal(hoursOfParisDay('2026-03-28').length, 24);
    assert.equal(hoursOfParisDay('2026-03-29').length, 23);
    assert.equal(hoursOfParisDay('2026-10-25').length, 25);
    assert.equal(hoursOfParisDay('2026-07-14')[0], Date.parse('2026-07-13T22:00:00Z'));
  });

  it('se suivent, changements d’heure et fins de mois compris', () => {
    assert.equal(nextParisDay('2026-03-28'), '2026-03-29');
    assert.equal(nextParisDay('2026-03-29'), '2026-03-30');
    assert.equal(nextParisDay('2026-10-25'), '2026-10-26');
    assert.equal(nextParisDay('2026-12-31'), '2027-01-01');
  });
});

describe('apprentissage sans données', () => {
  const until = Date.parse('2026-03-10T00:00:00Z');

  it('ne fait rien tant que l’archive ne contient aucune case', () => {
    const state = emptyCityState('toulon');
    const result = learn(state, { cells: indexCells([]), observations: new Map(), until });
    assert.deepEqual(result.state, state);
    assert.equal(result.hoursLearned, 0);
    assert.deepEqual(result.days, []);
  });

  it('avance sans rien apprendre quand aucune mesure n’est arrivée, et ne modifie pas l’état reçu', () => {
    const state = emptyCityState('toulon');
    const before = structuredClone(state);
    const time = until - 2 * DAY_MS;
    const cells = indexCells([
      { time, lead: 1, models: {}, blend: { temperature: 15, temperatureSpread: 0.5 } },
    ]);
    const result = learn(state, { cells, observations: new Map(), until });
    assert.deepEqual(state, before);
    assert.equal(result.state.learnedThrough, '2026-03-10T00:00:00Z');
    assert.equal(result.hoursLearned, 0);
    assert.equal(result.hoursWithoutObservation, 2 * 24 + 1);
    // Le jour est inscrit, mais rien n'y est vérifiable.
    const [day] = result.days;
    assert.equal(day?.held, null);
    assert.equal(day?.observedMax, null);
  });

  it('s’arrête à l’heure ronde demandée', () => {
    const state = { ...emptyCityState('toulon'), learnedThrough: '2026-03-09T20:00:00Z' };
    const result = learn(state, {
      cells: indexCells([]),
      observations: new Map(),
      until: until + 59 * 60_000,
    });
    assert.equal(result.state.learnedThrough, '2026-03-10T00:00:00Z');
    assert.equal(result.hoursWithoutObservation, 4);
    assert.equal(HOUR_MS * 4, until - Date.parse('2026-03-09T20:00:00Z'));
  });
});

describe('scores sans données', () => {
  it('ne publient aucune période tant que rien n’a été vérifié', () => {
    const verification = buildVerification({
      cityId: 'nice',
      generatedAt: '2026-11-17T06:00:00Z',
      through: null,
      cells: indexCells([]),
      observations: new Map(),
      days: [],
    });
    assert.equal(verification.period, null);
    assert.deepEqual(verification.rain, { count: 0, hitRate: null });
  });

  it('restent vides quand la période ne contient aucune comparaison', () => {
    const verification = buildVerification({
      cityId: 'nice',
      generatedAt: '2026-11-17T06:00:00Z',
      through: Date.parse('2026-11-15T12:00:00Z'),
      cells: indexCells([]),
      observations: new Map(),
      days: [],
    });
    assert.equal(verification.period, null);
    assert.deepEqual(verification.temperature, { byLead: [], recentDays: [] });
  });
});

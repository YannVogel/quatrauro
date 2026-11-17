import { BLEND_CONFIG } from '../../blendConfig';
import { correctForecast, readBias, updateBias } from '../bias';
import { EMPTY_DECAYED_MEAN } from '../decayedMean';
import type { DecayedMean } from '../decayedMean';

const { biasHalfLifeDays: HALF_LIFE, minSamples: MIN_SAMPLES } = BLEND_CONFIG.corrected;
const HOURS_PER_DAY = 24;

/** Température « vraie » d'une heure : un cycle quotidien autour de 15 °C. */
const truth = (hour: number): number => 15 + 5 * Math.sin((2 * Math.PI * hour) / HOURS_PER_DAY);

/** Apprend le biais d'un modèle sur une période, heure par heure. */
function learn(
  forecast: (hour: number) => number | null,
  observation: (hour: number) => number | null,
  hours: number,
  start: DecayedMean = EMPTY_DECAYED_MEAN,
  firstHour = 0,
): DecayedMean {
  let state = start;
  for (let hour = firstHour; hour < firstHour + hours; hour += 1) {
    state = updateBias(state, forecast(hour), observation(hour), hour, HALF_LIFE);
  }
  return state;
}

describe('correction de biais', () => {
  it('ramène à une erreur moyenne nulle un modèle biaisé de façon constante', () => {
    const biased = (hour: number): number => truth(hour) + 2;
    const state = learn(biased, truth, 20 * HOURS_PER_DAY);

    let totalError = 0;
    const checked = 5 * HOURS_PER_DAY;
    for (let hour = 20 * HOURS_PER_DAY; hour < 20 * HOURS_PER_DAY + checked; hour += 1) {
      totalError += correctForecast(biased(hour), state, MIN_SAMPLES) - truth(hour);
    }
    expect(totalError / checked).toBeCloseTo(0, 9);
    expect(readBias(state, MIN_SAMPLES)).toBeCloseTo(2, 9);
  });

  it('corrige aussi un modèle trop froid', () => {
    const state = learn((hour) => truth(hour) - 1.5, truth, 20 * HOURS_PER_DAY);
    expect(correctForecast(10, state, MIN_SAMPLES)).toBeCloseTo(11.5, 9);
  });

  it('suit un biais qui change', () => {
    const warm = learn(
      () => 12,
      () => 10,
      30 * HOURS_PER_DAY,
    );
    expect(readBias(warm, MIN_SAMPLES)).toBeCloseTo(2, 9);

    // Le modèle devient trop froid de 1 °C. Le biais suivi glisse de +2 vers −1 : il a fait
    // la moitié du chemin au bout d'une demi-vie environ, et il y est après huit.
    const afterOne = learn(
      () => 9,
      () => 10,
      HALF_LIFE * HOURS_PER_DAY,
      warm,
      30 * HOURS_PER_DAY,
    );
    const drift = readBias(afterOne, MIN_SAMPLES) ?? Number.NaN;
    expect(drift).toBeLessThan(1);
    expect(drift).toBeGreaterThan(-1);

    const afterEight = learn(
      () => 9,
      () => 10,
      8 * HALF_LIFE * HOURS_PER_DAY,
      warm,
      30 * HOURS_PER_DAY,
    );
    expect(readBias(afterEight, MIN_SAMPLES)).toBeCloseTo(-1, 1);
  });

  it("ne garde que la moitié d'un ancien biais après une demi-vie de silence", () => {
    const old = updateBias(EMPTY_DECAYED_MEAN, 13, 10, 0, HALF_LIFE);
    const state = updateBias(old, 10, 10, HALF_LIFE * HOURS_PER_DAY, HALF_LIFE);
    // (3 × 0,5 + 0 × 1) / (0,5 + 1) = 1
    expect(readBias(state, 1)).toBeCloseTo(1, 9);
  });

  it('ignore les trous dans les observations sans erreur', () => {
    const holed = (hour: number): number | null => (hour % 3 === 0 ? null : truth(hour));
    const state = learn((hour) => truth(hour) + 2, holed, 20 * HOURS_PER_DAY);
    expect(readBias(state, MIN_SAMPLES)).toBeCloseTo(2, 9);
    expect(state.count).toBe((20 * HOURS_PER_DAY * 2) / 3);
  });

  it("ignore une paire dont la prévision ou l'observation manque", () => {
    const state = updateBias(EMPTY_DECAYED_MEAN, 12, 10, 0, HALF_LIFE);
    expect(updateBias(state, 12, null, 1, HALF_LIFE)).toBe(state);
    expect(updateBias(state, null, 10, 1, HALF_LIFE)).toBe(state);
    expect(updateBias(state, Number.NaN, 10, 1, HALF_LIFE)).toBe(state);
    expect(updateBias(state, 12, Number.NaN, 1, HALF_LIFE)).toBe(state);
  });

  it("ne corrige pas un modèle dont l'historique est trop court", () => {
    const state = learn(
      () => 12,
      () => 10,
      MIN_SAMPLES - 1,
    );
    expect(readBias(state, MIN_SAMPLES)).toBeNull();
    expect(correctForecast(20, state, MIN_SAMPLES)).toBe(20);

    const enough = learn(
      () => 12,
      () => 10,
      MIN_SAMPLES,
    );
    expect(correctForecast(20, enough, MIN_SAMPLES)).toBeCloseTo(18, 9);
  });

  it('ne corrige pas un modèle jamais vu', () => {
    expect(correctForecast(20, EMPTY_DECAYED_MEAN, MIN_SAMPLES)).toBe(20);
  });

  it("ne modifie pas l'état qu'on lui passe", () => {
    const state = updateBias(EMPTY_DECAYED_MEAN, 12, 10, 0, HALF_LIFE);
    const copy = { ...state };
    updateBias(state, 15, 10, 5, HALF_LIFE);
    expect(state).toEqual(copy);
  });
});

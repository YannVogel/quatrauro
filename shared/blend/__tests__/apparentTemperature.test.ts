import { apparentTemperature } from '../apparentTemperature';

describe('température ressentie', () => {
  it('suit la formule de Steadman', () => {
    // 20 °C, 50 % d'humidité, vent de 18 km/h (5 m/s) :
    // e = 0,5 × 6,105 × exp(17,27 × 20 / 257,7) ≈ 11,66 hPa
    // ressenti = 20 + 0,33 × 11,66 − 0,70 × 5 − 4 ≈ 16,35 °C
    expect(apparentTemperature(20, 50, 18)).toBeCloseTo(16.35, 1);
  });

  it('baisse quand le vent se lève', () => {
    const calm = apparentTemperature(10, 60, 0) ?? Number.NaN;
    const windy = apparentTemperature(10, 60, 36) ?? Number.NaN;
    expect(windy).toBeLessThan(calm);
    expect(calm - windy).toBeCloseTo(7, 9);
  });

  it("monte avec l'humidité par temps chaud", () => {
    const dry = apparentTemperature(30, 20, 5) ?? Number.NaN;
    const humid = apparentTemperature(30, 80, 5) ?? Number.NaN;
    expect(humid).toBeGreaterThan(dry);
  });

  it("n'invente rien quand un champ manque", () => {
    expect(apparentTemperature(null, 50, 10)).toBeNull();
    expect(apparentTemperature(20, null, 10)).toBeNull();
    expect(apparentTemperature(20, 50, null)).toBeNull();
  });
});

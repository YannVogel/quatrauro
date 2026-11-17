import { meanDirection } from '../wind';

describe('direction moyenne du vent', () => {
  it('donne 0° pour 350° et 10°, pas 180°', () => {
    expect(meanDirection([350, 10], [0.5, 0.5])).toBeCloseTo(0, 9);
  });

  it('moyenne en vecteurs de part et d’autre du nord', () => {
    expect(meanDirection([340, 0], [0.5, 0.5])).toBeCloseTo(350, 9);
    expect(meanDirection([355, 25], [0.5, 0.5])).toBeCloseTo(10, 9);
  });

  it('rend la moyenne ordinaire loin du nord', () => {
    expect(meanDirection([90, 180], [0.5, 0.5])).toBeCloseTo(135, 9);
    expect(meanDirection([200, 220, 240], [1 / 3, 1 / 3, 1 / 3])).toBeCloseTo(220, 9);
  });

  it('tient compte des poids', () => {
    // Trois quarts du poids à l'est, un quart au nord : la moyenne penche vers l'est.
    const direction = meanDirection([90, 0], [0.75, 0.25]) ?? Number.NaN;
    expect(direction).toBeGreaterThan(45);
    expect(direction).toBeLessThan(90);
  });

  it('rend la direction du seul modèle disponible', () => {
    expect(meanDirection([315], [1])).toBeCloseTo(315, 9);
  });

  it('reste entre 0 inclus et 360 exclu', () => {
    for (const direction of [0, 359.9, 360, 720, -10]) {
      const result = meanDirection([direction], [1]) ?? Number.NaN;
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThan(360);
    }
  });

  it("n'invente pas de direction quand il n'y en a pas, ou quand elles s'annulent", () => {
    expect(meanDirection([], [])).toBeNull();
    expect(meanDirection([0, 180], [0.5, 0.5])).toBeNull();
    expect(meanDirection([90, 210, 330], [1 / 3, 1 / 3, 1 / 3])).toBeNull();
  });

  it('refuse des poids qui ne correspondent pas aux directions', () => {
    expect(() => meanDirection([10, 20], [1])).toThrow();
  });
});

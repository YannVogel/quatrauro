import { blendValues } from '../blend';

describe('moyenne pondérée', () => {
  it('rend la valeur combinée et la dispersion des modèles', () => {
    expect(blendValues([10, 14], [0.75, 0.25])).toEqual({ value: 11, spread: 2 });
  });

  it("n'invente pas de valeur quand aucun modèle n'est disponible", () => {
    expect(blendValues([], [])).toBeNull();
  });

  it('rend la valeur du seul modèle disponible, avec une dispersion nulle', () => {
    expect(blendValues([12.5], [1])).toEqual({ value: 12.5, spread: 0 });
  });

  it('refuse des poids qui ne correspondent pas aux valeurs', () => {
    expect(() => blendValues([1, 2], [1])).toThrow();
  });
});

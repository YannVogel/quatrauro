import assert from 'node:assert/strict';

import { blendValues } from '../logic/blend.ts';

describe('mélange', () => {
  it('rend la moyenne pondérée et la dispersion des modèles', () => {
    const blend = blendValues([10, 14], [0.75, 0.25]);
    assert.equal(blend?.value, 11);
    assert.equal(blend?.spread, 2);
  });

  it("n'invente pas de valeur quand aucun modèle n'est disponible", () => {
    assert.equal(blendValues([], []), null);
  });

  it('rend la valeur du seul modèle disponible, avec une dispersion nulle', () => {
    assert.deepEqual(blendValues([12.5], [1]), { value: 12.5, spread: 0 });
  });

  it('refuse des poids qui ne correspondent pas aux valeurs', () => {
    assert.throws(() => blendValues([1, 2], [1]));
  });
});

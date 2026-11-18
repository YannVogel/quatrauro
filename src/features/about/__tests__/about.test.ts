import { CITIES } from '@shared/cities';
import { MODELS } from '@shared/models';

import { computedAt, listOf, modelSources, stationSources } from '../about';

describe('fournisseurs des modèles', () => {
  it('cite chaque modèle configuré, une seule fois, sous son fournisseur', () => {
    const sources = modelSources();
    const cited = sources.flatMap((source) => source.models);
    expect([...cited].sort()).toEqual(MODELS.map((model) => model.name).sort());
    for (const model of MODELS) {
      const source = sources.find((candidate) => candidate.provider === model.provider);
      expect(source?.models).toContain(model.name);
    }
  });

  it('réunit les modèles d’un même fournisseur, dans l’ordre de la configuration', () => {
    expect(modelSources()[0]).toEqual({ provider: 'Météo-France', models: ['AROME', 'ARPEGE'] });
    expect(modelSources().map((source) => source.provider)).toEqual([
      'Météo-France',
      'ECMWF',
      'DWD',
      'NOAA',
    ]);
  });

  it('suit la configuration : un modèle ajouté est cité sans toucher à l’écran', () => {
    const added = { ...MODELS[0], id: 'ukmo', name: 'UKMO', provider: 'Met Office' };
    expect(modelSources([...MODELS, added])).toContainEqual({
      provider: 'Met Office',
      models: ['UKMO'],
    });
  });
});

describe('stations d’observation', () => {
  it('donne la station de chaque ville configurée', () => {
    expect(stationSources()).toEqual(
      CITIES.map((city) => ({
        city: city.name,
        station: city.station.name,
        stationId: city.station.id,
      })),
    );
  });
});

describe('liste de noms', () => {
  it('s’écrit comme on la dit', () => {
    expect(listOf([])).toBe('');
    expect(listOf(['Toulon'])).toBe('Toulon');
    expect(listOf(['Toulon', 'Nice'])).toBe('Toulon et Nice');
    expect(listOf(['Toulon', 'Nice', 'Hyères'])).toBe('Toulon, Nice et Hyères');
  });
});

describe('date du dernier calcul', () => {
  const NBSP = ' ';

  it('se lit à l’heure de Paris, en hiver comme en été', () => {
    expect(computedAt('2026-11-17T21:27:43Z')).toBe(`mardi 17 novembre à 22${NBSP}h${NBSP}27`);
    expect(computedAt('2026-07-14T22:05:00Z')).toBe(`mercredi 15 juillet à 0${NBSP}h${NBSP}05`);
  });

  it('reste inconnue tant qu’aucun calcul n’est arrivé', () => {
    expect(computedAt(null)).toBeNull();
  });
});

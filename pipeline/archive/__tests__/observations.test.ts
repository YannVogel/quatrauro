import assert from 'node:assert/strict';

import type { Observations } from '../../../shared/series.ts';
import { FORECAST_VARIABLES } from '../../../shared/variables.ts';
import type { ForecastVariable } from '../../../shared/variables.ts';
import { directoryStorage } from '../../storage.ts';
import type { Storage } from '../../storage.ts';
import { snapshot, temporaryDirectory } from '../../testing/scenario.ts';
import { archiveObservations, lastObservedInstant, readObservations } from '../observations.ts';

let root = '';
let storage: Storage;
let cleanup: () => Promise<void> = () => Promise.resolve();

beforeEach(async () => {
  const directory = await temporaryDirectory();
  root = directory.root;
  cleanup = directory.cleanup;
  storage = directoryStorage(root);
});
afterEach(() => cleanup());

/** Mesures fictives : seule la température est renseignée, le reste est vide. */
function temperatures(byTime: Record<string, number | null>): Observations {
  const times = Object.keys(byTime);
  return {
    stationId: '83137001',
    times,
    values: Object.fromEntries(
      FORECAST_VARIABLES.map((variable) => [
        variable,
        times.map((time) => (variable === 'temperature' ? (byTime[time] ?? null) : null)),
      ]),
    ) as Record<ForecastVariable, (number | null)[]>,
  };
}
const at = (iso: string): number => Date.parse(iso);

describe('archive des observations', () => {
  it('range les mesures par mois et les relit', async () => {
    const added = await archiveObservations(
      storage,
      'toulon',
      temperatures({
        '2026-10-31T23:00:00Z': 17.2,
        '2026-11-01T00:00:00Z': 16.9,
        '2026-11-01T01:00:00Z': null,
      }),
    );
    assert.equal(added, 2);
    assert.deepEqual(Object.keys(await snapshot(root)).sort(), [
      'archive/observations/toulon/2026-10.json',
      'archive/observations/toulon/2026-11.json',
    ]);
    const read = await readObservations(
      storage,
      'toulon',
      at('2026-10-31T00:00:00Z'),
      at('2026-11-02T00:00:00Z'),
    );
    assert.equal(read.get(at('2026-10-31T23:00:00Z'))?.temperature, 17.2);
    assert.equal(read.get(at('2026-11-01T00:00:00Z'))?.temperature, 16.9);
    // Une heure sans aucune mesure ne figure pas dans l'archive.
    assert.equal(read.get(at('2026-11-01T01:00:00Z')), undefined);
    assert.equal(lastObservedInstant(read), '2026-11-01T00:00:00Z');
  });

  it('remplit une heure vide quand la mesure arrive, sans jamais remplacer une mesure', async () => {
    await archiveObservations(
      storage,
      'toulon',
      temperatures({ '2026-11-01T00:00:00Z': 16.9, '2026-11-01T01:00:00Z': null }),
    );
    const added = await archiveObservations(
      storage,
      'toulon',
      temperatures({ '2026-11-01T00:00:00Z': 99, '2026-11-01T01:00:00Z': 16.4 }),
    );
    assert.equal(added, 1);
    const read = await readObservations(
      storage,
      'toulon',
      at('2026-11-01T00:00:00Z'),
      at('2026-11-01T01:00:00Z'),
    );
    assert.equal(read.get(at('2026-11-01T00:00:00Z'))?.temperature, 16.9);
    assert.equal(read.get(at('2026-11-01T01:00:00Z'))?.temperature, 16.4);
  });

  it('ne réécrit rien quand il n’y a rien de nouveau', async () => {
    const observations = temperatures({ '2026-11-01T00:00:00Z': 16.9 });
    await archiveObservations(storage, 'toulon', observations);
    const before = await snapshot(root);
    assert.equal(await archiveObservations(storage, 'toulon', observations), 0);
    assert.deepEqual(await snapshot(root), before);
  });

  it('ne lit que la période demandée', async () => {
    await archiveObservations(
      storage,
      'toulon',
      temperatures({ '2026-11-01T00:00:00Z': 16.9, '2026-11-01T05:00:00Z': 15.1 }),
    );
    const read = await readObservations(
      storage,
      'toulon',
      at('2026-11-01T01:00:00Z'),
      at('2026-11-01T05:00:00Z'),
    );
    assert.deepEqual([...read.keys()], [at('2026-11-01T05:00:00Z')]);
    assert.equal(lastObservedInstant(new Map()), null);
  });
});

import assert from 'node:assert/strict';

import { HttpStatusError, httpGet } from '../http.ts';
import type { HttpFetch } from '../http.ts';
import { fakeHttp, respond } from '../testing/fakeHttp.ts';

const URL_TESTED = 'https://api.example.test/v1/data?x=1';

describe('appel HTTP', () => {
  it('rend la réponse quand tout va bien, sans attendre', async () => {
    const http = fakeHttp([respond('ok')]);
    const response = await httpGet(URL_TESTED, http.options);
    assert.equal(await response.text(), 'ok');
    assert.deepEqual(http.sleeps, []);
  });

  it('retente une panne passagère, en espaçant les tentatives', async () => {
    const http = fakeHttp([respond('panne', 503), new Error('réseau coupé'), respond('ok')]);
    const response = await httpGet(URL_TESTED, http.options);
    assert.equal(await response.text(), 'ok');
    assert.deepEqual(http.sleeps, [5_000, 20_000]);
    assert.equal(http.urls.length, 3);
  });

  it('retente un dépassement de quota (429)', async () => {
    const http = fakeHttp([respond('trop de requêtes', 429), respond('ok')]);
    await httpGet(URL_TESTED, http.options);
    assert.deepEqual(http.sleeps, [5_000]);
  });

  it('abandonne après la dernière tentative, avec le statut et le message du serveur', async () => {
    const http = fakeHttp([respond('a', 500), respond('b', 502), respond('maintenance', 503)]);
    await assert.rejects(httpGet(URL_TESTED, http.options), (error: unknown) => {
      assert.ok(error instanceof HttpStatusError);
      assert.equal(error.status, 503);
      assert.match(error.message, /api\.example\.test a répondu 503 : maintenance/);
      return true;
    });
    assert.equal(http.urls.length, 3);
  });

  it('ne retente pas un refus', async () => {
    const http = fakeHttp([respond('{"error":true,"reason":"Invalid"}', 400)]);
    await assert.rejects(httpGet(URL_TESTED, http.options), HttpStatusError);
    assert.equal(http.urls.length, 1);
    assert.deepEqual(http.sleeps, []);
  });

  it('interrompt une tentative qui dépasse le délai, puis dit lequel', async () => {
    const never: HttpFetch = (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal.addEventListener('abort', () => reject(new Error('interrompu')));
      });
    const sleeps: number[] = [];
    const options = {
      fetch: never,
      sleep: (ms: number) => {
        sleeps.push(ms);
        return Promise.resolve();
      },
      timeoutMs: 5,
      retryDelaysMs: [1, 1],
    };
    await assert.rejects(
      httpGet(URL_TESTED, options),
      /Délai de 5 ms dépassé pour api\.example\.test/,
    );
    assert.deepEqual(sleeps, [1, 1]);
  });
});

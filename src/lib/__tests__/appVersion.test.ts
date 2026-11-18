// La version affichée vient de la configuration de l'app, lue par expo-constants.

type AppVersionModule = { readonly appVersion: string | null };

function loadWith(expoConfig: { version?: string } | null): string | null {
  let loaded: AppVersionModule | undefined;
  jest.isolateModules(() => {
    jest.doMock('expo-constants', () => ({ __esModule: true, default: { expoConfig } }));
    loaded = jest.requireActual<AppVersionModule>('../appVersion');
  });
  if (loaded === undefined) throw new Error('module non chargé');
  return loaded.appVersion;
}

afterEach(() => jest.dontMock('expo-constants'));

describe('version de l’app', () => {
  it('est celle que déclare la configuration', () => {
    expect(loadWith({ version: '1.4.0' })).toBe('1.4.0');
  });

  it('vaut null quand la configuration n’est pas lisible, ou ne dit pas la version', () => {
    expect(loadWith(null)).toBeNull();
    expect(loadWith({})).toBeNull();
  });
});

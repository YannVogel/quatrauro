// Réglages communs à tous les tests.

// Le stockage de l'appareil est remplacé par celui, en mémoire, que fournit la bibliothèque.
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Aucun test ne touche au réseau : un appel que le test n'a pas simulé échoue.
global.fetch = jest.fn(() => Promise.reject(new Error('Réseau non simulé dans ce test')));

// `renderRouter` (expo-router) installe de fausses minuteries, qui remplacent la classe `Date`.
// Si les modules de dates sont chargés après, `UTCDate` hérite de la fausse classe et date-fns
// ne la reconnaît plus : les heures sortent décalées du fuseau de la machine. On les charge donc
// ici, avec la vraie `Date`, comme dans l'app.
jest.requireActual('@date-fns/utc');
jest.requireActual('date-fns');

// Sous Jest, React Native annonce un téléphone dont la police est agrandie à 200 %. Les tests
// rendent l'app aux réglages par défaut ; ceux qui portent sur les grandes polices le demandent
// (`setFontScale`, dans `src/ui/testing/`).
const { Dimensions } = jest.requireActual<typeof import('react-native')>('react-native');
const { TEST_PHONE } =
  jest.requireActual<typeof import('./src/ui/testing/phone')>('./src/ui/testing/phone');
Dimensions.set({ window: TEST_PHONE, screen: TEST_PHONE });

// `app.config.ts` charge `tsx/cjs` pour importer d'autres fichiers TypeScript quand c'est Expo
// qui le lit. Sous Jest, Babel s'en charge déjà, et ce crochet bloque les processus de test
// lancés en parallèle : il est remplacé ici par un module vide.
module.exports = {};

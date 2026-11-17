// Point d'entrée de `npm run pipeline` : un passage complet, avec le vrai réseau et la vraie
// horloge. Voir pipeline/main.ts pour les options.

import { main } from './main.ts';

process.exitCode = await main(process.argv.slice(2), {
  fetch: (url, init) => fetch(url, init),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  now: () => new Date(),
  log: (message) => console.log(message),
});

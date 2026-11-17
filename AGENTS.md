# AGENTS.md — conventions pour les agents (et les humains)

Quatrauro est une app météo personnelle (Expo / React Native, Android) pour Toulon et Nice. Elle croise plusieurs modèles de prévision, corrige leurs erreurs locales à partir des observations et affiche un indice de fiabilité. Il n'y a pas de serveur : un pipeline TypeScript tourne dans GitHub Actions et publie des JSON statiques que l'app lit. Le cadrage de référence est [docs/QUATRAURO_PROJECT_BRIEF.md](docs/QUATRAURO_PROJECT_BRIEF.md) ; les décisions prises depuis vivent dans les issues GitHub (sections « ⚠️ Point tranché ») et dans [docs/adr/](docs/adr/). En cas de conflit avec le brief, l'issue prime. L'architecture (couches, flux des données, mélange, hors ligne) est décrite dans [ARCHITECTURE.md](ARCHITECTURE.md).

> **État du repo** (à tenir à jour à chaque milestone) : **socle en place.** Le projet Expo compile, se teste et affiche un écran provisoire ; la CI tourne sur chaque PR ; les deux spikes sont terminés (ADR 0002 et 0003) et le backtest a donné son feu vert ([rapport](docs/features/backtest.md)). Restent à écrire : le design system Riviera (suite de M0), le pipeline (M1), les écrans (M2 à M4).

## Ordre de travail

1. **M0-02** (spike sources) puis **M0-03** (spike backtest) sont terminés. Le critère du feu vert est atteint : le mélange fait mieux que le meilleur modèle seul, dans les deux villes. Les paramètres retenus sont dans l'[ADR 0003](docs/adr/0003-methode-de-melange.md).
2. Si un changement de la logique du mélange dégrade le backtest (`npm run backtest`), on s'arrête et on en parle à Yann.
3. Suivre les milestones dans l'ordre et les dépendances indiquées dans chaque issue.

## Conventions de travail

- **Langue** : la prose (issues, PR, docs, commentaires explicatifs) est en français. Le code et les identifiants sont en anglais. Les messages de commit suivent les Conventional Commits, en anglais.
- **Nom** : le projet s'appelle **Quatrauro**, en un mot. Ne jamais écrire « 4auro », « Quatre Auro » ni réintroduire un ancien nom de travail (Embellie, Souleiado, Cagnard…).
- **Principes** : DRY, SOLID, KISS, YAGNI. Pas de code spaghetti, dépendances unidirectionnelles.
- **Tests** : non négociables, écrits en même temps que le code. Une feature sans tests n'est pas terminée.
- **Documentation** : tout changement structurant met à jour les fichiers markdown racine dans le même commit : `README.md` (installation, variables, commandes, builds), `AGENTS.md` (conventions, structure, commandes) et `ARCHITECTURE.md` (couches, flux des données, mélange, hors ligne). Les décisions techniques notables font l'objet d'une ADR courte dans `docs/adr/` (gabarit : `docs/adr/0000-template.md`). Un spike se termine toujours par une ADR.
- **Docs de fonctionnalité** : chaque fonctionnalité notable a sa fiche dans `docs/features/<fonctionnalite>.md` (comportement, données, écrans, cas limites), mise à jour dans le même commit et listée dans l'index [docs/features/README.md](docs/features/README.md).
- **Workflow** : une issue → une branche → une PR (`Closes #n`), CI verte avant le merge. Yann relit et merge. Sur demande de Yann, les issues d'un milestone peuvent être regroupées dans une seule PR, avec un commit par issue.
- **Secrets** : aucune clé secrète dans l'app ni dans le repo (qui est public). Une éventuelle clé d'API d'observations vit dans les secrets GitHub Actions et dans `.env.local` (ignoré) ; un `.env.example` documente les variables.
- **Chaînes UI** : toutes dans `src/i18n/fr.ts`, lues par `strings` (`@/i18n`) ; aucune chaîne en dur dans les composants. Ce que disent les lecteurs d'écran est dans `strings.spoken`.
- **Nombres** : toujours mis en forme par `src/lib/format.ts` (virgule décimale, espace insécable avant `%` et les unités, `°` collé, vrai signe moins). Une valeur absente s'écrit « — » et se lit « indisponible ».
- **Catalogue** : tout composant de `@/ui` et toute condition météo se montrent dans le catalogue (`/dev/catalog`, lien sur l'accueil en développement), avec leurs cas limites. Un composant ajouté ou modifié s'y vérifie à l'œil, dans les deux thèmes, avant la PR. Ses données sont fictives et vivent dans `src/features/catalog/__fixtures__/`. Hors développement (`__DEV__` faux), l'écran renvoie à l'accueil.
- **Composants** : un composant de `@/ui` reçoit ses données par ses props et ne lit rien lui-même ; il accepte `null` pour toute valeur météo. Un composant graphique (barre, graphique, icône qui informe) a un `accessibilityLabel` qui dit sa valeur.
- **Accessibilité de base** : cibles tactiles d'au moins 48 dp ; contrastes WCAG AA dans les deux thèmes ; `accessibilityLabel` sur les boutons-icônes et sur les graphiques ; une information n'est jamais portée par la seule couleur.
- **Design system** : les écrans s'appuient sur les composants et les tokens de `@/ui` (`src/ui/theme.ts`). Aucune couleur en dur ailleurs (règle ESLint, testée). Chaque token existe en clair et en sombre. Le texte passe toujours par le composant `Text` de `@/ui` (variante et couleur du thème), les styles par `makeStyles`, le thème par `useTheme()`. Tout nouveau couple texte/fond s'ajoute à `CONTRAST_PAIRS`, que le test des contrastes parcourt.
- **Icônes et conditions** : la liste des conditions météo est dans `shared/conditions.ts` (source unique) ; leur icône et leurs couleurs dans `src/ui/conditions.ts`. Les icônes s'affichent par le composant `Icon` et le registre `src/ui/icons.ts` : ne jamais importer `lucide-react-native` ailleurs.
- **Direction graphique** : « Riviera » ([ADR 0001](docs/adr/0001-direction-graphique-riviera.md)). Sa spécification, [docs/design/riviera.md](docs/design/riviera.md), fait foi pour les tokens, les composants et les écrans ; les maquettes sont dans `docs/design/claude-design/`, à ne pas modifier à la main. Pas de dégradé, pas d'ombre floue, pas d'emoji : aplats, grands rayons, icônes au trait.

## Données météo

- **Ne jamais inventer une valeur.** Une donnée absente est `null` et s'affiche « indisponible ». Une prévision ancienne s'affiche avec son heure et un avertissement, jamais comme si elle était fraîche. Les chiffres des maquettes sont fictifs : ne pas les recopier comme données d'essai « réalistes » sans le dire.
- **Sources** : les modèles sont lus via Open-Meteo, les observations dans les fichiers horaires publics de Météo-France ([ADR 0002](docs/adr/0002-sources-de-donnees-meteo.md), détail dans [docs/features/donnees.md](docs/features/donnees.md)). Aucune des deux sources ne demande de clé. Ne pas ajouter une source sans ADR.
- **Usage non commercial** : l'accès gratuit d'Open-Meteo impose un usage non commercial et une attribution. Rester sobre sur les appels : le pipeline interroge l'API, jamais l'app.
- **Attributions** : Open-Meteo et les fournisseurs des modèles et des observations restent cités dans l'écran « À propos des données ».
- **Configuration unique** : les villes (`shared/cities.ts`), les modèles (`shared/models.ts`) et les paramètres du mélange (`shared/blendConfig.ts`) sont chacun dans un seul fichier. Aucune ville, aucun modèle, aucun paramètre en dur ailleurs. Ajouter une ville ne doit demander qu'une entrée de configuration. Un paramètre de `blendConfig.ts` ne change pas sans relancer `npm run backtest`.
- **Contrat** : la forme des fichiers publiés est dans `shared/schemas.ts` et décrite dans [docs/features/contrat-de-donnees.md](docs/features/contrat-de-donnees.md). Toute valeur météo y accepte `null`.
- **Unités** : °C, km/h, mm, %. Les conversions se font à l'entrée du pipeline, une seule fois.
- **Vent** : une direction se moyenne en composantes vectorielles, jamais en degrés.

## Logique métier partagée

- La logique pure (correction de biais, poids, mélange, indice de fiabilité, condition, résumés) vit dans `shared/`, sans dépendance à React Native ni à Node, et se teste avec des données et des dates fixes. Le pipeline et l'app l'importent depuis là.
- **Tout le calcul se fait dans le pipeline.** L'app n'effectue aucun mélange : elle valide le JSON reçu (schémas Zod de `shared/`) et l'affiche.
- Le contrat des fichiers publiés est versionné (`schemaVersion`). Un changement incompatible incrémente la version ; l'app refuse proprement une version inconnue.
- Les heures se manipulent dans le fuseau `Europe/Paris` : le décalage vient de `shared/parisTime.ts` (règle européenne de changement d'heure, sans `Intl` : [ADR 0005](docs/adr/0005-heure-de-paris-sans-base-de-fuseaux.md)), la mise en forme de `src/lib/dates.ts` (`date-fns`, locale `fr`, semaine commençant le lundi). Ne jamais lire le fuseau du téléphone ni appeler `Intl` pour situer une heure. Les fichiers publiés portent des instants en UTC. Les tests figent l'horloge et écrivent leurs instants en UTC, pour ne pas dépendre du fuseau de la machine. Attention aux changements d'heure dans les agrégats journaliers.
- Le backtest (`pipeline/backtest/`) rejoue exactement le code de `shared/` : jamais une copie de la logique. Il ne doit jamais utiliser une information postérieure à l'instant simulé. Il régénère aussi `pipeline/__fixtures__/backtest/reliability-days.json`, que le test de calibration de l'indice de fiabilité rejoue : ne pas le modifier à la main.
- Le backtest s'exécute directement avec Node (`node pipeline/backtest/run.ts`), sans compilation. Dans `pipeline/` et dans `shared/`, les imports relatifs portent donc l'extension `.ts`, sans alias, et le code n'utilise que la syntaxe TypeScript effaçable (pas d'`enum`, pas de propriétés de constructeur). L'app, elle, importe `shared/` par l'alias `@shared/`.
- `docs/features/backtest-resultats.md` est généré par le backtest : ne pas le modifier à la main.

## Structure

Ce qui existe aujourd'hui :

```
app/                        # routes Expo Router (uniquement des écrans et des layouts)
  _layout.tsx  index.tsx  dev/catalog.tsx
__tests__/                  # tests qui rendent l'app entière (renderRouter sur app/)
src/
  features/forecast/        # components/HomeScreen.tsx (écran provisoire), index.ts
  features/catalog/         # catalogue des composants (développement seulement) et ses données fictives
  ui/                       # theme.ts (tokens), ThemeProvider, Text, Icon, icons.ts, conditions.ts, contrast.ts
    components/             # les composants Riviera (HeroBlock, Card, DayRow, HourlyChart…), exportés par @/ui
    testing/                # renderWithTheme, pour les tests de composants
  lib/                      # dates.ts (mise en forme à l'heure de Paris), format.ts (nombres à la française)
  i18n/                     # fr.ts : toutes les chaînes UI ; index.ts : accès typé (`strings`)
shared/                     # ne dépend de rien : ni Node, ni React Native, ni le reste du repo
  cities.ts  models.ts  blendConfig.ts      # la configuration unique
  conditions.ts  variables.ts               # listes fermées : conditions météo, grandeurs prévues
  schemas.ts  series.ts                     # contrat des fichiers publiés (Zod), séries internes
  parisTime.ts                              # décalage de Paris sur UTC, jours civils de Paris
  blend/                                    # logique pure du mélange : biais, poids, mélange d'une heure, pluie, agrégats, indice de fiabilité
pipeline/
  __fixtures__/             # réponses réelles d'Open-Meteo et de Météo-France, et données dérivées du backtest, pour les tests
  backtest/                 # backtest du mélange : rejoue shared/blend/ sur l'historique
assets/                     # icônes provisoires du modèle Expo ; assets/icon/ : variantes proposées (docs/design/icone.md)
scripts/brand/              # export en PNG de la variante d'icône choisie (npm run brand:export)
docs/
  QUATRAURO_PROJECT_BRIEF.md  adr/  design/  features/
.github/workflows/ci.yml    # intégration continue
app.config.ts               # identité de l'app et configuration native
eas.json                    # profils de build (development, preview) et canal de mise à jour
```

Ce qui s'y ajoutera, là et pas ailleurs :

```
src/features/<feature>/     # forecast (accueil, détail d'un jour), models, reliability, about
  components/ hooks/ api/ __tests__/ index.ts
src/lib/                    # env.ts, queryClient.ts, data.ts (lecture des JSON publiés)
pipeline/                   # collect/ (prévisions, observations), archive/, verify/, blend/, publish/
```

- Les dépendances sont unidirectionnelles : `app/` → `features/` → `ui/` + `lib/` + `shared/` ; `pipeline/` → `shared/`. `shared/` n'importe rien du reste.
- Une feature n'importe jamais les internes d'une autre : elle passe par son `index.ts`.
- Les routes vivent dans `app/` à la racine. Ne jamais créer `src/app/`.
- Les données archivées et publiées vivent sur la branche `data`, jamais sur `main`. Aucun workflow ne doit committer sur `main`.
- Alias : `@/` → `src/`, `@shared/` → `shared/`.
- ESLint fait respecter deux frontières : `app/` et `src/` n'importent aucun module de Node ; `shared/` n'importe ni Node, ni React, ni React Native, ni Expo, ni `@/`.
- Les tests ne vivent jamais dans `app/` (tout fichier y est une route) : `__tests__/` à la racine pour l'app entière, `__tests__/` à côté du code ailleurs.

## Commandes

```bash
npm start                   # serveur de développement Expo
npm run android             # compile et installe l'app sur l'émulateur Android (expo run:android)
npm run typecheck           # tsc --noEmit
npm run lint                # ESLint (expo lint) puis Prettier en vérification
npm run format              # Prettier en écriture
npm test                    # Jest : tests de l'app, de shared/ et de pipeline/
npm run backtest            # rejoue le mélange sur l'historique et réécrit docs/features/backtest-resultats.md
npm run brand:export -- <variante>   # exporte en PNG l'icône choisie ; pas avant le choix de Yann (docs/design/icone.md)
npx expo install <paquet>   # toujours pour ajouter une dépendance de l'app (version compatible SDK)
```

À venir : `npm run pipeline` (un passage complet du pipeline, en local, sans publier), avec M1.

Lancer `typecheck`, `lint` et `test` avant de déclarer une tâche terminée. La CI (`.github/workflows/ci.yml`) rejoue ces trois commandes sur chaque PR et sur `main`, et doit être verte avant le merge. Elle ne se déclenche pas sur la branche `data`. Ne jamais la rendre plus permissive pour faire passer une PR.

## Expo évolue vite

Expo publie des changements cassants à chaque SDK. Avant d'écrire du code qui touche une API Expo, EAS ou React Native : lire la version majeure d'`expo` dans `package.json`, puis consulter la documentation versionnée (`https://docs.expo.dev/versions/v<majeure>.0.0/`) ou l'index https://docs.expo.dev/llms.txt. Ne jamais se fier à sa mémoire. Même règle pour l'API d'Open-Meteo : lire sa documentation avant d'écrire un appel.

Le projet est sur **Expo SDK 58** (React Native 0.88, React 19.3, TypeScript 6) : documentation versionnée sur https://docs.expo.dev/versions/v58.0.0/. Chaque page de la documentation se lit aussi en markdown en ajoutant `.md` à son adresse.

- Dans ce SDK, `renderRouter` et les helpers de `expo-router/testing-library` sont asynchrones : toujours les attendre (`await`).

- Les dossiers `ios/` et `android/` sont générés (Continuous Native Generation) et ignorés par git : configurer le natif dans `app.config.ts`. Après l'ajout d'une dépendance native ou d'un plugin, régénérer avec `npx expo prebuild --clean --platform android` avant `npm run android`.
- `app.config.ts` importe d'autres fichiers TypeScript grâce à `tsx/cjs` (première ligne du fichier) : ne pas la retirer.
- Builds et mises à jour : profils `development` et `preview` dans `eas.json`, canal `preview`, procédure dans le README. L'identifiant du projet Expo (`EAS_PROJECT_ID`, dans `app.config.ts`) est renseigné par Yann après `eas init`.
- Android est la seule cible de la v1. Ne rien écrire de spécifique à iOS, et ne rien écrire qui l'empêche.

## Règles d'exploitation

- **Aucun déploiement sans demande explicite de Yann** : build EAS, EAS Update, activation ou modification du cron, changement des secrets.
- **Aucune action destructive sans confirmation explicite de Yann** : réécriture ou suppression de la branche `data` (c'est l'archive, elle ne se reconstruit pas entièrement), suppression de secrets, changement de visibilité du repo.
- **Un échec du pipeline doit se voir** : un run en échec ne publie rien de partiel, laisse le dernier fichier valide en place et remonte l'erreur.

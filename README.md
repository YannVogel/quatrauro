# Quatrauro

App météo personnelle pour Toulon et Nice. Elle croise plusieurs modèles de prévision, corrige leurs erreurs locales à partir des observations, et affiche pour chaque jour un indice de fiabilité.

Le nom vient du provençal « quatre auro », les quatre vents.

> **État** : socle. Le projet Expo compile et affiche un écran provisoire, et le backtest a validé la méthode ([rapport](docs/features/backtest.md)). Le pipeline et les écrans arrivent avec les milestones M1 et M2.

## Comment ça marche

1. Un pipeline TypeScript, lancé par GitHub Actions, récupère les prévisions de plusieurs modèles (via Open-Meteo) et les observations des stations.
2. Il compare ce que chaque modèle avait prévu à ce qui a été mesuré, corrige le biais de chacun et le pondère selon son erreur récente.
3. Il publie la prévision combinée sous forme de fichiers JSON statiques, sur la branche `data`.
4. L'app (Expo / React Native, Android) lit ces fichiers et les affiche. Il n'y a ni serveur, ni compte.

## Documentation

| Document | Contenu |
|---|---|
| [docs/QUATRAURO_PROJECT_BRIEF.md](docs/QUATRAURO_PROJECT_BRIEF.md) | Cadrage : vision, décisions, règles métier, backlog |
| [AGENTS.md](AGENTS.md) | Conventions de travail, structure, commandes (lu par les agents de code) |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Couches, flux des données, mélange, hors ligne |
| [docs/adr/](docs/adr/) | Décisions d'architecture : direction graphique, sources de données, méthode de mélange, pipeline, heure de Paris |
| [docs/design/riviera.md](docs/design/riviera.md) | Direction graphique « Riviera » : tokens, composants, écrans |
| [docs/design/claude-design/](docs/design/claude-design/) | Maquettes |
| [docs/design/icone.md](docs/design/icone.md) | L'icône de l'app : dessin, sources, export des PNG |
| [docs/design/etats.md](docs/design/etats.md) | États non nominaux : chargement, erreurs, données manquantes |
| [docs/design/accessibilite.md](docs/design/accessibilite.md) | Ce qui a été vérifié en accessibilité, comment, et les écarts assumés |
| [docs/design/captures/](docs/design/captures/) | Captures de référence de chaque écran, en clair et en sombre |
| [docs/features/](docs/features/) | Fiches des fonctionnalités, au fil du développement : [sources de données](docs/features/donnees.md), [backtest du mélange](docs/features/backtest.md) |

## Installation

Il faut Node 24 (la version est dans `.nvmrc`) et, pour lancer l'app, un émulateur Android avec le SDK Android et un JDK 17.

```bash
nvm use            # ou toute autre façon d'obtenir Node 24
npm install
```

Aucune variable d'environnement n'est nécessaire à ce stade, et aucune clé : `.env.example` documente les variables au fur et à mesure qu'elles apparaissent. Les valeurs locales vont dans `.env.local`, ignoré par git.

## Commandes

| Commande | Effet |
|---|---|
| `npm start` | Lance le serveur de développement Expo |
| `npm run android` | Compile l'app et l'installe sur l'émulateur Android (ou un téléphone branché) |
| `npm run typecheck` | Vérifie les types (`tsc --noEmit`) |
| `npm run lint` | ESLint, puis Prettier en vérification |
| `npm run format` | Remet le code en forme avec Prettier |
| `npm test` | Lance tous les tests (app, `shared/`, `pipeline/`) avec Jest |
| `npm run backtest` | Rejoue le mélange sur l'historique et réécrit le [tableau des résultats](docs/features/backtest-resultats.md) |
| `npm run pipeline` | Un passage complet du pipeline dans un dossier local (`.data/` par défaut) ; `-- --dry-run` pour ne rien écrire. Voir [le passage](docs/features/pipeline.md) |
| `npm run pipeline:bootstrap` | Construit l'état de départ du pipeline à partir de l'historique. Une seule fois, à la main : voir [l'amorçage](docs/features/amorcage.md) |

### Lancer l'app sur un émulateur

```bash
npm run android
```

La première compilation prend plusieurs minutes : elle génère le dossier `android/` (ignoré par git, voir « Continuous Native Generation » dans la documentation d'Expo) puis construit l'app. Les fois suivantes, `npm start` suffit tant que le code natif ne change pas.

## Builds et mises à jour

Au quotidien, l'app s'installe par un APK, sans passer par le Play Store. Elle a aussi sa fiche dans la Google Play Console (compte Parallax Works), où se dépose un AAB. Les builds se font avec EAS (les services d'Expo), les mises à jour du JavaScript avec EAS Update. La configuration est dans [`eas.json`](eas.json) et [`app.config.ts`](app.config.ts).

| Profil | Ce qu'il produit | Quand s'en servir |
|---|---|---|
| `development` | Un client de développement (APK) qui charge le code depuis `npm start` | Pour développer sur un vrai téléphone |
| `preview` | L'app elle-même, en APK, abonnée au canal de mises à jour `preview` | Pour l'usage quotidien |
| `production` | L'app en AAB, abonnée au canal de mises à jour `production` | Pour déposer une version dans la Google Play Console |

> **Rien de tout cela ne se lance sans une demande explicite de Yann** : ni build, ni mise à jour (AGENTS.md, « Règles d'exploitation »).

### Une seule fois : relier le repo au compte Expo

C'est fait : le repo est relié au projet Expo `@yannvogel/quatrauro`, dont l'identifiant est dans la constante `EAS_PROJECT_ID` d'`app.config.ts` (ce n'est pas un secret). Sur une nouvelle machine, il reste à installer l'outil et à se connecter :

```bash
npm install --global eas-cli
eas login            # compte Expo propriétaire du projet
```

Si `EAS_PROJECT_ID` vaut `null`, les mises à jour EAS sont désactivées dans l'app ; `eas init` crée alors un projet et affiche l'identifiant à y reporter.

### Construire et installer l'APK

```bash
eas build --profile preview --platform android
```

Le build tourne sur les serveurs d'Expo (une quinzaine de minutes). À la fin, EAS affiche un lien et un QR code : l'ouvrir sur le téléphone, télécharger l'APK et l'installer (Android demande d'autoriser l'installation depuis cette source).

### Construire l'AAB pour Google Play

```bash
eas build --profile production --platform android
```

Le fichier `.aab` produit se dépose à la main dans la Play Console, sur la piste voulue (tests internes pour commencer). Deux numéros identifient une version :

- `version` dans `app.config.ts` est le numéro montré aux utilisateurs. Il se choisit avant chaque build destiné à Play, jamais en silence.
- le `versionCode` d'Android est tenu par EAS (`appVersionSource: remote`) et augmente tout seul à chaque build `production` : Play refuse un numéro déjà déposé.

Au premier build, EAS propose de créer la clé de signature et la garde ; pour Play, c'est la clé d'importation (« Signature d'application Play »).

### Publier une mise à jour du JavaScript

Quand seuls le JavaScript ou les images ont changé, pas besoin de reconstruire :

```bash
eas update --channel preview --message "Ce qui change"
```

Les builds déposés sur Play suivent le canal `production`, pas `preview` : une mise à jour publiée sur l'un n'atteint pas l'autre.

L'app installée télécharge la mise à jour à son prochain lancement et l'applique au lancement suivant : la fermer complètement et la rouvrir deux fois.

Une mise à jour ne s'applique qu'aux builds de la **même version** de l'app (`version` dans `app.config.ts`). Il faut reconstruire l'APK, et non publier une mise à jour, dès que le code natif change : nouvelle dépendance native, nouveau plugin dans `app.config.ts`, nouvelle version d'Expo, changement d'icône ou de police.

### Client de développement

```bash
eas build --profile development --platform android
npm start            # puis ouvrir l'app installée sur le téléphone
```

Sur un émulateur, `npm run android` suffit et ne passe pas par EAS.

### Lire des données locales

Par défaut, l'app lit les fichiers publiés sur la branche `data`. Pour lui faire lire des fichiers produits sur la machine de développement :

```bash
npm run pipeline                                   # écrit dans .data/
python3 -m http.server 8787 --directory .data      # les sert sur le port 8787
echo 'EXPO_PUBLIC_DATA_URL=http://10.0.2.2:8787' > .env.local
npm run android
```

`10.0.2.2` est le nom de la machine de développement vu depuis l'émulateur Android. `.env.local` est ignoré par git ; le supprimer pour revenir à l'adresse par défaut. Détail : [docs/features/lecture-des-donnees.md](docs/features/lecture-des-donnees.md).

### Catalogue des composants

En développement, l'écran d'accueil propose un lien « Ouvrir le catalogue des composants ». Le catalogue montre chaque composant du design system et chaque condition météo, avec leurs cas limites, et a sa propre bascule entre thème clair et thème sombre. Ses données sont fictives. Il n'existe pas dans l'app distribuée.

### Intégration continue

Le workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml) rejoue `npm run typecheck`, `npm run lint` et `npm test` sur chaque pull request et sur chaque push sur `main`, avec la version de Node de `.nvmrc`. Une PR ne se merge que si ce contrôle est vert.

La branche `data`, où le pipeline archive et publie ses fichiers, ne déclenche pas la CI.

Avant d'ouvrir une PR, lancer les trois commandes en local : ce sont exactement celles de la CI.

### Backtest

Le premier passage télécharge environ 60 Mo de prévisions et d'observations dans `pipeline/backtest/.cache/` (ignoré par git). Aucune clé n'est nécessaire. Le rapport est dans [docs/features/backtest.md](docs/features/backtest.md).

## Exploitation du pipeline

Le pipeline tourne dans GitHub Actions (`.github/workflows/pipeline.yml`) et publie sur la branche `data`. **Il est en service depuis le 20 novembre 2026** : quatre passages par jour, à 1 h 17, 7 h 17, 13 h 17 et 19 h 17 UTC, et il se lance aussi à la main. Les décisions (fréquence, adresse de lecture, rétention) sont dans l'[ADR 0004](docs/adr/0004-pipeline-github-actions.md) ; ce que fait un passage, dans [docs/features/pipeline.md](docs/features/pipeline.md).

### Une seule fois : mettre en route

**Fait le 20 novembre 2026**, à la demande de Yann. La marche suivie reste ici pour mémoire : elle ne se rejoue pas sur une branche `data` qui existe (l'amorçage refuse d'écraser un état, et réécrire `data` est une action destructive).

Dans l'ordre. Chaque étape est un geste de Yann ; aucune n'est faite par un agent sans demande explicite.

1. **Créer la branche `data`**, vide, sans l'historique du code :

   ```bash
   git switch --orphan data
   git commit --allow-empty --message "data: branche vide"
   git push --set-upstream origin data
   git switch main
   ```

2. **Amorcer** l'état sur l'historique, dans un checkout de `data` à côté du repo ([détail](docs/features/amorcage.md)) :

   ```bash
   git worktree add ../quatrauro-data data
   npm run pipeline:bootstrap -- --data-dir=../quatrauro-data
   git -C ../quatrauro-data add --all
   git -C ../quatrauro-data commit --message "data: amorçage par l'historique"
   git -C ../quatrauro-data push
   ```

3. **Lancer un premier passage à la main** : onglet Actions → Pipeline → Run workflow, sur `main`. Il doit finir en vert et ajouter un commit sur `data`.
   - S'il échoue à l'étape « Committer le résultat sur data » avec un refus d'écriture (403), autoriser le jeton : Settings → Actions → General → Workflow permissions → « Read and write permissions ».
4. **Vérifier** que les fichiers se lisent : `https://raw.githubusercontent.com/YannVogel/quatrauro/data/forecast/toulon.json`.
5. **Activer la planification** : dans `.github/workflows/pipeline.yml`, décommenter les deux lignes `schedule:` et `- cron:`, puis merger. Le test `__tests__/pipeline-workflow.test.ts` vérifie cette planification : toute modification l'adapte dans la même PR.

### Au quotidien

| Besoin | Geste |
|---|---|
| Lancer un passage à la main | Actions → Pipeline → Run workflow, sur `main` |
| Lire le journal d'un passage | Actions → Pipeline → le passage → étape « Lancer un passage » : modèles utilisés et absents, mesures nouvelles, heures apprises, durée |
| Comprendre un échec | La dernière ligne du journal : `Passage en échec, rien n'a été écrit : <raison>`. La branche `data` n'a pas bougé |
| Relancer après une panne | Rien à réparer : relancer le passage (bouton « Re-run jobs », ou attendre le suivant). Un passage relancé ne duplique rien |
| Essayer en local sans rien publier | `npm run pipeline -- --dry-run`, ou `npm run pipeline` qui écrit dans `.data/` (ignoré par git) |
| La planification a été désactivée par GitHub (60 jours sans activité dans le repo) | Actions → Pipeline → « Enable workflow » |
| Suspendre le pipeline | Actions → Pipeline → menu « … » → « Disable workflow » |

À savoir :

- Un passage planifié peut avoir du retard, ou sauter, quand GitHub est chargé. L'app affiche toujours l'heure de sa prévision.
- GitHub envoie un courriel à chaque passage en échec à la personne qui a activé la planification (réglable dans ses notifications GitHub, rubrique Actions).
- Si le pipeline reste arrêté plus d'un jour, les heures non prévues entre-temps ne seront jamais apprises : rien n'est inventé pour combler le trou.
- La taille de la branche `data` est à mesurer après un mois de passages (ADR 0004).

## Données et attributions

Prévisions : [Open-Meteo](https://open-meteo.com/) (licence CC BY 4.0, accès gratuit réservé à un usage non commercial), à partir des modèles de Météo-France (AROME, ARPEGE), de l'ECMWF (IFS), du DWD (ICON) et de la NOAA (GFS).

Observations : Météo-France, données climatologiques horaires des stations de Toulon et de Nice (Licence Ouverte 2.0).

Le détail des sources est dans [docs/features/donnees.md](docs/features/donnees.md), la décision dans l'[ADR 0002](docs/adr/0002-sources-de-donnees-meteo.md).

Quatrauro est un outil personnel, sans usage commercial.

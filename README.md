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

### Lancer l'app sur un émulateur

```bash
npm run android
```

La première compilation prend plusieurs minutes : elle génère le dossier `android/` (ignoré par git, voir « Continuous Native Generation » dans la documentation d'Expo) puis construit l'app. Les fois suivantes, `npm start` suffit tant que le code natif ne change pas.

## Builds et mises à jour

L'app s'installe par un APK, sans passer par le Play Store. Les builds se font avec EAS (les services d'Expo), les mises à jour du JavaScript avec EAS Update. La configuration est dans [`eas.json`](eas.json) et [`app.config.ts`](app.config.ts).

| Profil | Ce qu'il produit | Quand s'en servir |
|---|---|---|
| `development` | Un client de développement (APK) qui charge le code depuis `npm start` | Pour développer sur un vrai téléphone |
| `preview` | L'app elle-même, en APK, abonnée au canal de mises à jour `preview` | Pour l'usage quotidien |

Il n'y a pas de profil `production` : l'app ne va pas sur les stores.

> **Rien de tout cela ne se lance sans une demande explicite de Yann** : ni build, ni mise à jour (AGENTS.md, « Règles d'exploitation »).

### Une seule fois : relier le repo au compte Expo

```bash
npm install --global eas-cli
eas login            # compte Expo de Parallax Works
eas init             # crée le projet chez Expo et affiche son identifiant
```

Reporter l'identifiant affiché dans la constante `EAS_PROJECT_ID` d'`app.config.ts` (ce n'est pas un secret) et committer. Tant qu'elle vaut `null`, les mises à jour EAS sont désactivées dans l'app.

### Construire et installer l'APK

```bash
eas build --profile preview --platform android
```

Le build tourne sur les serveurs d'Expo (une quinzaine de minutes). À la fin, EAS affiche un lien et un QR code : l'ouvrir sur le téléphone, télécharger l'APK et l'installer (Android demande d'autoriser l'installation depuis cette source).

### Publier une mise à jour du JavaScript

Quand seuls le JavaScript ou les images ont changé, pas besoin de reconstruire :

```bash
eas update --channel preview --message "Ce qui change"
```

L'app installée télécharge la mise à jour à son prochain lancement et l'applique au lancement suivant : la fermer complètement et la rouvrir deux fois.

Une mise à jour ne s'applique qu'aux builds de la **même version** de l'app (`version` dans `app.config.ts`). Il faut reconstruire l'APK, et non publier une mise à jour, dès que le code natif change : nouvelle dépendance native, nouveau plugin dans `app.config.ts`, nouvelle version d'Expo, changement d'icône ou de police.

### Client de développement

```bash
eas build --profile development --platform android
npm start            # puis ouvrir l'app installée sur le téléphone
```

Sur un émulateur, `npm run android` suffit et ne passe pas par EAS.

### Catalogue des composants

En développement, l'écran d'accueil propose un lien « Ouvrir le catalogue des composants ». Le catalogue montre chaque composant du design system et chaque condition météo, avec leurs cas limites, et a sa propre bascule entre thème clair et thème sombre. Ses données sont fictives. Il n'existe pas dans l'app distribuée.

### Intégration continue

Le workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml) rejoue `npm run typecheck`, `npm run lint` et `npm test` sur chaque pull request et sur chaque push sur `main`, avec la version de Node de `.nvmrc`. Une PR ne se merge que si ce contrôle est vert.

La branche `data`, où le pipeline archive et publie ses fichiers, ne déclenche pas la CI.

Avant d'ouvrir une PR, lancer les trois commandes en local : ce sont exactement celles de la CI.

### Backtest

Le premier passage télécharge environ 60 Mo de prévisions et d'observations dans `pipeline/backtest/.cache/` (ignoré par git). Aucune clé n'est nécessaire. Le rapport est dans [docs/features/backtest.md](docs/features/backtest.md).

## Données et attributions

Prévisions : [Open-Meteo](https://open-meteo.com/) (licence CC BY 4.0, accès gratuit réservé à un usage non commercial), à partir des modèles de Météo-France (AROME, ARPEGE), de l'ECMWF (IFS), du DWD (ICON) et de la NOAA (GFS).

Observations : Météo-France, données climatologiques horaires des stations de Toulon et de Nice (Licence Ouverte 2.0).

Le détail des sources est dans [docs/features/donnees.md](docs/features/donnees.md), la décision dans l'[ADR 0002](docs/adr/0002-sources-de-donnees-meteo.md).

Quatrauro est un outil personnel, sans usage commercial.

# Quatrauro

App météo personnelle pour Toulon et Nice. Elle croise plusieurs modèles de prévision, corrige leurs erreurs locales à partir des observations, et affiche pour chaque jour un indice de fiabilité.

Le nom vient du provençal « quatre auro », les quatre vents.

> **État** : cadrage et études préalables. Le repo contient la documentation, les décisions d'architecture, les maquettes et le backtest qui a validé la méthode ([rapport](docs/features/backtest.md)) ; l'app et le pipeline arrivent avec la suite du milestone M0.

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
| [docs/adr/](docs/adr/) | Décisions d'architecture |
| [docs/design/riviera.md](docs/design/riviera.md) | Direction graphique « Riviera » : tokens, composants, écrans |
| [docs/design/claude-design/](docs/design/claude-design/) | Maquettes |
| [docs/features/](docs/features/) | Fiches des fonctionnalités, au fil du développement : [sources de données](docs/features/donnees.md), [backtest du mélange](docs/features/backtest.md) |

## Installation et commandes

Le projet Expo arrive avec M0-04 : cette section décrira alors l'installation, les variables d'environnement, les commandes et les builds.

En attendant, le backtest du mélange tourne seul, avec Node 24 et sans aucune dépendance à installer :

```bash
node --test "pipeline/backtest/__tests__/*.test.ts"   # tests
node pipeline/backtest/run.ts                         # rejoue le mélange sur l'historique
```

Le premier passage télécharge environ 60 Mo de prévisions et d'observations dans `pipeline/backtest/.cache/` (ignoré par git). Aucune clé n'est nécessaire.

## Données et attributions

Prévisions : [Open-Meteo](https://open-meteo.com/) (licence CC BY 4.0, accès gratuit réservé à un usage non commercial), à partir des modèles de Météo-France (AROME, ARPEGE), de l'ECMWF (IFS), du DWD (ICON) et de la NOAA (GFS).

Observations : Météo-France, données climatologiques horaires des stations de Toulon et de Nice (Licence Ouverte 2.0).

Le détail des sources est dans [docs/features/donnees.md](docs/features/donnees.md), la décision dans l'[ADR 0002](docs/adr/0002-sources-de-donnees-meteo.md).

Quatrauro est un outil personnel, sans usage commercial.

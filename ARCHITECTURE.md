# Architecture de Quatrauro

Ce document décrit comment les données circulent, des modèles météo jusqu'à l'écran. Le cadrage produit est dans [docs/QUATRAURO_PROJECT_BRIEF.md](docs/QUATRAURO_PROJECT_BRIEF.md), les conventions dans [AGENTS.md](AGENTS.md).

## État

Cette page décrit la cible et se met à jour à chaque issue structurante (voir AGENTS.md, « Documentation »). Où en est chaque bloc :

| Bloc | État |
|---|---|
| `shared/` | La configuration unique (villes, modèles, paramètres du mélange), le contrat des fichiers publiés ([fiche](docs/features/contrat-de-donnees.md)), les séries internes et le décalage de l'heure de Paris ([ADR 0005](docs/adr/0005-heure-de-paris-sans-base-de-fuseaux.md)). La logique pure du mélange (`shared/blend/` : biais, poids, mélange, pluie, agrégats, indice de fiabilité, condition et résumé du jour) y est aussi, rejouée telle quelle par le backtest |
| `pipeline/` | La collecte des prévisions (`pipeline/collect/`, [fiche](docs/features/collecte.md)) et le backtest (`pipeline/backtest/`), qui rejoue la logique de `shared/blend/` sur l'historique. Observations, archive, vérification et publication arrivent avec la suite de M1 |
| `app/` + `src/` | Le projet Expo et un écran provisoire. Le design system, la lecture des données et les écrans arrivent avec la suite de M0, puis M2 à M4 |

Décisions arrêtées : sources de données ([ADR 0002](docs/adr/0002-sources-de-donnees-meteo.md)), méthode de mélange et paramètres ([ADR 0003](docs/adr/0003-methode-de-melange.md)), heure de Paris (ADR 0005). Encore ouverte : l'exploitation du pipeline dans GitHub Actions ([ADR 0004](docs/adr/0004-pipeline-github-actions.md), au statut « proposée »).

## Vue d'ensemble

```
 Open-Meteo (AROME, ARPEGE, IFS, ICON, GFS)  Observations des stations
              │                                        │
              ▼                                        ▼
      ┌──────────────────────── pipeline/ (GitHub Actions, cron) ───────────────────────┐
      │  collect  →  archive  →  verify (biais, erreurs, poids)  →  blend  →  publish   │
      └──────────────────────────────────────┬───────────────────────────────────────────┘
                                             │ commits
                                             ▼
                                   branche git `data`
                       archive/  ·  state/  ·  forecast/  ·  verification/
                                             │ HTTPS (fichiers statiques)
                                             ▼
                              app Expo (Android) : lit, valide, affiche
```

Il n'y a ni serveur ni base de données. Le pipeline est la seule partie qui appelle des API météo ; l'app ne lit que des fichiers statiques publiés par le pipeline.

## Les trois blocs

| Bloc | Rôle | Dépend de |
|---|---|---|
| `shared/` | Schémas Zod du contrat, configuration (villes, modèles, paramètres), logique pure : biais, poids, mélange, fiabilité, condition, résumés | rien |
| `pipeline/` | Entrées-sorties : appels HTTP, lecture et écriture de l'archive, orchestration, backtest | `shared/` |
| `app/` + `src/` | Lecture des JSON, cache, écrans Riviera | `shared/` (schémas et types seulement) |

La règle qui tient l'ensemble : **`shared/` ne fait aucune entrée-sortie**. Ses fonctions prennent des données et rendent des données, ce qui permet de rejouer exactement le même code dans le backtest, dans le pipeline et dans les tests.

## Flux d'un passage du pipeline

1. **Collecte des prévisions** : pour chaque ville, une requête par lot à Open-Meteo, un modèle par série. Chaque réponse est validée puis normalisée (unités, UTC).
2. **Collecte des observations** : dernières mesures horaires de la station de référence de chaque ville.
3. **Archive** : prévisions et observations sont ajoutées à l'archive de la branche `data`, par ville, modèle et jour. L'archive est en ajout seul.
4. **Vérification** : les prévisions arrivées à échéance sont appariées aux observations. On met à jour, par ville, variable, modèle, tranche d'échéance et heure de la journée, le biais et l'erreur absolue moyenne (deux moyennes à pondération exponentielle), puis les poids. Cet état est stocké dans `state/`.
5. **Mélange** : pour chaque échéance des sept prochains jours, correction du biais de chaque modèle, moyenne pondérée, indice de fiabilité, condition et résumés.
6. **Publication** : écriture de `forecast/<ville>.json` et `verification/<ville>.json`, validés contre les schémas avant d'être commités. Un passage en échec ne publie rien : le dernier fichier valide reste en place.

Le passage est idempotent : relancé deux fois sur les mêmes entrées, il produit le même résultat et n'ajoute rien en double à l'archive.

## Mélange

La méthode est décrite dans le brief (§ 5.4 à § 5.6) et arrêtée par l'[ADR 0003](docs/adr/0003-methode-de-melange.md). Trois principes structurent le code :

- **Granularité** : tout est indexé par ville, variable, modèle, tranche d'échéance et heure UTC de la journée. Rien n'est mutualisé entre les deux villes.
- **Paramètres nommés** : fenêtre d'historique, vitesse d'oubli, exposant des poids, découpage des tranches et seuils des libellés vivent dans `shared/blendConfig.ts`. Le backtest les fait varier ; le pipeline lit les valeurs retenues.
- **Dégradation propre** : un modèle manquant est ignoré pour le passage, un modèle sans historique reçoit un poids neutre, une échéance couverte par un seul modèle est publiée avec une fiabilité plafonnée.

## Backtest

`pipeline/backtest/` rejoue le mélange sur l'historique : chaque prévision ne voit que les observations publiées au moment où elle a été émise (`replay.ts`), applique la logique pure du mélange (`shared/blend/`), et le résultat est comparé aux observations. Le rapport du premier passage est dans [docs/features/backtest.md](docs/features/backtest.md). Il sert deux fois : au départ pour décider si le projet vaut le coup et fixer les paramètres (M0-03), puis à chaque changement de la logique du mélange, pour vérifier qu'on n'a rien dégradé.

## Données de la branche `data`

```
archive/forecasts/<ville>/<modele>/<AAAA-MM-JJ>.json     # prévisions reçues, par run
archive/observations/<ville>/<AAAA-MM>.json              # mesures horaires de la station
state/<ville>.json                                       # biais, erreurs et poids courants
forecast/<ville>.json                                    # ce que lit l'app
verification/<ville>.json                                # scores affichés par « Fiabilité »
```

Format, découpage et politique de rétention sont arrêtés par l'[ADR 0004](docs/adr/0004-pipeline-github-actions.md). Seul le workflow du pipeline écrit sur cette branche.

## App

- **Lecture** : `src/lib/data.ts` télécharge les deux fichiers d'une ville et les valide avec les schémas de `shared/`. Un fichier invalide ou d'une version inconnue est traité comme une erreur, jamais affiché à moitié.
- **Cache** : TanStack Query avec persistance sur l'appareil. L'écran s'ouvre sur la dernière prévision connue, puis se rafraîchit en arrière-plan.
- **Fraîcheur** : l'app compare `generatedAt` à l'heure courante. Au-delà du seuil, un bandeau signale une prévision ancienne.
- **Écrans** : chaque feature expose ses écrans et ses hooks par son `index.ts` ; les routes de `app/` ne contiennent pas de logique.
- **Thème** : les tokens clair et sombre viennent de `src/ui/theme.ts` ; le choix (système, clair, sombre) est mémorisé sur l'appareil.

## Hors ligne

L'app fonctionne entièrement sur son cache : accueil, détail des jours, modèles et fiabilité restent consultables. Premier lancement sans réseau : un état vide explicite. Aucune écriture n'existe côté app, donc aucune file d'attente à synchroniser.

## Confidentialité

L'app ne collecte rien : pas de compte, pas de position (les villes sont fixes), pas de mesure d'audience. Ses seules requêtes sont le téléchargement des fichiers publiés et, le cas échéant, les mises à jour EAS.

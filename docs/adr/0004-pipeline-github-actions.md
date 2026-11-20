# ADR 0004 — Pipeline sans serveur dans GitHub Actions

- **Statut** : acceptée (M1-12, le 17 novembre 2026 ; la fréquence, l'adresse de lecture et la rétention ont été tranchées en l'absence de Yann, qui peut y revenir : voir l'issue). Le workflow, livré désactivé, est **en service depuis le 20 novembre 2026** : branche `data` amorcée, premier passage réussi, planification active
- **Date** : 2026-11-17
- **Issue** : [#29](https://github.com/YannVogel/quatrauro/issues/29) (M1-12)

## Contexte

Le mélange a besoin d'un calcul régulier et d'une mémoire (archive des prévisions, biais, poids). L'app n'a qu'un utilisateur et aucune donnée personnelle. Un serveur ou une base hébergée seraient disproportionnés.

## Décision

- Le pipeline est un ensemble de scripts TypeScript (`npm run pipeline`) exécutés par un workflow GitHub Actions, `.github/workflows/pipeline.yml`.
- L'archive, l'état et les fichiers publiés vivent sur une branche git dédiée, `data`. **Seul ce workflow y écrit**, et aucun workflow n'écrit sur `main`.
- L'app lit les fichiers publiés en HTTPS, comme des fichiers statiques.

### Fréquence : quatre passages par jour

`17 1,7,13,19 * * *`, en UTC.

- Les modèles sont mis à jour toutes les 3 à 6 heures (ADR 0002) : passer plus souvent ne donnerait pas une prévision plus fraîche.
- Le passage de 07 h 17 suit la mise à jour quotidienne des mesures de Météo-France (vers 06 h 45 UTC, mesuré le 17/11/2026) : c'est lui qui apprend.
- La minute 17 évite le début de l'heure, où GitHub retarde le plus les déclenchements.
- Coût : 8 appels à Open-Meteo par jour (quota : 10 000), et 8 téléchargements de 20 Mo chez Météo-France. Un passage dure une quinzaine de secondes hors installation.

### Adresse de lecture : les fichiers bruts de GitHub

```
https://raw.githubusercontent.com/YannVogel/quatrauro/data/forecast/<ville>.json
https://raw.githubusercontent.com/YannVogel/quatrauro/data/verification/<ville>.json
```

Mesuré le 17/11/2026 sur un fichier de `main` : `cache-control: max-age=300` et `access-control-allow-origin: *`. Une prévision publiée est donc visible **au plus cinq minutes** plus tard, ce qui est sans effet pour quatre passages par jour.

### Un seul passage à la fois

Groupe de concurrence `pipeline`, sans annulation : un passage lancé pendant qu'un autre tourne attend son tour. Deux passages ne peuvent pas écrire en même temps sur `data`.

### Un échec ne publie rien, et se voit

- `npm run pipeline` rend un code d'erreur sans avoir rien écrit ([fiche](../features/pipeline.md)) ; l'étape qui committe ne tourne alors pas.
- Le passage apparaît en rouge dans l'onglet Actions, et GitHub envoie un courriel à la personne qui a activé la planification (voir « Ce que dit la documentation »).
- L'app, elle, affichera la dernière prévision avec son heure et un avertissement (M2-02).

### Découpage et rétention : tout garder, mesurer, revoir dans un an

Le découpage est fait pour que le passé ne soit pas réécrit : un fichier de prévisions par ville et par jour de collecte, un fichier de mesures et un registre des jours par ville et par mois ([fiche](../features/archive-et-verification.md)).

Tailles mesurées (17/11/2026, dossier temporaire) :

| Fichier | Taille | Réécrit |
|---|---|---|
| `archive/forecasts/<ville>/<jour>.json` | 35 à 42 Ko par jour | pendant son jour seulement |
| `archive/observations/<ville>/<mois>.json` | environ 45 Ko par mois (27 Ko pour 18 jours) | une fois par jour |
| `archive/days/<ville>/<mois>.json` | 42 Ko par mois | une fois par jour |
| `state/<ville>.json` | 124 Ko | une fois par jour, quand des mesures arrivent |
| `forecast/<ville>.json` | 80 Ko | à chaque passage |
| `verification/<ville>.json` | 2 Ko | à chaque passage |

Les fichiers eux-mêmes pèseront environ 30 Mo par an pour les deux villes. L'historique git, lui, garde chaque version des fichiers réécrits : de l'ordre d'un mégaoctet par jour avant compression, **non mesuré** tant que le pipeline n'a pas tourné. GitHub recommande de rester sous 1 Go.

Décision : **ne rien supprimer automatiquement**. Mesurer la taille du repo après un mois de passages, et décider alors, chiffres en main. Si elle devient gênante, le remède est d'écraser l'historique de `data` en un seul commit : une action destructive, manuelle, réservée à Yann (AGENTS.md).

## Ce que dit la documentation de GitHub

Pages lues le 17 novembre 2026.

| Point | Ce qui est écrit | Page |
|---|---|---|
| Précision des déclenchements | Un déclenchement planifié peut être retardé quand la charge est forte, notamment au début de chaque heure ; si elle est très forte, il peut être abandonné | [Events that trigger workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule) |
| Branche | Un workflow planifié tourne sur le dernier commit de la branche par défaut | idem |
| Désactivation | Dans un repo public, les workflows planifiés sont désactivés automatiquement après 60 jours sans activité dans le repo | idem, et [Disabling and enabling a workflow](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/disable-and-enable-workflows) |
| Concurrence | Un seul job ou workflow d'un même groupe tourne à la fois ; sans `cancel-in-progress`, celui qui tourne va au bout | [Workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#concurrency) |
| Droits du jeton | Dès qu'un droit est précisé dans `permissions`, tous les autres valent « aucun » | [Workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#permissions) |
| Alertes | Les notifications d'un workflow planifié vont à la personne qui l'a créé, puis à celle qui modifie sa ligne `cron` ou qui le réactive | [Notifications for workflow runs](https://docs.github.com/en/actions/concepts/workflows-and-actions/notifications-for-workflow-runs) |
| Taille d'un repo | Idéalement moins de 1 Go, et moins de 5 Go fortement recommandé | [About large files on GitHub](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github) |

**Ce que la documentation ne dit pas** : si les commits que le workflow pousse lui-même sur `data` comptent comme une « activité » qui repousse la désactivation des 60 jours. À surveiller : GitHub prévient par courriel avant de désactiver, et la réactivation se fait d'un clic (README).

## Alternatives écartées

- **Tout calculer sur le téléphone** : pas de mémoire fiable des prévisions passées, et un recalcul à chaque ouverture.
- **Backend hébergé** (Supabase, Worker avec base) : surdimensionné pour un utilisateur, et un service de plus à maintenir.
- **Committer les données sur `main`** : noie l'historique du code sous les commits automatiques.
- **GitHub Pages pour servir les fichiers** : un réglage du repo et une étape de déploiement de plus, pour un cache du même ordre. À reconsidérer si l'adresse brute posait un problème.
- **Un passage par heure** : huit fois plus de téléchargements chez Météo-France pour des modèles qui ne changent que toutes les 3 à 6 heures.
- **Supprimer automatiquement les vieux fichiers d'archive** : cela n'allège pas l'historique git, qui garde tout, et retire la possibilité de recalculer.

## Conséquences

- Coût nul et rien à administrer, mais les horaires ne sont pas garantis : un passage peut avoir du retard, ou sauter. L'app doit donc toujours dire l'heure de sa prévision (M2-02).
- Si le pipeline s'arrête plus d'un jour, les heures qu'il aurait fallu prévoir entre-temps ne seront jamais apprises ([fiche](../features/archive-et-verification.md)).
- Un repo sans activité pendant 60 jours peut voir sa planification désactivée : un courriel de GitHub le signale, il faut alors la réactiver.
- Les fichiers publiés sont publics (le repo l'est) : ils ne contiennent que de la météo.
- L'historique de `data` grossit sans limite tant que personne ne l'écrase : à mesurer après un mois.

## Ce qui reste à faire par Yann

Le workflow n'a jamais tourné. Avant de l'activer : créer la branche `data`, lancer l'amorçage, autoriser le jeton à écrire si le premier passage est refusé, puis décommenter la planification. La marche à suivre, dans l'ordre, est dans le README (« Exploitation du pipeline »).

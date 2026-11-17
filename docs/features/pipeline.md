# Un passage du pipeline

Un **passage** produit, pour chaque ville, les deux fichiers que l'app lit : `forecast/<ville>.json` et `verification/<ville>.json` ([contrat](contrat-de-donnees.md)). Il se termine par des fichiers valides, ou par un échec net qui ne laisse rien derrière lui.

```bash
npm run pipeline -- --data-dir=<dossier> [--dry-run]
```

| Option | Rôle |
|---|---|
| `--data-dir=<dossier>` | Le dossier de données. Par défaut `.data/`, un dossier local ignoré par git ; en production, la branche `data` |
| `--dry-run` | Passage à blanc : tout est collecté et calculé, rien n'est écrit |

La commande ne connaît pas git : elle lit et écrit des fichiers dans un dossier. Elle rend le code 0 quand les fichiers sont écrits (ou calculés à blanc), 1 sinon. Un argument inconnu est une erreur : une faute de frappe dans `--dry-run` ne lance pas un vrai passage.

## Les étapes, pour chaque ville

| Étape | Code | Fiche |
|---|---|---|
| 1. Collecter les prévisions des cinq modèles | `pipeline/collect/forecasts.ts` | [collecte.md](collecte.md) |
| 2. Collecter les mesures des dix derniers jours | `pipeline/collect/observations.ts` | [collecte.md](collecte.md) |
| 3. Archiver les mesures, apprendre des heures dont la mesure est arrivée, archiver les prévisions du passage, calculer les scores | `pipeline/verify/step.ts` | [archive-et-verification.md](archive-et-verification.md) |
| 4. Mélanger et construire la prévision | `pipeline/publish/forecast.ts` | [melange.md](melange.md), [conditions-et-resumes.md](conditions-et-resumes.md) |
| 5. Valider les deux fichiers contre le contrat, puis les écrire | `pipeline/publish/publish.ts` | [contrat-de-donnees.md](contrat-de-donnees.md) |

L'ordre compte : on apprend **avant** de mélanger, comme dans le backtest. La prévision publiée profite de tout ce que les mesures arrivées depuis le dernier passage ont appris.

Toutes les villes portent le même instant : celui du début du passage (`generatedAt`).

## Tout ou rien

Le passage travaille sur un **stockage tampon** (`bufferedStorage`) : il lit dans le dossier, mais garde ses écritures en mémoire. Elles ne sont reportées qu'à la toute fin, une fois les deux villes traitées et leurs fichiers validés.

| Ce qui arrive | Ce qui se passe |
|---|---|
| Open-Meteo ou Météo-France ne répond pas, après les tentatives | Échec : rien n'est écrit, les fichiers précédents restent en place |
| Une réponse est mal formée | Échec, avec le détail de ce qui cloche |
| La première ville réussit, la seconde échoue | Échec : rien n'est écrit, **pour aucune des deux** |
| Un fichier calculé ne respecte pas le contrat | Échec avant toute écriture, avec le champ en cause |
| Un modèle manque | Le passage continue : le modèle figure dans le fichier avec `available: false` |
| Aucun modèle ne répond pour une ville | Échec |

Limite : le report final écrit les fichiers l'un après l'autre. Si la machine s'arrête à cet instant précis, certains sont écrits et d'autres non. En production, le workflow ne committe que si la commande a rendu 0 : un passage interrompu ne publie rien. Et le relancer rétablit un état cohérent, puisque le passage est idempotent.

## Ce que contient la prévision

**Les jours** : sept jours civils de Paris, aujourd'hui compris. Un jour sans aucune heure couverte n'est pas publié.

**Les heures** : toutes celles de ces sept jours qu'au moins un modèle couvre. Open-Meteo rend ses séries à partir de 0 h UTC : la première heure d'aujourd'hui à Paris (23 h UTC la veille, 22 h en été) manque donc, et les agrégats du jour se calculent sur les autres (règle des 75 % de couverture).

**L'échéance d'une heure** est le nombre de jours qui la séparent du passage, arrondi au-dessus : 1 pour les 24 prochaines heures, 2 pour les 24 suivantes. C'est elle qui choisit le biais et l'erreur de chaque modèle. Les heures déjà passées d'aujourd'hui sont à l'échéance 1.

**L'échéance d'un jour** est son rang : 1 pour aujourd'hui, 2 pour demain, 7 pour le dernier. C'est elle qui choisit la calibration de la pluie du jour et la table de l'indice de fiabilité. Elle est prudente : les heures de demain matin sont à moins de 24 heures, mais demain est jugé comme une prévision à deux jours.

| Champ du jour | D'où il vient |
|---|---|
| `min`, `max`, ressentis, cumul, vent, rafales, humidité | `aggregateDaily`, sur les heures du jour ; `null` sous 75 % de couverture |
| `precipitationProbability` | Part des modèles qui annoncent au moins 1 mm sur le jour, calibrée. Un modèle compte s'il couvre au moins 75 % du jour |
| `condition`, `summary` | `dayCondition`, `daySummary` |
| `reliability`, `reliabilityLabel` | `dayReliability`, avec l'écart moyen entre modèles sur le jour. `null` tant que l'historique est insuffisant |
| `modelsAgreeing`, `modelsTotal` | Modèles dont le maximum corrigé du jour est à moins de 1 °C du maximum combiné, sur ceux qui couvrent le jour |
| `weights` | Poids moyen de chaque modèle dans la température, sur les heures du jour |

**Arrondis**, faits ici et nulle part ailleurs : températures au dixième, écart entre modèles au centième, pluie au dixième de millimètre, le reste à l'unité. Les probabilités et l'indice de fiabilité sont en pourcentage.

Limite connue : une probabilité de 29,6 % s'affiche 30 % alors que le jour est resté « sec » (le seuil est appliqué avant l'arrondi).

## Le journal

Une ligne par fait utile, en français :

```
Passage du 2026-11-17T21:27:43Z, dans /…/data
Toulon : modèles utilisés : arome, arpege, ifs, icon, gfs
Toulon : 363 mesures nouvelles dans l'archive
Toulon : 46 heures apprises, 0 sans mesure, 14 jours jugés
Toulon : 167 heures et 7 jours prêts à publier
…
12 fichiers écrits
Passage terminé en 13 s
```

Un modèle absent apparaît sur la ligne des modèles (`; absents : icon`). Un échec se termine par `Passage en échec, rien n'a été écrit : <raison>`.

## Essayé en vrai

Le 17 novembre 2026, dans un dossier temporaire amorcé par l'historique (rien n'a été écrit sur la branche `data`) : un passage à blanc, puis un vrai passage. 13 secondes, deux fichiers de prévision de 80 Ko, deux fichiers de scores de 2 Ko. La prévision de Toulon sortait avec des poids différenciés (ICON 30 %, IFS 22 %, AROME 21 %, ARPEGE 20 %, GFS 7 % pour le jour même) et un indice de fiabilité de 74 % (« Probable ») pour le jour même à 29 % (« Incertain ») à J+5.

## Tests

- `pipeline/__tests__/pass.test.ts` : de bout en bout sur un dossier temporaire. Passage nominal sur les **réponses réelles enregistrées** (réseau simulé), modèle absent, panne de la collecte, échec de la seconde ville, passage à blanc, fichier invalide refusé, passage répété, et premier passage après un amorçage (scénario fictif).
- `pipeline/publish/__tests__/forecast.test.ts` : jour et nuit, probabilités, résumés, modèle seul (indice plafonné), sans historique (pas d'indice), aucun modèle.

# Amorçage par l'historique

Au premier jour, le pipeline ne sait rien : il lui faudrait des semaines pour apprendre le biais et l'erreur de chaque modèle, et des mois pour que l'indice de fiabilité ait un sens. L'amorçage lui donne cette mémoire d'un coup, en rejouant l'historique que le backtest utilise déjà.

**C'est une commande à lancer une seule fois, à la main, avant d'activer le pipeline.**

```bash
npm run pipeline:bootstrap -- --data-dir=<dossier de la branche data>
```

| Option | Rôle |
|---|---|
| `--data-dir=<dossier>` | Où écrire. Par défaut `.data/`, un dossier local ignoré par git |
| `--until=AAAA-MM-JJ` | Dernier jour de l'historique. Par défaut l'avant-veille : les mesures de Météo-France ont jusqu'à 27 heures de retard |
| `--force` | Remplace un état existant. Sans elle, la commande s'arrête si une ville a déjà son `state/<ville>.json` |

La commande ne publie rien et ne touche pas à git : elle écrit des fichiers dans le dossier indiqué. Les committer sur la branche `data` reste un geste de Yann.

## Ce qu'elle fait

1. **Lire l'historique** de chaque ville avec le code du backtest (`pipeline/backtest/data/`) : les prévisions passées de chaque modèle par échéance (API Previous Runs d'Open-Meteo) et les mesures horaires de Météo-France. La période commence le 1er octobre 2025, quand les cinq modèles sont tous dans l'historique (ADR 0002). Les réponses sont gardées dans le cache du backtest : relancer ne refait aucun appel pour une période déjà lue. Une période nouvelle demande une soixantaine d'appels.
2. **Rejouer** cet historique heure par heure, comme si le pipeline avait tourné à chaque heure (`pipeline/bootstrap/replay.ts`). À chaque heure, dans l'ordre du backtest : on apprend ce dont la mesure a eu le temps d'arriver (30 heures), puis on émet les prévisions de cette heure pour chaque échéance.
3. **Écrire** l'état et l'archive de départ (`pipeline/bootstrap/write.ts`).

Le rejeu n'a pas de logique à lui : il appelle `blendModels` (le mélange d'une heure) et `advanceLearning` (l'apprentissage), les fonctions des passages réels. Un test le vérifie : cinq jours rejoués et cinq jours de passages réels toutes les heures, sur les mêmes données, aboutissent au même état.

## Ce qu'elle écrit

| Fichier | Contenu |
|---|---|
| `state/<ville>.json` | Biais et erreur de chaque modèle, calibrations de la pluie, tables de l'indice de fiabilité, appris sur tout l'historique |
| `archive/days/<ville>/<mois>.json` | Tous les jours jugés de l'historique, à chaque échéance |
| `archive/forecasts/<ville>/<jour>.json` | Les cases des 33 derniers jours seulement : ce dont les scores publiés ont besoin |
| `archive/observations/<ville>/<mois>.json` | Les mesures des mêmes jours |

Les cases plus anciennes ne sont pas archivées : elles ont servi à apprendre, et les garder pèserait environ 30 Mo (estimation : 35 Ko par ville et par jour, sur 410 jours). Les fichiers de prévisions sont rangés au jour où la prévision a été émise (N jours avant son heure de validité).

Après l'amorçage, l'état dit que les heures sont apprises jusqu'à 30 heures avant la fin de l'historique. Le premier passage du pipeline reprend à partir de là.

## Mesuré sur l'historique réel

Amorçage du 1er octobre 2025 au 15 novembre 2026, lancé le 17 novembre 2026 dans un dossier temporaire (rien n'a été écrit sur la branche `data`) :

- durée : 4,5 secondes pour les deux villes, historique déjà en cache ;
- taille : 124 Ko d'état par ville, 3,8 Mo d'archive pour les deux ;
- 407 jours jugés à J+1 dans chaque ville. Prévisions tenues à J+1 : **65,6 % à Toulon, 89,9 % à Nice**. Le backtest donnait 67 % à Toulon sur un an, avec des jours découpés en UTC et non en jours civils de Paris.

Scores des 30 derniers jours (15 octobre au 14 novembre 2026), tels que le premier passage les publierait. Erreur absolue moyenne de température, en °C :

| Échéance | Toulon, mélange | Toulon, meilleur modèle | Nice, mélange | Nice, meilleur modèle |
|---|---|---|---|---|
| J+1 | 1,07 | 1,20 (ICON) | 0,80 | 0,93 (ARPEGE) |
| J+2 | 1,09 | 1,24 (ICON) | 0,86 | 0,94 (ICON) |
| J+3 | 1,19 | 1,39 (ICON) | 0,99 | 1,14 (ICON) |
| J+4 | 1,23 | 1,36 (ICON) | 1,06 | 1,17 (ICON) |
| J+5 | 1,35 | 1,66 (ICON) | 1,16 | 1,35 (GFS) |
| J+6 | 1,55 | 1,78 (GFS) | 1,26 | 1,35 (ICON) |
| J+7 | 1,74 | 2,01 (IFS) | 1,45 | 1,50 (GFS) |

Annonce de pluie de la veille juste 24 jours sur 30 à Toulon (80 %), 28 sur 30 à Nice (93,3 %).

Ces chiffres ne remplacent pas le [rapport du backtest](backtest.md), qui sépare la période où les paramètres ont été choisis de celle où ils sont jugés. Ils disent seulement que l'état amorcé se comporte comme le backtest l'annonçait.

## Limites

- **L'historique ne contient pas tout.** La direction du vent n'y est pas (elle n'est ni corrigée ni vérifiée). AROME n'y figure qu'à un jour d'échéance, ARPEGE jusqu'à trois, ICON jusqu'à six : au-delà, rien n'est appris pour eux, et ils entreront dans le mélange avec un poids neutre tant que les passages réels ne les auront pas notés.
- **L'historique donne la prévision émise exactement N jours plus tôt.** Les passages réels archivent une prévision qui a entre N jours et N jours moins l'intervalle entre deux passages : un peu plus fraîche, donc un peu meilleure. L'état amorcé est légèrement pessimiste, et se corrige de lui-même.
- **Entre la fin de l'historique et le premier passage**, les heures sans case ne sont pas apprises. Lancer l'amorçage juste avant d'activer le pipeline réduit ce trou.

## Tests

`pipeline/bootstrap/__tests__/bootstrap.test.ts`, sur un historique **fictif** de 60 jours (`pipeline/testing/scenario.ts`) : biais retrouvés, poids différenciés, indice de fiabilité à chaque tranche, aucune mesure lue en avance, fichiers écrits, scores disponibles dès le premier passage, refus d'écraser un état, équivalence avec des passages réels.

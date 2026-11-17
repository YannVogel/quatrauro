# Archive et vérification

Le mélange a besoin d'une mémoire : ce que chaque modèle avait prévu, ce qui a été mesuré, et ce qu'on en a déduit. Cette fiche décrit cette mémoire et la façon dont le pipeline en tire le biais, l'erreur et les poids de chaque modèle, puis les scores de l'écran « Fiabilité ».

| Fichier | Rôle |
|---|---|
| `pipeline/storage.ts` | Petite interface de stockage (lire, écrire, lister) : un dossier local, testable sans git |
| `pipeline/archive/forecasts.ts` | Archive des prévisions, par heure et par échéance |
| `pipeline/archive/observations.ts` | Archive des mesures |
| `pipeline/archive/days.ts` | Registre des jours jugés |
| `pipeline/state/cityState.ts` | État d'une ville : ce qui a été appris |
| `pipeline/blend/hour.ts` | Mélange d'une heure à une échéance, et les cases qu'un passage archive |
| `pipeline/verify/learn.ts` | Apprentissage : heures, puis jours |
| `pipeline/verify/scores.ts` | Scores publiés |
| `pipeline/verify/step.ts` | L'étape entière, pour une ville |

## Ce que contient le dossier de données

```
archive/forecasts/<ville>/<AAAA-MM-JJ>.json   # prévisions collectées ce jour-là (UTC)
archive/observations/<ville>/<AAAA-MM>.json   # mesures horaires de la station
archive/days/<ville>/<AAAA-MM>.json           # jours jugés : prévu, observé, tenu ou non
state/<ville>.json                            # ce qui a été appris
```

Chaque fichier porte un `schemaVersion` et est validé à la lecture (Zod) : un fichier illisible ou d'une autre version arrête le passage.

### Prévisions : une case par heure et par échéance

Une **case** est une heure de validité vue à une échéance : ce qui était prévu pour cette heure N jours plus tôt (N de 1 à 7). Elle garde, pour chaque modèle, sa valeur **brute** et sa valeur **corrigée du biais connu à ce moment-là**, et la température du **mélange** avec l'écart entre modèles.

À chaque passage, on ajoute pour chaque échéance N les heures dont l'instant « N jours plus tôt » tombe entre le passage précédent et celui-ci. Conséquences :

- chaque case est écrite **une seule fois**, par le premier passage qui suit cet instant ;
- la prévision archivée à l'échéance N a entre N jours et N jours moins l'intervalle entre deux passages ;
- un fichier ne change plus une fois son jour de collecte passé : la branche de données ne réécrit pas son passé ;
- si le pipeline s'arrête plus d'un jour, les heures qu'il aurait fallu prévoir entre-temps restent sans case, et ne seront jamais apprises à cette échéance.

C'est la convention de l'historique d'Open-Meteo utilisé par le backtest (« la valeur prévue N × 24 h avant »), à l'intervalle entre deux passages près.

Pourquoi garder la valeur corrigée et le mélange « tels qu'émis » : l'erreur d'un modèle se mesure sur sa prévision corrigée du moment, pas sur celle qu'on recalculerait aujourd'hui avec un biais mieux connu. C'est ce que fait le backtest, et c'est ce qui rend les scores recalculables.

### Observations

Une ligne par heure, les sept grandeurs dans l'ordre de `variables`. L'archive est en **ajout seul** : une mesure archivée n'est jamais remplacée (même si Météo-France la corrige ensuite), une heure vide se remplit quand la mesure arrive. Un passage qui n'apporte rien de nouveau ne réécrit aucun fichier.

### État

Pour chaque grandeur corrigée (température, humidité, vent moyen, rafales), chaque modèle, chaque tranche d'échéance et chaque heure UTC : deux moyennes qui oublient, le biais et l'erreur. S'y ajoutent, par tranche d'échéance, la calibration de la pluie (dans l'heure, dans la journée) et la table de l'indice de fiabilité. Trois repères disent où l'on en est : l'instant du dernier passage archivé, la dernière heure apprise, le dernier jour jugé.

Les nombres sont écrits avec six décimales (trois dans l'archive) : bien en deçà de la précision des mesures, et deux écritures du même état donnent le même fichier.

## Apprentissage

`learn(state, { cells, observations, until })` est une fonction pure : elle ne modifie pas l'état reçu.

**Heure par heure.** Une heure est apprise quand elle a plus de **30 heures** (`observationDelayHours`) : le temps qu'il faut à sa mesure pour être publiée. Pour chaque échéance qui a une case, et pour chaque modèle de la case :

- le biais reçoit l'écart entre la valeur brute et la mesure (`updateBias`) ;
- l'erreur reçoit l'écart absolu entre la valeur corrigée archivée et la mesure (`updateError`) ;
- la calibration de la pluie reçoit l'accord entre modèles et le fait qu'il a plu ou non.

Les heures sont apprises **dans l'ordre et une seule fois**, comme dans le backtest. Une heure dont la mesure manque à ce moment-là est passée : elle ne sera pas reprise, même si la mesure finit par arriver (elle reste dans l'archive). **Une prévision n'est donc jamais appariée à une mesure manquante**, et jamais deux fois à la même.

**Jour par jour.** Un jour civil de Paris est jugé quand toutes ses heures ont été apprises. Pour chaque échéance :

- minimum et maximum prévus (mélange) et observés, cumul de pluie observé. Il suffit d'une heure manquante pour qu'une de ces valeurs vaille `null` ;
- probabilité d'un jour de pluie, à partir de l'accord entre les cumuls quotidiens des modèles ;
- **prévision tenue** : minimum et maximum à moins de 2 °C, annonce de pluie juste. `null` si le jour n'est pas vérifiable ;
- la calibration quotidienne de la pluie et la table de l'indice de fiabilité sont mises à jour, et le jour est inscrit au registre.

Toutes les échéances d'un jour sont jugées avec ce que l'on savait avant ce jour, puis on apprend.

## Scores publiés

`verification/<ville>.json` (contrat : [contrat-de-donnees.md](contrat-de-donnees.md)) porte sur les **30 derniers jours** appris.

| Score | Calcul |
|---|---|
| Erreur du mélange par échéance | Écart absolu moyen entre la température du mélange archivée et la mesure, sur les heures où les deux existent |
| Erreur de chaque modèle | Même calcul sur sa valeur **brute**, sur les mêmes heures quand il les couvre |
| Meilleur modèle seul | Le modèle à la plus petite erreur, parmi ceux qui couvrent au moins la moitié des heures comparées |
| Prévu contre observé | Les sept derniers jours jugés : minimum et maximum prévus la veille (échéance d'un jour) et observés |
| Pluie | Part des jours où l'annonce de la veille (pluie ou pas) était juste |

**Ils se recalculent à l'identique à partir de l'archive** : `verificationFromArchive` ne lit que les cases, les mesures, le registre des jours et le repère « dernière heure apprise ». Tant que rien n'a été vérifié, la période vaut `null` et les listes sont vides.

## Idempotence

Relancer un passage sur les mêmes entrées ne change aucun fichier :

- les observations déjà archivées ne sont pas réécrites ;
- les heures déjà apprises ne le sont pas une seconde fois (repère de l'état) ;
- un passage déjà archivé n'ajoute aucune case.

L'ordre des écritures est : archives d'abord, état en dernier. Si un passage s'arrête entre les deux, le relancer refait les mêmes écritures et arrive au même résultat (testé).

## Cas limites

| Cas | Comportement |
|---|---|
| Premier passage, sans historique | Les prévisions et les mesures sont archivées ; rien n'est appris avant que les premières cases aient 30 heures |
| Mesure en retard de plus de 30 heures | Archivée, jamais apprise |
| Mesure qui ne viendra jamais | L'heure est passée ; le jour n'a ni minimum ni maximum observé, et n'est pas jugé |
| Modèle absent plusieurs jours | Ses cases manquent : rien n'est appris pour lui sur ces heures. Les autres continuent, et il reprend à son retour |
| Modèle hors de portée (AROME au-delà de deux jours) | Pas de case pour lui à ces échéances, donc ni biais ni erreur |
| Jour de 23 ou 25 heures | Le jour civil de Paris a le nombre d'heures qu'il a |
| Pipeline arrêté plus d'un jour | Les heures non prévues à temps restent sans case |

## Tailles mesurées

Sur un vrai premier passage (17/11/2026, deux villes) : 35 Ko de prévisions archivées par ville pour 24 heures de cases, 13 Ko d'observations pour dix jours, 1 Ko d'état vide. Un état appris compte environ 2 400 cases de modèle par ville. La politique de rétention de la branche de données est à fixer par l'ADR 0004 (M1-12).

## Tests

`pipeline/verify/__tests__/step.test.ts` joue des passages sur un dossier temporaire avec un scénario **fictif** (`pipeline/testing/scenario.ts` : des modèles à biais constant autour d'un temps inventé, jamais utilisé hors des tests) : premier passage, passage répété, passage interrompu avant l'écriture de l'état, dix jours de passages, mesure manquante, mesure en retard, modèle absent deux jours.

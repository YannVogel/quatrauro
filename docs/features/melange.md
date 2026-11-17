# Mélange des modèles

Comment le code corrige, pondère et combine les prévisions des modèles. La méthode et ses paramètres sont arrêtés par l'[ADR 0003](../adr/0003-methode-de-melange.md), à partir du [backtest](backtest.md). Cette fiche décrit le code de `shared/blend/`, qui grandit issue par issue (M1-02 à M1-06).

Tout y est **pur** : des données en entrée, des données en sortie, ni réseau, ni fichier, ni horloge. Le pipeline et le backtest appellent exactement les mêmes fonctions.

## Où est rangée la mémoire d'un modèle

Ce que l'on sait d'un modèle n'est pas un chiffre unique : c'est un état par **ville, variable, modèle, tranche d'échéance et heure de la journée**.

| Dimension | Valeurs | Pourquoi |
|---|---|---|
| Ville | Toulon, Nice | Rien n'est mutualisé : un modèle peut être bon dans une ville et mauvais dans l'autre |
| Variable | température, humidité, vent moyen, rafales | Chacune a ses erreurs propres |
| Tranche d'échéance | J+1, J+2, J+3, J+4–5, J+6–7 | Un modèle ne se trompe pas de la même façon à un jour et à six |
| Heure de la journée | 24 blocs, un par heure UTC | Le biais d'un modèle en bord de mer n'est pas le même à 5 h et à 15 h. C'est le réglage qui paie le plus (3 % d'erreur en moins) |

Les heures sont en UTC parce que le biais suit le soleil, pas l'heure légale. `hourBlockOf` (`grouping.ts`) donne le bloc d'une heure.

## La brique commune : une moyenne qui oublie

`decayedMean.ts` tient une moyenne à pondération exponentielle indexée par le temps : le poids d'une valeur est divisé par deux tous les N jours (sa demi-vie). Un trou dans les données n'a pas besoin de traitement : le temps écoulé fait baisser le poids des valeurs anciennes. L'état tient en quatre nombres, ce qui garde léger le fichier d'état du pipeline.

## Correction de biais (`bias.ts`)

| Fonction | Rôle |
|---|---|
| `updateBias(state, forecast, observation, hour, halfLifeDays)` | Intègre une paire prévision / observation. L'écart suivi est `prévision − observation` |
| `readBias(state, minSamples)` | Biais courant, ou `null` tant que l'historique est trop court |
| `correctForecast(forecast, state, minSamples)` | Prévision corrigée : `prévision − biais` |

Réglages, dans `shared/blendConfig.ts` : demi-vie de **20 jours**, au moins **10 paires** avant de corriger.

Cas limites :

| Cas | Comportement |
|---|---|
| Observation ou prévision absente (`null`) | La paire est ignorée, l'état ne change pas |
| Moins de 10 paires | Le modèle n'est pas corrigé : sa prévision brute est utilisée telle quelle |
| Le biais du modèle change (nouvelle version, nouvelle grille) | L'ancien biais s'efface peu à peu : le poids des anciennes erreurs est divisé par deux tous les 20 jours. Il faut compter deux à trois mois pour qu'il n'en reste rien de visible |
| Longue interruption des données | Les valeurs d'avant comptent d'autant moins que l'interruption a duré |

Une correction ne voit jamais le futur : c'est l'appelant (le pipeline, ou `replay.ts` dans le backtest) qui ne lui donne que les observations publiées au moment où la prévision est émise.

## Pondération (`weights.ts`)

Chaque modèle pèse en raison inverse de son erreur récente, une fois son biais corrigé.

| Fonction | Rôle |
|---|---|
| `updateError(state, correctedForecast, observation, hour, halfLifeDays)` | Intègre l'erreur absolue d'une prévision **corrigée** |
| `readError(state, minSamples)` | Erreur absolue moyenne récente, ou `null` tant que l'historique est trop court |
| `computeWeights(errors, options)` | Poids des modèles disponibles, de somme 1 |

Le poids brut d'un modèle vaut `(1 / erreur)` élevé à l'exposant ; les poids sont ensuite ramenés à une somme de 1, puis dans leurs bornes.

Réglages, dans `shared/blendConfig.ts` :

| Réglage | Valeur | Rôle |
|---|---|---|
| Demi-vie de l'erreur | 60 jours | La « fenêtre » de l'erreur récente |
| Exposant | 4 | Un modèle deux fois plus précis pèse seize fois plus, avant les bornes |
| Erreur plancher | 0,05 | Un modèle presque parfait sur une courte période n'écrase pas les autres |
| Poids minimal | 5 % | Un modèle en mauvaise passe garde une voix |
| Poids maximal | 70 % | Aucun modèle ne monopolise le mélange sur un coup de chance |

L'erreur récente est une moyenne à pondération exponentielle, pas une fenêtre glissante : même information, pour un état de quatre nombres au lieu d'une liste de jours (ADR 0003).

Les deux bornes sont des garde-fous, pas des réglages de précision : sur le backtest, l'erreur du mélange est la même avec ou sans elles (1,1950 °C sur la période de sélection), parce que les poids les atteignent rarement. Des bornes plus serrées (15 % et 60 %) la dégradent.

Cas limites :

| Cas | Comportement |
|---|---|
| Modèle sans historique suffisant | Poids neutre : la moyenne des poids des modèles notés |
| Aucun modèle n'a d'historique | Poids égaux |
| Modèle absent du passage | Il n'est pas dans la liste : les autres se partagent toute la somme |
| Un seul modèle disponible | Il pèse 1, malgré le poids maximal |
| Trop peu de modèles pour respecter une borne | La borne s'efface devant le partage égal (deux modèles ne peuvent pas peser chacun au plus 40 %) |
| Un poids dépasse une borne | Tous les poids sont multipliés par un même facteur, puis bornés, de façon que leur somme vaille 1 : les modèles que les bornes ne touchent pas gardent entre eux leurs proportions |
| Plafond et plancher atteints en même temps | Même règle : un modèle à 70 %, les autres se partagent les 30 % restants sans descendre sous 5 % |

## Mélange d'une heure (`hourly.ts`)

`blendHour(models, calibration, params)` prend ce que chaque modèle prévoit pour une heure, avec son état pour la tranche d'échéance et l'heure de la journée concernées, et rend la valeur combinée de chaque variable.

| Variable | Comment elle se mélange | Fichier |
|---|---|---|
| Température, humidité, vent moyen, rafales | Biais corrigé, puis moyenne pondérée par l'erreur récente | `corrected.ts` (`blendCorrected`) |
| Direction du vent | Moyenne **vectorielle**, avec les poids du vent moyen | `wind.ts` (`meanDirection`) |
| Nébulosité | Moyenne simple, sans correction : elle n'est pas mesurée à Toulon, et le mélange pondéré ne fait pas mieux à Nice | `hourly.ts` |
| Cumul de pluie | Moyenne simple des modèles | `hourly.ts` |
| Probabilité de pluie | Part des modèles qui annoncent au moins 0,2 mm, remplacée par la fréquence observée pour ce degré d'accord | `rain.ts` |
| Température ressentie | Dérivée de la température, de l'humidité et du vent **mélangés** | `apparentTemperature.ts` |

Le résultat garde aussi ce qu'il faut pour être transparent : l'écart-type entre les températures corrigées (`temperatureSpread`), la liste des modèles qui donnent une température à cette heure (`temperatureModels`), leur poids, et la température corrigée et le cumul de chaque modèle.

Le backtest rejoue `blendCorrected`, la même fonction que le pipeline.

### Direction du vent

350° et 10° font 0°, pas 180° : on additionne les vecteurs unitaires, pondérés, et on lit l'angle de la somme. Quand les directions s'annulent (un modèle au nord, l'autre au sud, à poids égaux), il n'y a pas de direction moyenne : le résultat est `null`.

### Température ressentie

Formule de Steadman, celle du Bureau of Meteorology australien, sans le terme de rayonnement : `ressenti = T + 0,33 × e − 0,70 × v − 4`, où `e` est la pression de vapeur d'eau en hPa et `v` le vent à 10 m en m/s. Elle ne donne pas le même chiffre que la température ressentie d'Open-Meteo, qui ajoute le rayonnement solaire : c'est voulu, le ressenti de Quatrauro vient des champs qu'il a lui-même corrigés.

### Probabilité de pluie

L'accord entre modèles est rangé en cinq classes : aucun, une minorité, la moitié, une majorité, tous. Pour chaque tranche d'échéance, on compte combien de fois il a plu dans chaque classe ; la probabilité annoncée est cette fréquence, lissée vers la fréquence d'ensemble tant que la classe compte peu de cas, et rendue croissante avec l'accord. Avant 30 cas, la probabilité est l'accord brut.

### Cas limites

| Cas | Comportement |
|---|---|
| Aucun modèle ne donne une variable | Elle vaut `null` ; les autres variables se calculent normalement |
| Un seul modèle couvre l'heure | Sa valeur est rendue, avec un écart nul et lui seul dans `temperatureModels` |
| Un modèle ne fournit pas une variable (rafales d'IFS dans l'historique) | Il est ignoré pour cette variable seulement |
| La correction pousse une valeur hors de son domaine | Humidité ramenée entre 0 et 100, vent et rafales à 0 au moins |
| Il manque la température, l'humidité ou le vent | Pas de ressenti |
| Les directions du vent s'annulent | Pas de direction |

## Agrégats quotidiens (`daily.ts`)

`aggregateDaily(hours, minCoverage)` range les heures par **jour civil de Paris** (`shared/parisTime.ts`) et calcule le minimum et le maximum de température et de ressenti, le cumul de pluie, le vent et les rafales les plus forts, l'humidité moyenne.

- Un jour compte 24 heures, ou 23 et 25 les jours de changement d'heure : le cumul d'un jour de 25 heures additionne bien 25 heures.
- Une variable n'a d'agrégat que si elle couvre au moins **75 %** des heures du jour (`minDayCoverage`). En dessous, il vaut `null` : le minimum d'une demi-journée n'est pas le minimum du jour.
- La couverture se juge variable par variable : un jour peut avoir un maximum de température et pas de rafales.

## Indice de fiabilité (`reliability.ts`)

L'indice d'un jour répond à une question : **dans une situation semblable, combien de fois la prévision a-t-elle été tenue ?** Ce n'est pas une note calculée par une formule, c'est une fréquence relevée dans le passé.

**Prévision tenue** : le minimum et le maximum de température du jour sont à moins de **2 °C** de l'observé (`temperatureTolerance`), et l'annonce de pluie (oui ou non) est juste.

**Situation semblable** : trois critères, qui portent l'échéance, l'écart entre modèles et l'erreur passée.

| Critère | Classes | Réglage |
|---|---|---|
| Tranche d'échéance | J+1, J+2, J+3, J+4-5, J+6-7 : une table par tranche, tenue par l'appelant | `leadGrouping` |
| Désaccord entre modèles (écart-type moyen de la température sur la journée) | faible < 0,6 °C ≤ moyen < 0,9 °C ≤ fort | `spreadThresholds` |
| Signal de pluie | net, ou incertain entre 20 % et 80 % de probabilité | `uncertainRain` |

- `updateReliability(table, situation, held, options)` ajoute un jour vérifié à la table de sa tranche.
- `reliabilityIndex(table, situation, options)` rend l'indice, de 0 à 1.
- `reliabilityLabel(index, thresholds)` rend le libellé : **Sûr** à partir de 80 %, **Probable** à partir de 60 %, **Incertain** en dessous (`labels`).
- `countAgreeingModels(values, combined, tolerance)` compte les modèles « d'accord » : ceux dont la valeur est à moins de **1 °C** de la valeur combinée (`agreementTolerance.temperature`).
- `dayReliability(table, day, settings)` réunit les trois : c'est ce que le pipeline publie pour un jour (`reliability`, `reliabilityLabel`, `modelsAgreeing`, `modelsTotal`).

### Garde-fous

| Cas | Comportement |
|---|---|
| Moins de 30 jours vérifiés dans la tranche (`minSamples`) | Indice `null`, libellé `null` : l'app affiche « indisponible » |
| Situation peu rencontrée | Son taux est tiré vers le taux de la tranche, avec le poids de 10 jours fictifs (`priorStrength`) |
| Un niveau de désaccord plus fort a été, par hasard, mieux tenu | Les taux sont rendus décroissants : à signal de pluie égal, l'indice ne monte jamais quand le désaccord augmente |
| Un seul modèle couvre le jour | L'indice est plafonné à **50 %** (`singleModelCap`), donc « Incertain » : un écart nul entre un modèle et lui-même ne prouve rien |
| Pas de valeur combinée | Le nombre de modèles d'accord vaut `null` |

Le plafond ne joue pas dans le backtest, où trois modèles au moins couvrent chaque échéance. Il protège le cas d'une panne : si un seul modèle répond un jour, la prévision sort quand même, mais sans se dire sûre.

### Calibration

Un indice n'a de sens que s'il tient parole : les jours annoncés à 70 % doivent être tenus environ sept fois sur dix. Le critère, fixé par le [rapport du backtest](backtest.md), est un écart d'au plus **10 points** entre l'indice annoncé et la part des prévisions tenues, dans chaque classe d'au moins 50 jours, sur la période de validation. Il est rempli (écart maximal : 9,6 points, dans la classe 30-40 %) ; les tableaux sont dans [backtest-resultats.md](backtest-resultats.md).

Ce critère est rejoué à chaque passage de la CI par `pipeline/backtest/__tests__/calibration.test.ts`, sans retélécharger l'historique : `npm run backtest` écrit la situation de chaque jour (désaccord, probabilité de pluie, prévision tenue ou non) dans `pipeline/__fixtures__/backtest/reliability-days.json`, et le test rejoue l'indice dessus, sans fuite d'information. Si un réglage qui définit « prévision tenue » change dans `blendConfig.ts`, le test échoue tant que le backtest n'a pas été relancé.

À savoir : le backtest juge les jours en UTC, le pipeline les jugera en jours civils de Paris. L'écart est d'une ou deux heures par jour ; la calibration sera remesurée sur les jours de Paris quand la vérification (M1-09) aura accumulé assez de jours.

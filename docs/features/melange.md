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

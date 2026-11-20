# Collecte

La collecte est la seule partie du projet qui parle au réseau : elle lit les prévisions chez Open-Meteo et les observations chez Météo-France, et rend des séries horaires dans le format interne (`shared/series.ts`). Les sources, leurs conditions et leurs particularités sont décrites dans [donnees.md](donnees.md) ; cette fiche dit ce que fait le code de `pipeline/collect/`.

## Prévisions (`forecasts.ts`)

`collectForecasts(city, models, options)` rend un `CityForecasts` : une série par modèle, l'instant de la collecte et la liste des modèles indisponibles.

### La requête

Une requête par ville, pour tous les modèles à la fois (`openMeteoForecast.ts`). Un passage du pipeline fait donc **deux appels**.

| Paramètre | Valeur | Pourquoi |
|---|---|---|
| `hourly` | température, humidité, vent moyen, rafales, direction du vent, nébulosité, précipitations, code météo | Les grandeurs de `shared/variables.ts`, plus le code météo qui sert à reconnaître l'orage |
| `models` | les cinq modèles de `shared/models.ts` | Une série par modèle, suffixée par son identifiant |
| `forecast_days` | 8 | Huit jours UTC couvrent sept jours civils de Paris, même pour un passage en fin de soirée |
| `timezone` | `GMT` | Les heures reviennent en UTC |
| `temperature_unit`, `wind_speed_unit`, `precipitation_unit` | `celsius`, `kmh`, `mm` | Les unités de Quatrauro, demandées explicitement : aucune conversion à faire |

La température ressentie et la probabilité de pluie d'Open-Meteo ne sont pas demandées : Quatrauro calcule les siennes.

### Ce qui est vérifié à la lecture

Tout écart lève une erreur lisible, et le passage s'arrête sans rien publier :

- la réponse est du JSON, avec un bloc `hourly` et un décalage horaire nul ;
- les heures sont rondes et consécutives ;
- chaque série a autant de valeurs que d'heures, et ses valeurs sont des nombres ou `null` ;
- chaque série est dans l'unité attendue (`hourly_units`). Une unité différente n'est jamais convertie à l'aveugle.

Les instants sont rendus en UTC, à la seconde (`2026-11-17T15:00:00Z`). Une heure hors de portée d'un modèle vaut `null` et le reste.

### Un modèle qui manque n'arrête rien

| Cas | Comportement |
|---|---|
| Le modèle n'a aucune série dans la réponse | Indisponible pour ce passage, signalé dans le journal |
| Le modèle n'a plus aucune température à venir (run très en retard) | Indisponible |
| Une variable manque chez un modèle présent | Elle vaut `null` sur toutes les heures ; le modèle reste dans le mélange pour les autres |
| Open-Meteo refuse la requête groupée (HTTP 400) | Reprise modèle par modèle : celui qui est refusé est indisponible |
| Les séries reviennent sans suffixe alors que plusieurs modèles étaient demandés | Reprise modèle par modèle (voir ci-dessous) |
| Aucun modèle n'a de prévision | Erreur : le passage échoue |

**Les séries sans suffixe.** Mesuré le 17/11/2026 : quand on demande deux modèles et qu'un seul couvre la ville, Open-Meteo répond 200, retire l'autre sans le dire et rend des séries **sans suffixe**. Rien ne dit alors à quel modèle elles appartiennent. La collecte ne devine pas : elle redemande chaque modèle séparément (cinq appels au lieu d'un, ce jour-là seulement).

**Limite connue : un run en retard ne se voit pas toujours.** Open-Meteo sert le dernier run qu'il possède. Si un modèle global cesse d'être mis à jour, ses anciennes prévisions restent servies pendant des jours et la collecte les prend pour fraîches. Les métadonnées d'Open-Meteo donnent l'heure du dernier run, mais par domaine de calcul et non par modèle demandé (ICON et GFS en combinent plusieurs) : la correspondance n'a pas été établie. En attendant, le mélange limite le dégât de lui-même : un modèle dont les prévisions vieillissent voit son erreur monter et son poids baisser.

### Réseau (`http.ts`)

- Délai d'attente de 30 secondes par tentative.
- Trois tentatives au plus, espacées de 5 puis 20 secondes, pour les pannes passagères : coupure réseau, délai dépassé, HTTP 429, HTTP 5xx.
- Un refus (HTTP 4xx) n'est pas retenté.
- Après la dernière tentative, l'erreur remonte avec le nom du serveur, le statut et le début de sa réponse.
- Si le serveur n'a pas répondu du tout, l'erreur dit lequel et pourquoi : `Pas de réponse de <serveur> : fetch failed : <raison>`. La raison vient de la cause de l'erreur de Node (nom introuvable, connexion refusée ou coupée), que « fetch failed » seul ne dit pas.

Le réseau, l'horloge, l'attente et le journal sont passés en paramètres (`CollectOptions`) : les tests ne font aucun appel et n'attendent pas.

## Observations (`observations.ts`)

`collectObservations(city, { from, to }, options)` rend les mesures horaires de la station de référence de la ville (`shared/cities.ts`) sur la période demandée : une valeur par heure et par grandeur, `null` quand il n'y a pas de mesure.

### Le déroulé

1. Lire la fiche du jeu de données sur data.gouv.fr, pour y trouver l'adresse du fichier « deux dernières années » du département. Son nom porte ses années (`H_83_latest-2025-2026.csv.gz`) et changera au 1er janvier : on ne la construit jamais à la main.
2. Vérifier que cette adresse est en HTTPS et pointe vers le serveur connu de Météo-France (`meteofrance.s3.sbg.io.cloud.ovh.net`). Sinon, le passage échoue avec un message qui dit quoi vérifier : on ne télécharge pas un fichier depuis une adresse que la fiche se mettrait à désigner ailleurs.
3. Télécharger le fichier (environ 20 Mo) et le décompresser **au fil de l'eau** : seules les lignes de la station sont gardées.
4. Rendre les heures de la période, dans l'ordre, en UTC.

Un passage fait donc **quatre appels** pour les observations : la fiche et le fichier, pour chaque ville. Aucune clé n'est nécessaire, donc aucune n'est lue, écrite ni journalisée.

### Ce que devient une mesure

| Cas | Comportement |
|---|---|
| Mesure présente, code qualité autre que « douteuse » | Convertie dans l'unité de Quatrauro (m/s → km/h, octas → %) |
| Champ vide | `null` |
| Code qualité `2` (douteuse) | `null` |
| Ciel invisible (9 octas) | `null` |
| Direction du vent par vent nul | `null` : le fichier écrit alors 0, et le nord s'écrit 360 (vérifié sur les 927 heures de vent nul de Toulon et les 46 de Nice depuis janvier 2025) |
| Valeur hors des bornes de vraisemblance | `null`, et une ligne dans le journal |
| Heure absente du fichier (pas encore publiée, ou jamais) | Toutes les grandeurs à `null` : **rien n'est interpolé ni recopié** |
| Mesure qui n'est pas un nombre, heure illisible, colonne manquante | Erreur : le passage échoue |
| Station absente du fichier | Erreur |

Bornes de vraisemblance (`PLAUSIBLE_RANGES`), appliquées après conversion. Elles sont larges : leur rôle est d'arrêter une panne de capteur, pas de juger le temps qu'il fait. À titre de repère, depuis janvier 2025 les deux stations ont mesuré de 0,1 à 37,5 °C, des rafales jusqu'à 117 km/h et jusqu'à 48,6 mm en une heure.

| Grandeur | Bornes |
|---|---|
| Température | −20 à 50 °C |
| Humidité | 0 à 100 % |
| Vent moyen | 0 à 200 km/h |
| Rafales | 0 à 300 km/h |
| Direction | 0 à 360° |
| Nébulosité | 0 à 100 % |
| Précipitations | 0 à 200 mm dans l'heure |

### Le retard des mesures

Les fichiers sont mis à jour une fois par jour, avec des mesures qui s'arrêtent trois heures plus tôt : une mesure met jusqu'à 27 heures à arriver. La collecte ne décide pas de la période : c'est l'appelant (l'archive, M1-09) qui redemande les derniers jours à chaque passage, pour compléter les heures restées vides la veille.

La lecture d'un fichier est partagée avec le backtest (`pipeline/meteoFranceHourly.ts` : adresse de la fiche, champs, conversions, code qualité).

## Tests

`pipeline/collect/__tests__/` rejoue les réponses réelles enregistrées dans `pipeline/__fixtures__/`. Pour les prévisions : réponse complète des deux villes, modèle absent, modèle en retard, variable manquante, séries sans suffixe, refus, panne, délai dépassé, réponses mal formées. Pour les observations : série complète des deux stations, heures manquantes, valeur aberrante, code qualité douteux, vent nul, fiche ou fichier inaccessible, serveur inconnu, fichier illisible. Les variantes abîmées sont dérivées des réponses réelles dans les tests eux-mêmes.

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

Le réseau, l'horloge, l'attente et le journal sont passés en paramètres (`CollectOptions`) : les tests ne font aucun appel et n'attendent pas.

## Observations

À venir avec M1-08.

## Tests

`pipeline/collect/__tests__/` rejoue les réponses réelles enregistrées dans `pipeline/__fixtures__/` : réponse complète des deux villes, modèle absent, modèle en retard, variable manquante, séries sans suffixe, refus, panne, délai dépassé, réponses mal formées. Les variantes abîmées sont dérivées des réponses réelles dans les tests eux-mêmes.

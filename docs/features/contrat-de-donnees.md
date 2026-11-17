# Contrat de données

Le pipeline et l'app se parlent par des fichiers JSON statiques. Leur forme est définie une seule fois, dans [`shared/schemas.ts`](../../shared/schemas.ts) (schémas Zod), et validée des deux côtés : le pipeline valide avant d'écrire, l'app valide avant d'afficher.

Les exemples de cette page montrent la forme des fichiers : **leurs valeurs sont fictives**.

## Règles

- **Une valeur absente vaut `null`**, jamais une valeur par défaut. Toute valeur météo peut manquer ; l'app affiche alors « — ».
- **Les instants sont en UTC** (`2026-11-17T15:00:00Z`). Les jours (`2026-11-17`) sont des jours civils de Paris.
- **Unités** : °C, km/h, mm, % (de 0 à 100), degrés pour la direction du vent.
- **`schemaVersion`** vaut `1`. Un changement incompatible (champ retiré, renommé, ou dont le sens change) l'incrémente, et l'app refuse un fichier d'une version qu'elle ne connaît pas. Un champ **ajouté** ne l'incrémente pas : une app plus ancienne l'ignore.
- Un fichier qui ne respecte pas le schéma n'est **ni publié** par le pipeline, **ni affiché** par l'app, même en partie.

## `forecast/<ville>.json`

Ce que l'app affiche : sept jours, heure par heure et jour par jour.

```jsonc
{
  "schemaVersion": 1,
  "city": "toulon",
  // Instant du calcul. L'app le compare à l'heure courante pour signaler une prévision ancienne.
  "generatedAt": "2026-11-17T15:00:00Z",
  // Tous les modèles configurés. Un modèle absent de ce passage a `available: false`.
  "models": [
    { "id": "arome", "available": true },
    { "id": "gfs", "available": false }
  ],
  "hourly": [
    {
      "time": "2026-11-17T16:00:00Z",
      "temperature": 16.3,
      // Écart-type entre les modèles corrigés : leur désaccord, en °C.
      "temperatureSpread": 0.6,
      "apparentTemperature": 15.1,
      "humidity": 62,
      "cloudCover": 10,
      // Cumul de l'heure écoulée, en mm, et probabilité de pluie dans l'heure, en %.
      "precipitation": 0,
      "precipitationProbability": 2,
      "windSpeed": 18,
      "windGusts": 30,
      "windDirection": 315,
      // Une des conditions de shared/conditions.ts ; jour ou nuit à part.
      "condition": "clear",
      "isNight": false,
      // Ce que prévoit chaque modèle disponible à cette heure, corrigé de son biais.
      "models": { "arome": { "temperature": 16.9, "precipitation": 0 } }
    }
  ],
  "daily": [
    {
      "date": "2026-11-17",
      "min": 9,
      "max": 16,
      "apparentMin": 7,
      "apparentMax": 15,
      "condition": "clear",
      // Phrase courte produite par des règles, ou null s'il n'y a rien à dire.
      "summary": "Grand soleil",
      "precipitation": 0,
      "precipitationProbability": 3,
      "windSpeedMax": 22,
      "windGustsMax": 38,
      "humidity": 58,
      // Indice de fiabilité en % ; null tant que l'historique est insuffisant.
      "reliability": 95,
      "reliabilityLabel": "sure", // "sure", "likely" ou "uncertain"
      // Modèles proches de la valeur combinée, sur ceux qui couvrent ce jour.
      "modelsAgreeing": 4,
      "modelsTotal": 4,
      // Poids moyen de chaque modèle dans la température du jour ; leur somme vaut 1.
      "weights": { "arome": 0.35, "ifs": 0.24, "arpege": 0.23, "icon": 0.18 }
    }
  ]
}
```

Par rapport à l'esquisse du brief (§ 6), ajustée aux conclusions des spikes :

- `models[].runAt` a disparu : Open-Meteo ne donne pas l'heure du run dans sa réponse de prévision ;
- `hourly[].byModel` s'appelle `models` et porte aussi le cumul de pluie de chaque modèle, pour montrer quand chacun fait commencer la pluie ;
- s'ajoutent, heure par heure, la température ressentie, l'humidité et `isNight` ; jour par jour, les ressentis, le cumul et la probabilité de pluie, le vent et les rafales les plus forts, l'humidité ;
- le nombre de modèles baisse avec l'échéance (ADR 0002) : `modelsTotal` et `weights` ne citent que ceux qui couvrent le jour.

## `verification/<ville>.json`

Ce que montre l'écran « Fiabilité » : le bilan du mélange face aux mesures.

```jsonc
{
  "schemaVersion": 1,
  "city": "nice",
  "generatedAt": "2026-11-17T15:00:00Z",
  // Période des scores ; null tant que rien n'a pu être vérifié.
  "period": { "from": "2026-10-18", "to": "2026-11-16" },
  "temperature": {
    // Erreur absolue moyenne, en °C, par échéance en jours.
    "byLead": [
      {
        "leadDays": 1,
        "count": 720, // nombre d'heures comparées
        "blend": 0.8,
        // Le meilleur modèle seul sur la même période : la comparaison qui compte.
        "bestModel": { "id": "icon", "error": 1.1 },
        // Chaque modèle brut ; null s'il ne couvre pas l'échéance.
        "models": { "arome": 1.3, "icon": 1.1, "gfs": null }
      }
    ],
    // Prévu la veille contre mesuré, sur les sept derniers jours vérifiés.
    "recentDays": [
      { "date": "2026-11-16", "forecastMin": 9, "forecastMax": 16, "observedMin": 8.6, "observedMax": 16.4 }
    ]
  },
  // Part des jours où l'annonce (pluie ou pas) était juste, en %.
  "rain": { "count": 30, "hitRate": 90 }
}
```

## Configuration unique

Trois fichiers portent tout ce qui se configure. Rien de tout cela n'existe ailleurs dans le code.

| Fichier | Contenu |
|---|---|
| [`shared/cities.ts`](../../shared/cities.ts) | Les villes : identifiant, nom, point de prévision, altitude, station de référence. Ajouter une ville, c'est ajouter une entrée |
| [`shared/models.ts`](../../shared/models.ts) | Les modèles : identifiant, nom, fournisseur, identifiant Open-Meteo, portée, fréquence, échéance vérifiable dans l'historique |
| [`shared/blendConfig.ts`](../../shared/blendConfig.ts) | Les paramètres du mélange retenus par le backtest ([ADR 0003](../adr/0003-methode-de-melange.md)) |

S'y ajoutent deux listes fermées : les conditions météo ([`shared/conditions.ts`](../../shared/conditions.ts)) et les grandeurs prévues ([`shared/variables.ts`](../../shared/variables.ts)), avec la façon dont chacune se mélange.

## Séries internes

[`shared/series.ts`](../../shared/series.ts) décrit ce que le pipeline manipule avant tout calcul : la prévision d'un modèle (`ModelForecast`), ce qu'un passage de la collecte a obtenu pour une ville (`CityForecasts`, avec la liste des modèles indisponibles), les mesures d'une station (`Observations`) et l'état d'un modèle (`ModelState` : son biais et son erreur récente). Toutes reposent sur des heures rondes en UTC et acceptent `null`.

## Cas limites

| Cas | Ce que dit le contrat |
|---|---|
| Un modèle ne répond pas | Il figure dans `models` avec `available: false`, et n'apparaît ni dans `hourly[].models` ni dans `weights` |
| Une échéance n'est couverte par aucun modèle | Les valeurs de l'heure valent `null` |
| L'historique est trop court pour un indice de fiabilité | `reliability` et `reliabilityLabel` valent `null` |
| Rien n'a encore été vérifié | `period` vaut `null`, les listes sont vides, `rain.hitRate` vaut `null` |
| Le fichier vient d'une version plus récente du pipeline | `schemaVersion` inconnue : l'app le refuse et garde sa dernière prévision valide |

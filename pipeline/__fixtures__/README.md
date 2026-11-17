# Fixtures

Réponses **réelles**, enregistrées telles quelles pendant le spike M0-02 ([#4](https://github.com/YannVogel/quatrauro/issues/4)) le 17 novembre 2026 vers 17 h UTC. Elles servent aux tests de la collecte des prévisions (M1-07), des observations (M1-08) et de l'amorçage (M1-10).

Ne pas les modifier à la main, ni les reformater : un test doit lire exactement ce que l'API renvoie. Pour les rafraîchir, relancer les requêtes ci-dessous et mettre la date à jour.

## Open-Meteo

Données sous licence [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), « Weather data by [Open-Meteo.com](https://open-meteo.com/) ».

| Fichier | Requête |
|---|---|
| `open-meteo/forecast-toulon.json` | `GET https://api.open-meteo.com/v1/forecast?latitude=43.1257&longitude=5.9304&hourly=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,wind_speed_10m,wind_gusts_10m,wind_direction_10m,cloud_cover,weather_code&models=meteofrance_arome_france,meteofrance_arpege_europe,ecmwf_ifs,dwd_icon_seamless,ncep_gfs_global&forecast_days=7&timezone=GMT` |
| `open-meteo/forecast-nice.json` | La même, avec `latitude=43.6973&longitude=7.2702` |
| `open-meteo/forecast-error-no-data.json` | Réponse d'erreur (HTTP 400) : `GET https://api.open-meteo.com/v1/forecast?latitude=43.1257&longitude=5.9304&hourly=temperature_2m&models=dwd_icon_d2&forecast_days=1&timezone=GMT` (Toulon est hors du domaine d'ICON-D2) |
| `open-meteo/forecast-toulon-model-out-of-domain.json` | Enregistrée le 17/11/2026 vers 20 h 40 UTC : `GET https://api.open-meteo.com/v1/forecast?latitude=43.1257&longitude=5.9304&hourly=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_gusts_10m,wind_direction_10m,cloud_cover,weather_code&models=meteofrance_arome_france,dwd_icon_d2&forecast_days=1&timezone=GMT&temperature_unit=celsius&wind_speed_unit=kmh&precipitation_unit=mm`. Deux modèles demandés, un seul couvre Toulon : la réponse (HTTP 200) ne contient que les séries d'AROME, **sans suffixe** |
| `open-meteo/previous-runs-toulon.json` | `GET https://previous-runs-api.open-meteo.com/v1/forecast?latitude=43.1257&longitude=5.9304&hourly=temperature_2m,temperature_2m_previous_day1,temperature_2m_previous_day2,temperature_2m_previous_day3,precipitation,precipitation_previous_day1,precipitation_previous_day2,precipitation_previous_day3&models=meteofrance_arome_france,ecmwf_ifs&start_date=2026-11-15&end_date=2026-11-16&timezone=GMT` |

À savoir pour les tests :

- Les séries d'une réponse multi-modèles sont suffixées par l'identifiant du modèle (`temperature_2m_ecmwf_ifs`).
- Quand un seul des modèles demandés répond, les séries ne sont **pas** suffixées et rien ne dit à qui elles sont (`forecast-toulon-model-out-of-domain.json`).
- Les heures hors de portée d'un modèle valent `null` : AROME s'arrête au bout de 51 h, ARPEGE au bout de 102 h.
- Dans `previous-runs-toulon.json`, AROME n'a que `_previous_day1` : les décalages 2 et 3 sont entièrement `null`.

## Météo-France

Données sous [Licence Ouverte 2.0](https://www.etalab.gouv.fr/licence-ouverte-open-licence). Source : Météo-France, « Données climatologiques de base — horaires ».

| Fichier | Origine |
|---|---|
| `meteo-france/hourly-toulon-83137001.csv` | Extrait de `H_83_latest-2025-2026.csv.gz` : l'en-tête et les 48 lignes de la station `83137001` (TOULON) du 15/11/2026 00 h UTC au 16/11/2026 23 h UTC |
| `meteo-france/hourly-nice-06088001.csv` | Extrait de `H_06_latest-2025-2026.csv.gz` : l'en-tête et les 48 lignes de la station `06088001` (NICE) sur la même période |

Ce sont des **extraits** : le fichier d'origine fait environ 20 Mo par département et contient toutes les stations. Les lignes conservées sont intactes (séparateur `;`, 200 colonnes et plus, champs vides pour les mesures absentes). Les deux extraits couvrent la même période que `previous-runs-toulon.json`, pour pouvoir apparier une prévision et une observation dans un test.

## Backtest

| Fichier | Origine |
|---|---|
| `backtest/reliability-days.json` | Écrit par `npm run backtest`. Pour chaque ville et chaque échéance, la situation de chaque jour du 01/10/2025 au 15/11/2026 : écart-type moyen entre modèles, probabilité de pluie, prévision tenue (1), manquée (0) ou non vérifiable (`null`) |

Ce ne sont pas des réponses d'API mais des **données dérivées** des prévisions (Open-Meteo, CC BY 4.0) et des observations (Météo-France, Licence Ouverte 2.0) réelles du backtest. Le test de calibration de l'indice de fiabilité les rejoue ([fiche du mélange](../../docs/features/melange.md)). Ne pas les modifier à la main : relancer le backtest.

Le détail des sources, des unités et des conversions est dans [docs/features/donnees.md](../../docs/features/donnees.md).

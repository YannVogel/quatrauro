# Sources de données

Cette fiche consigne ce que le spike M0-02 ([#4](https://github.com/YannVogel/quatrauro/issues/4)) a établi sur les prévisions et les observations. La décision est dans l'[ADR 0002](../adr/0002-sources-de-donnees-meteo.md).

Tout ce qui suit a été **lu dans la documentation ou mesuré par un appel réel le 17 novembre 2026** (entre 16 h 50 et 17 h 05 UTC). Rien n'est repris de mémoire. Les valeurs « mesurées » sont celles d'un instant : elles sont à revérifier si un comportement surprend.

## Points de prévision

| Ville | Point demandé | Altitude du point (MNT d'Open-Meteo) |
|---|---|---|
| Toulon | 43,1257 N, 5,9304 E (centre-ville) | 11 m |
| Nice | 43,6973 N, 7,2702 E (centre-ville) | 10 m |

Open-Meteo choisit pour chaque modèle une maille proche du point. Par défaut (`cell_selection=land`), il cherche une maille terrestre d'altitude voisine de celle du point, puis ramène la température à l'altitude du point. Le tableau donne, pour chaque modèle, la maille terrestre retenue, son altitude (obtenue en redemandant cette maille avec `elevation=nan`) et la maille que renvoie `cell_selection=sea`.

| Ville | Modèle | Maille « terre » | Distance au point | Altitude de la maille | Maille « mer » |
|---|---|---|---|---|---|
| Toulon | AROME France | 43,1250 N, 5,9250 E | 0,4 km | 15 m | identique |
| Toulon | ARPEGE Europe | 43,1000 N, 5,9000 E | 3,8 km | 66 m | distincte (43,0000 N) |
| Toulon | IFS HRES | 43,1283 N, 5,9016 E | 2,4 km | 118 m | distincte (43,0580 N) |
| Toulon | ICON (EU) | 43,1250 N, 5,9375 E | 0,6 km | 72 m | distincte (43,0625 N) |
| Toulon | ICON (global) | 43,1250 N, 5,8750 E | 4,5 km | 51 m | distincte (43,0000 N) |
| Toulon | GFS | 43,1695 N, 5,9766 E | 6,1 km | 235 m | distincte (43,0524 N) |
| Toulon | UKMO global | 43,1250 N, 5,9063 E | 2,0 km | 230 m | distincte (43,0313 N) |
| Nice | AROME France | 43,7000 N, 7,2750 E | 0,5 km | 13 m | identique |
| Nice | ARPEGE Europe | 43,7000 N, 7,2000 E | 5,7 km | 86 m | distincte (7,3000 E) |
| Nice | IFS HRES | 43,6907 N, 7,1946 E | 6,1 km | 132 m | distincte (7,3303 E) |
| Nice | ICON (D2) | 43,6919 N, 7,2601 E | 1,0 km | 13 m | distincte (43,6834 N) |
| Nice | ICON (EU) | 43,6875 N, 7,2500 E | 2,0 km | 53 m | distincte (7,3125 E) |
| Nice | ICON (global) | 43,6250 N, 7,2500 E | 8,2 km | 77 m | distincte (7,3750 E) |
| Nice | GFS | 43,7553 N, 7,2656 E | 6,5 km | 276 m | distincte (43,6381 N) |
| Nice | UKMO global | 43,6875 N, 7,3125 E | 3,6 km | 171 m | distincte (43,5938 N) |

À retenir :

- **Aucune maille retenue n'est en mer.** Toutes ont une altitude strictement positive et, sauf pour AROME, une maille « mer » différente existe à côté. Pour AROME (maille de 2,5 km), `sea` renvoie la même maille : elle est à 13–15 m d'altitude, en ville.
- Open-Meteo n'expose pas le masque terre/mer des modèles. La vérification repose donc sur ces deux indices (altitude de la maille, existence d'une maille « mer » distincte), pas sur une lecture directe du masque.
- Les modèles globaux placent la côte en altitude (jusqu'à 276 m pour GFS à Nice). La descente d'échelle d'Open-Meteo compense la température (+1,5 °C environ pour GFS à Toulon), mais pas le vent ni la pluie : c'est précisément le genre d'erreur systématique que la correction de biais doit absorber.
- À Nice, sans la sélection « terre » (`elevation=nan` force la maille la plus proche), ARPEGE Europe et IFS tombent sur une maille d'altitude 0 : **ne jamais désactiver `cell_selection=land`**.
- Dans une réponse multi-modèles, `latitude` et `longitude` sont ceux de la maille du premier modèle demandé seulement.

## Modèles

Tous sont lus via Open-Meteo, endpoint `https://api.open-meteo.com/v1/forecast`, paramètre `models`.

| Modèle | Fournisseur | Identifiant Open-Meteo | Maille | Portée (doc) | Portée mesurée | Mise à jour | Délai mesuré | Échéances dans l'historique |
|---|---|---|---|---|---|---|---|---|
| AROME France | Météo-France | `meteofrance_arome_france` | 0,025° (~2,5 km) | 2 jours | 51 h | toutes les 3 h | 4,2 h | J−1 |
| ARPEGE Europe | Météo-France | `meteofrance_arpege_europe` | 0,1° (~11 km) | 4 jours | 102 h | toutes les 6 h | 3,7 h | J−1 à J−3 |
| IFS HRES | ECMWF | `ecmwf_ifs` | 9 km | 15 jours | > 8 jours | toutes les 6 h | 6,2 h | J−1 à J−7 |
| ICON | DWD | `dwd_icon_seamless` | 2 km (D2, Nice seulement), 7 km (EU), 11 km (global) | 2 j, 5 j, 7,5 j | > 7 jours | toutes les 3 h (D2, EU), 6 h (global) | 1,5 h à 4,1 h | J−1 à J−6 |
| GFS | NOAA | `ncep_gfs_global` | 0,11° (~13 km) | 16 jours | > 8 jours | toutes les 6 h | 6,0 h | J−1 à J−7 |

- **Portée (doc)** : pages des modèles sur open-meteo.com. **Portée mesurée** : dernière heure non nulle d'une réponse du 17/11/2026 à 16 h 53 UTC, comptée depuis le run. **Délai mesuré** : écart entre l'initialisation du dernier run et sa disponibilité, lu dans les métadonnées (`https://api.open-meteo.com/data/<modèle>/static/meta.json`) le 17/11/2026 à 16 h 59 UTC. Open-Meteo recommande d'attendre dix minutes de plus.
- **Échéances dans l'historique** : décalages `_previous_dayN` réellement remplis dans l'API Previous Runs (voir plus bas).
- `dwd_icon_seamless` enchaîne ICON-D2, ICON-EU puis ICON global. Toulon est hors du domaine d'ICON-D2 (`dwd_icon_d2` y répond « No data is available for this location ») : ICON-EU y sert dès la première heure.

### Ce que ça change par rapport au brief

- La liste du brief est **confirmée** (AROME, ARPEGE, IFS, ICON), et **GFS devient un modèle à part entière**, plus une option : sans lui, il ne resterait que deux modèles au-delà de quatre jours.
- **Les modèles de Météo-France ne couvrent pas la fin de semaine** : AROME s'arrête à 51 h, ARPEGE à 102 h. Le nombre de modèles disponibles selon l'échéance :

| Échéance | Modèles disponibles |
|---|---|
| J et J+1 | AROME, ARPEGE, IFS, ICON, GFS |
| J+2 à J+3 | ARPEGE, IFS, ICON, GFS (ARPEGE s'arrête dans la journée de J+4) |
| J+4 à J+6 | IFS, ICON, GFS |

- « Quatre vents » reste juste : quatre fournisseurs (Météo-France, ECMWF, DWD, NOAA), cinq modèles.

### Modèles écartés

| Modèle | Identifiant | Pourquoi |
|---|---|---|
| AROME France HD (1,5 km) | `meteofrance_arome_france_hd` | Ne fournit ni nébulosité ni code météo ; même portée qu'AROME France |
| ARPEGE World (0,25°) | `meteofrance_arpege_world` | Même portée qu'ARPEGE Europe, maille plus grossière (maille à 14,9 km de Toulon) |
| IFS 0,25° open data | `ecmwf_ifs025` | Pas de 3 h, maille de 25 km ; IFS HRES 9 km est disponible. **Repli** si l'historique d'IFS HRES manque (voir plus bas) |
| AIFS | `ecmwf_aifs025_single` | Pas de 6 h, pas de rafales |
| ICON-EU et ICON global séparés | `dwd_icon_eu`, `dwd_icon_global` | Deux entrées très corrélées ; `dwd_icon_seamless` les enchaîne |
| UKMO global 10 km | `ukmo_global_deterministic_10km` | Cinquième fournisseur possible (7 jours, J−1 à J−6 dans l'historique), mais historique troué avant août 2025. **À évaluer dans le backtest M0-03** avant de l'ajouter |
| ICON 2I (ItaliaMeteo), ICON CH2 (MeteoSwiss) | — | Couvrent les deux villes, mais sur 3 et 5 jours seulement ; pas évalués plus loin |

### Changements annoncés côté Open-Meteo

- **30 novembre 2026** : `dwd_icon_global`, `dwd_icon_eu` et `dwd_icon_d2` passent sur les grilles natives du DWD (identifiants `*_native` déjà disponibles). La maille retenue pour chaque ville changera donc légèrement : le biais d'ICON peut bouger ce jour-là, et la correction de biais mettra quelques jours à s'y adapter.
- Les réponses d'IFS HRES utilisent le cycle IFS 50R1 depuis le 12 mai 2026.

## Variables

Noms à passer dans `hourly`. Unités par défaut de l'API, qui sont celles de Quatrauro : aucune conversion à faire côté prévisions.

| Variable du brief | Nom Open-Meteo | Unité | Valeur | Modèles qui ne la fournissent pas |
|---|---|---|---|---|
| Température à 2 m | `temperature_2m` | °C | instantanée | — |
| Température ressentie | `apparent_temperature` | °C | instantanée, calculée par Open-Meteo | — |
| Précipitations | `precipitation` | mm | cumul de l'heure écoulée | — |
| Probabilité de précipitations | `precipitation_probability` | % | — | AROME, ARPEGE |
| Vent moyen | `wind_speed_10m` | km/h | instantané | — |
| Rafales | `wind_gusts_10m` | km/h | maximum de l'heure écoulée | IFS HRES **dans l'historique seulement** (présent en prévision) |
| Direction du vent | `wind_direction_10m` | ° | instantanée | — |
| Nébulosité | `cloud_cover` | % | instantanée | (AROME France HD, écarté) |
| Code météo OMM | `weather_code` | code OMM | calculé par Open-Meteo | (AROME France HD, écarté) |
| Humidité relative | `relative_humidity_2m` | % | instantanée | — |

- `precipitation_probability` n'est pas une sortie des modèles déterministes : la documentation précise qu'elle vient toujours des prévisions d'ensemble. Quatrauro **ne l'utilise pas** : la probabilité de pluie se calcule à partir de l'accord entre modèles (brief § 5.3).
- `weather_code` est calculé par Open-Meteo, pas par les services météo. La condition affichée se dérive des champs mélangés (brief § 5.3), pas de ce code.
- Les heures des réponses sont en UTC avec `timezone=GMT`. Avec `forecast_days=7`, la série commence à 00 h UTC du jour courant et compte 168 heures ; les heures hors de portée d'un modèle valent `null`.

## Historique des prévisions

Trois API d'Open-Meteo donnent des prévisions passées. Elles n'ont pas le même usage.

| API | Endpoint | Ce qu'elle donne | Profondeur | Usage |
|---|---|---|---|---|
| **Previous Runs** | `https://previous-runs-api.open-meteo.com/v1/forecast` | Pour chaque heure, la valeur prévue 1 à 7 jours plus tôt (`<variable>_previous_day1` à `_previous_day7`) | « La plupart des modèles depuis janvier 2024 » | **Backtest (M0-03) et amorçage (M1-10)** |
| Single Runs | `https://single-runs-api.open-meteo.com/v1/forecast` (paramètre `run`) | Un run complet, toutes échéances | Depuis le 2 avril 2026 pour la plupart des modèles ; IFS HRES depuis le 14 mars 2024 | Trop récent pour 12 mois de backtest |
| Historical Forecast | `https://historical-forecast-api.open-meteo.com/v1/forecast` | Les premières heures de chaque run mises bout à bout (échéance proche de zéro) | Selon le modèle : 2017 pour IFS HRES, novembre 2022 pour ICON, janvier 2024 pour AROME France | Pas un historique par échéance ; utilisable comme repli d'observation |

Profondeur **mesurée** de Previous Runs pour Toulon, température à 2 m, du 1er janvier 2024 au 16 novembre 2026 :

| Modèle | Échéances remplies | Depuis | Trous |
|---|---|---|---|
| AROME France | J−1 seulement | 19 janvier 2024 | aucun notable |
| ARPEGE Europe | J−1 à J−3 | 19 janvier 2024 | aucun notable |
| ICON (`dwd_icon_seamless`) | J−1 à J−6 | 19 janvier 2024 | avril 2026 à 89 % |
| GFS | J−1 à J−7 | 19 janvier 2024 | aucun notable |
| IFS HRES | J−1 à J−7 | **octobre 2025** | mars 2026 (81 %) et avril 2026 (52 à 69 %) |
| IFS 0,25° | J−1 à J−7 | février 2024 | aucun notable |
| UKMO global | J−1 à J−6 | août 2024 | nombreux jusqu'en juillet 2025, puis avril–mai 2026 |

Conséquences pour le backtest et pour le mélange :

- `_previous_dayN` est la valeur prévue **exactement N × 24 h avant l'heure de validité**. Les échéances se mesurent donc en jours pleins, ce qui correspond aux tranches du brief.
- **L'historique s'arrête plus tôt que la prévision en direct** : ICON n'a pas de J−7, ARPEGE pas de J−4, AROME pas de J−2. Une tranche d'échéance n'est vérifiable que jusqu'à ce que l'historique contient.
- Avec IFS HRES, on dispose d'environ **13 mois** (octobre 2025 à novembre 2026), dans la fourchette de 6 à 12 mois demandée par M0-03. Pour remonter plus loin, il faudrait remplacer IFS HRES par IFS 0,25°.
- Les rafales d'IFS HRES sont absentes de l'historique : IFS ne peut pas être vérifié sur les rafales par cette voie.

## Conditions d'usage d'Open-Meteo

- **Usage non commercial** uniquement sur l'accès gratuit, sans clé. Sont cités comme non commerciaux les sites et apps privés sans abonnement ni publicité : c'est le cas de Quatrauro.
- **Quotas** : moins de 10 000 appels par jour, 5 000 par heure, 600 par minute (et 300 000 par mois d'après le tableau des offres). Les limites s'appliquent par adresse IP.
- **Décompte** : une requête compte pour plus d'un appel au-delà de 10 variables ou de 2 semaines de données (15 variables sur 2 semaines = 1,5 appel ; 4 semaines = 3 appels). La documentation ne dit pas comment se comptent plusieurs modèles dans une même requête : les estimations ci-dessous supposent, par prudence, qu'une variable demandée pour cinq modèles en vaut cinq.
- **Licence des données** : CC BY 4.0. Il faut créditer la source, donner un lien vers la licence et indiquer les modifications.
- Les appels aux métadonnées (`meta.json`) ne comptent pas dans les quotas.

Estimations (hypothèse prudente ci-dessus) :

| Usage | Calcul | Appels |
|---|---|---|
| Un passage du pipeline | 2 villes × (9 variables × 5 modèles) ÷ 10 | ≈ 9 |
| Une journée à 4 passages | 4 × 9 | ≈ 36, soit 0,4 % du quota quotidien |
| Un backtest complet sur 12 mois | 2 villes × 5 modèles × (8 variables × 7 échéances ÷ 10) × (365 ÷ 14) | ≈ 1 500 |

Le backtest tient dans le quota horaire s'il est lancé une fois ; ses réponses sont mises en cache sur disque pour ne pas refaire les appels à chaque essai de paramètres.

## Observations

### Source retenue

Jeu de données **« Données climatologiques de base — horaires »** de Météo-France, publié sur data.gouv.fr (meteo.data.gouv.fr).

| | |
|---|---|
| Accès | Fichiers CSV compressés, en HTTPS, **sans clé ni compte** |
| Découpage | Un fichier par département et par période |
| Fichiers utiles | `H_83_latest-2025-2026.csv.gz` (Var), `H_06_latest-2025-2026.csv.gz` (Alpes-Maritimes), environ 20 Mo chacun |
| Adresse | `https://meteofrance.s3.sbg.io.cloud.ovh.net/data/synchro_ftp/BASE/HOR/<fichier>` |
| Licence | Licence Ouverte 2.0 (Etalab), sans redevance ; source à indiquer : « Météo-France » |
| Mise à jour | Quotidienne pour les deux dernières années, mensuelle pour 2020–2024 |
| Délai mesuré | Fichiers modifiés le 17/11/2026 vers 06 h 45 UTC, dernière mesure à 03 h ou 04 h UTC le même jour : **3 heures de retard à la publication, donc jusqu'à 27 heures entre deux mises à jour** |
| Profondeur | Depuis l'ouverture de chaque station (fichiers par décennie) |
| Heures | UTC en métropole |
| Qualité | Chaque valeur a un code : `0` protégée, `1` validée, `2` douteuse, `9` filtrée (contrôles de premier niveau). Le 17/11/2026, les 9 dernières heures de TOULON étaient en `9`, toutes les autres en `1` |

Le nom du fichier « latest » porte ses années (`2025-2026`) : **il changera au 1er janvier**. L'adresse courante se lit dans la fiche du jeu de données (`https://www.data.gouv.fr/api/1/datasets/donnees-climatologiques-de-base-horaires/`) plutôt que de la construire à la main.

### Stations de référence

| Ville | Station | Numéro | Position | Altitude | Distance au point de prévision |
|---|---|---|---|---|---|
| Toulon | TOULON | `83137001` | 43,1140 N, 5,9005 E | 3 m | 2,8 km |
| Nice | NICE | `06088001` | 43,6488 N, 7,2090 E | 2 m | 7,3 km |

Remplissage mesuré du 1er janvier 2025 au 17 novembre 2026 (16 445 heures) :

| Station | T | RR1 | FF | DD | FXI | U | N (nébulosité) |
|---|---|---|---|---|---|---|---|
| TOULON `83137001` | 100 % | 100 % | 99 % | 99 % | 100 % | 100 % | **0 %** |
| NICE `06088001` | 100 % | 100 % | 99 % | 99 % | 100 % | 100 % | 99 % |

Pourquoi ces deux stations :

- **TOULON** est la station complète la plus proche du centre (2,8 km), au niveau de la mer comme lui. Les suivantes sont incomplètes (CAP CEPET : vent seul, à 115 m) ou trop loin (HYÈRES à 17,8 km, LE CASTELLET-AÉRO à 417 m d'altitude).
- **NICE** (aéroport) est plus loin du centre que NICE-RIMIEZ (4,7 km), mais Rimiez est à 238 m d'altitude, sur une colline : elle ne représente pas le bord de mer. NICE est au niveau de la mer et c'est la seule des deux à mesurer la nébulosité.

Limite connue : la station de Nice est sur la plateforme de l'aéroport, entourée d'eau et exposée à la brise de la vallée du Var. La prévision corrigée décrit donc le temps **à la station**, à 7 km du centre.

### Variables et conversions

Les observations ne sont pas dans les unités de Quatrauro : la conversion se fait une seule fois, à l'entrée du pipeline (AGENTS.md).

| Variable du brief | Champ | Unité du fichier | Conversion |
|---|---|---|---|
| Température à 2 m | `T` | °C | — |
| Précipitations | `RR1` | mm sur l'heure écoulée | — |
| Vent moyen | `FF` | m/s (moyenne sur 10 min, à 10 m) | × 3,6 |
| Direction | `DD` | ° (rose de 360) | — |
| Rafales | `FXI` | m/s (maximum instantané de l'heure) | × 3,6 |
| Humidité | `U` | % | — |
| Nébulosité | `N` | octas (9 = ciel invisible) | × 12,5, et 9 → `null` |

- L'heure d'une ligne (`AAAAMMJJHH`) est l'heure UTC de la mesure ; `RR1` et `FXI` portent sur l'heure qui la précède, comme `precipitation` et `wind_gusts_10m` côté Open-Meteo.
- **La nébulosité n'est pas mesurée à Toulon.** Elle n'est donc ni corrigée ni pondérée par l'observation dans cette ville : le traitement à retenir (poids égaux, ou poids appris sur la température) est un point du spike M0-03.
- La température ressentie n'est pas observée : elle reste une valeur dérivée, sans vérification (brief § 5.3).

### Autres accès, non retenus

| Accès | Pourquoi il n'est pas retenu |
|---|---|
| API de Météo-France (portail-api.meteofrance.fr : observations en temps réel, DPClimatologie) | Demande un compte et une clé. Non testée dans ce spike. Elle ne devient utile que si un retard de 27 h gêne, ce qui n'est pas le cas d'une vérification quotidienne |
| Données 6 minutes (data.gouv.fr) | Même accès sans clé, mais pas plus fin que nécessaire |
| Archive SYNOP OMM (data.gouv.fr) | Mesures toutes les 3 heures seulement |

### Repli

Si les fichiers de Météo-France devenaient inaccessibles, la référence de repli serait une analyse de modèle : la série `temperature_2m` de l'API Historical Forecast d'Open-Meteo (les premières heures de chaque run) ou la réanalyse de l'API Historical Weather. On y perdrait l'essentiel : en bord de mer, une analyse sur une maille de plusieurs kilomètres lisse la brise et l'effet de la mer, et l'on corrigerait un modèle avec un autre modèle. Le repli ne vaudrait donc que pour dépanner, avec une fiabilité affichée plus basse.

## Attributions

À afficher dans l'écran « À propos des données » (M3-03) :

- **Prévisions** : « Données météo par [Open-Meteo.com](https://open-meteo.com/) », licence [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), avec la mention que les données sont corrigées et combinées par Quatrauro.
- **Modèles** : Météo-France (AROME, ARPEGE), ECMWF (IFS), Deutscher Wetterdienst (ICON), NOAA NCEP (GFS).
- **Observations** : « Source : Météo-France », [Licence Ouverte 2.0](https://www.etalab.gouv.fr/licence-ouverte-open-licence).

## Fixtures

Des réponses réelles sont dans [`pipeline/__fixtures__/`](../../pipeline/__fixtures__/README.md), pour les tests de M1-07 (prévisions) et de M1-08 (observations).

## Pages consultées

Toutes consultées le 17 novembre 2026.

| Sujet | Page |
|---|---|
| Conditions, quotas, usage non commercial | https://open-meteo.com/en/terms |
| Décompte des appels | https://open-meteo.com/en/pricing |
| Licence et attribution | https://open-meteo.com/en/licence |
| API de prévision, sélection de maille, variables | https://open-meteo.com/en/docs |
| AROME et ARPEGE | https://open-meteo.com/en/docs/meteofrance-api |
| IFS | https://open-meteo.com/en/docs/ecmwf-api |
| ICON, passage aux grilles natives | https://open-meteo.com/en/docs/dwd-api |
| GFS | https://open-meteo.com/en/docs/gfs-api |
| Previous Runs | https://open-meteo.com/en/docs/previous-runs-api |
| Single Runs | https://open-meteo.com/en/docs/single-runs-api |
| Historical Forecast | https://open-meteo.com/en/docs/historical-forecast-api |
| Mises à jour des modèles, métadonnées | https://open-meteo.com/en/docs/model-updates |
| Données horaires de Météo-France | https://www.data.gouv.fr/datasets/donnees-climatologiques-de-base-horaires |
| Descriptif des champs | https://meteofrance.s3.sbg.io.cloud.ovh.net/data/synchro_ftp/BASE/HOR/H_descriptif_champs.csv |
| Documentation des données climatologiques, licence | https://confluence-meteofrance.atlassian.net/wiki/spaces/OpenDataMeteoFrance/pages/621510657/Donn+es+climatologiques |

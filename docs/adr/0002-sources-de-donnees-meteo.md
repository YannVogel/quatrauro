# ADR 0002 — Sources de données météo

- **Statut** : acceptée (spike M0-02 terminé le 17 novembre 2026 ; les coordonnées et les stations ont été tranchées en l'absence de Yann, qui peut y revenir : voir l'issue)
- **Date** : 2026-11-17
- **Issue** : [#4](https://github.com/YannVogel/quatrauro/issues/4) (M0-02)

## Contexte

Quatrauro a besoin de deux choses : les prévisions de plusieurs modèles, accessibles séparément, et des observations fiables pour Toulon et Nice, qui servent de vérité terrain. L'usage est personnel et non commercial. Le backtest (M0-03) a en plus besoin d'un historique des prévisions passées, par échéance.

Le spike M0-02 a vérifié chaque point dans la documentation et par des appels réels. Le détail (tableaux, mesures, pages consultées) est dans [docs/features/donnees.md](../features/donnees.md).

## Décision

### Prévisions : Open-Meteo, cinq modèles de quatre fournisseurs

| Modèle | Fournisseur | Identifiant Open-Meteo | Portée utile |
|---|---|---|---|
| AROME France | Météo-France | `meteofrance_arome_france` | J et J+1 (51 h) |
| ARPEGE Europe | Météo-France | `meteofrance_arpege_europe` | jusqu'à J+3 (102 h) |
| IFS HRES | ECMWF | `ecmwf_ifs` | 7 jours et plus |
| ICON | DWD | `dwd_icon_seamless` | 7 jours |
| GFS | NOAA | `ncep_gfs_global` | 7 jours et plus |

- **GFS n'est plus une option** : au-delà de J+3, il ne reste que les trois modèles globaux, et sans GFS il n'en resterait que deux.
- La probabilité de pluie d'Open-Meteo (`precipitation_probability`) n'est pas utilisée : elle vient de prévisions d'ensemble, pas des modèles retenus.
- La sélection de maille reste celle par défaut (`cell_selection=land`), jamais désactivée.

### Points de prévision : les centres-villes

Toulon : 43,1257 N, 5,9304 E. Nice : 43,6973 N, 7,2702 E. Pour chacun, la maille retenue par chaque modèle est terrestre (altitude de 13 à 276 m selon le modèle).

### Observations : fichiers horaires publics de Météo-France

Jeu « Données climatologiques de base — horaires » (data.gouv.fr), en CSV, **sans clé**, sous Licence Ouverte 2.0, mis à jour chaque jour.

| Ville | Station | Numéro | Altitude | Distance au point de prévision |
|---|---|---|---|---|
| Toulon | TOULON | `83137001` | 3 m | 2,8 km |
| Nice | NICE (aéroport) | `06088001` | 2 m | 7,3 km |

### Historique : l'API Previous Runs d'Open-Meteo

Elle donne, pour chaque heure, la valeur prévue 1 à 7 jours plus tôt. Tous les modèles retenus y sont depuis janvier 2024, sauf IFS HRES (octobre 2025). Le backtest dispose donc d'environ treize mois avec les cinq modèles.

### Aucun secret

Ni Open-Meteo ni les fichiers de Météo-France ne demandent de clé : le pipeline n'a besoin d'aucun secret pour lire ses données. L'étape « créer la clé d'accès aux observations » de M0-01 est sans objet.

## Alternatives écartées

- **Appeler directement chaque service météo national** : formats lourds (GRIB), un client par fournisseur. À reconsidérer seulement si Open-Meteo ne suffit pas ou si l'usage devient commercial.
- **Agréger des API météo grand public** (qui renvoient déjà une prévision finale) : on ne sait pas quels modèles sont derrière, donc on ne peut ni les corriger ni les pondérer proprement.
- **Demander les prévisions aux coordonnées des stations** plutôt qu'au centre-ville : le point de prévision coïnciderait avec le point de vérification, mais la station de Nice est sur la plateforme de l'aéroport, entourée d'eau, où les modèles à maille large tombent en mer. La correction de biais absorbe l'écart entre le centre et la station.
- **NICE-RIMIEZ comme station de Nice** : plus proche du centre (4,7 km), mais à 238 m d'altitude et sans mesure de nébulosité.
- **L'API de Météo-France à clé** (observations en temps réel) : un compte, une clé et un secret à gérer, pour gagner un délai dont une vérification quotidienne n'a pas besoin. Non testée.
- **AROME France HD, ARPEGE World, IFS 0,25°, AIFS, ICON-EU et ICON global séparés** : voir le tableau des modèles écartés dans la fiche.
- **UKMO global** : candidat sérieux (cinquième fournisseur, 7 jours), mais son historique est troué avant août 2025. À évaluer dans le backtest M0-03 avant de l'ajouter.

## Conséquences

- **Dépendance à un seul intermédiaire** pour les prévisions : une panne d'Open-Meteo arrête le pipeline. L'app continue d'afficher la dernière prévision, datée.
- **L'accès gratuit est limité à un usage non commercial**, avec attribution (CC BY 4.0), et à 10 000 appels par jour. Un passage du pipeline en consomme une dizaine, un backtest complet environ 1 500. Toute diffusion publique ou commerciale impose de revoir ce point.
- **Le nombre de modèles baisse avec l'échéance** : cinq à J+1, quatre jusqu'à J+3, trois au-delà. Le mélange et l'indice de fiabilité doivent en tenir compte, et l'app doit le montrer.
- **L'historique est plus court que la prévision** : AROME n'y est vérifiable qu'à J−1, ARPEGE jusqu'à J−3, ICON jusqu'à J−6. Les rafales d'IFS n'y figurent pas.
- **Les observations arrivent avec un retard de 3 à 27 heures.** La vérification est donc quotidienne, pas horaire, et le pipeline télécharge deux fichiers d'environ 20 Mo par jour.
- **La nébulosité n'est pas mesurée à Toulon** : elle ne peut pas y être corrigée par l'observation. Traitement à fixer en M0-03.
- **Le nom du fichier d'observations change chaque année** (`latest-2025-2026`) : le pipeline doit lire l'adresse dans la fiche du jeu de données.
- **ICON change de grille le 30 novembre 2026** chez Open-Meteo : son biais local peut bouger ce jour-là.
- **La prévision corrigée décrit le temps à la station**, pas exactement au centre-ville : à dire dans « À propos des données ».

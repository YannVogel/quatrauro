# Détail d'un jour

L'accueil dit l'essentiel ; le détail répond à « à quelle heure, exactement ? » et montre où les modèles divergent. Maquette : `riviera-jour` ([spécification](../design/riviera.md)).

| Fichier | Rôle |
|---|---|
| `app/day/[date].tsx` | La route : `/day/2026-11-19` |
| `src/features/forecast/components/DayScreen.tsx` | L'écran |
| `src/features/forecast/day.ts` | Fonction pure : ce que l'écran affiche, tiré de la prévision |
| `…/DayHero.tsx`, `…/DisagreementCard.tsx` | Le bloc du jour, la carte de désaccord |

## Ce que montre l'écran

1. **En-tête** : le jour (« Jeudi 19 novembre »), la ville, le retour à l'accueil.
2. **Bloc du jour** : maximum (en grand) et minimum, rond et couleur de la condition, nom de la condition, résumé du jour s'il y en a un (« Pluie jusqu'à 6 h »), pastille « Fiabilité 51 % » suivie de « 5 modèles couvrent ce jour ».
3. **Heure par heure** : une colonne toutes les trois heures (0 h, 3 h… 21 h, heure de Paris), avec la température en chiffres et le risque de pluie en barre.
4. **Quatre vignettes** : vent moyen le plus fort, cumul de pluie, humidité moyenne, ressenti le plus élevé.
5. **Carte de désaccord**, quand les modèles divergent.
6. L'heure de mise à jour, et le bandeau « Prévision ancienne » ou « Mise à jour impossible » le cas échéant.

L'écran suit la ville courante et l'instant présent : il est disponible pour aujourd'hui et les jours à venir.

## La carte de désaccord

Elle montre ce que dit **chaque modèle qui couvre le jour**, sur la grandeur où ils divergent. Un modèle couvre un jour s'il en donne au moins 75 % des heures (la règle des agrégats quotidiens) : au-delà de sa portée, il n'apparaît pas.

| Ordre | Condition | Carte |
|---|---|---|
| 1 | Au moins un modèle annonce de la pluie (0,2 mm dans une heure), et soit un autre reste sec, soit leurs débuts de pluie s'écartent d'au moins **2 heures** | « Début de la pluie selon les modèles » : l'heure de chacun, ou « pas de pluie » |
| 2 | Leurs températures maximales s'écartent d'au moins **2 °C** | « Température maximale selon les modèles » |
| 3 | Sinon, ou si un seul modèle couvre le jour | Pas de carte |

La pluie passe d'abord : c'est elle qui change les plans de la journée. Les seuils sont dans `src/lib/config.ts`.

Les températures de chaque modèle sont celles du fichier publié, donc **corrigées de leur biais**. Le vent n'y figure pas modèle par modèle : la carte ne peut pas porter sur le vent, contrairement à ce qu'envisageait la spécification.

## Cas limites

| Cas | Comportement |
|---|---|
| Jour passé, jour absent de la prévision, adresse qui n'est pas un jour | « Ce jour n'est plus dans la prévision », avec le retour |
| Aujourd'hui | Toutes les heures du jour sont montrées, y compris celles déjà passées : c'est le déroulé de la journée, pas une liste d'heures à venir |
| Première heure d'aujourd'hui | Elle peut manquer (les séries d'Open-Meteo commencent à 0 h UTC) : la colonne « 0 h » n'apparaît alors pas |
| Valeur absente | « — » à l'écran, « indisponible » pour les lecteurs d'écran |
| Jour sans condition | Bloc de la couleur par défaut, sans rond, « Condition indisponible » |
| Chargement, rien à montrer | Les mêmes états que l'accueil ([fraîcheur](fraicheur-et-etats.md)) |

## Ce qui n'est pas construit

- **Le passage au jour précédent ou suivant par un geste** : l'issue le demandait « si c'est simple ». On revient à l'accueil pour changer de jour.
- **Le pas horaire au défilement** : le graphique reste au pas de trois heures de la maquette.

## Accessibilité

- Le graphique se lit d'une traite, colonne par colonne : « 0 heure : 15 degrés, risque de pluie 20 % ; 3 heures : … ».
- Le maximum et le minimum se lisent ensemble : « maximum 17 degrés, minimum 13 degrés ».
- Chaque ligne de la carte se lit : « IFS, pluie dès 2 heures », « GFS, pas de pluie ».
- Chaque vignette se lit avec son libellé : « Cumul, 8 mm ».

## Tests

- `src/features/forecast/__tests__/day.test.ts` : sur un vrai fichier publié. Colonnes à l'heure de Paris, chiffres clés, jour passé ou absent ; désaccord sur la pluie (jeudi 19, réel), jour lointain à trois modèles (dimanche 22, réel), accord (mercredi 18, réel), modèle qui reste sec, écart d'une heure non retenu, désaccord sur la température, modèle seul.
- `__tests__/app.test.tsx` : l'écran dans l'app entière. Jour de pluie, jour sec, jour lointain, valeurs indisponibles, libellé du graphique, jour absent, ville courante.

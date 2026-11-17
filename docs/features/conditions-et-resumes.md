# Conditions et résumés

L'accueil affiche une **condition** (« Ciel dégagé », « Averses ») pour chaque heure et chaque jour, et le détail d'un jour une **phrase** (« Pluie dès 15 h »). Les deux découlent des champs mélangés par des règles fixes, écrites dans `shared/` et calculées par le pipeline. Pas d'IA générative, pas de texte libre.

| Fichier | Rôle |
|---|---|
| `shared/conditions.ts` | La liste fermée des huit conditions (M0-10) |
| `shared/blend/condition.ts` | Condition d'une heure, condition d'un jour, orage annoncé par les modèles |
| `shared/blend/summary.ts` | Résumé d'un jour |
| `shared/texts/fr.ts` | La table des phrases : aucune phrase n'est assemblée ailleurs |
| `shared/sun.ts` | Jour ou nuit, par la hauteur du soleil |
| `shared/blendConfig.ts` | Tous les seuils (`condition`, `summary`, et les seuils d'annonce de pluie de `rain`) |

## Ce qu'est une heure ou un jour « de pluie »

C'est le point de départ de toutes les règles : **la pluie suit l'annonce de pluie**, celle que le backtest a réglée et que l'indice de fiabilité juge.

- Une heure est pluvieuse quand sa probabilité de pluie atteint **20 %** (`rain.hourlyAnnouncement`).
- Un jour est pluvieux quand sa probabilité de pluie atteint **30 %** (`rain.dailyAnnouncement`).

Le cumul prévu n'entre pas dans la règle : la moyenne de cinq modèles donne presque toujours quelques dixièmes de millimètre, et c'est justement pour cela que la probabilité a été calibrée.

Conséquence voulue : **un jour sec n'annonce jamais de pluie, et un jour de pluie n'annonce jamais un temps sec**, ni par sa condition ni par son résumé. Les tests le vérifient pour toutes les combinaisons.

## Condition d'une heure

`hourCondition(hour, settings)`. La première règle qui s'applique l'emporte.

| Ordre | Règle | Condition |
|---|---|---|
| 1 | Pas de probabilité de pluie | aucune (`null`) |
| 2 | Heure pluvieuse, et une majorité de modèles annonce un orage | `thunderstorm` |
| 3 | Heure pluvieuse, température de 1 °C ou moins (`snowUpTo`) | `snow` |
| 4 | Heure pluvieuse, nébulosité sous 75 % | `showers` |
| 5 | Heure pluvieuse, ciel couvert ou nébulosité inconnue | `rain` |
| 6 | Vent moyen d'au moins 40 km/h (`strongWind`) ou rafales d'au moins 60 km/h (`strongGusts`) | `windy` |
| 7 | Nébulosité inconnue | aucune (`null`) |
| 8 | Nébulosité sous 25 % (`clearBelow`) | `clear` |
| 9 | Nébulosité sous 75 % (`cloudyFrom`) | `partlyCloudy` |
| 10 | Nébulosité de 75 % ou plus | `cloudy` |

- **Orage** : il ne se déduit d'aucun champ mélangé. `announcesThunderstorm(codes)` lit le code météo de chaque modèle (codes OMM 95, 96, 97 et 99 chez Open-Meteo) et répond oui quand une **majorité stricte** des modèles qui donnent un code annoncent un orage. Un orage annoncé sur une heure sèche ne change rien : la règle 2 demande une heure pluvieuse.
- **Jour ou nuit** : ce n'est pas une condition. `isNight(instant, lieu)` (`shared/sun.ts`) dit si le soleil est couché, et l'app choisit l'icône (soleil ou lune). Le calcul retrouve, à quatre minutes près, les heures de lever et de coucher d'Open-Meteo (vérifié par test sur six relevés réels, aux deux points de prévision).
- **Vent fort** : il passe après la pluie. Une heure de pluie avec du vent reste « Pluie ».

## Condition d'un jour

`dayCondition({ precipitationProbability, hours }, settings)`, par dominance, à partir des conditions des heures du jour civil de Paris.

**Jour pluvieux** (probabilité du jour d'au moins 30 %) :

| Ordre | Règle | Condition |
|---|---|---|
| 1 | Au moins une heure d'orage | `thunderstorm` |
| 2 | Au moins la moitié des heures pluvieuses sont de la neige | `snow` |
| 3 | Au moins 6 heures pluvieuses (`lastingRainHours`) | `rain` |
| 4 | Moins de 6 heures pluvieuses, ou aucune | `showers` |

**Jour sec**, sur les seules heures de jour (le ciel de la nuit ne décide pas du temps de la journée) :

| Ordre | Règle | Condition |
|---|---|---|
| 1 | Au moins 3 heures de vent fort (`windyHours`) | `windy` |
| 2 | Nébulosité moyenne, avec les mêmes seuils que pour une heure | `clear`, `partlyCloudy` ou `cloudy` |
| 3 | Aucune nébulosité connue | aucune (`null`) |

Sans probabilité de pluie pour le jour, il n'y a pas de condition.

## Résumé d'un jour

`daySummary({ condition, windGustsMax, hours }, settings)` rend au plus une phrase, ou `null` quand il n'y a rien à ajouter à la condition. Les heures citées sont celles de **Paris** (`parisHour`, `shared/parisTime.ts`), été comme hiver.

**Jour pluvieux** (`rain`, `showers`, `thunderstorm`). La première règle qui s'applique l'emporte ; « première » et « dernière » désignent la première et la dernière heure pluvieuse du jour.

| Ordre | Règle | Phrase |
|---|---|---|
| 1 | Une heure d'orage | Orage vers 17 h |
| 2 | Aucune heure pluvieuse (les modèles ne s'accordent pas sur l'heure) | Risque d'averses dans la journée |
| 3 | Une seule heure pluvieuse | Averse vers 16 h |
| 4 | Première à 18 h ou après (`eveningFrom`) | Matinée sèche, soirée arrosée |
| 5 | Plus d'heures sèches que pluvieuses entre la première et la dernière | Averses entre 9 h et 19 h |
| 6 | Première à 7 h ou avant (`earlyUntil`), dernière avant 18 h | Pluie jusqu'à 11 h |
| 7 | Première après 7 h, dernière à 21 h ou après (`lateFrom`) | Pluie dès 15 h |
| 8 | Au moins 12 heures pluvieuses (`mostOfDayHours`) | Pluie une grande partie de la journée |
| 9 | Sinon | Pluie entre 10 h et 16 h |

**Jour sec** (`clear`, `partlyCloudy`, `cloudy`, `windy`) :

| Ordre | Règle | Phrase |
|---|---|---|
| 1 | Rafales du jour d'au moins 60 km/h | Rafales jusqu'à 85 km/h |
| 2 | Matinée (6 h à 12 h) dégagée, après-midi (12 h à 18 h) couvert | Matinée ensoleillée, après-midi nuageux |
| 3 | Matinée couverte, après-midi dégagé | Matinée nuageuse, après-midi ensoleillé |
| 4 | Sinon | aucune (`null`) |

Un jour sans condition n'a pas de résumé. Un jour de **neige** non plus : les phrases parlent de pluie, et la condition « Neige » dit déjà l'essentiel.

## Cas limites et limites connues

- **Une heure pluvieuse dans un jour sec.** Les deux annonces sont calibrées séparément : une heure peut atteindre 20 % un jour qui reste sous 30 %. La vignette de l'heure montre alors de la pluie, le jour reste sec et son résumé ne parle pas de pluie.
- **Un jour pluvieux sans heure pluvieuse.** Les modèles annoncent de la pluie mais pas à la même heure : le jour est « Averses » et son résumé « Risque d'averses dans la journée ».
- **L'heure citée est celle de la vignette.** Le cumul d'une heure est celui de l'heure écoulée : la pluie de la vignette « 15 h » tombe entre 14 h et 15 h. Le résumé cite l'heure de la vignette, pour dire la même chose que l'écran ; l'écart est d'une heure au plus, en deçà de ce que les modèles savent situer.
- **Jours de changement d'heure.** Un jour de 25 heures a deux heures « 2 h » : elles comptent toutes les deux comme heures pluvieuses.
- **La brume, le brouillard, la grêle** ne sont pas reconnus : aucun champ mélangé ne les donne.
- **Les seuils n'ont pas été réglés sur des observations.** La nébulosité n'est mesurée qu'à Nice, et ni l'orage ni le vent fort ne sont vérifiés par le backtest. Les seuils sont des conventions (octas pour le ciel, échelle de Beaufort pour le vent), à ajuster à l'usage.

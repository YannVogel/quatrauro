# Écran « Les modèles »

La prévision combinée ne vaut que si l'on peut voir d'où elle vient. Cet écran montre, pour un jour, ce que dit chaque modèle, combien il pèse dans le mélange, et de combien il s'est trompé récemment. Maquette : `riviera-modeles` ([spécification](../design/riviera.md)).

| Fichier | Rôle |
|---|---|
| `app/models.tsx` | La route : `/models` |
| `src/features/models/components/ModelsScreen.tsx` | L'écran |
| `src/features/models/models.ts` | Fonction pure : ce que l'écran affiche, tiré des deux fichiers publiés |
| `src/features/models/components/ModelErrorsCard.tsx` | La carte des erreurs récentes |

On y arrive par la pastille de fiabilité de l'accueil. **L'app ne calcule rien** : tout vient de `forecast/<ville>.json` et de `verification/<ville>.json`.

## Ce que montre l'écran

1. **Bloc** : le choix du jour (aujourd'hui, demain… jusqu'au dernier jour publié ; **demain par défaut**), le moment comparé (« Demain, 15 h »), la **prévision combinée** de cette heure, et la pastille « Écart 1,8° », l'écart entre le modèle le plus chaud et le plus frais.
2. **Une ligne par modèle**, du plus lourd au plus léger : nom, fournisseur (`shared/models.ts`), poids (barre et pourcentage), température prévue.
3. **Erreur moyenne récente** : celle de la prévision combinée, puis celle de chaque modèle, de la plus petite à la plus grande.
4. **Une phrase** qui explique la pondération.

## Les règles

| Élément | Règle |
|---|---|
| Moment comparé | 15 h, heure de Paris, du jour choisi (`MODELS_REFERENCE_HOUR`). Si cette heure manque, l'heure du jour la plus proche |
| Température d'un modèle | Celle du fichier publié à cette heure : **corrigée de son biais** |
| Poids | Le poids **moyen du modèle dans la température du jour** : le fichier publié ne donne pas les poids heure par heure |
| Pourcentages | Entiers, et **leur somme vaut exactement 100** : chaque poids est arrondi vers le bas, puis les points restants vont aux plus gros restes |
| Écart | Maximum moins minimum des modèles à cette heure ; pas de pastille avec moins de deux modèles |
| Erreurs | Celles du fichier de vérification, à l'échéance du jour (aujourd'hui : prévisions faites jusqu'à 24 h avant ; demain : 24 à 48 h ; etc.). L'erreur d'un modèle est celle de sa valeur **brute** |

## Modèle sans valeur

| Cas | Ce que dit sa ligne |
|---|---|
| Hors de portée (AROME au-delà de deux jours) | « Météo-France · ne va pas jusque-là », sans poids ni température |
| Absent du dernier calcul (`available: false` dans le fichier) | « NOAA · absent du dernier calcul », sans poids ni température |

Les modèles sans poids ferment la liste. Les poids des autres somment toujours à 100 %.

## Cas limites

- **Pas encore de scores** (rien n'a été vérifié, ou le fichier de vérification n'est pas arrivé) : la carte des erreurs dit « Pas encore assez de jours vérifiés pour noter les modèles ».
- **Le jour choisi devient hier** (écran resté ouvert passé minuit) : l'écran revient au jour par défaut.
- **Chargement, rien à montrer, prévision ancienne** : les mêmes états que l'accueil.

## Ce qui n'est pas construit

- **Le choix de la variable** : la température seulement. Le fichier publié ne donne par modèle que la température et la pluie.
- **Le choix de l'heure** : toujours l'après-midi.

## Tests

- `src/features/models/__tests__/models.test.ts` : sur de vrais fichiers publiés. Pourcentages entiers, jour par défaut, demain à cinq modèles (valeurs, poids, écart, erreurs), jour lointain à trois modèles, modèle absent, pas de scores, modèle seul.
- `__tests__/app.test.tsx` : l'écran dans l'app. Ouverture depuis la pastille, lignes et libellés d'accessibilité, erreurs et explication, changement de jour, modèle absent, pas de scores.

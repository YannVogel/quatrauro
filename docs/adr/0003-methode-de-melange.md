# ADR 0003 — Méthode de mélange des modèles

- **Statut** : acceptée (spike M0-03 terminé le 17 novembre 2026 ; le feu vert a été constaté en l'absence de Yann, selon le critère écrit dans l'issue : voir l'issue)
- **Date** : 2026-11-17
- **Issue** : [#5](https://github.com/YannVogel/quatrauro/issues/5) (M0-03)

## Contexte

Faire la moyenne de plusieurs modèles ne suffit pas : chaque modèle a des erreurs systématiques propres à un lieu (un modèle trop chaud en bord de mer, un autre en retard sur les entrées maritimes). Comme Quatrauro ne couvre que deux villes, on peut mesurer ces erreurs chaque jour et les corriger.

Le spike M0-03 a rejoué la méthode sur treize mois de prévisions et d'observations réelles, sans fuite d'information. Le rapport est dans [docs/features/backtest.md](../features/backtest.md), les tableaux complets dans [docs/features/backtest-resultats.md](../features/backtest-resultats.md).

## Décision

### Feu vert

Sur la période de validation (16 mai – 15 novembre 2026), le mélange réduit l'erreur absolue moyenne de température de 8 % à 23 % à Toulon et de 6 % à 27 % à Nice face au meilleur modèle seul désigné sur les 30 jours précédents : le gain dépasse 5 % aux sept échéances, dans les deux villes. La pluie n'est pas dégradée. Le critère de l'issue est atteint : le projet continue.

### Variables continues (température, humidité, vent moyen, rafales)

Pour chaque ville, variable, modèle, tranche d'échéance et heure UTC de la journée :

1. **Correction de biais** : moyenne à pondération exponentielle de l'écart prévision − observation, retranchée de la prévision.
2. **Pondération** : inverse de l'erreur absolue moyenne récente du modèle corrigé, élevé à un exposant, normalisé sur les modèles disponibles.
3. **Mélange** : moyenne pondérée des modèles disponibles à l'échéance.

| Paramètre | Valeur |
|---|---|
| Vitesse d'oubli du biais | demi-vie de 20 jours |
| Fenêtre de l'erreur récente | demi-vie de 60 jours |
| Exposant des poids | 4 |
| Heure de la journée | 24 blocs, un par heure UTC |
| Tranches d'échéance | J+1, J+2, J+3, J+4–5, J+6–7 |
| Historique minimal | 10 paires ; en dessous, pas de correction et poids neutre |
| Erreur plancher | 0,05 (dans l'unité de la variable) |
| Garde-fous des poids | aucun modèle sous 5 % ni au-dessus de 70 % (ajoutés en M1-03 ; sans effet mesurable sur l'erreur du backtest) |
| Délai de publication des observations | 30 heures |

L'erreur récente est une moyenne à pondération exponentielle et non une fenêtre glissante : l'état d'un modèle tient en quatre nombres.

### Nébulosité

Moyenne simple des modèles, sans correction ni pondération, dans les deux villes. À Nice, où elle est mesurée, le mélange pondéré ne fait pas mieux ; à Toulon, elle n'est pas mesurée.

### Pluie

- **Probabilité** : part des modèles qui annoncent de la pluie, rangée en cinq classes, remplacée par la fréquence de pluie observée dans le passé pour cette classe et cette tranche d'échéance (lissée par 5 cas fictifs, après 30 cas au moins).
- **Annonce** : pluie quand la probabilité atteint 30 % à la journée, 20 % à l'heure.
- **Cumul** : moyenne simple des modèles.
- **Seuils** : il pleut dans l'heure à partir de 0,2 mm, dans la journée à partir de 1 mm.

### Indice de fiabilité

Part des jours passés, dans une situation semblable, où la prévision a été tenue. Une situation est la tranche d'échéance, le niveau de désaccord entre modèles (écart-type moyen sur la journée : moins de 0,6 °C, de 0,6 à 0,9 °C, au-delà) et la netteté du signal de pluie (probabilité entre 20 % et 80 %, ou en dehors). Le taux d'une situation rare est tiré vers celui de sa tranche (10 jours fictifs) ; l'indice ne monte jamais quand le désaccord augmente ; il est indisponible avant 30 jours vérifiés.

Proposés, **à valider par Yann** :

- une prévision est « tenue » si le minimum et le maximum du jour sont à moins de 2 °C de l'observé et si l'annonce de pluie est juste ;
- libellés : « Sûr » à partir de 80 %, « Probable » à partir de 60 %, « Incertain » en dessous.

Critère de calibration pour M1-05 : dans chaque classe de dix points d'au moins 50 jours, l'écart entre l'indice moyen et la part des prévisions tenues ne dépasse pas 10 points. Il est rempli sur la période de validation, de justesse : 9,6 points dans la classe 30–40 %, où l'indice est pessimiste, et moins de 6 points ailleurs.

## Alternatives écartées

- **Moyenne simple** : meilleure que n'importe quel modèle brut à longue échéance, mais le mélange fait encore 5 % à 16 % mieux qu'elle en température sur la période de validation.
- **Choisir le meilleur modèle du moment** : c'est la référence du feu vert ; le mélange la bat à toutes les échéances.
- **Apprentissage automatique** (régression, gradient boosting, réseau) : plus de données nécessaires, moins explicable, risque de surapprentissage sur deux villes. À reconsidérer seulement si la méthode simple plafonne.
- **Biais sans distinction d'heure** : erreur supérieure de 3 % en moyenne sur la grille.
- **Fenêtre glissante pour l'erreur récente** : même information qu'une moyenne exponentielle, pour un état bien plus lourd à stocker.
- **Annonce de pluie à 50 % de probabilité** : rate la plupart des pluies (voir le rapport).
- **Ajouter UKMO** : gain de −0,7 % à +1,1 %, dans le bruit.

## Conséquences

- **À Toulon, de J+1 à J+3, l'essentiel du gain vient de la correction de biais** : face à ICON corrigé, le mélange ne gagne que 0,3 % à 2,9 %. L'écran « Fiabilité » compare le mélange au meilleur modèle brut ; ce qu'il montre restera vrai, mais c'est la correction qui porte le résultat à courte échéance.
- **Il faut plusieurs semaines d'historique** avant que biais et poids aient un sens : d'où l'amorçage par l'historique (M1-10), qui peut rejouer les treize mois déjà disponibles.
- **L'état à conserver** est indexé par ville, variable, modèle, tranche et heure : quatre nombres par case pour le biais, autant pour l'erreur.
- **Les valeurs corrigées peuvent sortir de leurs bornes** (vent négatif, humidité au-delà de 100 %) : à borner dans le mélange (M1-04).
- **Les échéances du pipeline ne tombent pas sur des jours pleins** : la règle qui rattache une échéance en heures à une tranche est à fixer en M1.
- **Toulon n'est presque jamais « Sûr »** avec la définition proposée (0 % des jours, contre 51 % à Nice) : tolérance et seuils sont à revoir avec Yann avant M1-05.
- **Le verdict repose sur une année**, dont six mois de validation avec 17 et 16 jours de pluie. Le backtest est à relancer à chaque changement de la logique du mélange, et quand l'historique aura grandi.
- La liste des limites est dans le rapport.

# ADR 0003 — Méthode de mélange des modèles

- **Statut** : proposée (à confirmer par le spike M0-03)
- **Date** : 2026-11-17
- **Issue** : M0-03

## Contexte

Faire la moyenne de plusieurs modèles ne suffit pas : chaque modèle a des erreurs systématiques propres à un lieu (un modèle trop chaud en bord de mer, un autre en retard sur les entrées maritimes). Comme Quatrauro ne couvre que deux villes, on peut mesurer ces erreurs chaque jour et les corriger.

## Décision

Proposition, à confirmer et à paramétrer par le backtest :

1. **Correction de biais** par ville, variable, modèle et tranche d'échéance, suivie par une moyenne mobile à pondération exponentielle.
2. **Pondération** de chaque modèle en raison inverse de son erreur absolue moyenne récente, après correction.
3. **Mélange** par moyenne pondérée des modèles disponibles à chaque échéance.
4. **Indice de fiabilité** à partir de l'écart entre modèles, de l'échéance et de l'erreur historique.

La méthode est volontairement simple et explicable. Le mélange est toujours évalué contre le meilleur modèle seul sur la même période.

## Alternatives écartées

- **Moyenne simple** : sert de référence dans le backtest, pas de méthode.
- **Apprentissage automatique** (régression, gradient boosting, réseau) : plus de données nécessaires, moins explicable, risque de surapprentissage sur deux villes. À reconsidérer seulement si la méthode simple plafonne.
- **Choisir le meilleur modèle du moment** : instable, et perd l'information des autres.

## Conséquences

- Il faut plusieurs semaines d'historique avant que les poids aient un sens : d'où l'amorçage par l'historique (M1-10).
- La pluie se prête mal à une moyenne : son traitement (probabilité issue de l'accord entre modèles, calibration) est un point à part du spike.
- **Feu vert** : si le backtest ne montre pas de gain net sur le meilleur modèle seul, le projet est remis en question avant d'aller plus loin.

## À établir par le spike

Gain mesuré par variable et par échéance ; valeurs retenues pour la fenêtre, la vitesse d'oubli, l'exposant des poids et le découpage des tranches ; intérêt de tenir compte de l'heure de la journée ; traitement de la pluie ; formule et calibration de l'indice de fiabilité.

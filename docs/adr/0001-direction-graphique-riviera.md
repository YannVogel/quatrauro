# ADR 0001 — Direction graphique « Riviera »

- **Statut** : acceptée
- **Date** : 2026-11-17
- **Issue** : —

## Contexte

Avant d'écrire du code, cinq directions ont été maquettées sur l'écran d'accueil de Toulon, chacune en thème clair et sombre : Instrument (tableau de bord technique), Bulletin (tout en texte), Riviera (aplats colorés et formes rondes), Bandes (la semaine en bandes horaires) et Calme (minimal). L'app est un outil personnel, ouvert chaque matin.

## Décision

La direction retenue est **Riviera** : un grand bloc d'état coloré, un chiffre très grand, un rond jaune pour le soleil, des cartes blanches très arrondies, la typographie Outfit. Les thèmes clair et sombre sont tous deux livrés. La spécification est dans [docs/design/riviera.md](../design/riviera.md), les maquettes dans [docs/design/claude-design/](../design/claude-design/).

## Alternatives écartées

- **Bandes** : la plus riche en information (quand il pleut, et à quel point y croire), mais plus austère.
- **Instrument** : la plus transparente sur la mécanique, trop dense pour un usage quotidien.
- **Bulletin** : rapide à lire, mais repose sur une phrase générée de qualité.
- **Calme** : agréable, mais cache ce qui fait l'intérêt de l'app.

## Conséquences

- Riviera ressemble davantage à une app météo classique : ce qui distingue Quatrauro (fiabilité, modèles, bilan) doit rester visible dès l'accueil, par la pastille de fiabilité et les écrans « Les modèles » et « Fiabilité ».
- Le bloc d'état change de couleur selon la condition. Seuls le beau temps et la pluie sont maquettés ; les autres états sont à définir (issue M0-10).
- Deux thèmes à maintenir : chaque token existe en clair et en sombre, et les contrastes sont testés dans les deux.

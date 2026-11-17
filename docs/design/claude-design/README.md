# Maquettes Claude Design

Ce dossier contient les maquettes de la direction retenue, « Riviera » ([spécification](../riviera.md), [ADR 0001](../../adr/0001-direction-graphique-riviera.md)).

| Fichier | Écran |
|---|---|
| `riviera-accueil.dc.html` | Accueil de Toulon par beau temps : bloc d'état, prochaines heures, sept jours |
| `riviera-accueil-pluie.dc.html` | Accueil de Nice sous la pluie : bloc bleu ardoise, risque de pluie horaire |
| `riviera-jour.dc.html` | Détail d'un jour : heure par heure, chiffres clés, début de la pluie selon les modèles |
| `riviera-modeles.dc.html` | Les modèles : prévision combinée, poids et erreur de chacun |
| `riviera-fiabilite.dc.html` | Fiabilité : erreur du mélange, prévu contre observé, erreur selon l'échéance |
| `support.js` | Moteur de rendu des fichiers `.dc.html`, fourni par Claude Design |

## Clair et sombre

Chaque maquette contient les deux thèmes. Le bouton rond en haut à droite bascule de l'un à l'autre, et la propriété `dark` du composant fixe le thème de départ (clair par défaut). Les tokens des deux thèmes sont au début de chaque fichier, dans les règles `[data-theme="light"]` et `[data-theme="dark"]`.

## Provenance

- **Canevas** : « App météo — 5 directions de design », créé avec Claude le 17/11/2026 dans l'espace de Yann ([lien](https://claude.ai/artifact/CLW1d6Bv11nC2ohoPe3Ny6)). Les quatre autres directions (Instrument, Bulletin, Bandes, Calme) et les copies sombres des écrans Riviera y restent pour mémoire.
- **Renommage** : les fichiers du canevas (`Riviera`, `Nice`, `Jour`, `Modeles`, `Fiabilite`) ont été renommés ici, et leurs liens de retour pointent vers `riviera-accueil.dc.html`. Rien d'autre n'a été modifié.
- **`support.js`** : repris de l'export Claude Design d'Escapades (même format `.dc.html`). Le rendu de ces cinq fichiers avec cette version du moteur n'a pas été contrôlé : en cas de doute, le canevas d'origine fait référence.
- **Contenu** : toutes les valeurs sont fictives (températures, poids, erreurs, scores).

## Ouvrir les maquettes

Ouvrir un fichier `.dc.html` dans un navigateur, avec une connexion internet : `support.js` charge React, ReactDOM et Babel depuis unpkg, et les maquettes chargent Outfit depuis Google Fonts. Les flèches de retour ramènent à l'accueil.

## Règles

- **Ne pas modifier ces fichiers à la main.** Pour faire évoluer la direction, on repasse par Claude Design, on remplace l'export ici et on met à jour la spécification dans le même commit.
- ESLint et Prettier doivent ignorer ce dossier : c'est du code généré.

# Accessibilité : ce qui a été vérifié

Passe faite le 18 novembre 2026 sur l'app assemblée, écran par écran, dans les deux thèmes. Les règles sont celles d'[AGENTS.md](../../AGENTS.md) : cibles de 48 dp, contrastes WCAG AA, libellés des boutons-icônes et des graphiques, ordre de lecture, police agrandie, information jamais portée par la seule couleur.

## Comment

| Moyen | Ce qu'il vérifie |
|---|---|
| `__tests__/accessibility.test.tsx` | Sur chaque écran rendu en entier : nom de chaque bouton, lien, choix et graphique ; cible de 48 dp ; un titre reconnu ; aucune lecture en double ; rien ne disparaît à 200 % de police |
| `src/ui/__tests__/theme.test.ts` | Contrastes de tous les couples texte / fond (`CONTRAST_PAIRS`, 4,5:1) et forme / fond (`GRAPHIC_PAIRS`, 3:1), dans les deux thèmes |
| `src/ui/__tests__/largeText.test.tsx` | Ce que chaque composant change avec une grande police, et ce qu'il tait quand sa ligne parle déjà |
| Émulateur Android (Pixel 3a, Android 13) | Taille réelle des cibles et ordre de lecture, lus dans l'arbre d'accessibilité du système (`uiautomator dump`) ; captures de chaque écran à 130 % et à 200 % de police ; les deux thèmes |

**Non fait : aucun essai avec TalkBack lui-même.** L'arbre d'accessibilité lu sur l'émulateur est celui que TalkBack parcourt, mais personne n'a écouté l'app. C'est à faire sur un vrai téléphone (voir « Reste à faire »).

## Résultat par écran

Les cinq écrans, le menu du thème et l'état vide passent la liste dans les deux thèmes, après les corrections ci-dessous.

| Critère | Accueil | Détail d'un jour | Les modèles | Fiabilité | À propos |
|---|---|---|---|---|---|
| Cibles ≥ 48 dp (mesurées sur l'émulateur) | oui | oui | oui | oui | oui |
| Boutons-icônes et graphiques nommés | oui | oui | oui | oui | oui |
| Un titre reconnu par les lecteurs d'écran | oui (corrigé) | oui | oui | oui | oui |
| Rien n'est lu deux fois | oui (corrigé) | oui (corrigé) | oui (corrigé) | oui (corrigé) | oui |
| Ordre de lecture : celui de l'écran, de haut en bas | oui | oui | oui | oui | oui |
| Lisible à 130 % de police | oui | oui | oui | oui (corrigé) | oui |
| Rien de coupé à 200 % de police | oui (corrigé) | oui (corrigé) | oui (corrigé) | oui (corrigé) | oui (corrigé) |
| Information jamais portée par la seule couleur | oui | oui | oui | oui | oui |

Les contrastes ne dépendent pas de l'écran mais des tokens : ils sont vérifiés une fois pour toutes, par thème.

## Ce qui a été corrigé

### Lectures en double

Une ligne qui se lit d'une traite (« mercredi, Éclaircies, de 14 à 19 degrés, fiabilité 62 % ») contenait une barre qui se lisait une seconde fois (« de 14 à 19 degrés »). Un lecteur d'écran s'arrêtait donc deux fois par ligne. Étaient touchés : les lignes de la semaine, les lignes des modèles, l'erreur selon l'échéance, le désaccord entre modèles.

- `RangeBar`, `MeterBar` et `ConditionBadge` ont une prop `decorative` : la ligne qui les contient parle, ils se taisent.
- Seuls, ils gardent leur libellé (règle d'AGENTS.md).
- Le rond de la condition, dans le bloc d'état, est décoratif : le nom de la condition est écrit juste à côté.

### Titre de l'accueil

L'accueil n'avait aucun titre : la navigation « de titre en titre » des lecteurs d'écran n'y trouvait rien. Le temps qu'il fait (« Couvert »), dans le bloc d'état, est maintenant un titre.

### Grandes polices

L'app suivait déjà la taille de police du téléphone, mais plusieurs lignes à colonnes cassaient au-delà de 130 %.

| Élément | Problème | Correction |
|---|---|---|
| Ligne d'un jour (accueil) | À 200 %, la fiabilité sortait de la carte | Au-delà de 130 % : la barre s'efface (les deux températures disent la même chose), la fiabilité passe sous la ligne |
| Graphique heure par heure | À 200 %, les températures se chevauchaient | Les colonnes s'élargissent avec la police ; le graphique défile de côté quand elles ne tiennent plus |
| Vignettes du détail d'un jour | Libellés tronqués (« Humi… ») | Deux par deux au-delà de 130 % |
| Titre d'un écran | « Vendredi 20 n… » | Deux lignes au plus |
| Pastille du bloc d'état | Le texte qui suit s'écrasait en colonne d'une lettre | Il passe sous la pastille |
| Prévu contre observé (Fiabilité) | À 130 %, le jour était tronqué ; à 200 %, il disparaissait | Colonnes resserrées ; au-delà de 130 %, chaque jour s'écrit sur ses propres lignes, avec ses intitulés (« Prévu 16,2° ») |
| Erreur selon l'échéance | À 200 %, débordement | La barre s'efface, le chiffre reste |
| Ligne d'un modèle | « 31 % » sur deux lignes | La colonne suit la taille de police |
| Liens de l'accueil et d'« À propos » | Un libellé sur deux lignes touchait le voisin | Marge verticale |
| Titres de cartes avec légende | La légende était coupée | Elle passe à la ligne |

Le seuil est dans `src/ui/textScale.ts` (`LARGE_TEXT_FROM = 1.3`) : jusqu'à 130 %, la mise en page est celle des maquettes ; au-delà, elle s'adapte.

## Contrastes

| Couple | Clair | Sombre | Seuil |
|---|---|---|---|
| Texte sur carte | 17,0 | 14,6 | 4,5 |
| Texte secondaire sur carte | 6,8 | 8,3 | 4,5 |
| Icône d'état ou de condition sur rond pâle | 13,7 | 13,7 | 3 |
| Barre sur son fond de barre | 4,0 | 6,1 | 3 |
| Barre sur carte | 4,9 | 7,5 | 3 |

Tous les couples texte / fond sont dans `CONTRAST_PAIRS`, tous les couples forme / fond dans `GRAPHIC_PAIRS` : le test les parcourt dans les deux thèmes.

## Information jamais portée par la seule couleur

| Information | Couleur | Et aussi |
|---|---|---|
| Le temps qu'il fait | Couleur du bloc d'état | Le nom de la condition, et son icône |
| Risque de pluie d'une heure | Hauteur de la barre bleue | Le pourcentage, dans la vignette et dans ce que lit le graphique |
| Amplitude d'un jour | Barre bleue | Les deux températures |
| Poids d'un modèle | Barre bleue | Le pourcentage |
| Fiabilité | Pastille jaune | Le pourcentage, en toutes lettres |
| Écart important (Fiabilité) | — | Une icône, un texte en gras, et « écart important » pour les lecteurs d'écran |
| Choix en cours (ville, jour, thème) | Fond blanc ou coche | L'état « sélectionné » annoncé |
| Prévision ancienne, erreur | — | Une icône et un texte |

## Écarts assumés

- **Fond des barres** (`track` sur `card`, 1,2:1) : la partie vide d'une barre se distingue peu de la carte. Elle ne porte pas d'information : le remplissage (4:1 et plus) et le chiffre voisin la portent.
- **Contour du bouton « Réessayer » en sombre** (`heroClear` sur `card`, 2,5:1) : le bouton se reconnaît à son texte blanc (6,7:1 sur son fond) et à sa forme, pas à son contour.
- **Blocs d'état sur le fond de l'écran** : contraste faible entre deux aplats voisins dans le thème sombre. Ce sont des surfaces, pas des informations ; le texte qu'elles portent est vérifié.
- **Au-delà de 130 % de police, deux graphiques s'effacent** (barre d'amplitude de la semaine, barre de l'erreur selon l'échéance). Les chiffres qu'ils illustrent restent.
- **Le graphique heure par heure défile de côté** au-delà de 130 % : un défilement dans une seule direction, sur un contenu qui est un tableau.
- **Lecteurs d'écran : le graphique heure par heure se lit d'une traite**, huit heures à la suite. C'est long, mais chaque heure séparément aurait fait huit arrêts pour une seule carte.

## Reste à faire

- **Écouter l'app avec TalkBack** sur un vrai téléphone : aucun outil n'a remplacé cette écoute.
- **Android 14 et plus** agrandissent la police de façon non linéaire (les grands titres grossissent moins) : l'émulateur de cette passe est en Android 13.
- **Mode paysage et tablettes** : hors du périmètre de la v1 (téléphone, portrait).

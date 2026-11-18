# États : chargement, erreurs, données manquantes

Ce que l'app montre quand elle n'a pas, ou pas mieux, que le contenu normal. Chaque état est dessiné avec les mêmes moyens que le reste de [Riviera](riviera.md) : aplats, grands rayons, icônes au trait, aucune couleur nouvelle. Tous sont visibles dans le catalogue (`/dev/catalog`, section « États »), dans les deux thèmes.

## Les sept états

| État | Quand | Ce que l'écran montre | Composant | Écrans |
|---|---|---|---|---|
| **Premier chargement** | Rien en cache, la réponse n'est pas arrivée | Des formes pleines à la place du contenu, qui respirent lentement. Aucun chiffre, aucun tiret | `LoadingSkeleton` | Accueil, détail d'un jour, Les modèles, Fiabilité |
| **Rafraîchissement** | Une prévision est affichée, une plus récente est demandée | La prévision reste. « Mise à jour en cours… » remplace l'heure de mise à jour, et l'indicateur du geste « tirer pour rafraîchir » tourne | Texte du bloc d'état | Accueil ; indicateur seul sur Fiabilité |
| **Prévision ancienne** | Calculée il y a plus de douze heures | La prévision reste, sous un bandeau qui dit son âge | `Notice` (icône `stale`) | Accueil, détail d'un jour, Les modèles |
| **Erreur, une prévision en cache** | La mise à jour vient d'échouer | La prévision reste, sous un bandeau qui dit pourquoi | `Notice` (icône `offline` ou `alert`) | Accueil, détail d'un jour, Les modèles |
| **Erreur, aucune prévision** | Rien en cache, et le chargement a échoué | Une carte : une icône, ce qui se passe, quoi faire, un bouton « Réessayer » | `StateMessage` | Accueil, détail d'un jour, Les modèles, Fiabilité |
| **Historique insuffisant** | Moins d'une semaine de prévisions vérifiées | Une carte qui dit combien d'heures l'ont été ; aucun score | `StateMessage` (Fiabilité), `Notice` (Les modèles) | Fiabilité, Les modèles |
| **Modèle absent** | Le modèle n'a pas répondu au dernier calcul, ou ne prévoit pas aussi loin | Sa ligne reste, avec la raison à la place de la barre de poids, et « — » pour la valeur | `ModelRow` (`note`) | Les modèles |

Un jour demandé qui n'est plus dans la prévision (lien ancien, jour passé) suit le même dessin que l'erreur sans prévision : une carte, avec le bouton « Voir les jours à venir ».

## Textes

Courts, concrets : le titre dit ce qui se passe, le texte dit quoi faire. Tous sont dans `src/i18n/fr.ts`.

### Erreur, aucune prévision

| Cause | Icône | Titre | Texte | Bouton |
|---|---|---|---|---|
| Pas de réseau | `offline` | Pas de connexion | Vérifiez votre connexion, puis réessayez. La prévision s'affichera dès qu'elle aura été reçue une première fois. | Réessayer |
| Le serveur répond par une erreur | `unavailable` | Prévisions indisponibles | Le serveur ne répond pas pour le moment. Réessayez dans quelques minutes. | Réessayer |
| Fichier illisible | `alert` | Prévisions illisibles | Le fichier reçu n'a pas pu être lu. Plutôt que d'afficher des valeurs douteuses, l'app n'affiche rien. Réessayez plus tard. | Réessayer |
| Version du contrat inconnue | `update` | Mise à jour nécessaire | Cette version de l'app ne sait pas lire les nouvelles prévisions. Mettez l'app à jour. | aucun : réessayer n'y changerait rien |
| Rien reçu, sans erreur | `hourglass` | Pas encore de prévision | Aucune prévision n'a encore été reçue. Réessayez dans un instant. | Réessayer |
| Tous les jours sont passés | `stale` | Prévision trop ancienne | La dernière prévision reçue ne décrit plus que des jours passés. Réessayez pour en recevoir une nouvelle. | Réessayer |

### Bandeaux

| Cas | Titre | Texte |
|---|---|---|
| Prévision ancienne, le fichier a bien été relu | Prévision ancienne | Calculée il y a 13 heures. Aucune prévision plus récente n'est disponible pour le moment. |
| Prévision ancienne, la mise à jour a échoué | Prévision ancienne | Calculée il y a 13 heures. Pas de connexion. La prévision affichée est la dernière reçue. |
| Mise à jour échouée, pas de réseau | Mise à jour impossible | Pas de connexion. La prévision affichée est la dernière reçue. |
| Mise à jour échouée, erreur du serveur | Mise à jour impossible | Le serveur ne répond pas. La prévision affichée est la dernière reçue. |
| Mise à jour échouée, fichier illisible | Mise à jour impossible | La nouvelle prévision était illisible. L'ancienne reste affichée. |
| Mise à jour échouée, version inconnue | Mise à jour impossible | Mettez l'app à jour pour recevoir les nouvelles prévisions. |

**Un seul bandeau à la fois.** Une prévision à la fois ancienne et impossible à mettre à jour n'en montre qu'un : l'âge, puis la raison.

### Autres

| État | Titre | Texte |
|---|---|---|
| Scores impossibles à charger | Scores indisponibles | Les scores n'ont pas pu être chargés. Vérifiez votre connexion, puis réessayez. |
| Historique insuffisant (Fiabilité) | Pas encore assez de recul | Seulement 60 heures de prévisions ont été comparées aux mesures. Les scores apparaîtront après une semaine : avant, une moyenne ne voudrait rien dire. |
| Historique insuffisant (Les modèles) | Pas encore de scores | Il faut quelques jours de mesures pour noter les modèles. |
| Modèle absent | — | Absent du dernier calcul |
| Modèle hors de portée | — | Ne prévoit pas aussi loin |
| Jour sorti de la prévision | Ce jour n'est plus dans la prévision | Il est passé, ou trop lointain pour être prévu. |

## Dessin

- **Icône d'état** : dans un rond `pale`, tracée en `onSun`, comme le rond d'une condition sans soleil. 40 dp dans un bandeau, 72 dp dans une carte. Le jaune reste réservé au soleil et à la pastille : aucun état ne l'emploie.
- **Bandeau** (`Notice`) : une carte, l'icône à gauche, le titre en gras et le détail en `textMuted`.
- **Carte d'état** (`StateMessage`) : une carte centrée, l'icône, le titre (variante `title`), le texte, puis le bouton.
- **Bouton** (`ActionButton`) : plein, `heroClear`, texte `onHero`, 48 dp de haut au moins.
- **Formes de chargement** (`Skeleton`) : `track` sur une carte, `heroOverlay` sur le bloc d'état. L'ensemble respire entre 100 % et 55 % d'opacité, en 1,8 s. Pas de reflet qui balaie : il demanderait un dégradé.

Aucun nouveau couple de couleurs : `onSun` sur `pale` et `onHero` sur `heroClear` sont déjà dans `CONTRAST_PAIRS`.

## Accessibilité

- Les formes de chargement sont **un seul élément** pour les lecteurs d'écran : une barre de progression « occupée », nommée « Chargement de la prévision… » ou « Chargement des scores… ».
- La respiration s'arrête quand le téléphone demande de **réduire les animations**.
- Les bandeaux ont le rôle `alert` : ils sont annoncés dès qu'ils apparaissent, et se lisent d'une traite.
- Le titre d'une carte d'état a le rôle « titre ».
- **« Réessayer » est un bouton**, pas seulement un geste : tirer vers le bas n'est pas à la portée de tout le monde. Le geste reste disponible.
- L'icône d'un état est décorative : le titre dit la même chose. Aucune information ne passe par la seule couleur.
- Un modèle sans valeur se lit « GFS, NOAA, Absent du dernier calcul, indisponible ».

## Décisions

- **Un bouton plutôt qu'une invitation à tirer** : l'ancien texte « Tirez vers le bas pour réessayer » supposait un geste que les lecteurs d'écran ne proposent pas simplement.
- **Un titre par cause** plutôt qu'un titre unique « Pas encore de prévision » : « Pas de connexion » dit tout de suite quoi vérifier.
- **Pas de bouton quand il n'y a rien à tenter** (version inconnue).
- **L'échec d'une mise à jour s'affiche en haut**, sous le bloc d'état, et sur les trois écrans de prévision : il était en bas de l'accueil seulement, en petit.

## Tests

- `__tests__/states.test.tsx` : chaque état dans l'app entière. Premier chargement sur les quatre écrans, rafraîchissement, prévision ancienne sur trois écrans, erreur avec cache pour les quatre causes, erreur sans cache pour trois causes, « Réessayer » qui recharge, prévision entièrement passée.
- `__tests__/app.test.tsx` : historique insuffisant, scores impossibles à charger puis rechargés, modèle absent, modèle hors de portée, jour sorti de la prévision.
- `src/ui/__tests__/states.test.tsx` : les composants. Rôles et libellés, animation coupée sur demande, bouton désactivé, cible de 48 dp.
- `src/features/catalog/__tests__/CatalogScreen.test.tsx` : chaque état est au catalogue, dans les deux thèmes.

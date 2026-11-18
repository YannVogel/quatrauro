# Thème clair et sombre

L'app existe dans deux thèmes à égalité (direction Riviera). Par défaut elle suit le téléphone ; on peut aussi forcer le clair ou le sombre.

| Fichier | Rôle |
|---|---|
| `src/ui/theme.ts` | Les tokens des deux thèmes |
| `src/ui/ThemeProvider.tsx` | Donne le thème aux composants (`useTheme`, `makeStyles`) |
| `src/ui/components/ThemeMenu.tsx` | Le menu : Système, Clair, Sombre |
| `src/lib/themePreference.tsx` | Le réglage : mémorisé, appliqué au lancement, et le menu qui le change |
| `src/lib/preferences.ts` | Stockage des petits réglages sur l'appareil |

## Le réglage

| Choix | Effet |
|---|---|
| **Système** (par défaut) | L'app suit le thème du téléphone, en direct : si le téléphone passe en sombre le soir, l'app aussi |
| **Clair** | Toujours clair, quel que soit le téléphone |
| **Sombre** | Toujours sombre |

- **Le bouton rond** (en haut à droite du bloc d'état de l'accueil, et dans l'en-tête des autres écrans) ouvre le menu. Toucher un choix l'applique tout de suite et referme le menu ; toucher le voile le referme sans rien changer.
- **Le choix est gardé sur l'appareil** et relu au lancement. Rien n'est affiché tant qu'il n'a pas été lu (quelques millisecondes) : l'app ne dessine jamais un écran dans le mauvais thème.
- **Le téléphone est prévenu** (`Appearance.setColorScheme`) : la barre d'état, la barre de navigation et les éléments natifs (indicateur de rafraîchissement, menu) suivent le thème de l'app.
- Un réglage enregistré qui n'existe plus est ignoré : l'app revient à « Système ».

## Limite connue : l'écran de démarrage

L'écran de démarrage d'Android est dessiné par le système, avant que l'app ait pu lire son réglage : **il suit le thème du téléphone**. Si l'app est réglée sur « Sombre » et le téléphone en clair (ou l'inverse), on voit donc l'écran de démarrage dans le thème du téléphone, puis l'app dans le sien. Avec le réglage « Système », il n'y a aucune différence.

Pour l'éviter, il faudrait enregistrer le choix côté Android (API disponible depuis Android 12), ce qui demande un petit module natif : non construit.

## Vérifié sur l'émulateur

Le 18 novembre 2026, Pixel 3a, app de développement :

- « Système » : l'app passe en sombre puis revient en clair quand on change le thème du téléphone, sans la relancer ;
- « Clair » avec le téléphone en sombre : l'app reste claire, barres système comprises ;
- « Sombre » avec le téléphone en clair : l'app reste sombre ; fermée puis rouverte, elle s'ouvre directement en sombre, et le menu coche « Sombre » ;
- au lancement, aucune image de l'app n'apparaît en clair avant le sombre (l'écran de démarrage, lui, est clair : voir la limite ci-dessus).

## Tests

- `__tests__/theme.test.tsx` : l'app entière. Réglage de départ, suivi du téléphone, chaque choix, enregistrement sur l'appareil, application dès le premier affichage au lancement suivant, retour à « Système », réglage inconnu ignoré, fermeture par le voile, menu depuis le détail d'un jour.
- `src/ui/__tests__/ThemeProvider.test.tsx` : le fournisseur de thème.
- Le menu se voit dans le catalogue, dans les deux thèmes.

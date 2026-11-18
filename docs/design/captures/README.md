# Captures de référence

Les cinq écrans de l'app, en clair et en sombre. Elles servent de référence visuelle : une retouche d'écran se compare à elles, et elles se refont quand un écran change.

| Écran | Clair | Sombre |
|---|---|---|
| Accueil | [accueil-clair.png](accueil-clair.png) | [accueil-sombre.png](accueil-sombre.png) |
| Détail d'un jour | [jour-clair.png](jour-clair.png) | [jour-sombre.png](jour-sombre.png) |
| Les modèles | [modeles-clair.png](modeles-clair.png) | [modeles-sombre.png](modeles-sombre.png) |
| Fiabilité | [fiabilite-clair.png](fiabilite-clair.png) | [fiabilite-sombre.png](fiabilite-sombre.png) |
| À propos des données | [a-propos-clair.png](a-propos-clair.png) | [a-propos-sombre.png](a-propos-sombre.png) |

Les états non nominaux (chargement, erreurs, données manquantes) ne sont pas capturés ici : ils se voient dans le catalogue des composants (`/dev/catalog`, section « États ») et sont décrits dans [etats.md](../etats.md).

## Conditions de prise

| | |
|---|---|
| Date | 18 novembre 2026, vers 2 h (heure de Paris) |
| Appareil | Émulateur Android, profil Pixel 3a, Android 13 (API 33) |
| Écran | 1080 × 2220 px, 440 dpi (393 × 807 dp) |
| Réglages | Taille de police et d'affichage par défaut ; thème de l'app sur « Système », thème du téléphone basculé pour le sombre |
| App | Build de développement (`npm run android`), version 0.1.0, bouton flottant des outils de développement masqué |
| Ville | Toulon ; le détail d'un jour est celui du jeudi 19 novembre |
| Fichiers | 540 × 1110 px (moitié de la taille de l'écran), PNG à palette |

## Données affichées

**Ce sont de vraies données, mais pas celles d'un pipeline en service.** Les fichiers lus par l'app ont été produits en local le 17 novembre 2026 à 22 h 27 (heure de Paris) par `npm run pipeline:bootstrap` puis `npm run pipeline`, à partir des vraies prévisions d'Open-Meteo et des vraies observations de Météo-France, et servis à l'émulateur depuis la machine de développement (`EXPO_PUBLIC_DATA_URL`, voir le README, « Lire des données locales »). Rien n'a été publié sur la branche `data`.

Les chiffres sont donc réels à cette date (prévision pour Toulon, scores sur la période du 17 octobre au 16 novembre 2026), mais ils ne sont pas à recopier ailleurs comme données d'essai.

## Refaire les captures

1. Produire des fichiers en local et les servir à l'émulateur (README, « Lire des données locales »).
2. Lancer l'app (`npm run android`), masquer le bouton flottant dans le menu de développement (« Tools button »).
3. Ouvrir chaque écran et capturer : `adb exec-out screencap -p > ecran.png`. Les écrans s'ouvrent aussi par lien : `adb shell am start -a android.intent.action.VIEW -d "quatrauro://reliability"` (`models`, `about`, `day/AAAA-MM-JJ`).
4. Basculer le thème du téléphone : `adb shell cmd uimode night yes`, puis `no`.
5. Réduire de moitié et enregistrer en PNG à palette, pour ne pas alourdir le repo.

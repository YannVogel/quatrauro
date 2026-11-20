# Icône et écran de démarrage : quatre souffles autour du soleil

Issue [#14](https://github.com/YannVogel/quatrauro/issues/14) (M0-11). Yann a choisi l'icône le 20 novembre 2026 : quatre lignes de vent blanches, dont une s'enroule autour d'un soleil jaune, sur le bleu `heroClear`.

| Icône | Avant-plan (icône adaptative) | Monochrome |
|---|---|---|
| <img src="../../assets/icon/icon.svg" width="160" alt="Quatre lignes de vent blanches, dont une s'enroule autour d'un soleil jaune, sur fond bleu"> | <img src="../../assets/icon/foreground.svg" width="160" alt=""> | <img src="../../assets/icon/monochrome.svg" width="160" alt=""> |

L'avant-plan et la version monochrome s'affichent ici sur le fond de la page, où leur blanc se voit mal : dans l'app, l'avant-plan est posé sur le bleu `heroClear`, et la version monochrome sur la couleur que le système choisit.

- **Le nom** : Quatrauro, les quatre vents. Il y a quatre lignes, pas une de plus.
- **Le soleil** : le rond jaune de l'accueil, seule touche de jaune de l'icône.
- **Les couleurs** : uniquement celles du thème clair (`heroClear`, `sun`, `onHero`), vérifié par un test.

## Sources

Trois fichiers dans `assets/icon/` :

| Fichier | Rôle |
|---|---|
| `icon.svg` | Icône complète, fond compris |
| `foreground.svg` | Avant-plan de l'icône adaptative : le même dessin à 66 %, pour tenir dans la zone sûre |
| `monochrome.svg` | Silhouette blanche pour les icônes thématiques d'Android 13 et suivants |

Le fond de l'icône adaptative n'est pas une image : c'est la couleur `heroClear`, lue dans `src/ui/theme.ts` par `app.config.ts`. Le système découpe l'ensemble en rond, en carré arrondi ou en goutte selon le téléphone.

## Régénérer les PNG

```bash
npm run brand:export
```

Le script écrit `assets/icon.png`, `assets/android-icon-foreground.png`, `assets/android-icon-monochrome.png` et `assets/splash-icon.png`. Les PNG sont dans le repo : après une retouche d'un SVG, relancer l'export et committer les deux. Une icône ne passe pas par une mise à jour JavaScript : il faut reconstruire l'app.

## Écran de démarrage

L'écran de démarrage montre l'avant-plan de l'icône (`assets/splash-icon.png`) sur le bleu `heroClear` du thème en cours : `#1463FF` en clair, `#1A4FD6` en sombre. Il est configuré dans `app.config.ts` par le plugin `expo-splash-screen`, qui lit les deux couleurs dans `src/ui/theme.ts`.

- **Taille** : Android pose l'image sur un canevas de 288 dp et n'en montre que le rond central, de 192 dp. L'image fait 288 dp de large : le dessin garde ainsi les proportions qu'il a dans le lanceur, et tient dans le rond.
- **Durée** : l'app ne retient pas l'écran de démarrage ; il disparaît dès que le premier écran est prêt.
- **À vérifier sur un build de distribution** : Expo Go montre l'icône à la place, et un build de développement ne reprend pas tous les réglages du plugin (documentation d'Expo).

## Ce qui reste de l'issue

1. Dessiner le wordmark (le nom écrit).
2. Voir l'écran de démarrage dans un build Android : il n'a été contrôlé que sur les ressources générées par `npx expo prebuild`. L'icône, elle, est dans le build 0.1.1.

## Provenance

L'icône a été retenue parmi dix pistes, puis cinq variantes de la piste « Quatre souffles », sur le canevas Claude Design « Quatrauro — icônes » ([lien](https://claude.ai/artifact/MNUrFA9dX8SFP3xrBba2zr), dans l'espace de Yann). C'est la variante « 01B · Autour du soleil ». Les trois premières variantes de cette page (rose des vents, moulin à vent, rose et soleil) ont été écartées ; elles restent dans l'historique git.

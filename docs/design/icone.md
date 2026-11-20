# Icône de l'app : quatre souffles autour du soleil

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

## Ce qui reste de l'issue

1. Configurer le splash clair et sombre (plugin `expo-splash-screen`, couleurs prises dans `src/ui/theme.ts`). `assets/splash-icon.png` est prêt, mais rien ne le lit encore.
2. Dessiner le wordmark (le nom écrit).
3. Voir l'icône dans un build Android : aucun build n'a été fait depuis le choix.

## Provenance

L'icône a été retenue parmi dix pistes, puis cinq variantes de la piste « Quatre souffles », sur le canevas Claude Design « Quatrauro — icônes » ([lien](https://claude.ai/artifact/MNUrFA9dX8SFP3xrBba2zr), dans l'espace de Yann). C'est la variante « 01B · Autour du soleil ». Les trois premières variantes de cette page (rose des vents, moulin à vent, rose et soleil) ont été écartées ; elles restent dans l'historique git.

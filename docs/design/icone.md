# Icône de l'app : trois variantes à départager

Issue [#14](https://github.com/YannVogel/quatrauro/issues/14) (M0-11). **Aucune variante n'est retenue** : le choix revient à Yann. Rien n'est exporté ni branché dans l'app, qui garde pour l'instant les icônes du modèle Expo.

Les trois partent de la piste de l'issue : une rose des vents à quatre branches, en aplats, sur le bleu `heroClear`, avec une touche de jaune `sun`. Elles n'utilisent que des couleurs du thème (vérifié par un test).

| | Rose des vents | Moulin à vent | Rose et soleil |
|---|---|---|---|
| Identifiant | `compass` | `pinwheel` | `sunrise` |
| Icône | <img src="../../assets/icon/compass/icon.svg" width="160" alt="Rose des vents à quatre branches, blanche, avec un point jaune au centre"> | <img src="../../assets/icon/pinwheel/icon.svg" width="160" alt="Quatre pales courbes en moulin, trois blanches et une jaune"> | <img src="../../assets/icon/sunrise/icon.svg" width="160" alt="Rose des vents blanche devant un soleil jaune"> |
| Avant-plan (icône adaptative) | <img src="../../assets/icon/compass/foreground.svg" width="120" alt=""> | <img src="../../assets/icon/pinwheel/foreground.svg" width="120" alt=""> | <img src="../../assets/icon/sunrise/foreground.svg" width="120" alt=""> |
| L'idée | La rose des vents la plus littérale : quatre branches, un soleil au centre | Les quatre vents en mouvement ; l'une des pales est jaune | La rose des vents et le rond jaune de l'accueil, côte à côte |
| Pour | Se lit tout de suite, tient très bien en petit | La plus vivante, et la plus singulière | Reprend le rond du soleil, signature de Riviera |
| Contre | La plus attendue | Les pales s'empâtent sous 48 px | Moins symétrique ; le soleil sort de la zone sûre si on agrandit |

L'avant-plan s'affiche ici sur le fond de la page : dans l'app, il est blanc sur le bleu `heroClear`, et le système le découpe en rond, en carré arrondi ou en goutte selon le téléphone. La version monochrome (icônes thématiques d'Android) reprend la même forme, toute blanche.

## Sources

Chaque variante a trois fichiers dans `assets/icon/<variante>/` :

| Fichier | Rôle |
|---|---|
| `icon.svg` | Icône complète, fond compris |
| `foreground.svg` | Avant-plan de l'icône adaptative, dessin tenu dans la zone sûre |
| `monochrome.svg` | Silhouette blanche pour les icônes thématiques |

## Une fois la variante choisie

```bash
npm run brand:export -- compass     # ou pinwheel, ou sunrise
```

Le script écrit `assets/icon.png`, `assets/android-icon-foreground.png`, `assets/android-icon-monochrome.png` et `assets/splash-icon.png`, aux chemins que lit `app.config.ts`. Il reste alors à faire, dans la même PR :

1. remplacer `assets/android-icon-background.png` par un aplat `heroClear`, ou déclarer la couleur de fond dans `app.config.ts` ;
2. configurer le splash clair et sombre (plugin `expo-splash-screen`, couleurs prises dans `src/ui/theme.ts`) ;
3. reconstruire l'app : une icône ne passe pas par une mise à jour JavaScript ;
4. supprimer les deux variantes écartées et cette page, ou la réduire à la variante retenue.

Le wordmark (le nom écrit) n'est pas dessiné : il dépend de la variante choisie.

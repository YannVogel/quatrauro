# Direction graphique : Riviera

Cette spécification fait foi pour les tokens, les composants et les écrans de Quatrauro. Elle est dérivée des maquettes de [claude-design/](claude-design/) ; en cas d'écart entre une maquette et ce document, ce document prime. La décision est consignée dans l'[ADR 0001](../adr/0001-direction-graphique-riviera.md).

## Sources

- Maquettes : `claude-design/riviera-*.dc.html` (cinq écrans, chacun basculable en clair et en sombre).
- Canevas d'origine : « App météo — 5 directions de design », créé avec Claude le 17/11/2026 dans l'espace de Yann.
- Les valeurs ci-dessous sont relevées dans les maquettes. Les maquettes n'ont pas été contrôlées visuellement écran par écran : un détail qui déborde ou qui jure dans une maquette est un défaut de la maquette, pas une intention.

## Principes

1. **Un coup d'œil** : l'accueil répond à « quel temps fait-il, et jusqu'à quand ? » sans défilement.
2. **Aplats et rondeurs** : couleurs pleines, grands rayons. Pas de dégradé, pas d'ombre floue, pas de bordure décorative.
3. **Le chiffre d'abord** : la température est l'élément le plus grand de chaque écran.
4. **Le jaune est rare** : réservé au soleil et à la pastille mise en avant du bloc d'état (fiabilité, écart, score).
5. **La fiabilité se voit partout** : chaque prévision affichée est accompagnée de son indice ou d'un moyen d'y accéder.
6. **Deux thèmes à égalité** : aucun écran n'est pensé d'abord pour le clair puis « assombri ».
7. **Icônes au trait**, jamais d'emoji.

## Couleurs

Chaque token existe dans les deux thèmes. Les noms sont ceux de `src/ui/theme.ts`.

| Token | Clair | Sombre | Usage |
|---|---|---|---|
| `background` | `#EAF4FF` | `#071226` | Fond des écrans |
| `card` | `#FFFFFF` | `#0F1E3D` | Cartes, vignettes, boutons ronds hors bloc |
| `text` | `#0B1B3A` | `#EAF1FF` | Texte principal |
| `textMuted` | `#4A5B7C` | `#A9B8D6` | Texte secondaire, légendes |
| `track` | `#DCE8F7` | `#1C2E55` | Fond des barres, séparateurs |
| `bar` | `#1463FF` | `#7FB0FF` | Remplissage des barres |
| `heroClear` | `#1463FF` | `#1A4FD6` | Bloc d'état par beau temps, et bloc des écrans « Les modèles » et « Fiabilité » |
| `heroRain` | `#3A4F7A` | `#2A3A5E` | Bloc d'état sous la pluie ou les averses |
| `heroCloudy` | `#4C6A9C` | `#34507E` | Bloc d'état par temps couvert ou sous la neige |
| `heroStorm` | `#2E2A66` | `#262257` | Bloc d'état sous l'orage |
| `heroWind` | `#0F6E8C` | `#0E5A73` | Bloc d'état par vent fort |
| `heroNight` | `#14235C` | `#13225A` | Bloc d'état par ciel dégagé ou peu nuageux, la nuit |
| `onHero` | `#FFFFFF` | `#FFFFFF` | Texte sur le bloc d'état |
| `sun` | `#FFC93C` | `#FFC93C` | Rond du soleil, pastille mise en avant |
| `onSun` | `#0B1B3A` | `#0B1B3A` | Texte et icône sur le jaune |
| `pale` | `#DCE8F7` | `#DCE8F7` | Rond d'icône quand il n'y a pas de soleil |
| `heroOverlay` | noir à 16 % | blanc à 16 % | Fond du sélecteur de ville et du bouton de thème dans le bloc |

Règles :

- Aucune couleur en dur hors de `theme.ts`.
- Les contrastes des couples texte/fond sont vérifiés par un test, dans les deux thèmes (WCAG AA : 4,5:1 pour le texte courant, 3:1 à partir de 24 px). La liste des couples vérifiés est `CONTRAST_PAIRS`, dans `theme.ts` : tout nouveau couple texte/fond s'y ajoute.
- **Écart avec les maquettes** : elles posent un voile blanc à 16 % dans le bloc d'état des deux thèmes. En clair, le nom de la ville non sélectionnée (blanc, 15 px) n'y atteint que 3,8:1. Le voile du thème clair est donc noir à 16 % (6,5:1) ; celui du thème sombre reste blanc (4,8:1).
- Chaque état du bloc a son token `hero*` (voir « Conditions météo ») : une couleur pleine, sur laquelle le texte blanc reste lisible. Le test des contrastes parcourt `HERO_TOKENS`.

## Typographie

Police : **Outfit** (Google Fonts), graisses 400, 500, 600 et 700, embarquée dans l'app.

| Style | Taille / graisse | Usage |
|---|---|---|
| `displayXL` | 108 / 700, interlettrage −4 % | Température de l'accueil |
| `displayL` | 80 / 700, interlettrage −4 % | Chiffre principal des autres écrans |
| `title` | 22 / 600 | Condition sous la température |
| `value` | 24 / 600 | Valeur d'un modèle |
| `heading` | 18 / 600 | Titre d'écran |
| `section` | 16 / 600 | Titre de carte |
| `stat` | 20 / 600 | Valeur d'une vignette |
| `body` | 15 / 400 | Lignes de liste, texte courant |
| `bodyStrong` | 15 / 600 | Texte courant mis en avant (jour, valeur d'une ligne) |
| `label` | 14 / 600 | Pastilles |
| `caption` | 13 / 400 | Légendes, texte secondaire |
| `micro` | 12 / 400 | Graduations (taille minimale) |

Les maquettes ne fixent l'interligne que pour les grands chiffres (0,95). Dans l'app, il vaut 1 fois le corps pour `displayXL` et `displayL` (en dessous, Android rogne le haut des chiffres), et de 1,25 à 1,4 fois pour les autres styles.

Les nombres s'écrivent à la française : virgule décimale, espace avant `%` et avant les unités, `°` collé au chiffre.

## Formes et espacements

| Élément | Valeur |
|---|---|
| Marge d'écran | 16 |
| Espace entre blocs | 12 |
| Rayon du bloc d'état et des cartes | 28 |
| Rayon des vignettes | 18 |
| Rayon des boutons ronds et du sélecteur | 24 dans l'app (hauteur 48 dp) ; 22 dans les maquettes (hauteur 44) |
| Marge intérieure du bloc d'état et des cartes | 20 |
| Espace entre éléments voisins | 8 |
| Rayon des pastilles | 16 |
| Épaisseur des barres | 8 à 10, extrémités rondes |
| Rond du soleil | 112 à l'accueil, 92 sur le détail d'un jour |

Les maquettes utilisent des cibles de 44 px ; l'app applique le minimum de 48 dp d'AGENTS.md.

## Composants

| Composant | Rôle | Vu dans |
|---|---|---|
| `HeroBlock` | Bloc d'état coloré : contenu libre, couleur selon la condition | Tous les écrans |
| `CitySwitch` | Sélecteur Toulon / Nice, dans le bloc d'état | Accueil |
| `IconButton` | Bouton rond (retour, thème) | Tous |
| `ConditionBadge` | Rond coloré avec l'icône de la condition | Accueil, détail |
| `Pill` | Pastille jaune mise en avant, suivie d'un court texte | Bloc d'état |
| `Card` | Carte arrondie sur fond `card` | Tous |
| `HourChip` | Vignette d'une heure : heure, température, risque de pluie éventuel | Accueil |
| `DayRow` | Ligne d'un jour : icône, jour, min, barre d'amplitude, max, fiabilité | Accueil |
| `RangeBar` | Barre d'amplitude min–max sur une échelle commune à la semaine | Accueil |
| `MeterBar` | Barre de proportion (poids, erreur) | Modèles, fiabilité |
| `HourlyChart` | Colonnes d'une journée : température et barre verticale de risque de pluie | Détail |
| `StatTile` | Vignette libellé + valeur | Détail |
| `ModelRow` | Ligne d'un modèle : nom, fournisseur, poids, valeur | Modèles |
| `ScreenHeader` | Retour, titre et sous-titre centrés, bouton de thème | Écrans secondaires |

Chaque composant a un `accessibilityLabel` quand il porte une information graphique (une `RangeBar` s'annonce « de 9 à 16 degrés »).

## Icônes

Icônes au trait, épaisseur 1,8, extrémités rondes, sur une grille de 24. Elles viennent de la bibliothèque [Lucide](https://lucide.dev/) (`lucide-react-native`, licence ISC), dont le dessin est exactement celui-là : trait seul, grille de 24, extrémités rondes, épaisseur réglable. Les maquettes en dessinent quatre à la main ; Lucide fournit les mêmes formes et toutes celles qui manquaient.

Le reste du code ne connaît pas Lucide : il passe par le registre `src/ui/icons.ts` et par le composant `Icon`, qui fixe l'épaisseur et prend sa couleur dans le thème. Une icône qui porte une information reçoit un `accessibilityLabel` ; sans libellé, elle est décorative et les lecteurs d'écran l'ignorent.

## Conditions météo

La liste fermée des conditions est dans `shared/conditions.ts` : c'est ce que le mélange sait déterminer (M1-06), et rien d'autre. Le jour et la nuit ne sont pas des conditions : ils se déduisent de l'heure. L'apparence de chaque condition est dans `src/ui/conditions.ts`.

| Condition | Nom affiché | Icône de jour | Icône de nuit | Bloc d'état | Rond d'icône |
|---|---|---|---|---|---|
| `clear` | Ciel dégagé | soleil | lune | `heroClear` le jour, `heroNight` la nuit | `sun` le jour, `pale` la nuit |
| `partlyCloudy` | Éclaircies | nuage et soleil | nuage et lune | `heroClear` le jour, `heroNight` la nuit | `sun` le jour, `pale` la nuit |
| `cloudy` | Couvert | nuage | nuage | `heroCloudy` | `pale` |
| `rain` | Pluie | nuage et pluie | nuage et pluie | `heroRain` | `pale` |
| `showers` | Averses | nuage, soleil et pluie | nuage, lune et pluie | `heroRain` | `pale` |
| `thunderstorm` | Orage | nuage et éclair | nuage et éclair | `heroStorm` | `pale` |
| `snow` | Neige | nuage et flocons | nuage et flocons | `heroCloudy` | `pale` |
| `windy` | Vent fort | vent | vent | `heroWind` | `pale` |

- Le rond jaune n'apparaît que lorsque le soleil est visible : ciel dégagé ou éclaircies, de jour.
- L'icône posée sur le rond est toujours de couleur `onSun`, sur le jaune comme sur le rond pâle.
- **La brume n'est pas dans la liste** : aucun champ mélangé (température, humidité, vent, nébulosité, pluie) ne permet de la reconnaître de façon fiable.
- Contraste du texte blanc sur chaque bloc, vérifié par test : au moins 4,5:1 dans les deux thèmes, voile du sélecteur compris.

## Écrans

### Maquettés

| Écran | Maquette | À retenir |
|---|---|---|
| Accueil, beau temps | `riviera-accueil` | Bloc bleu vif, rond jaune, cinq prochaines heures, sept jours |
| Accueil, pluie | `riviera-accueil-pluie` | Bloc bleu ardoise, rond pâle, risque de pluie dans les vignettes horaires |
| Détail d'un jour | `riviera-jour` | Min et max, colonnes toutes les 3 h, quatre vignettes, début de la pluie selon chaque modèle |
| Les modèles | `riviera-modeles` | Prévision combinée, écart entre modèles, poids et erreur de chacun |
| Fiabilité | `riviera-fiabilite` | Erreur du mélange contre le meilleur modèle, prévu contre observé, erreur selon l'échéance |

### À dériver de cette spécification

- **Navigation** : toucher une ligne de jour ouvre son détail ; toucher la pastille de fiabilité de l'accueil ouvre « Les modèles » ; un accès à « Fiabilité » et à « À propos des données » depuis l'accueil (emplacement à proposer dans l'issue de l'accueil, sans barre d'onglets).
- **Détail d'un jour par beau temps** : la carte « début de la pluie selon les modèles » devient une carte de désaccord sur la variable la plus incertaine du jour (température maximale, vent), ou disparaît si les modèles sont d'accord.
- **Réglage du thème** : Système, Clair, Sombre. Le bouton rond des maquettes bascule clair/sombre ; son comportement exact est fixé dans l'issue du thème.
- **États** : chargement, prévision ancienne, erreur, aucune donnée (issue M4-01).
- **À propos des données**.

## Contenu des maquettes

Toutes les valeurs affichées sont **fictives** : températures, poids, erreurs, scores. Elles montrent la forme de l'information, pas des ordres de grandeur à atteindre.

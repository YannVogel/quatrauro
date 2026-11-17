# Accueil d'une ville

L'écran qu'on ouvre le matin. Il répond d'un coup d'œil : quel temps maintenant, dans les prochaines heures, et sur sept jours, avec la fiabilité de chaque jour. Maquettes : `riviera-accueil` et `riviera-accueil-pluie` ([spécification](../design/riviera.md)).

| Fichier | Rôle |
|---|---|
| `app/index.tsx` | La route |
| `src/features/forecast/components/HomeScreen.tsx` | L'écran : il lit la ville courante, la prévision, l'instant présent, et distribue |
| `src/features/forecast/home.ts` | Fonction pure : ce que l'accueil affiche, tiré d'une prévision prête |
| `src/features/forecast/components/HomeHero.tsx` | Le bloc d'état |
| `…/UpcomingHours.tsx`, `…/WeekCard.tsx`, `…/LinkRow.tsx` | Prochaines heures, semaine, accès aux autres écrans |
| `src/lib/currentCity.tsx` | La ville que l'app montre, partagée par tous les écrans |

## Ce que montre l'écran

De haut en bas :

1. **Bloc d'état**
   - le sélecteur de ville, alimenté par `shared/cities.ts` ;
   - la température de **l'heure en cours** et le rond de la condition (soleil, lune, nuage…) ;
   - le nom de la condition, puis « Mercredi 18 novembre · vent 14 km/h » ;
   - « Mis à jour à 22 h 27 » (ou « Mise à jour en cours… ») ;
   - la pastille « Fiabilité 62 % » du jour, suivie de « 5 modèles d'accord » ou « 3 modèles sur 4 d'accord ». **La toucher ouvre « Les modèles ».**
2. **Bandeau « Prévision ancienne »**, au-delà de douze heures ([fraîcheur](fraicheur-et-etats.md)).
3. **Prochaines heures** : les cinq heures qui suivent l'heure en cours.
4. **Semaine** : une ligne par jour, d'aujourd'hui au dernier jour publié. **Toucher une ligne ouvre le détail du jour.**
5. **Accès** : « Fiabilité des prévisions », « À propos des données » (et le catalogue, en développement).

Le geste « tirer pour rafraîchir » redemande la prévision de la ville affichée.

## Les règles

| Élément | Règle |
|---|---|
| Couleur du bloc et icône | Celles de la condition de l'heure en cours, de jour ou de nuit (`conditionAppearance`). Sans condition connue : la couleur par défaut, pas de rond, « Condition indisponible » |
| Température | Celle de l'heure en cours, arrondie au degré |
| Risque de pluie dans les vignettes | Affiché pour les cinq vignettes dès qu'une seule atteint 20 %, le seuil d'annonce de la pluie (`rain.hourlyAnnouncement`). Sinon aucune vignette n'en parle |
| Échelle des barres d'amplitude | Du minimum le plus bas au maximum le plus haut de la semaine affichée |
| Jours | « Mar. » à l'écran, « mardi » pour les lecteurs d'écran ; jour civil de Paris |
| Valeur absente | « — » à l'écran, « indisponible » pour les lecteurs d'écran. Jamais un zéro |
| Un seul modèle | « 1 modèle », sans « d'accord » : il n'est d'accord avec personne |

L'heure en cours, les heures et les jours à venir viennent de `forecastView` : un écran resté ouvert avance tout seul d'heure en heure.

## États

| État | Ce que l'écran montre |
|---|---|
| Chargement | Le bloc d'état avec le seul sélecteur, et « Chargement de la prévision… » |
| Rien à montrer | Le bloc d'état avec le seul sélecteur, puis l'état vide et sa raison |
| Prévision prête | Tout ce qui précède |
| Rafraîchissement raté | La prévision reste ; une ligne sous la semaine dit pourquoi elle n'a pas pu être mise à jour |

Dans tous les cas, le sélecteur de ville et les accès restent utilisables.

## Navigation

| Geste | Destination |
|---|---|
| Toucher un jour | `/day/<AAAA-MM-JJ>` |
| Toucher la pastille de fiabilité | `/models` |
| « Fiabilité des prévisions » | `/reliability` |
| « À propos des données » | `/about` |

Pas de barre d'onglets : les accès secondaires sont deux lignes dans une carte, sous la semaine. Les écrans de destination qui ne sont pas encore écrits affichent « Cet écran arrive bientôt » (`PendingScreen`), avec un retour.

## Taille de l'écran et de la police

Le bloc d'état, les cinq vignettes et la semaine tiennent sans défilement sur un téléphone d'environ 900 dp de haut. Sur un écran plus petit (vérifié sur un Pixel 3a, 807 dp) ou avec une police agrandie, l'écran défile ; les accès sont alors sous le pli. Les colonnes de la semaine suivent la taille de police du téléphone (vérifié à 130 %).

## Accessibilité

- Chaque ligne de jour est un bouton qui se lit d'une traite : « mercredi, Éclaircies, de 14 à 19 degrés, fiabilité 62 % ».
- La pastille est un bouton : « fiabilité 62 %, 5 modèles d'accord, Voir ce que prévoit chaque modèle ».
- Chaque vignette se lit : « 18 heures, 17 degrés, risque de pluie 51 % ».
- Le sélecteur est un groupe de boutons radio ; les accès sont des liens ; toutes les cibles font au moins 48 dp.

## Tests

- `__tests__/app.test.tsx` : l'app entière sur de **vrais fichiers publiés**, horloge figée. Beau temps (mercredi 9 h 30), pluie (mardi 17 h 20), données partielles, navigation vers les quatre écrans, bascule de ville, bandeau, heure qui passe écran ouvert, états vides, catalogue.
- `src/features/forecast/__tests__/home.test.ts` : le contenu de l'accueil (heures de Paris, seuil du risque de pluie, échelle, noms des jours, modèles d'accord).

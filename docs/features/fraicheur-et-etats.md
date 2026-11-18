# Fraîcheur et états de chargement

Une prévision vieille de deux jours ressemble à une prévision fraîche si rien ne la distingue. L'app dit donc toujours de quand date ce qu'elle affiche, le signale quand c'est trop vieux, et ne présente jamais une heure passée comme à venir.

| Fichier | Rôle |
|---|---|
| `src/features/forecast/freshness.ts` | Fonctions pures : âge, prévision ancienne, heures et jours à venir, état d'un écran |
| `src/lib/now.ts` | `useNow()` : l'instant présent, rafraîchi chaque minute et au retour au premier plan |
| `src/lib/config.ts` | Le seuil de la prévision ancienne |
| `src/features/forecast/components/FreshnessNotice.tsx` | Le bandeau : « Prévision ancienne », ou « Mise à jour impossible » |
| `src/features/forecast/components/EmptyState.tsx` | L'état vide, qui dit pourquoi il n'y a rien |

## Ce qu'un écran reçoit

`forecastView(published, now)` transforme ce que rend `useForecast` ([lecture des données](lecture-des-donnees.md)) en un des trois états qu'un écran sait montrer :

| État | Quand | Ce que l'écran montre |
|---|---|---|
| `loading` | Premier chargement, rien en cache | Des formes à la place du contenu (`LoadingSkeleton`) |
| `empty` | Rien à montrer, avec sa raison | Une carte : ce qui se passe, quoi faire, et un bouton « Réessayer » |
| `ready` | Une prévision est là | La prévision, son heure de mise à jour, et ses avertissements éventuels |

Un état `ready` porte : les heures à venir, les jours à venir, le libellé de mise à jour, `isStale`, `isRefreshing`, et `refreshError` quand le dernier rafraîchissement a échoué (la prévision affichée n'est alors pas la plus récente).

### Pourquoi il n'y a rien

Six raisons : `network`, `http`, `invalid`, `version`, `none`, `expired`. Le titre, le texte et l'icône de chacune sont dans la [fiche des états](../design/etats.md), qui décrit aussi le dessin de tous les états non nominaux. Pour `version`, pas de bouton « Réessayer » : cela n'y changerait rien.

**Jamais un écran blanc, jamais des zéros** : sans prévision, aucun chiffre n'est affiché.

## Les règles

- **Heure de mise à jour**, à l'heure de Paris : « Mis à jour à 22 h 27 » le jour même, « Mis à jour hier à 22 h 27 » le lendemain, « Mis à jour mardi 17 novembre à 22 h 27 » au-delà. Le jour se compte en jours civils de Paris.
- **Prévision ancienne** : **plus de 12 heures** (`STALE_FORECAST_AFTER_HOURS`). Le pipeline passe toutes les six heures (ADR 0004) : douze heures, c'est deux passages manqués. Le bandeau dit l'âge (« il y a 13 heures », « il y a 3 jours » au-delà de deux jours) et s'annonce de lui-même aux lecteurs d'écran.
- **Heures à venir** : l'heure en cours, puis les suivantes. À 8 h 40, la première vignette est celle de 8 h.
- **Jours à venir** : aujourd'hui (jour civil de Paris), puis les suivants. Une prévision calculée mardi soir et ouverte mercredi matin commence à mercredi.
- **L'écran reste juste sans qu'on le rouvre** : `useNow()` avance chaque minute et à chaque retour au premier plan. Une heure qui passe disparaît, un bandeau apparaît quand la prévision franchit douze heures.
- **Horloge déréglée** : une prévision « du futur » a un âge de zéro heure, pas un âge négatif.

## Où ces états s'affichent

L'accueil, le détail d'un jour et « Les modèles » partagent `forecastView`, `EmptyState` et `FreshnessNotice` : ils montrent donc les mêmes états, avec les mêmes mots. « Fiabilité » lit un autre fichier et a ses propres états (chargement des scores, scores indisponibles, historique insuffisant). Le tableau complet est dans la [fiche des états](../design/etats.md).

## Tests

- `src/features/forecast/__tests__/freshness.test.ts` : chaque règle, avec un « maintenant » passé à la fonction. Frais, ancien (à la seconde près autour de douze heures), changement de jour à minuit de Paris, heures passées, prévision entièrement passée, les trois états.
- `__tests__/app.test.tsx` : l'app entière, horloge figée. Heure de mise à jour, ouverture le lendemain, bandeau, bandeau qui apparaît écran resté ouvert, premier lancement hors ligne, chargement, version inconnue.
- `__tests__/states.test.tsx` : chaque état non nominal, écran par écran.

Pour figer l'horloge dans un test de l'app : `jest.useFakeTimers({ now })` **avant** `renderRouter`, qui garde cette heure. Ne pas rendre ses vraies minuteries à Jest en fin de test (voir le commentaire de `closeApp`).

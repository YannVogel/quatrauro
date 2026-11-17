# ADR 0005 — Heure de Paris sans base de fuseaux horaires

- **Statut** : acceptée
- **Date** : 2026-11-17
- **Issue** : [#6](https://github.com/YannVogel/quatrauro/issues/6) (M0-04)

## Contexte

Toutes les heures se manipulent dans le fuseau `Europe/Paris` : l'app les affiche à l'heure de Paris quel que soit le réglage du téléphone, et le pipeline agrège les journées en jours civils de Paris (AGENTS.md). Les deux ont donc besoin de connaître le décalage de Paris sur UTC à un instant donné.

Le moyen habituel passe par la base de fuseaux du moteur JavaScript (`Intl`), directement ou via `@date-fns/tz`. Or l'app tourne sur Hermes, dont l'`Intl` ne fournit pas ce décalage : la documentation de `@date-fns/tz` (lue le 17 novembre 2026) demande, pour Hermes, de charger sept polyfills FormatJS et leurs données de fuseaux. Les tests, eux, tournent dans Node, qui a une base complète : un code qui s'appuie sur `Intl` y passerait sans rien dire de ce qui se produit sur le téléphone.

## Décision

Le décalage de Paris est calculé par la **règle européenne de changement d'heure**, sans base de fuseaux : UTC+2 du dernier dimanche de mars à 01 h UTC jusqu'au dernier dimanche d'octobre à 01 h UTC, UTC+1 le reste de l'année.

- `shared/parisTime.ts` porte cette règle. C'est du calcul pur, identique dans Node et dans Hermes, utilisable par le pipeline comme par l'app. Les jours civils de Paris (agrégats quotidiens du pipeline) s'y ajouteront en M1.
- `src/lib/dates.ts` met en forme les dates pour l'app avec `date-fns` (locale `fr`, semaine commençant le lundi), en lui passant l'heure murale de Paris dans une `UTCDate` (`@date-fns/utc`).
- Un test compare la règle à la base de fuseaux de Node, heure par heure, de 2024 à 2031.

## Alternatives écartées

- **`@date-fns/tz` avec les polyfills FormatJS** : plusieurs centaines de kilo-octets de données de fuseaux embarquées pour un seul fuseau, et un comportement qui dépend du chargement des polyfills.
- **`Intl.DateTimeFormat` avec `timeZone`** : le résultat dépend du moteur, et les tests dans Node ne prouveraient rien pour Hermes.
- **Faire confiance au fuseau du téléphone** : l'app afficherait d'autres heures à l'étranger, contre la règle d'AGENTS.md.
- **Faire écrire les heures locales par le pipeline** dans les fichiers publiés : le contrat porte des instants en UTC, et l'app doit de toute façon situer « maintenant ».

## Conséquences

- Aucune dépendance au moteur ni au téléphone : la même fonction, testée, sert partout.
- **La règle est écrite en dur.** Si l'Union européenne supprime le changement d'heure, ou si la France change de fuseau, `shared/parisTime.ts` doit être mis à jour ; le test de comparaison avec la base de fuseaux de Node échouera alors dès que Node aura la nouvelle règle, ce qui sert d'alerte.
- Le code ne vaut que pour `Europe/Paris`. Une ville dans un autre fuseau (issue « d'autres villes ») demanderait de revoir cette décision.

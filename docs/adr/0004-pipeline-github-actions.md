# ADR 0004 — Pipeline sans serveur dans GitHub Actions

- **Statut** : proposée (à confirmer par l'issue M1-12)
- **Date** : 2026-11-17
- **Issue** : M1-12

## Contexte

Le mélange a besoin d'un calcul régulier et d'une mémoire (archive des prévisions, biais, poids). L'app n'a qu'un utilisateur et aucune donnée personnelle. Un serveur ou une base hébergée seraient disproportionnés.

## Décision

Proposition :

- Le pipeline est un ensemble de scripts TypeScript exécutés par un workflow GitHub Actions planifié.
- L'archive, l'état et les fichiers publiés vivent sur une branche git dédiée, `data`. Seul ce workflow y écrit.
- L'app lit les fichiers publiés en HTTPS, comme des fichiers statiques.

## Alternatives écartées

- **Tout calculer sur le téléphone** : pas de mémoire fiable des prévisions passées, et un recalcul à chaque ouverture.
- **Backend hébergé** (Supabase, Worker avec base) : surdimensionné pour un utilisateur, et un service de plus à maintenir.
- **Committer les données sur `main`** : noie l'historique du code sous les commits automatiques.

## Conséquences

- Coût nul et rien à administrer, mais les horaires planifiés de GitHub Actions ne sont pas garantis à la minute.
- L'historique git de la branche `data` grossit : il faut une politique de découpage et de rétention.
- Les fichiers publiés sont publics (le repo l'est) : ils ne contiennent que de la météo.

## À établir par l'issue

Fréquence du cron ; précision et fiabilité réelles des déclenchements ; risque de désactivation des workflows planifiés sur un repo inactif ; URL de lecture (fichiers bruts ou GitHub Pages) et son délai de cache ; format, découpage et rétention de l'archive ; alerte en cas d'échecs répétés.

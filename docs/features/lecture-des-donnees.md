# Lecture des données et cache hors ligne

L'app ne calcule rien et n'appelle aucune API météo. Elle télécharge les fichiers que le pipeline publie (deux par ville), les valide, les garde sur l'appareil, et s'ouvre toujours sur la dernière prévision reçue.

| Fichier | Rôle |
|---|---|
| `src/lib/env.ts` | L'adresse des fichiers publiés |
| `src/lib/data.ts` | Téléchargement et validation |
| `src/lib/queryClient.tsx` | Cache (TanStack Query), enregistré sur l'appareil ; `QueryProvider`, posé à la racine de l'app |
| `src/features/forecast/hooks/` | `useForecast(ville)` et `useVerification(ville)` |

## D'où viennent les fichiers

```
https://raw.githubusercontent.com/YannVogel/quatrauro/data/forecast/<ville>.json
https://raw.githubusercontent.com/YannVogel/quatrauro/data/verification/<ville>.json
```

C'est l'adresse retenue par l'[ADR 0004](../adr/0004-pipeline-github-actions.md). La variable `EXPO_PUBLIC_DATA_URL` la remplace en développement (voir « Lire des données locales » dans le README). Elle n'a rien de secret.

Chaque requête porte l'en-tête `Cache-Control: no-cache` : le téléphone doit vérifier auprès du serveur avant de resservir une réponse qu'il a gardée. Sans cela, son cache HTTP peut répondre à la place d'un serveur injoignable (constaté sur l'émulateur Android) : l'app croirait avoir rafraîchi alors qu'elle est hors ligne.

## Ce qui est refusé

`fetchForecast` et `fetchVerification` rendent un fichier valide ou lèvent une `DataError`, qui dit pourquoi :

| Genre | Cause |
|---|---|
| `network` | Pas de réponse : hors ligne, délai |
| `http` | Le serveur a répondu par une erreur : fichier absent, panne |
| `version` | Le fichier porte une `schemaVersion` que cette app ne connaît pas |
| `invalid` | Le fichier n'est pas du JSON, ne respecte pas le contrat de `shared/schemas.ts`, ou décrit une autre ville |

La version est lue avant tout le reste : un fichier d'une version future n'est pas « invalide », il est d'une autre version, et l'app pourra le dire (M2-02).

**Un fichier refusé ne remplace jamais une prévision valide.** L'échec est signalé, la prévision précédente reste affichée.

## Le cache

- **Sur l'appareil** : le cache est écrit dans le stockage de l'app (AsyncStorage) et relu à l'ouverture. L'app affiche donc la dernière prévision reçue avant même que le réseau ait répondu, et sans réseau du tout.
- **Sept jours** : au-delà, une prévision ne décrit plus que des jours passés ; le cache est abandonné.
- **Une prévision reçue est gardée même si son dernier rafraîchissement a échoué.** Par défaut, TanStack Query n'enregistre que les requêtes en succès : une coupure ou un fichier invalide aurait effacé la prévision à la fermeture de l'app. La règle d'enregistrement est donc « tout ce qui porte une donnée » (testé sur trois ouvertures successives).
- **Version du contrat** : un cache écrit pour une autre `schemaVersion` est ignoré.
- **Les deux villes sont préchargées** dès que le cache est relu, sans attendre la réponse du réseau pour afficher.

## Quand l'app redemande les fichiers

| Moment | Comportement |
|---|---|
| À l'ouverture | Si la prévision en cache a plus de cinq minutes |
| Au retour au premier plan | Même règle |
| Geste « tirer pour rafraîchir » | Toujours |

Cinq minutes, parce que les fichiers bruts de GitHub sont eux-mêmes en cache cinq minutes (ADR 0004) : redemander plus tôt ne rapporterait rien. Un échec est retenté une fois, une seconde plus tard.

## Ce que rendent les hooks

`useForecast(ville)` et `useVerification(ville)` rendent le même objet :

| Champ | Sens |
|---|---|
| `data` | La dernière version valide connue, du cache ou du réseau ; `null` s'il n'y en a aucune |
| `error` | Pourquoi le dernier chargement a échoué ; `data` peut rester disponible malgré tout |
| `isLoading` | Premier chargement : rien à afficher encore |
| `isRefreshing` | Une nouvelle version est en cours de téléchargement |
| `refresh()` | Redemande le fichier |

Les quatre combinaisons qui comptent pour un écran : rien et chargement ; rien et erreur (premier lancement hors ligne) ; une prévision ; une prévision et une erreur (prévision gardée, rafraîchissement raté).

## Vérifié sur l'émulateur

Le 17 novembre 2026, avec des fichiers produits en local par le pipeline et servis par un serveur de la machine de développement :

- l'écran provisoire affiche « Prévision calculée le mardi 17 novembre à 22 h 27 » pour les deux villes : l'heure de Paris, y compris avec le téléphone réglé sur le fuseau de New York ;
- serveur coupé, app fermée puis rouverte : la même prévision s'affiche, depuis le cache ;
- serveur coupé, geste « tirer pour rafraîchir » : la prévision reste, avec « Dernière mise à jour impossible » ;
- serveur revenu, même geste : les deux fichiers sont redemandés.

L'adresse réelle n'a pas pu être essayée : la branche `data` n'existe pas encore.

## Tests

- `src/features/forecast/__tests__/useForecast.test.tsx` : réseau simulé et stockage en mémoire, sur de **vrais fichiers publiés** (`src/lib/__fixtures__/published/`, produits par le pipeline en local). Premier chargement, cache puis rafraîchissement, hors ligne avec et sans cache, fichier invalide, pas du JSON, autre ville, version inconnue, fichier absent, survie du cache à la fermeture de l'app.
- `__tests__/no-weather-api.test.ts` : le code de l'app ne contient l'adresse d'aucune API météo, et n'appelle le réseau qu'à un endroit, `src/lib/data.ts`.
- `jest.setup.ts` : le stockage est simulé, et tout appel réseau qu'un test n'a pas prévu échoue.

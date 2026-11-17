# Quatrauro — Brief projet

> Document de cadrage rédigé avec Yann (novembre 2026). Il a servi à créer le backlog GitHub du repo `YannVogel/quatrauro` : labels, milestones, epics et issues.
>
> **Ce qui fait foi.** Les issues GitHub détaillent chaque tâche et priment sur ce brief en cas d'écart. Les décisions prises en cours de route vivent dans les issues (sections « ⚠️ Point tranché ») et dans [docs/adr/](adr/).
>
> **Les éléments marqués « à vérifier »** doivent l'être au moment de l'implémentation, jamais tenus pour acquis. Ce brief a été écrit avant tout code : les noms d'API, d'endpoints et de versions viennent de la documentation lue en novembre 2026 ou de mémoire, et les spikes de M0 sont là pour les confirmer.

---

## 1. Vision

Quatrauro est une app météo personnelle qui ne fait confiance à aucun modèle en particulier : elle **croise plusieurs modèles de prévision**, corrige les erreurs habituelles de chacun à l'endroit précis où l'on habite, et dit **à quel point on peut croire** ce qu'elle affiche.

Le pari : en se limitant à deux villes (Toulon et Nice), on peut comparer chaque jour ce que chaque modèle avait prévu à ce qui a été réellement mesuré, puis corriger et pondérer en conséquence. C'est ce que font les services météo professionnels ; c'est hors de portée d'une app généraliste, mais faisable pour deux points sur la carte.

Le nom vient du provençal « quatre auro », les quatre vents : quatre modèles, une seule prévision.

### 1.1 Principes produit

- **Honnêteté** : chaque prévision porte un indice de fiabilité. Quand les modèles divergent, l'app le dit au lieu d'afficher un chiffre faussement précis. Une donnée absente ou périmée s'affiche comme telle, jamais inventée.
- **Preuve** : l'app montre son bilan (prévu contre observé). Si le mélange ne fait pas mieux que le meilleur modèle seul, ça doit se voir.
- **Calme** : un coup d'œil suffit le matin. Pas de pub, pas de compte, pas de notification en v1.
- **Hors ligne** : la dernière prévision reçue reste lisible sans réseau, avec son heure de mise à jour.
- **Langue** : intégralement en français. Unités : °C, km/h, mm. Fuseau : `Europe/Paris`.
- **Horizon** : sept jours au maximum.

### 1.2 Identité

| Élément | Valeur |
|---|---|
| Nom | **Quatrauro** |
| Studio | Parallax Works |
| Identifiant d'app | `com.parallaxworks.quatrauro` (package Android ; même valeur pour un éventuel bundle iOS) |
| Scheme de deep link | `quatrauro://` |
| Direction graphique | « Riviera » ([spécification](design/riviera.md), [ADR 0001](adr/0001-direction-graphique-riviera.md)) |

### 1.3 Utilisateur de la v1

| Personne | Appareil | Distribution |
|---|---|---|
| Yann | Android | APK via EAS (distribution interne) |

Outil strictement personnel : pas de publication sur les stores. L'app est tout de même écrite en React Native (Expo), pour qu'une version iOS reste possible sans réécriture. Rien ne doit être fait pour iOS en v1, et rien ne doit l'empêcher.

---

## 2. Décisions actées

| Sujet | Décision |
|---|---|
| Villes | Toulon et Nice en v1. La liste vit dans une configuration unique ; ajouter une ville ne doit demander qu'une entrée de plus |
| Horizon | 7 jours, au pas horaire |
| Sources de prévision | Plusieurs modèles numériques lus via **Open-Meteo**, qui les expose séparément : AROME et ARPEGE (Météo-France), IFS (ECMWF), ICON (DWD) ; GFS (NOAA) en option. Liste définitive fixée par le spike M0-02 ([ADR 0002](adr/0002-sources-de-donnees-meteo.md)) |
| Vérité terrain | Observations des stations Météo-France les plus proches de chaque ville, sous réserve du spike M0-02 |
| Méthode | Correction de biais par modèle, puis moyenne pondérée selon l'erreur récente, par ville, variable et échéance ([ADR 0003](adr/0003-methode-de-melange.md)). Paramètres fixés par le backtest M0-03 |
| Condition de poursuite | Le backtest M0-03 doit montrer un gain du mélange sur le meilleur modèle seul. Sinon, on s'arrête et on en reparle avant d'écrire l'app |
| Backend | **Aucun serveur.** Un pipeline TypeScript tourne dans GitHub Actions (cron), calcule le mélange et publie des fichiers JSON statiques que l'app lit ([ADR 0004](adr/0004-pipeline-github-actions.md)) |
| Calcul | Tout le mélange se fait dans le pipeline. L'app ne calcule rien : elle affiche |
| Compte | Aucun compte, aucune donnée personnelle, aucune position : les villes sont fixes |
| Plateforme | Android. Expo / React Native « au cas où » pour iOS |
| Design | Riviera, thèmes **clair et sombre** (suit le système, bascule manuelle possible) |
| Licence des données | Usage personnel et non commercial : l'accès gratuit d'Open-Meteo suffit. Toute diffusion publique ou commerciale impose de revoir les sources (à vérifier dans M0-02) |
| Monétisation | Hors périmètre |

---

## 3. Stack technique

| Couche | Choix |
|---|---|
| App | Expo (dernier SDK stable au moment de M0-04, à vérifier), React Native, TypeScript strict, Expo Router |
| Données dans l'app | TanStack Query avec cache persisté ; validation Zod du JSON reçu |
| Logique métier | TypeScript pur dans `shared/`, sans dépendance à React Native ni à Node, importé par le pipeline et par l'app |
| Pipeline | Scripts TypeScript dans `pipeline/`, exécutés par Node dans GitHub Actions |
| Stockage | Branche git `data` du repo : archive des prévisions et des observations, scores, JSON publiés |
| Distribution des données | Fichiers statiques lus par l'app en HTTPS (`raw.githubusercontent.com` ou GitHub Pages, tranché par l'ADR 0004) |
| Tests | Jest + React Native Testing Library pour l'app ; Jest (ou Vitest, à trancher en M0-04) pour `shared/` et `pipeline/` |
| Qualité | ESLint, Prettier, `tsc --noEmit`, CI GitHub Actions |
| Builds | EAS Build (APK, distribution interne) ; EAS Update pour le JavaScript seul |

### 3.1 Structure indicative

```
app/                      # routes Expo Router (écrans et layouts uniquement)
__tests__/                # tests qui rendent l'app entière
src/
  features/<feature>/     # forecast (accueil, détail d'un jour), models, reliability, about
    components/ hooks/ api/ __tests__/ index.ts
  ui/                     # design system Riviera : theme.ts (tokens clair et sombre), composants, icons.ts
  lib/                    # dates.ts (Europe/Paris), env.ts, queryClient.ts, data.ts (lecture des JSON publiés)
  i18n/                   # fr.ts : toutes les chaînes UI
shared/                   # schémas Zod, config des villes et des modèles, logique pure du mélange
pipeline/                 # collecte, archive, vérification, mélange, publication ; backtest/
docs/
  QUATRAURO_PROJECT_BRIEF.md  adr/  design/  features/
```

Dépendances unidirectionnelles : `app/` → `features/` → `ui/` + `lib/` + `shared/` ; `pipeline/` → `shared/`. `shared/` n'importe rien d'autre.

---

## 4. Conventions de travail

Voir [AGENTS.md](../AGENTS.md) : langue, principes (DRY, SOLID, KISS, YAGNI), tests non négociables, documentation tenue à jour dans le même commit, une issue → une branche → une PR, Yann relit et merge.

---

## 5. Règles métier

### 5.1 Villes

Une ville est une entrée de `shared/cities.ts` : identifiant (`toulon`, `nice`), nom affiché, coordonnées du point de prévision, altitude, station d'observation de référence. Les coordonnées et la station sont fixées par le spike M0-02 (un point en bord de mer mal placé tombe sur une maille « mer » du modèle : à vérifier ville par ville).

### 5.2 Modèles

Un modèle est une entrée de `shared/models.ts` : identifiant, nom affiché, fournisseur, portée en jours, fréquence de mise à jour, identifiant côté Open-Meteo. Les modèles n'ont pas tous la même portée : les modèles à maille fine (AROME) s'arrêtent à quelques jours, les modèles globaux vont au-delà de sept jours. Le mélange d'une échéance n'utilise que les modèles qui la couvrent, et l'app l'indique.

### 5.3 Variables

| Variable | Unité | Remarque |
|---|---|---|
| Température à 2 m | °C | Variable principale du backtest |
| Température ressentie | °C | Dérivée, affichée sans indice propre |
| Précipitations | mm et probabilité (%) | La probabilité vient de l'accord entre modèles, calibrée sur l'historique |
| Vent moyen, rafales, direction | km/h, ° | La direction se moyenne en vecteurs, jamais en degrés |
| Nébulosité et condition | % et catégorie | La catégorie (soleil, éclaircies, couvert, pluie, averses, orage, vent fort…) est dérivée des champs mélangés par des règles testées |
| Humidité relative | % | Affichage seul |

### 5.4 Mélange

Pour chaque ville, variable, échéance et modèle :

1. **Biais** : on suit l'écart moyen entre la prévision du modèle et l'observation par une moyenne mobile à pondération exponentielle, et on le retranche.
2. **Poids** : chaque modèle pèse en raison inverse de son erreur absolue moyenne récente, après correction du biais.
3. **Mélange** : moyenne pondérée des modèles disponibles pour cette échéance.

Les échéances sont regroupées en tranches (par exemple J+1, J+2, J+3, J+4–5, J+6–7), et l'heure de la journée peut être prise en compte si le backtest montre que ça paie. La fenêtre d'historique, la vitesse d'oubli, l'exposant des poids et le découpage des tranches sont des paramètres nommés dans une configuration unique, fixés par le backtest (M0-03) et consignés dans l'ADR 0003.

Un modèle sans historique suffisant reçoit un poids neutre. Un modèle absent d'un run (panne, retard) est simplement ignoré pour ce run, et le fichier publié le signale.

### 5.5 Indice de fiabilité

Un pourcentage par jour et par ville, construit à partir de l'écart entre les modèles, de l'échéance et de l'erreur historique à cette échéance. Il s'accompagne d'un libellé (« Sûr », « Probable », « Incertain ») et du nombre de modèles d'accord. Sa formule est dans `shared/`, testée, et il doit être **calibré** : quand l'app annonce 90 %, la prévision doit être tenue environ neuf fois sur dix (critère précisé dans l'issue).

### 5.6 Vérification

Chaque jour, le pipeline apparie les prévisions archivées aux observations, met à jour biais, erreurs et poids, et produit les scores affichés par l'écran « Fiabilité » : erreur moyenne du mélange et de chaque modèle par échéance, prévu contre observé des sept derniers jours, taux de réussite de la pluie. Le mélange est toujours comparé au **meilleur modèle seul** sur la même période.

### 5.7 Écrans

| Écran | Contenu | Maquette |
|---|---|---|
| Accueil d'une ville | Bloc d'état (température, condition, fiabilité), prochaines heures, sept jours avec min, max et fiabilité | `riviera-accueil`, `riviera-accueil-pluie` |
| Détail d'un jour | Min et max, résumé, température et risque de pluie dans la journée, vent, cumul, humidité, ressenti, désaccord des modèles | `riviera-jour` |
| Les modèles | Prévision combinée, valeur et poids de chaque modèle, erreur récente | `riviera-modeles` |
| Fiabilité | Erreur du mélange contre le meilleur modèle, prévu contre observé, erreur selon l'échéance | `riviera-fiabilite` |
| À propos des données | Sources, attributions, date de mise à jour | À dériver de la spécification |

La bascule Toulon / Nice est en haut de l'accueil. Toucher un jour ouvre son détail ; toucher la pastille de fiabilité ouvre « Les modèles » ; « Fiabilité » est accessible depuis l'accueil.

### 5.8 Hors ligne et fraîcheur

L'app affiche la dernière prévision reçue, avec l'heure de calcul. Au-delà d'un seuil (par exemple 12 h), un bandeau signale que la prévision est ancienne. Sans aucune donnée (premier lancement hors ligne), un état vide explique quoi faire. Jamais d'écran blanc ni de valeur par défaut qui ressemble à une vraie prévision.

### 5.9 Thèmes

Clair et sombre, tous les écrans. Par défaut l'app suit le réglage du système ; un réglage manuel (Système, Clair, Sombre) est mémorisé sur l'appareil. Le bloc d'état change de couleur selon la condition (bleu vif par beau temps, bleu ardoise sous la pluie ; les autres états sont définis en M0-10).

### 5.10 Résumés

Les libellés (« Grand soleil », « Pluie dès 15 h », « Matinée sèche, soirée arrosée ») sont produits par des règles déterministes dans `shared/`, à partir des données mélangées. Pas d'IA générative.

---

## 6. Contrat de données (indicatif)

Le pipeline publie, par ville, un fichier de prévision et un fichier de vérification, validés par les schémas Zod de `shared/` (même schéma des deux côtés).

```jsonc
// forecast/<ville>.json
{
  "schemaVersion": 1,
  "city": "toulon",
  "generatedAt": "2026-11-17T15:00:00Z",
  "models": [{ "id": "arome", "available": true, "runAt": "2026-11-17T12:00:00Z" }],
  "hourly": [{
    "time": "2026-11-17T16:00:00Z",
    "temperature": 16.3, "temperatureSpread": 0.6,
    "precipitationProbability": 0, "precipitation": 0,
    "windSpeed": 18, "windGusts": 30, "windDirection": 315,
    "cloudCover": 10, "condition": "clear",
    "byModel": { "arome": { "temperature": 16.9 } }
  }],
  "daily": [{
    "date": "2026-11-17", "min": 9, "max": 16, "condition": "clear",
    "summary": "Grand soleil", "reliability": 95, "reliabilityLabel": "sure",
    "modelsAgreeing": 4, "modelsTotal": 4,
    "weights": { "arome": 0.35, "ifs": 0.24, "arpege": 0.23, "icon": 0.18 }
  }]
}
```

`verification/<ville>.json` porte les scores du § 5.6. Le contrat réel est défini par l'issue M1-01 ; tout changement incompatible incrémente `schemaVersion`, et l'app refuse proprement une version qu'elle ne connaît pas.

---

## 7. Services externes

### 7.1 Open-Meteo

API de prévision ouverte qui expose de nombreux modèles nationaux, interrogeables séparément (paramètre `models`). Accès gratuit sans clé pour un usage non commercial, données sous licence CC BY 4.0 (attribution à afficher). À vérifier dans M0-02 : conditions exactes, quotas, liste et portée des modèles disponibles pour Toulon et Nice, et les API d'historique utiles au backtest (prévisions passées par échéance, runs archivés) avec leur profondeur.

### 7.2 Observations

Stations Météo-France proches de Toulon et de Nice, via les données publiques de Météo-France. À vérifier dans M0-02 : point d'accès, licence, clé éventuelle, délai de mise à disposition, variables disponibles au pas horaire. Solution de repli si l'accès est impraticable : une analyse de modèle comme référence, moins fiable en bord de mer.

### 7.3 GitHub

GitHub Actions pour le cron et la CI ; la branche `data` pour l'archive et les fichiers publiés. À vérifier dans M1-12 : précision réelle des horaires programmés, désactivation des workflows planifiés sur un repo inactif, droits d'écriture du `GITHUB_TOKEN`.

### 7.4 Expo et EAS

Build de l'APK et mises à jour JavaScript. Compte Expo de Yann.

---

## 8. Direction artistique

« Riviera » : de grands aplats de couleur, des formes très arrondies, une typographie ronde (Outfit), un bloc d'état bleu vif surmonté d'un grand chiffre, un rond jaune pour le soleil. Le jaune est réservé au soleil et à la pastille de fiabilité. Pas de dégradé, pas d'ombre floue, pas d'emoji : des icônes au trait.

La [spécification](design/riviera.md) fait foi pour les tokens, les composants et les écrans ; les maquettes sont dans [docs/design/claude-design/](design/claude-design/).

---

## 9. Organisation GitHub

### 9.1 Labels

| Label | Couleur | Description |
|---|---|---|
| `epic` | `0B1B3A` | Epic regroupant plusieurs issues |
| `feature` | `1463FF` | Fonctionnalité |
| `chore` | `DCE8F7` | Outillage, configuration, CI |
| `design` | `FFC93C` | UI, direction artistique, assets |
| `spike` | `7FB0FF` | Étude technique courte qui débouche sur une ADR |
| `manual` | `F0CF86` | Action manuelle de Yann |
| `idea` | `EAF4FF` | Idée hors périmètre, à rediscuter |
| `area:infra` | `EDE3D1` | Projet, CI, builds |
| `area:melange` | `EDE3D1` | Logique pure : biais, poids, mélange, fiabilité |
| `area:pipeline` | `EDE3D1` | Collecte, archive, vérification, publication, cron |
| `area:donnees` | `EDE3D1` | Sources de prévision et d'observation |
| `area:app` | `EDE3D1` | Écrans, navigation, cache |

### 9.2 Milestones

| Milestone | Description |
|---|---|
| M0 — Fondations | Spikes sources et backtest (feu vert), projet Expo, CI, design system Riviera, build Android |
| M1 — Le mélange | Logique de mélange, collecte, archive, vérification, publication des JSON, cron |
| M2 — L'app | Accueil, bascule de ville, détail d'un jour, thèmes, hors ligne |
| M3 — Transparence | Écrans « Les modèles » et « Fiabilité », attributions |
| M4 — Finitions | États vides et erreurs, accessibilité, captures de référence |

### 9.3 Gabarit d'issue

```markdown
## Contexte
Pourquoi cette issue existe, en 2-3 phrases.

## Objectif
Le résultat attendu, du point de vue de l'utilisateur ou du système.

## Spécifications
Les règles, écrans, données et contrats.

## Critères d'acceptation
- [ ] …

## Tests attendus
Les tests unitaires et de composants à écrire.

## Dépendances
Bloquée par #…

## Références
docs/QUATRAURO_PROJECT_BRIEF.md § …
```

Les issues `manual` remplacent « Spécifications » par « Étapes (Yann) ». Les issues `spike` se terminent par une ADR. Un epic contient l'objectif, le périmètre, la liste de ses issues (aussi rattachées en sous-issues) et son critère de complétion.

Chaque issue porte un identifiant de travail en préfixe de son titre (`[M1-03] …`), et chaque epic le sien (`[E2] …`).

---

## 10. Backlog

Le détail de chaque issue est sur GitHub. Vue d'ensemble :

| Milestone | Epic | Issues |
|---|---|---|
| M0 — Fondations | E0 Socle technique | M0-01 à M0-07 (dont les spikes sources et backtest) |
| M0 — Fondations | E1 Design system Riviera | M0-08 à M0-12 |
| M1 — Le mélange | E2 Logique de mélange | M1-01 à M1-06 |
| M1 — Le mélange | E3 Pipeline | M1-07 à M1-12 |
| M2 — L'app | E4 Données dans l'app | M2-01 à M2-02 |
| M2 — L'app | E5 Écrans de prévision | M2-03 à M2-06 |
| M3 — Transparence | E6 Modèles et fiabilité | M3-01 à M3-03 |
| M4 — Finitions | E7 Finitions | M4-01 à M4-02 |

**Ordre imposé** : les spikes M0-02 puis M0-03 passent avant tout le reste. Tant que M0-03 n'a pas donné son feu vert, on n'écrit ni le pipeline ni l'app.

---

## 11. Idées hors périmètre

Créées en issues `idea`, sans milestone :

- Widget Android sur l'écran d'accueil.
- Alerte de pluie (notification avant une averse).
- D'autres villes.
- Prévisions d'ensemble pour une vraie probabilité de pluie.
- Version iOS.

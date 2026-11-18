# Écran « Fiabilité »

C'est l'écran qui prouve, ou non, que le projet tient sa promesse : la prévision combinée fait-elle mieux que le meilleur modèle seul ? Maquette : `riviera-fiabilite` ([spécification](../design/riviera.md)).

| Fichier | Rôle |
|---|---|
| `app/reliability.tsx` | La route : `/reliability` |
| `src/features/reliability/components/ReliabilityScreen.tsx` | L'écran |
| `src/features/reliability/reliability.ts` | Fonction pure : ce que l'écran affiche, tiré du fichier de vérification |
| `…/ComparedDaysCard.tsx`, `…/LeadErrorsCard.tsx` | Prévu contre observé, erreur selon l'échéance |

On y arrive par « Fiabilité des prévisions », sur l'accueil. **Les chiffres sont ceux de `verification/<ville>.json`** ([contrat](contrat-de-donnees.md), [calcul](archive-et-verification.md)) : l'app les met en forme, elle ne recalcule rien.

## Ce que montre l'écran

1. **Bloc** : l'erreur moyenne des prévisions faites la veille (température, en °C), sur la période des scores ; la comparaison au meilleur modèle seul ; la pastille « Pluie : 24 jours sur 30 bien annoncés ».
2. **7 derniers jours** : pour chaque jour, la température maximale prévue la veille, celle qui a été mesurée, et l'écart. Du plus récent au plus ancien.
3. **Erreur selon l'échéance** : l'erreur moyenne du mélange pour les prévisions faites 1 à 7 jours avant, en barres.
4. La période des scores (« Scores du 17 octobre au 16 novembre »).

## Honnêteté

La phrase sous le chiffre dit ce qui est, dans les trois cas, sans mise en forme flatteuse :

| Cas | Phrase |
|---|---|
| Le mélange fait mieux | « contre 1,2° pour le meilleur modèle seul (ICON) » |
| À égalité | « à égalité avec le meilleur modèle seul (ICON, 1,2°) » |
| **Le mélange fait moins bien** | « Sur cette période, la prévision combinée fait moins bien que ICON seul (1,2°). », en gras |
| Aucun modèle n'a pu être noté | « Aucun modèle seul n'a pu être noté sur cette période. » |

La comparaison se fait sur les valeurs du fichier, sans tolérance : 1,19 contre 1,18 est « moins bien ».

## Historique insuffisant

Tant que moins de **168 heures** de prévisions ont été comparées aux mesures (une semaine, `MIN_VERIFIED_HOURS`), l'écran n'affiche aucun score : « Pas encore assez de recul », avec le nombre d'heures déjà comparées. Une moyenne sur trois jours ne voudrait rien dire.

## Écarts importants

Un jour dont l'écart atteint **2 °C** (`LARGE_GAP_DEGREES`, la tolérance d'une prévision « tenue ») est signalé par une **icône** devant l'écart, par un **texte en gras**, et par « écart important » pour les lecteurs d'écran : jamais par la seule couleur.

## Cas limites

| Cas | Comportement |
|---|---|
| Jour sans observation, ou sans prévision la veille | « — » pour la valeur manquante et pour l'écart ; aucun écart n'est inventé |
| Aucun jour de pluie comparé | Pas de pastille |
| Aucun jour comparé | Pas de carte des sept jours |
| Scores en cours de chargement, ou impossibles à charger | « Chargement des scores… », ou « Les scores n'ont pas pu être chargés. » |

Le geste « tirer pour rafraîchir » redemande le fichier.

## Accessibilité

- Chaque jour se lit d'une traite : « dimanche 15, prévu 16,2 degrés, observé 16,7 degrés, écart 0,5 degrés ».
- Chaque échéance se lit : « prévisions faites 3 jours avant, erreur moyenne 1,2 degrés ».
- Les en-têtes de colonnes (Prévu, Observé, Écart) sont masqués aux lecteurs d'écran : chaque ligne les redit.

## Tests

- `src/features/reliability/__tests__/reliability.test.ts` : sur un vrai fichier de vérification. Chiffres repris tels quels, verdict (mieux, égal, moins bien, personne à qui comparer), jours comparés, écart important dans les deux sens, jour sans observation, historique insuffisant (rien, puis juste sous une semaine).
- `__tests__/app.test.tsx` : l'écran dans l'app. Mélange meilleur, mélange moins bon, écart important, jour sans observation, historique court, scores impossibles à charger.

# Backtest du mélange

Rapport du spike M0-03 ([#5](https://github.com/YannVogel/quatrauro/issues/5)) : le mélange de modèles fait-il mieux que le meilleur modèle seul, à Toulon et à Nice ? La décision qui en découle est dans l'[ADR 0003](../adr/0003-methode-de-melange.md).

Tous les chiffres viennent du passage du 17 novembre 2026 sur des données réelles (prévisions archivées par Open-Meteo, observations de Météo-France). Les tableaux complets sont dans [backtest-resultats.md](backtest-resultats.md), un fichier généré par le script : cette page en donne la méthode, la lecture et les limites.

## Verdict

**Feu vert.** Le critère de l'issue est atteint dans les deux villes, sur une période où aucun paramètre n'a été réglé.

> Critère : le mélange réduit l'erreur absolue moyenne de température d'au moins 5 % face au meilleur modèle seul « sur la fenêtre précédente », sur la majorité des tranches d'échéance, sans dégrader la pluie.

| | Toulon | Nice |
|---|---|---|
| Échéances où le gain atteint 5 % | **7 sur 7** | **7 sur 7** |
| Gain en température, de J+1 à J+7 | 8 % à 23 % | 6 % à 27 % |
| Erreur absolue moyenne du mélange, J+1 → J+7 | 1,03 °C → 1,62 °C | 0,77 °C → 1,40 °C |
| Pluie à la journée : bonnes annonces, mélange contre meilleur modèle seul | 91,4 % contre 91,1 % | 92,0 % contre 89,0 % |
| Pluie à la journée : indice de succès critique | 0,459 contre 0,425 | 0,380 contre 0,324 |
| Pluie dégradée ? | non | non |

Trois réserves à garder en tête, détaillées plus bas :

1. **À Toulon, à courte échéance, presque tout le gain vient de la correction de biais**, pas du mélange lui-même : face au meilleur modèle *une fois corrigé*, le mélange ne gagne que 0,3 % à 2,9 % de J+1 à J+3.
2. **La pluie est jugée sur peu de cas** : 17 jours de pluie à Toulon et 16 à Nice sur la période de validation.
3. **Avec la définition proposée d'une prévision « tenue », Toulon n'est presque jamais « Sûr »** : c'est un choix à valider.

## Données

| | |
|---|---|
| Villes | Toulon et Nice, aux points et stations de l'[ADR 0002](../adr/0002-sources-de-donnees-meteo.md) |
| Modèles | AROME, ARPEGE, IFS, ICON, GFS ; UKMO évalué à part comme candidat |
| Prévisions | API Previous Runs d'Open-Meteo : pour chaque heure, la valeur prévue 1 à 7 jours plus tôt |
| Observations | Fichiers horaires de Météo-France, stations `83137001` et `06088001` |
| Période | du 1er octobre 2025 au 15 novembre 2026 (IFS n'est archivé que depuis octobre 2025) |
| Apprentissage | les 46 premiers jours ne sont pas notés |
| Période de sélection | du 16 novembre 2025 au 15 mai 2026 : on y règle les paramètres |
| Période de validation | du 16 mai au 15 novembre 2026 : on y juge, sans plus rien régler |

« J+N » désigne ici la prévision faite exactement N × 24 heures avant l'heure visée. Tous les modèles ne couvrent pas toutes les échéances dans l'historique : AROME seulement J+1, ARPEGE jusqu'à J+3, ICON jusqu'à J+6. À J+7, le mélange ne réunit qu'IFS et GFS.

## Méthode

### Sans triche

Une prévision d'échéance N pour l'heure h a été émise à h − 24 N. À cet instant, on ne connaissait que les observations déjà publiées, soit celles antérieures d'au moins 30 heures (le délai mesuré en M0-02 est de 27 heures au plus). Le biais et les poids appliqués à une prévision n'utilisent donc que des paires dont l'heure est antérieure à h − 24 N − 30 h. Un test falsifie les observations à partir d'une date et vérifie qu'aucune prévision émise avant leur publication ne change.

### Le mélange testé

C'est celui de l'ADR 0003, pour chaque ville, variable, modèle et tranche d'échéance :

1. **Biais** : moyenne à pondération exponentielle de l'écart prévision − observation, retranchée des prévisions suivantes.
2. **Poids** : inverse de l'erreur absolue moyenne récente du modèle corrigé, élevé à un exposant.
3. **Mélange** : moyenne pondérée des modèles disponibles.

### Les références

| Référence | Ce que c'est |
|---|---|
| Chaque modèle seul | Sa prévision brute |
| Moyenne simple | Moyenne des modèles bruts disponibles |
| Meilleur après coup | Le modèle brut le plus précis sur toute la période : connu seulement à la fin |
| **Meilleur, fenêtre précédente** | Le modèle brut le plus précis sur les 30 jours précédant l'émission. C'est la comparaison honnête, et la référence du feu vert |
| Meilleur corrigé, après coup | Le modèle le plus précis une fois son biais corrigé : sépare ce que rapporte la correction de ce que rapporte le mélange |

Toutes les méthodes sont notées sur les mêmes heures : celles où l'observation et tous les modèles attendus à l'échéance existent.

### Sélection puis validation

Les paramètres sont choisis sur la première moitié de l'année, sur la température seule, puis figés. Le verdict se lit sur la seconde moitié. Les chiffres « année entière » sont donnés pour information : ils contiennent la période de sélection.

## Paramètres retenus

Grille de 640 combinaisons. La mesure est l'erreur absolue moyenne du mélange en température, moyennée sur les deux villes et les sept échéances.

| Paramètre | Valeur retenue | Valeurs essayées | Ce que montre la grille |
|---|---|---|---|
| Vitesse d'oubli du biais (demi-vie) | **20 jours** | 5, 10, 20, 40 | 5 jours est nettement moins bon : le biais suit alors le bruit |
| Fenêtre de l'erreur récente (demi-vie) | **60 jours** | 10, 30, 60, 120 | Presque sans effet au-delà de 30 jours |
| Exposant des poids | **4** | 0, 1, 2, 4, 8 | Des poids égaux (0) sont les moins bons ; 8 concentre trop |
| Heure de la journée | **24 blocs** (un par heure UTC) | 1, 4, 8, 24 | Le paramètre qui compte le plus : sans distinction d'heure, l'erreur monte de 3 % |
| Découpage des échéances | **J+1, J+2, J+3, J+4–5, J+6–7** | par jour, ou regroupé | Équivalents ; le regroupement divise l'état à stocker |

- La combinaison retenue fait 1,1950 °C ; la meilleure de la grille 1,1948 °C (fenêtre de 120 jours). À moins de 0,1 % d'écart, on garde la fenêtre la plus courte, qui réagit plus vite quand un modèle change.
- Toute la grille tient entre 1,19 °C et 1,28 °C : **le résultat dépend peu du réglage fin**, ce qui limite le risque de surapprentissage.
- **Tenir compte de l'heure paie**, comme le brief le supposait : le biais d'un modèle en bord de mer n'est pas le même à 5 h et à 15 h. Les blocs sont en heures UTC, parce que le biais suit le soleil et non l'heure légale.
- Deux réglages fixes, non explorés : un modèle n'est ni corrigé ni noté avant 10 paires ; l'erreur utilisée pour les poids ne descend pas sous 0,05.

Écart avec la proposition de départ : l'erreur récente est une **moyenne à pondération exponentielle**, pas une fenêtre glissante. L'état d'un modèle tient alors en quatre nombres au lieu d'une liste de jours, ce qui compte pour le fichier d'état du pipeline.

## Résultats

### Température

Période de validation. Erreur absolue moyenne en °C ; le gain est mesuré face au meilleur modèle de la fenêtre précédente.

| Échéance | Toulon : meilleur seul | Toulon : mélange | Gain | Nice : meilleur seul | Nice : mélange | Gain |
|---|---|---|---|---|---|---|
| J+1 | 1,15 | **1,03** | +11,0 % | 1,05 | **0,77** | +27,2 % |
| J+2 | 1,21 | **1,11** | +8,1 % | 0,93 | **0,79** | +14,7 % |
| J+3 | 1,25 | **1,14** | +8,7 % | 1,01 | **0,89** | +12,3 % |
| J+4 | 1,34 | **1,21** | +9,4 % | 1,07 | **0,94** | +12,6 % |
| J+5 | 1,57 | **1,27** | +19,5 % | 1,32 | **1,09** | +17,7 % |
| J+6 | 1,80 | **1,39** | +22,9 % | 1,33 | **1,19** | +10,9 % |
| J+7 | 1,88 | **1,62** | +13,4 % | 1,49 | **1,40** | +5,9 % |

Le biais résiduel du mélange reste sous 0,1 °C à toutes les échéances. Sur l'année entière, les gains vont de 12 % à 23 % à Toulon et de 11 % à 26 % à Nice.

**D'où vient le gain.** Face au meilleur modèle *corrigé de son biais* (connu après coup, donc une comparaison sévère), le mélange gagne encore :

| Échéance | J+1 | J+2 | J+3 | J+4 | J+5 | J+6 | J+7 |
|---|---|---|---|---|---|---|---|
| Toulon | +1,4 % | +0,3 % | +2,9 % | +6,0 % | +12,9 % | +15,3 % | +5,4 % |
| Nice | +12,1 % | +6,1 % | +6,7 % | +9,1 % | +11,5 % | +8,6 % | +9,1 % |

À Nice, mélanger apporte à toutes les échéances. À Toulon, de J+1 à J+3, ICON corrigé fait presque aussi bien que le mélange : l'essentiel du gain y vient de la correction de biais. Le mélange garde un intérêt même là : on ne sait pas d'avance quel modèle sera le meilleur, et il le reste si ICON se dégrade.

### Autres variables

Mêmes paramètres, sans réglage propre, sur l'année entière. Gain face au meilleur modèle de la fenêtre précédente :

| Variable | Modèles mélangés | Toulon | Nice |
|---|---|---|---|
| Humidité | les cinq | +10 % à +15 % | +14 % à +30 % |
| Vent moyen | IFS, ICON, GFS | +13 % à +22 % | +30 % à +36 % |
| Rafales | ICON, GFS | +12 % à +22 % | +33 % à +39 % |
| Nébulosité | les cinq | pas de mesure | +9 % à +18 % |

- **Vent** : AROME et ARPEGE n'ont d'historique de vent que depuis le 7 août 2026, et IFS n'a pas de rafales : ils sont absents de ces lignes. Le gain du vent à Nice est surtout une correction de biais (la station est sur la piste de l'aéroport, bien plus ventée que la maille des modèles).
- **Nébulosité** : à Nice, la moyenne simple des modèles bruts fait aussi bien que le mélange (16,0 % d'erreur contre 16,5 % à J+1). Proposition : **moyenne simple, sans correction ni pondération, dans les deux villes**. Cela règle du même coup le cas de Toulon, où la nébulosité n'est pas mesurée.
- La correction de biais peut sortir une valeur de ses bornes (vent négatif, humidité au-dessus de 100 %) : à borner en M1-04.

### Pluie

Une moyenne des cumuls ne dit pas s'il pleuvra. Méthode proposée et évaluée :

- **Probabilité** : la part des modèles qui annoncent de la pluie, rangée en cinq classes (aucun, une minorité, la moitié, une majorité, tous), puis remplacée par la fréquence de pluie observée dans le passé pour cette classe et cette tranche d'échéance.
- **Annonce** : le mélange annonce de la pluie quand la probabilité atteint un seuil.
- **Cumul** : moyenne simple des modèles.

Il « pleut » dans l'heure à partir de 0,2 mm (la résolution du pluviomètre), dans la journée à partir de 1 mm.

**Une première version a échoué**, et il faut le dire : avec un seuil d'annonce de 50 %, le mélange ratait la plupart des pluies (indice de succès critique de 0,32 contre 0,50 pour le meilleur modèle seul à Toulon, sur l'année). La probabilité était bonne, mais elle dépasse rarement 50 % : le seuil était mal choisi. Il a été réglé sur la période de sélection, puis jugé sur la période de validation.

| Réglage | À la journée | À l'heure |
|---|---|---|
| Seuil d'annonce | **30 %** | **20 %** |
| Poids de la fréquence d'ensemble face à une classe peu fournie | 5 cas fictifs | 5 cas fictifs |
| Historique minimal avant de calibrer | 30 cas | 30 cas |

Résultats sur la période de validation, toutes échéances confondues :

| | Toulon : mélange | Toulon : meilleur seul | Nice : mélange | Nice : meilleur seul |
|---|---|---|---|---|
| Journée : bonnes annonces | **91,4 %** | 91,1 % | **92,0 %** | 89,0 % |
| Journée : indice de succès critique | **0,459** | 0,425 | **0,380** | 0,324 |
| Heure : bonnes annonces | **95,8 %** | 95,2 % | **96,5 %** | 95,2 % |
| Heure : indice de succès critique | **0,225** | 0,190 | **0,226** | 0,195 |

- **La probabilité est le vrai apport.** À la journée, son score de Brier (plus il est bas, mieux c'est) va de 0,036 à 0,063 selon l'échéance à Toulon, contre 0,049 à 0,114 pour le meilleur modèle seul ; à Nice, de 0,038 à 0,072 contre 0,076 à 0,158. Elle fait mieux que la climatologie à toutes les échéances.
- **Calibration** : à l'heure, la probabilité annoncée colle à la fréquence observée à quelques points près. À la journée, les classes sont peu fournies et les écarts montent jusqu'à 17 points (62 % annoncés, 79 % observés à Nice, sur 38 jours).
- **Le cumul** par moyenne simple fait jeu égal avec le meilleur modèle seul : mieux à certaines échéances, moins bien à d'autres.
- **À l'heure, au-delà de J+5, le mélange n'annonce presque plus de pluie** : la probabilité n'atteint plus 20 %. C'est honnête (on ne sait pas dire à l'heure près s'il pleuvra dans six jours), mais à savoir.

### Indice de fiabilité

**Définition proposée d'une prévision « tenue »**, pour un jour : le minimum et le maximum de température sont à moins de 2 °C de l'observé, et l'annonce de pluie (oui ou non) est juste.

**Formule proposée** : l'indice d'un jour est la part des jours passés, dans une situation semblable, où la prévision a été tenue. Une situation, c'est :

- la tranche d'échéance ;
- le désaccord entre modèles : écart-type moyen sur la journée, en trois niveaux (moins de 0,6 °C, de 0,6 à 0,9 °C, au-delà) ;
- la netteté du signal de pluie : probabilité entre 20 % et 80 % (incertain) ou en dehors (net).

Le taux d'une situation rare est tiré vers le taux de sa tranche, et l'indice ne monte jamais quand le désaccord augmente. Il réunit donc bien l'écart entre modèles, l'échéance et l'erreur passée, et il est indisponible avant 30 jours vérifiés.

**Calibration**, deux villes et toutes échéances confondues, période de validation :

| Indice annoncé | Jours | Indice moyen | Prévisions tenues |
|---|---|---|---|
| moins de 30 % | 52 | 27 % | 29 % |
| 30 % à 40 % | 372 | 36 % | 45 % |
| 40 % à 50 % | 396 | 45 % | 49 % |
| 50 % à 60 % | 370 | 56 % | 61 % |
| 60 % à 70 % | 496 | 65 % | 66 % |
| 70 % à 80 % | 190 | 75 % | 73 % |
| 80 % à 90 % | 284 | 84 % | 82 % |
| 90 % et plus | 416 | 94 % | 93 % |

L'indice est calibré : quand il annonce 94 %, la prévision est tenue 93 fois sur 100. Le plus grand écart est de 10 points (classe 30–40 %), à la limite du critère.

**Critère chiffré pour M1-05** : dans chaque classe de dix points qui réunit au moins 50 jours, l'écart entre l'indice moyen et la part des prévisions tenues ne dépasse pas 10 points.

**Le point qui demande une décision.** Part des prévisions tenues sur l'année, et libellés avec les seuils proposés (Sûr à partir de 80 %, Probable à partir de 60 %) :

| | J+1 | J+3 | J+5 | J+7 | Jours « Sûr » | « Probable » | « Incertain » |
|---|---|---|---|---|---|---|---|
| Toulon | 67 % | 59 % | 51 % | 33 % | 0 % | 24 % | 76 % |
| Nice | 88 % | 82 % | 71 % | 52 % | 51 % | 30 % | 19 % |

À Toulon, c'est le minimum de température qui pèche (80 % à ± 2 °C dès J+1, contre 97 % à Nice). Résultat : **Toulon n'est presque jamais « Sûr »**. L'indice dit vrai, mais un libellé « Incertain » trois jours sur quatre n'aide pas. Une tolérance de ± 2,5 °C donnerait 79 % de prévisions tenues à J+1 à Toulon et 93 % à Nice ; ± 3 °C, 84 % et 93 %. La tolérance et les seuils des libellés sont des réglages de produit, à valider par Yann ; ± 2 °C a été fixé avant de voir les chiffres et n'a pas été retouché.

### UKMO, modèle candidat

Ajouter UKMO change l'erreur du mélange de +0,4 % à +1,1 % à Toulon et de −0,7 % à +0,7 % à Nice. **Non retenu** : un sixième modèle à collecter et à suivre pour un gain dans le bruit.

## Limites

- **Une seule année, coupée en deux saisons.** Les paramètres sont réglés sur l'hiver et le printemps, jugés sur l'été et l'automne. C'est sévère (le régime change entre les deux) et le mélange passe, mais une année ne dit rien des années atypiques.
- **Peu de pluie en validation** : 17 et 16 jours de pluie. Les sept échéances d'un même jour ne sont pas indépendantes. Le résultat « pluie non dégradée » est cohérent avec l'année entière (87,1 % et 0,522 contre 87,1 % et 0,504 à Toulon ; 88,5 % et 0,428 contre 86,1 % et 0,385 à Nice), sans être une preuve.
- **Ce que vaut « N jours avant »** : la documentation d'Open-Meteo ne dit pas si le décalage compte depuis l'initialisation du run ou depuis sa mise à disposition. Dans le premier cas, les erreurs absolues sont un peu optimistes (un run n'est disponible que 4 à 6 heures après son initialisation). Tous les modèles et le mélange sont logés à la même enseigne : la comparaison reste valable.
- **Échéances pleines** : le backtest ne connaît que des échéances de 24, 48… heures. Le pipeline produira des échéances intermédiaires ; la règle qui les rattache à une tranche est à fixer en M1.
- **Historique incomplet** : AROME n'est vérifiable qu'à J+1, le vent d'AROME et d'ARPEGE depuis août 2026 seulement, les rafales d'IFS pas du tout. Leur apport réel au vent n'est pas mesuré.
- **Paramètres réglés sur la température seule**, puis appliqués tels quels aux autres variables.
- **ICON change de nature à J+5** : `dwd_icon_seamless` passe d'ICON-EU à ICON global, et son erreur à Toulon saute (vent moyen : 5,5 km/h à J+4, 8,7 km/h à J+5). Le suivi par tranche d'échéance l'absorbe. ICON change aussi de grille le 30 novembre 2026.
- **Jours UTC** : les minimums, maximums et cumuls quotidiens portent sur des jours UTC, pas sur des jours de `Europe/Paris`. L'écart est d'une ou deux heures et ne change pas le verdict ; le pipeline, lui, agrège en heure de Paris.
- **La vérité est une station** : à Nice, l'aéroport, à 7 km du centre.
- **Le meilleur modèle seul pour la pluie** est désigné par l'erreur de son cumul sur 30 jours ; un autre critère de désignation donnerait une référence un peu différente.

## Relancer le backtest

```bash
npm test             # tous les tests, dont ceux du backtest et de la logique du mélange
npm run backtest     # télécharge si besoin, calcule, réécrit backtest-resultats.md
```

Le backtest s'exécute directement avec Node 24, sans compilation. Le premier passage télécharge environ 60 Mo (72 requêtes à Open-Meteo, soit environ 1 500 appels au sens de ses quotas, et deux fichiers de Météo-France) dans `pipeline/backtest/.cache/`, ignoré par git. Les passages suivants relisent ce cache et durent un peu plus d'une minute.

Le code est rangé pour la suite : `pipeline/backtest/logic/` contient les fonctions pures du mélange (biais, poids, mélange, pluie, fiabilité), sans dépendance à Node, à reprendre telles quelles dans `shared/` en M1. Le reste du dossier est l'outillage du backtest : lecture des données, rejeu sans fuite, mesures, rapport.

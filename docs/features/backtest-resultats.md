# Backtest du mélange : tableaux de résultats

> Fichier **généré** par `node pipeline/backtest/run.ts`. Ne pas le modifier à la main : relancer le script. La méthode, la lecture des résultats et leurs limites sont dans [backtest.md](backtest.md).

## Verdict

Critère de l'issue M0-03 : le mélange réduit l'erreur absolue moyenne de température d'au moins 5 % face au meilleur modèle seul « sur la fenêtre précédente », sur la majorité des tranches d'échéance, sans dégrader la pluie. Il est appliqué à la période de validation (du 16/05/2026 au 15/11/2026), dans chaque ville.

- **Température, Toulon** : gain d'au moins 5 % sur 7 échéances sur 7 → critère rempli.
- **Température, Nice** : gain d'au moins 5 % sur 7 échéances sur 7 → critère rempli.
- **Pluie, Toulon** : non dégradée.
- **Pluie, Nice** : non dégradée.

**Feu vert : le critère est atteint dans les deux villes.**

## Données

- **Période téléchargée** : du 01/10/2025 au 15/11/2026. Les 46 premiers jours servent d'apprentissage et ne sont pas notés.
- **Période de sélection** (réglage des paramètres) : du 16/11/2025 au 15/05/2026.
- **Période de validation** (jugement) : du 16/05/2026 au 15/11/2026.
- **Prévisions** : API Previous Runs d'Open-Meteo, décalages de 1 à 7 jours (« J+N » = prévision faite N × 24 h avant l'heure visée).
- **Observations** : fichiers horaires de Météo-France, stations 83137001 (Toulon) et 06088001 (Nice).
- **Délai de publication des observations** retenu : 30 h. Une prévision n'apprend que des observations publiées au moment où elle est émise.
- **Jours** : tous les agrégats quotidiens (minimum, maximum, cumul de pluie) portent sur des jours UTC.

Part des heures remplies entre le 01/10/2025 et le 15/11/2026, à l'échéance J+1 pour les modèles (les mêmes pour les deux villes : les trous sont ceux de l'archive d'Open-Meteo).

### Toulon

| Variable | Observation | AROME | ARPEGE | IFS | ICON | GFS | UKMO |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Température | 100 % | 100 % | 100 % | 96 % | 100 % | 100 % | 92 % |
| Humidité | 100 % | 99 % | 99 % | 96 % | 100 % | 100 % | 94 % |
| Vent moyen | 100 % | 24 % | 24 % | 97 % | 100 % | 100 % | 100 % |
| Rafales | 100 % | 24 % | 24 % | 0 % | 100 % | 100 % | 92 % |
| Nébulosité | 0 % | 99 % | 100 % | 100 % | 100 % | 100 % | 96 % |
| Précipitations | 100 % | 100 % | 100 % | 100 % | 100 % | 100 % | 96 % |

### Nice

| Variable | Observation | AROME | ARPEGE | IFS | ICON | GFS | UKMO |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Température | 100 % | 100 % | 100 % | 96 % | 100 % | 100 % | 92 % |
| Humidité | 100 % | 99 % | 99 % | 96 % | 100 % | 100 % | 94 % |
| Vent moyen | 100 % | 24 % | 24 % | 97 % | 100 % | 100 % | 100 % |
| Rafales | 100 % | 24 % | 24 % | 0 % | 100 % | 100 % | 92 % |
| Nébulosité | 100 % | 99 % | 100 % | 100 % | 100 % | 100 % | 96 % |
| Précipitations | 100 % | 100 % | 100 % | 100 % | 100 % | 100 % | 96 % |

## Paramètres du mélange

Grille de 640 combinaisons, évaluée sur la **période de sélection** (du 16/11/2025 au 15/05/2026), température seule. La mesure est l'erreur absolue moyenne du mélange, moyennée sur les deux villes et les sept échéances.

### Combinaison retenue

| Paramètre | Valeur retenue | Valeurs essayées |
| --- | --- | --- |
| Vitesse d’oubli du biais (demi-vie, jours) | **20** | 5, 10, 20, 40 |
| Fenêtre de l’erreur récente (demi-vie, jours) | **60** | 10, 30, 60, 120 |
| Exposant des poids | **4** | 0, 1, 2, 4, 8 |
| Blocs horaires par jour | **24** | 1, 4, 8, 24 |
| Découpage des échéances | **J+4–5 et J+6–7 regroupés** | par jour, J+4–5 et J+6–7 regroupés |

Erreur de la combinaison retenue : 1,1950 °C. Meilleure de la grille : 1,1948 °C ; plus mauvaise : 1,2834 °C. Deux combinaisons à moins de 0,1 % l'une de l'autre sont tenues pour équivalentes ; entre équivalentes, on garde la fenêtre d'erreur la plus courte.

### Les cinq meilleures combinaisons

| Vitesse d’oubli du biais (demi-vie, jours) | Fenêtre de l’erreur récente (demi-vie, jours) | Exposant des poids | Blocs horaires par jour | Découpage des échéances | Erreur (°C) |
| --- | --- | --- | --- | --- | --- |
| 20 | 120 | 4 | 24 | J+4–5 et J+6–7 regroupés | 1,1948 |
| 20 | 60 | 4 | 24 | J+4–5 et J+6–7 regroupés | 1,1950 |
| 20 | 120 | 4 | 24 | par jour | 1,1961 |
| 20 | 30 | 4 | 24 | J+4–5 et J+6–7 regroupés | 1,1962 |
| 20 | 60 | 4 | 24 | par jour | 1,1963 |

### Effet propre de chaque paramètre

Erreur moyenne (°C) de toutes les combinaisons qui partagent une valeur du paramètre.

| Vitesse d’oubli du biais (demi-vie, jours) | 5 | 10 | 20 | 40 |
| --- | --- | --- | --- | --- |
| Erreur moyenne (°C) | 1,2453 | 1,2238 | 1,2201 | 1,2258 |

| Fenêtre de l’erreur récente (demi-vie, jours) | 10 | 30 | 60 | 120 |
| --- | --- | --- | --- | --- |
| Erreur moyenne (°C) | 1,2320 | 1,2280 | 1,2275 | 1,2274 |

| Exposant des poids | 0 | 1 | 2 | 4 | 8 |
| --- | --- | --- | --- | --- | --- |
| Erreur moyenne (°C) | 1,2439 | 1,2339 | 1,2263 | 1,2182 | 1,2214 |

| Blocs horaires par jour | 1 | 4 | 8 | 24 |
| --- | --- | --- | --- | --- |
| Erreur moyenne (°C) | 1,2536 | 1,2237 | 1,2196 | 1,2181 |

| Découpage des échéances | par jour | J+4–5 et J+6–7 regroupés |
| --- | --- | --- |
| Erreur moyenne (°C) | 1,2290 | 1,2285 |

## Température

Erreur absolue moyenne, en °C, sur les mêmes heures pour toutes les méthodes. « Meilleur après coup » est le modèle brut le plus précis sur la période, connu seulement à la fin. « Meilleur, fenêtre précédente » est le modèle brut le plus précis sur les 30 jours précédant l'émission : c'est la référence du feu vert. Le gain est la baisse d'erreur du mélange face à cette référence.

### Toulon

**Période de validation** (du 16/05/2026 au 15/11/2026), sur laquelle aucun paramètre n'a été réglé :

| Échéance | Heures notées | AROME | ARPEGE | IFS | ICON | GFS | Moyenne simple | Meilleur après coup | Meilleur, fenêtre précédente | **Mélange** | Gain du mélange | Biais du mélange |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| J+1 | 4 416 | 1,44 | 1,34 | 1,29 | 1,11 | 1,89 | 1,18 | 1,11 (ICON) | 1,15 | **1,03** | +11,0 % | −0,02 °C |
| J+2 | 4 416 | — | 1,45 | 1,34 | 1,18 | 1,94 | 1,25 | 1,18 (ICON) | 1,21 | **1,11** | +8,1 % | −0,02 °C |
| J+3 | 4 416 | — | 1,54 | 1,39 | 1,22 | 1,96 | 1,27 | 1,22 (ICON) | 1,25 | **1,14** | +8,7 % | 0,00 °C |
| J+4 | 4 416 | — | — | 1,42 | 1,33 | 2,02 | 1,33 | 1,33 (ICON) | 1,34 | **1,21** | +9,4 % | 0,00 °C |
| J+5 | 4 416 | — | — | 1,54 | 1,52 | 2,06 | 1,37 | 1,52 (ICON) | 1,57 | **1,27** | +19,5 % | 0,06 °C |
| J+6 | 4 416 | — | — | 1,84 | 1,67 | 2,17 | 1,47 | 1,67 (ICON) | 1,80 | **1,39** | +22,9 % | 0,09 °C |
| J+7 | 4 416 | — | — | 1,86 | — | 2,18 | 1,72 | 1,86 (IFS) | 1,88 | **1,62** | +13,4 % | 0,01 °C |

Échéances où le gain atteint 5 % : **7 sur 7** (J+1, J+2, J+3, J+4, J+5, J+6, J+7).

**Année entière** (du 16/11/2025 au 15/11/2026), pour information (elle contient la période de sélection) :

| Échéance | Heures notées | AROME | ARPEGE | IFS | ICON | GFS | Moyenne simple | Meilleur après coup | Meilleur, fenêtre précédente | **Mélange** | Gain du mélange | Biais du mélange |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| J+1 | 8 394 | 1,39 | 1,42 | 1,34 | 1,16 | 1,71 | 1,18 | 1,16 (ICON) | 1,21 | **1,03** | +15,2 % | −0,03 °C |
| J+2 | 8 370 | — | 1,51 | 1,39 | 1,21 | 1,79 | 1,28 | 1,21 (ICON) | 1,24 | **1,09** | +12,0 % | −0,02 °C |
| J+3 | 8 346 | — | 1,60 | 1,45 | 1,29 | 1,84 | 1,33 | 1,29 (ICON) | 1,32 | **1,14** | +13,9 % | −0,02 °C |
| J+4 | 8 725 | — | — | 1,53 | 1,41 | 1,92 | 1,40 | 1,41 (ICON) | 1,42 | **1,25** | +12,0 % | −0,07 °C |
| J+5 | 8 298 | — | — | 1,65 | 1,83 | 2,04 | 1,48 | 1,65 (IFS) | 1,71 | **1,35** | +21,4 % | 0,05 °C |
| J+6 | 8 268 | — | — | 1,90 | 1,98 | 2,15 | 1,60 | 1,90 (IFS) | 1,92 | **1,49** | +22,5 % | −0,01 °C |
| J+7 | 8 760 | — | — | 2,01 | — | 2,19 | 1,85 | 2,01 (IFS) | 2,02 | **1,68** | +16,8 % | −0,04 °C |

Ce que rapporte la correction de biais seule, modèle par modèle, et ce que le mélange ajoute au meilleur modèle corrigé (période de validation). Ce dernier n’est connu qu’après coup : la comparaison est sévère pour le mélange.

| Échéance | AROME brut | AROME corrigé | ARPEGE brut | ARPEGE corrigé | IFS brut | IFS corrigé | ICON brut | ICON corrigé | GFS brut | GFS corrigé | Meilleur corrigé, après coup | **Mélange** | Gain du mélange sur le meilleur corrigé |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| J+1 | 1,44 | 1,18 | 1,34 | 1,20 | 1,29 | 1,19 | 1,11 | 1,04 | 1,89 | 1,50 | 1,04 (ICON) | **1,03** | +1,4 % |
| J+2 | — | — | 1,45 | 1,31 | 1,34 | 1,25 | 1,18 | 1,12 | 1,94 | 1,53 | 1,12 (ICON) | **1,11** | +0,3 % |
| J+3 | — | — | 1,54 | 1,43 | 1,39 | 1,30 | 1,22 | 1,18 | 1,96 | 1,55 | 1,18 (ICON) | **1,14** | +2,9 % |
| J+4 | — | — | — | — | 1,42 | 1,33 | 1,33 | 1,29 | 2,02 | 1,63 | 1,29 (ICON) | **1,21** | +6,0 % |
| J+5 | — | — | — | — | 1,54 | 1,45 | 1,52 | 1,45 | 2,06 | 1,70 | 1,45 (ICON) | **1,27** | +12,9 % |
| J+6 | — | — | — | — | 1,84 | 1,66 | 1,67 | 1,64 | 2,17 | 1,83 | 1,64 (ICON) | **1,39** | +15,3 % |
| J+7 | — | — | — | — | 1,86 | 1,72 | — | — | 2,18 | 1,91 | 1,72 (IFS) | **1,62** | +5,4 % |

### Nice

**Période de validation** (du 16/05/2026 au 15/11/2026), sur laquelle aucun paramètre n'a été réglé :

| Échéance | Heures notées | AROME | ARPEGE | IFS | ICON | GFS | Moyenne simple | Meilleur après coup | Meilleur, fenêtre précédente | **Mélange** | Gain du mélange | Biais du mélange |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| J+1 | 4 416 | 1,27 | 1,20 | 1,22 | 1,23 | 1,08 | 0,87 | 1,08 (GFS) | 1,05 | **0,77** | +27,2 % | −0,03 °C |
| J+2 | 4 416 | — | 1,36 | 1,27 | 0,91 | 1,13 | 0,94 | 0,91 (ICON) | 0,93 | **0,79** | +14,7 % | −0,02 °C |
| J+3 | 4 416 | — | 1,49 | 1,34 | 0,99 | 1,18 | 1,00 | 0,99 (ICON) | 1,01 | **0,89** | +12,3 % | −0,02 °C |
| J+4 | 4 416 | — | — | 1,41 | 1,05 | 1,28 | 1,05 | 1,05 (ICON) | 1,07 | **0,94** | +12,6 % | −0,06 °C |
| J+5 | 4 416 | — | — | 1,47 | 1,28 | 1,37 | 1,17 | 1,28 (ICON) | 1,32 | **1,09** | +17,7 % | 0,08 °C |
| J+6 | 4 416 | — | — | 1,68 | 1,33 | 1,47 | 1,27 | 1,33 (ICON) | 1,33 | **1,19** | +10,9 % | 0,07 °C |
| J+7 | 4 416 | — | — | 1,73 | — | 1,58 | 1,47 | 1,58 (GFS) | 1,49 | **1,40** | +5,9 % | 0,02 °C |

Échéances où le gain atteint 5 % : **7 sur 7** (J+1, J+2, J+3, J+4, J+5, J+6, J+7).

**Année entière** (du 16/11/2025 au 15/11/2026), pour information (elle contient la période de sélection) :

| Échéance | Heures notées | AROME | ARPEGE | IFS | ICON | GFS | Moyenne simple | Meilleur après coup | Meilleur, fenêtre précédente | **Mélange** | Gain du mélange | Biais du mélange |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| J+1 | 8 394 | 1,46 | 1,15 | 1,45 | 1,14 | 1,13 | 0,87 | 1,13 (GFS) | 1,05 | **0,78** | +26,1 % | 0,00 °C |
| J+2 | 8 370 | — | 1,27 | 1,53 | 0,93 | 1,19 | 0,98 | 0,93 (ICON) | 0,95 | **0,81** | +14,4 % | −0,01 °C |
| J+3 | 8 346 | — | 1,38 | 1,60 | 1,02 | 1,26 | 1,05 | 1,02 (ICON) | 1,05 | **0,90** | +14,2 % | −0,01 °C |
| J+4 | 8 725 | — | — | 1,68 | 1,10 | 1,37 | 1,12 | 1,10 (ICON) | 1,11 | **0,99** | +11,0 % | 0,00 °C |
| J+5 | 8 298 | — | — | 1,72 | 1,35 | 1,49 | 1,27 | 1,35 (ICON) | 1,37 | **1,12** | +18,2 % | 0,00 °C |
| J+6 | 8 268 | — | — | 1,87 | 1,40 | 1,58 | 1,34 | 1,40 (ICON) | 1,42 | **1,21** | +14,8 % | 0,02 °C |
| J+7 | 8 760 | — | — | 2,00 | — | 1,70 | 1,64 | 1,70 (GFS) | 1,65 | **1,42** | +14,1 % | −0,03 °C |

Ce que rapporte la correction de biais seule, modèle par modèle, et ce que le mélange ajoute au meilleur modèle corrigé (période de validation). Ce dernier n’est connu qu’après coup : la comparaison est sévère pour le mélange.

| Échéance | AROME brut | AROME corrigé | ARPEGE brut | ARPEGE corrigé | IFS brut | IFS corrigé | ICON brut | ICON corrigé | GFS brut | GFS corrigé | Meilleur corrigé, après coup | **Mélange** | Gain du mélange sur le meilleur corrigé |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| J+1 | 1,27 | 0,87 | 1,20 | 1,01 | 1,22 | 0,97 | 1,23 | 0,97 | 1,08 | 0,97 | 0,87 (AROME) | **0,77** | +12,1 % |
| J+2 | — | — | 1,36 | 1,16 | 1,27 | 1,04 | 0,91 | 0,84 | 1,13 | 1,01 | 0,84 (ICON) | **0,79** | +6,1 % |
| J+3 | — | — | 1,49 | 1,29 | 1,34 | 1,14 | 0,99 | 0,95 | 1,18 | 1,07 | 0,95 (ICON) | **0,89** | +6,7 % |
| J+4 | — | — | — | — | 1,41 | 1,22 | 1,05 | 1,03 | 1,28 | 1,20 | 1,03 (ICON) | **0,94** | +9,1 % |
| J+5 | — | — | — | — | 1,47 | 1,33 | 1,28 | 1,23 | 1,37 | 1,30 | 1,23 (ICON) | **1,09** | +11,5 % |
| J+6 | — | — | — | — | 1,68 | 1,54 | 1,33 | 1,30 | 1,47 | 1,42 | 1,30 (ICON) | **1,19** | +8,6 % |
| J+7 | — | — | — | — | 1,73 | 1,62 | — | — | 1,58 | 1,54 | 1,54 (GFS) | **1,40** | +9,1 % |

## Modèle candidat : UKMO

Erreur absolue moyenne de température (°C) du mélange à cinq modèles et du mélange à six (avec UKMO), sur les heures où les six modèles existent. Période : année entière (du 16/11/2025 au 15/11/2026).

### Toulon

| Échéance | Heures notées | UKMO brut | Mélange à cinq | Mélange à six | Gain du sixième modèle |
| --- | --- | --- | --- | --- | --- |
| J+1 | 7 622 | 1,47 | 1,020 | 1,016 | +0,4 % |
| J+2 | 8 370 | 1,55 | 1,094 | 1,090 | +0,4 % |
| J+3 | 7 592 | 1,57 | 1,115 | 1,105 | +0,9 % |
| J+4 | 7 941 | 1,68 | 1,241 | 1,235 | +0,5 % |
| J+5 | 7 140 | 1,79 | 1,360 | 1,345 | +1,1 % |
| J+6 | 7 689 | 1,94 | 1,502 | 1,489 | +0,9 % |

### Nice

| Échéance | Heures notées | UKMO brut | Mélange à cinq | Mélange à six | Gain du sixième modèle |
| --- | --- | --- | --- | --- | --- |
| J+1 | 7 622 | 1,22 | 0,785 | 0,788 | −0,3 % |
| J+2 | 8 370 | 1,27 | 0,813 | 0,819 | −0,7 % |
| J+3 | 7 592 | 1,30 | 0,893 | 0,897 | −0,5 % |
| J+4 | 7 941 | 1,42 | 0,992 | 0,998 | −0,6 % |
| J+5 | 7 140 | 1,51 | 1,123 | 1,115 | +0,7 % |
| J+6 | 7 689 | 1,67 | 1,209 | 1,208 | +0,1 % |

## Autres variables

Mêmes paramètres que pour la température, **sans réglage propre** à chaque variable. Période : année entière (du 16/11/2025 au 15/11/2026). Seuls les modèles dont l'historique couvre la période sont mélangés.

### Humidité (%)

**Toulon**.

| Échéance | Heures notées | AROME | ARPEGE | IFS | ICON | GFS | Moyenne simple | Meilleur après coup | Meilleur, fenêtre précédente | **Mélange** | Gain du mélange | Biais du mélange |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| J+1 | 8 394 | 9,95 | 10,64 | 8,97 | 8,12 | 12,63 | 8,29 | 8,12 (ICON) | 8,14 | **6,93** | +14,8 % | 0,23 % |
| J+2 | 8 370 | — | 11,10 | 9,68 | 8,69 | 13,13 | 9,01 | 8,69 (ICON) | 8,85 | **7,81** | +11,8 % | 0,42 % |
| J+3 | 7 879 | — | 11,59 | 9,91 | 9,08 | 13,33 | 9,20 | 9,08 (ICON) | 8,98 | **7,99** | +11,0 % | 0,52 % |
| J+4 | 8 293 | — | — | 10,65 | 10,07 | 13,62 | 9,70 | 10,07 (ICON) | 9,89 | **8,89** | +10,1 % | −0,24 % |
| J+5 | 8 298 | — | — | 11,54 | 10,53 | 14,28 | 9,97 | 10,53 (ICON) | 10,83 | **9,32** | +14,0 % | 0,64 % |
| J+6 | 7 801 | — | — | 12,43 | 11,58 | 15,55 | 10,81 | 11,58 (ICON) | 11,62 | **10,07** | +13,3 % | −0,04 % |
| J+7 | 8 760 | — | — | 13,81 | — | 15,71 | 12,95 | 13,81 (IFS) | 13,73 | **12,08** | +12,0 % | 0,05 % |

**Nice**.

| Échéance | Heures notées | AROME | ARPEGE | IFS | ICON | GFS | Moyenne simple | Meilleur après coup | Meilleur, fenêtre précédente | **Mélange** | Gain du mélange | Biais du mélange |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| J+1 | 8 394 | 10,36 | 9,25 | 8,49 | 8,30 | 9,29 | 6,63 | 8,30 (ICON) | 8,37 | **5,85** | +30,2 % | 0,08 % |
| J+2 | 8 370 | — | 10,00 | 8,97 | 8,87 | 9,61 | 7,16 | 8,87 (ICON) | 8,87 | **6,41** | +27,8 % | 0,13 % |
| J+3 | 7 879 | — | 10,66 | 9,54 | 9,50 | 10,28 | 7,74 | 9,50 (ICON) | 9,40 | **6,98** | +25,7 % | 0,19 % |
| J+4 | 8 293 | — | — | 10,31 | 10,05 | 11,27 | 8,54 | 10,05 (ICON) | 10,11 | **7,99** | +21,0 % | −0,19 % |
| J+5 | 8 298 | — | — | 10,89 | 11,23 | 11,37 | 9,17 | 10,89 (IFS) | 11,12 | **8,56** | +23,1 % | −0,08 % |
| J+6 | 7 801 | — | — | 12,06 | 11,89 | 12,59 | 10,01 | 11,89 (ICON) | 11,93 | **9,48** | +20,6 % | −0,03 % |
| J+7 | 8 760 | — | — | 12,45 | — | 13,22 | 11,32 | 12,45 (IFS) | 12,68 | **10,95** | +13,6 % | −0,49 % |

### Vent moyen (km/h)

**Toulon**. Sans AROME, ARPEGE (historique insuffisant).

| Échéance | Heures notées | IFS | ICON | GFS | Moyenne simple | Meilleur après coup | Meilleur, fenêtre précédente | **Mélange** | Gain du mélange | Biais du mélange |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| J+1 | 8 495 | 4,41 | 4,55 | 4,10 | 3,80 | 4,10 (GFS) | 4,24 | **3,33** | +21,5 % | −0,02 km/h |
| J+2 | 8 368 | 4,42 | 4,70 | 4,27 | 3,88 | 4,27 (GFS) | 4,40 | **3,44** | +21,7 % | −0,02 km/h |
| J+3 | 8 344 | 4,59 | 4,90 | 4,35 | 3,94 | 4,35 (GFS) | 4,49 | **3,59** | +20,1 % | 0,00 km/h |
| J+4 | 8 057 | 4,94 | 5,46 | 4,68 | 4,26 | 4,68 (GFS) | 4,99 | **3,91** | +21,7 % | −0,18 km/h |
| J+5 | 8 758 | 5,42 | 8,70 | 5,23 | 5,25 | 5,23 (GFS) | 5,30 | **4,42** | +16,7 % | 0,15 km/h |
| J+6 | 8 003 | 6,03 | 8,84 | 5,68 | 5,66 | 5,68 (GFS) | 5,76 | **4,92** | +14,7 % | −0,03 km/h |
| J+7 | 8 254 | 6,91 | — | 6,35 | 5,84 | 6,35 (GFS) | 6,48 | **5,66** | +12,5 % | −0,20 km/h |

**Nice**. Sans AROME, ARPEGE (historique insuffisant).

| Échéance | Heures notées | IFS | ICON | GFS | Moyenne simple | Meilleur après coup | Meilleur, fenêtre précédente | **Mélange** | Gain du mélange | Biais du mélange |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| J+1 | 8 497 | 7,50 | 7,72 | 7,40 | 7,36 | 7,40 (GFS) | 7,16 | **4,68** | +34,6 % | 0,06 km/h |
| J+2 | 8 370 | 7,73 | 7,89 | 7,54 | 7,53 | 7,54 (GFS) | 7,33 | **4,72** | +35,6 % | −0,04 km/h |
| J+3 | 8 346 | 7,75 | 8,07 | 7,58 | 7,60 | 7,58 (GFS) | 7,41 | **4,88** | +34,2 % | −0,04 km/h |
| J+4 | 8 059 | 7,93 | 8,28 | 7,72 | 7,73 | 7,72 (GFS) | 7,58 | **5,00** | +34,1 % | 0,04 km/h |
| J+5 | 8 760 | 8,04 | 8,22 | 7,95 | 7,83 | 7,95 (GFS) | 7,80 | **5,22** | +33,1 % | 0,06 km/h |
| J+6 | 8 005 | 8,39 | 8,40 | 8,03 | 8,00 | 8,03 (GFS) | 8,05 | **5,32** | +33,9 % | −0,03 km/h |
| J+7 | 8 256 | 8,33 | — | 7,95 | 7,88 | 7,95 (GFS) | 7,81 | **5,50** | +29,6 % | 0,03 km/h |

### Rafales (km/h)

**Toulon**. Sans AROME, ARPEGE, IFS (historique insuffisant).

| Échéance | Heures notées | ICON | GFS | Moyenne simple | Meilleur après coup | Meilleur, fenêtre précédente | **Mélange** | Gain du mélange | Biais du mélange |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| J+1 | 8 760 | 6,51 | 9,43 | 6,24 | 6,51 (ICON) | 6,51 | **5,75** | +11,6 % | −0,24 km/h |
| J+2 | 8 760 | 7,06 | 10,00 | 6,78 | 7,06 (ICON) | 7,11 | **6,27** | +11,9 % | −0,16 km/h |
| J+3 | 8 760 | 7,73 | 10,57 | 7,20 | 7,73 (ICON) | 7,83 | **6,75** | +13,7 % | −0,17 km/h |
| J+4 | 8 760 | 9,05 | 11,39 | 8,13 | 9,05 (ICON) | 9,08 | **7,67** | +15,6 % | −0,78 km/h |
| J+5 | 8 760 | 11,46 | 12,46 | 9,52 | 11,46 (ICON) | 11,60 | **9,14** | +21,2 % | 0,38 km/h |
| J+6 | 8 760 | 12,60 | 13,26 | 10,49 | 12,60 (ICON) | 13,12 | **10,22** | +22,1 % | −0,37 km/h |

**Nice**. Sans AROME, ARPEGE, IFS (historique insuffisant).

| Échéance | Heures notées | ICON | GFS | Moyenne simple | Meilleur après coup | Meilleur, fenêtre précédente | **Mélange** | Gain du mélange | Biais du mélange |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| J+1 | 8 760 | 10,38 | 15,59 | 12,66 | 10,38 (ICON) | 10,38 | **6,42** | +38,1 % | 0,03 km/h |
| J+2 | 8 760 | 10,46 | 15,75 | 12,62 | 10,46 (ICON) | 10,46 | **6,36** | +39,1 % | 0,05 km/h |
| J+3 | 8 760 | 10,77 | 15,86 | 12,76 | 10,77 (ICON) | 10,77 | **6,70** | +37,8 % | 0,05 km/h |
| J+4 | 8 760 | 10,99 | 16,04 | 12,88 | 10,99 (ICON) | 10,99 | **7,06** | +35,8 % | 0,16 km/h |
| J+5 | 8 760 | 11,04 | 16,20 | 12,99 | 11,04 (ICON) | 11,04 | **7,30** | +33,9 % | 0,12 km/h |
| J+6 | 8 760 | 11,28 | 16,23 | 13,12 | 11,28 (ICON) | 11,28 | **7,55** | +33,1 % | 0,06 km/h |

### Nébulosité (%)

**Toulon** : la station ne mesure pas cette variable, rien n'est vérifiable.

**Nice**.

| Échéance | Heures notées | AROME | ARPEGE | IFS | ICON | GFS | Moyenne simple | Meilleur après coup | Meilleur, fenêtre précédente | **Mélange** | Gain du mélange | Biais du mélange |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| J+1 | 8 661 | 23,97 | 20,42 | 20,33 | 21,33 | 23,44 | 16,03 | 20,33 (IFS) | 19,68 | **16,53** | +16,0 % | −0,39 % |
| J+2 | 8 716 | — | 22,45 | 21,32 | 23,83 | 25,55 | 17,80 | 21,32 (IFS) | 21,45 | **18,20** | +15,1 % | −0,08 % |
| J+3 | 8 650 | — | 23,71 | 22,49 | 25,03 | 27,15 | 18,78 | 22,49 (IFS) | 23,38 | **19,08** | +18,4 % | −0,36 % |
| J+4 | 8 250 | — | — | 24,10 | 26,94 | 30,62 | 21,81 | 24,10 (IFS) | 23,99 | **21,80** | +9,1 % | −0,58 % |
| J+5 | 8 721 | — | — | 26,45 | 30,07 | 30,18 | 23,42 | 26,45 (IFS) | 26,83 | **23,56** | +12,2 % | −0,77 % |
| J+6 | 8 208 | — | — | 28,68 | 31,42 | 32,15 | 25,47 | 28,68 (IFS) | 29,09 | **25,68** | +11,7 % | −0,43 % |
| J+7 | 8 284 | — | — | 31,10 | — | 33,53 | 28,54 | 31,10 (IFS) | 31,59 | **28,73** | +9,0 % | −1,39 % |

## Pluie

La probabilité de pluie vient de l’accord entre modèles (la part d’entre eux qui annonce de la pluie), calibrée sur la fréquence observée dans le passé pour le même degré d’accord. Le mélange annonce de la pluie quand cette probabilité atteint un seuil d’annonce. Le cumul est la moyenne simple des modèles.

Il « pleut » dans l'heure à partir de 0,2 mm (la résolution du pluviomètre), dans la journée à partir de 1 mm.

### Réglage, sur la période de sélection (du 16/11/2025 au 15/05/2026)

Deux villes et toutes échéances confondues. On retient l’a priori qui donne le meilleur score de Brier, puis le seuil d’annonce qui donne le meilleur indice de succès critique (à 0,005 près, celui qui donne le plus de bonnes annonces).

**À la journée**

| A priori (cas fictifs) | Seuil d’annonce | Score de Brier | Bonnes annonces | Indice de succès critique |  |
| --- | --- | --- | --- | --- | --- |
| 5 | 20 % | 0,1086 | 81,4 % | 0,511 |  |
| 5 | 25 % | 0,1086 | 81,9 % | 0,498 |  |
| 5 | 30 % | 0,1086 | 83,7 % | 0,509 | **retenu** |
| 5 | 35 % | 0,1086 | 84,4 % | 0,494 |  |
| 5 | 40 % | 0,1086 | 84,6 % | 0,462 |  |
| 5 | 45 % | 0,1086 | 84,6 % | 0,431 |  |
| 5 | 50 % | 0,1086 | 84,2 % | 0,377 |  |
| 20 | 20 % | 0,1218 | 81,5 % | 0,501 |  |
| 20 | 25 % | 0,1218 | 81,9 % | 0,478 |  |
| 20 | 30 % | 0,1218 | 83,0 % | 0,456 |  |
| 20 | 35 % | 0,1218 | 83,9 % | 0,398 |  |
| 20 | 40 % | 0,1218 | 83,0 % | 0,340 |  |
| 20 | 45 % | 0,1218 | 82,1 % | 0,273 |  |
| 20 | 50 % | 0,1218 | 80,7 % | 0,205 |  |

**À l’heure**

| A priori (cas fictifs) | Seuil d’annonce | Score de Brier | Bonnes annonces | Indice de succès critique |  |
| --- | --- | --- | --- | --- | --- |
| 5 | 20 % | 0,0552 | 90,5 % | 0,278 | **retenu** |
| 5 | 25 % | 0,0552 | 91,6 % | 0,271 |  |
| 5 | 30 % | 0,0552 | 92,4 % | 0,263 |  |
| 5 | 35 % | 0,0552 | 93,0 % | 0,245 |  |
| 5 | 40 % | 0,0552 | 93,1 % | 0,218 |  |
| 5 | 45 % | 0,0552 | 93,1 % | 0,208 |  |
| 5 | 50 % | 0,0552 | 93,1 % | 0,174 |  |
| 20 | 20 % | 0,0558 | 90,8 % | 0,277 |  |
| 20 | 25 % | 0,0558 | 91,9 % | 0,264 |  |
| 20 | 30 % | 0,0558 | 92,6 % | 0,241 |  |
| 20 | 35 % | 0,0558 | 93,0 % | 0,215 |  |
| 20 | 40 % | 0,0558 | 93,0 % | 0,192 |  |
| 20 | 45 % | 0,0558 | 93,0 % | 0,160 |  |
| 20 | 50 % | 0,0558 | 93,0 % | 0,123 |  |

### Résultats, sur la période de validation (du 16/05/2026 au 15/11/2026)

« Bonnes annonces » : part des cas où l’annonce (pluie ou pas) était juste. « ISC », indice de succès critique : parmi les cas où la pluie a été annoncée ou observée, part de ceux où elle a été annoncée et observée ; il n’est pas gonflé par les nombreux cas secs. « Meilleur seul » : le modèle au cumul le plus précis sur les 30 jours précédant l’émission. Score de Brier : plus il est bas, meilleure est la probabilité ; « climatologie » annonce toujours la fréquence moyenne de la période.

#### Toulon

**À la journée** (seuil d'annonce : 30 %)

| Échéance | Cas notés | Avec pluie | Mélange : bonnes annonces | Mélange : ISC | Meilleur seul : bonnes annonces | Meilleur seul : ISC | Moyenne simple : bonnes annonces | Moyenne simple : ISC | Brier mélange | Brier meilleur seul | Brier climatologie |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| J+1 | 184 | 17 | **92,4 %** | **0,533** | 95,1 % | 0,625 | 93,5 % | 0,571 | 0,0355 | 0,0489 | 0,0839 |
| J+2 | 184 | 17 | **92,4 %** | **0,533** | 92,4 % | 0,548 | 92,4 % | 0,548 | 0,0377 | 0,0761 | 0,0839 |
| J+3 | 184 | 17 | **94,0 %** | **0,607** | 92,9 % | 0,500 | 90,2 % | 0,471 | 0,0404 | 0,0707 | 0,0839 |
| J+4 | 184 | 17 | **90,8 %** | **0,452** | 88,6 % | 0,382 | 88,0 % | 0,389 | 0,0526 | 0,1141 | 0,0839 |
| J+5 | 184 | 17 | **91,8 %** | **0,444** | 89,7 % | 0,367 | 88,6 % | 0,400 | 0,0495 | 0,1033 | 0,0839 |
| J+6 | 184 | 17 | **89,1 %** | **0,333** | 90,2 % | 0,250 | 89,7 % | 0,387 | 0,0609 | 0,0978 | 0,0839 |
| J+7 | 184 | 17 | **89,1 %** | **0,310** | 88,6 % | 0,323 | 87,5 % | 0,361 | 0,0634 | 0,1141 | 0,0839 |
| **Toutes** | 1 288 | 119 | **91,4 %** | **0,459** | 91,1 % | 0,425 | 90,0 % | 0,442 | 0,0486 |  |  |

Calibration de la probabilité, toutes échéances confondues :

| Probabilité annoncée | Cas | Annonce moyenne | Fréquence observée |
| --- | --- | --- | --- |
| 0 % à 10 % | 1 009 | 3 % | 1 % |
| 10 % à 30 % | 99 | 23 % | 18 % |
| 30 % à 50 % | 82 | 39 % | 35 % |
| 50 % à 70 % | 34 | 60 % | 59 % |
| 70 % à 90 % | 64 | 76 % | 70 % |
| 90 % à 100 % | 0 | — | — |

Erreur absolue moyenne du cumul quotidien (mm) :

| Échéance | Moyenne simple | Meilleur seul, fenêtre précédente |
| --- | --- | --- |
| J+1 | 1,23 | 1,16 |
| J+2 | 1,37 | 1,56 |
| J+3 | 1,45 | 1,65 |
| J+4 | 1,54 | 1,09 |
| J+5 | 1,97 | 2,17 |
| J+6 | 1,74 | 2,00 |
| J+7 | 2,22 | 2,13 |

**À l’heure** (seuil d'annonce : 20 %)

| Échéance | Cas notés | Avec pluie | Mélange : bonnes annonces | Mélange : ISC | Meilleur seul : bonnes annonces | Meilleur seul : ISC | Moyenne simple : bonnes annonces | Moyenne simple : ISC | Brier mélange | Brier meilleur seul | Brier climatologie |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| J+1 | 4 416 | 129 | **95,5 %** | **0,311** | 96,2 % | 0,274 | 95,5 % | 0,307 | 0,0200 | 0,0378 | 0,0284 |
| J+2 | 4 416 | 129 | **95,7 %** | **0,319** | 95,3 % | 0,275 | 94,8 % | 0,267 | 0,0205 | 0,0471 | 0,0284 |
| J+3 | 4 416 | 129 | **95,8 %** | **0,279** | 95,7 % | 0,208 | 94,7 % | 0,251 | 0,0220 | 0,0430 | 0,0284 |
| J+4 | 4 416 | 129 | **94,8 %** | **0,182** | 94,5 % | 0,166 | 93,8 % | 0,195 | 0,0263 | 0,0548 | 0,0284 |
| J+5 | 4 416 | 129 | **96,3 %** | **0,198** | 94,5 % | 0,137 | 93,4 % | 0,177 | 0,0242 | 0,0555 | 0,0284 |
| J+6 | 4 416 | 129 | **96,1 %** | **0,151** | 95,8 % | 0,197 | 94,5 % | 0,220 | 0,0257 | 0,0423 | 0,0284 |
| J+7 | 4 416 | 129 | **96,2 %** | **0,050** | 94,3 % | 0,091 | 92,9 % | 0,111 | 0,0287 | 0,0566 | 0,0284 |
| **Toutes** | 30 912 | 903 | **95,8 %** | **0,225** | 95,2 % | 0,190 | 94,2 % | 0,214 | 0,0239 |  |  |

Calibration de la probabilité, toutes échéances confondues :

| Probabilité annoncée | Cas | Annonce moyenne | Fréquence observée |
| --- | --- | --- | --- |
| 0 % à 10 % | 27 864 | 2 % | 1 % |
| 10 % à 30 % | 2 240 | 16 % | 14 % |
| 30 % à 50 % | 543 | 35 % | 28 % |
| 50 % à 70 % | 221 | 59 % | 53 % |
| 70 % à 90 % | 44 | 77 % | 68 % |
| 90 % à 100 % | 0 | — | — |

**À la journée, année entière** (du 16/11/2025 au 15/11/2026), pour information :

| Échéance | Cas notés | Avec pluie | Mélange : bonnes annonces | Mélange : ISC | Meilleur seul : bonnes annonces | Meilleur seul : ISC | Moyenne simple : bonnes annonces | Moyenne simple : ISC | Brier mélange | Brier meilleur seul | Brier climatologie |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| J+1 | 365 | 66 | **91,0 %** | **0,645** | 91,5 % | 0,644 | 92,6 % | 0,690 | 0,0617 | 0,0849 | 0,1481 |
| J+2 | 354 | 63 | **88,1 %** | **0,558** | 88,7 % | 0,574 | 90,1 % | 0,620 | 0,0641 | 0,1130 | 0,1463 |
| J+3 | 336 | 63 | **90,5 %** | **0,640** | 91,1 % | 0,639 | 88,7 % | 0,608 | 0,0742 | 0,0893 | 0,1523 |
| J+4 | 365 | 66 | **87,9 %** | **0,551** | 85,8 % | 0,505 | 86,8 % | 0,547 | 0,0829 | 0,1425 | 0,1481 |
| J+5 | 365 | 66 | **88,2 %** | **0,527** | 87,4 % | 0,505 | 84,9 % | 0,505 | 0,0855 | 0,1260 | 0,1481 |
| J+6 | 350 | 63 | **84,6 %** | **0,460** | 86,0 % | 0,402 | 85,7 % | 0,495 | 0,1012 | 0,1400 | 0,1476 |
| J+7 | 365 | 66 | **79,5 %** | **0,318** | 79,5 % | 0,299 | 80,0 % | 0,371 | 0,1218 | 0,2055 | 0,1481 |
| **Toutes** | 2 500 | 453 | **87,1 %** | **0,522** | 87,1 % | 0,504 | 87,0 % | 0,540 | 0,0846 |  |  |

#### Nice

**À la journée** (seuil d'annonce : 30 %)

| Échéance | Cas notés | Avec pluie | Mélange : bonnes annonces | Mélange : ISC | Meilleur seul : bonnes annonces | Meilleur seul : ISC | Moyenne simple : bonnes annonces | Moyenne simple : ISC | Brier mélange | Brier meilleur seul | Brier climatologie |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| J+1 | 184 | 16 | **95,1 %** | **0,550** | 92,4 % | 0,391 | 90,8 % | 0,452 | 0,0376 | 0,0761 | 0,0794 |
| J+2 | 184 | 16 | **92,9 %** | **0,409** | 92,4 % | 0,481 | 88,0 % | 0,371 | 0,0459 | 0,0761 | 0,0794 |
| J+3 | 184 | 16 | **92,9 %** | **0,435** | 88,0 % | 0,313 | 84,2 % | 0,293 | 0,0496 | 0,1196 | 0,0794 |
| J+4 | 184 | 16 | **89,7 %** | **0,321** | 88,6 % | 0,344 | 81,5 % | 0,227 | 0,0616 | 0,1141 | 0,0794 |
| J+5 | 184 | 16 | **91,3 %** | **0,407** | 88,6 % | 0,323 | 87,0 % | 0,351 | 0,0525 | 0,1141 | 0,0794 |
| J+6 | 184 | 16 | **90,2 %** | **0,308** | 88,6 % | 0,300 | 84,2 % | 0,275 | 0,0684 | 0,1141 | 0,0794 |
| J+7 | 184 | 16 | **91,8 %** | **0,250** | 84,2 % | 0,171 | 82,1 % | 0,195 | 0,0716 | 0,1576 | 0,0794 |
| **Toutes** | 1 288 | 112 | **92,0 %** | **0,380** | 89,0 % | 0,324 | 85,4 % | 0,301 | 0,0553 |  |  |

Calibration de la probabilité, toutes échéances confondues :

| Probabilité annoncée | Cas | Annonce moyenne | Fréquence observée |
| --- | --- | --- | --- |
| 0 % à 10 % | 1 071 | 2 % | 3 % |
| 10 % à 30 % | 100 | 24 % | 14 % |
| 30 % à 50 % | 71 | 42 % | 37 % |
| 50 % à 70 % | 38 | 62 % | 79 % |
| 70 % à 90 % | 8 | 75 % | 88 % |
| 90 % à 100 % | 0 | — | — |

Erreur absolue moyenne du cumul quotidien (mm) :

| Échéance | Moyenne simple | Meilleur seul, fenêtre précédente |
| --- | --- | --- |
| J+1 | 0,80 | 0,76 |
| J+2 | 1,10 | 1,08 |
| J+3 | 1,13 | 1,28 |
| J+4 | 1,41 | 1,35 |
| J+5 | 1,50 | 1,45 |
| J+6 | 1,49 | 1,80 |
| J+7 | 2,07 | 2,11 |

**À l’heure** (seuil d'annonce : 20 %)

| Échéance | Cas notés | Avec pluie | Mélange : bonnes annonces | Mélange : ISC | Meilleur seul : bonnes annonces | Meilleur seul : ISC | Moyenne simple : bonnes annonces | Moyenne simple : ISC | Brier mélange | Brier meilleur seul | Brier climatologie |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| J+1 | 4 416 | 115 | **96,7 %** | **0,382** | 97,6 % | 0,376 | 96,6 % | 0,363 | 0,0160 | 0,0240 | 0,0254 |
| J+2 | 4 416 | 115 | **96,2 %** | **0,328** | 96,4 % | 0,340 | 95,9 % | 0,319 | 0,0170 | 0,0360 | 0,0254 |
| J+3 | 4 416 | 115 | **96,2 %** | **0,268** | 94,8 % | 0,186 | 94,8 % | 0,232 | 0,0202 | 0,0516 | 0,0254 |
| J+4 | 4 416 | 115 | **96,0 %** | **0,217** | 94,5 % | 0,175 | 94,0 % | 0,185 | 0,0224 | 0,0546 | 0,0254 |
| J+5 | 4 416 | 115 | **96,6 %** | **0,177** | 94,4 % | 0,140 | 94,2 % | 0,162 | 0,0221 | 0,0557 | 0,0254 |
| J+6 | 4 416 | 115 | **96,6 %** | **0,039** | 94,7 % | 0,162 | 94,3 % | 0,174 | 0,0238 | 0,0528 | 0,0254 |
| J+7 | 4 416 | 115 | **96,9 %** | **0,000** | 94,2 % | 0,079 | 93,3 % | 0,116 | 0,0250 | 0,0582 | 0,0254 |
| **Toutes** | 30 912 | 805 | **96,5 %** | **0,226** | 95,2 % | 0,195 | 94,7 % | 0,213 | 0,0209 |  |  |

Calibration de la probabilité, toutes échéances confondues :

| Probabilité annoncée | Cas | Annonce moyenne | Fréquence observée |
| --- | --- | --- | --- |
| 0 % à 10 % | 28 211 | 2 % | 1 % |
| 10 % à 30 % | 2 384 | 15 % | 13 % |
| 30 % à 50 % | 135 | 41 % | 48 % |
| 50 % à 70 % | 153 | 57 % | 59 % |
| 70 % à 90 % | 29 | 78 % | 76 % |
| 90 % à 100 % | 0 | — | — |

**À la journée, année entière** (du 16/11/2025 au 15/11/2026), pour information :

| Échéance | Cas notés | Avec pluie | Mélange : bonnes annonces | Mélange : ISC | Meilleur seul : bonnes annonces | Meilleur seul : ISC | Moyenne simple : bonnes annonces | Moyenne simple : ISC | Brier mélange | Brier meilleur seul | Brier climatologie |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| J+1 | 365 | 48 | **94,0 %** | **0,614** | 92,9 % | 0,581 | 90,1 % | 0,561 | 0,0520 | 0,0712 | 0,1142 |
| J+2 | 354 | 45 | **92,1 %** | **0,517** | 90,7 % | 0,542 | 87,0 % | 0,465 | 0,0594 | 0,0932 | 0,1110 |
| J+3 | 336 | 45 | **91,1 %** | **0,538** | 88,1 % | 0,474 | 83,6 % | 0,409 | 0,0643 | 0,1190 | 0,1160 |
| J+4 | 365 | 48 | **88,2 %** | **0,469** | 84,7 % | 0,385 | 81,9 % | 0,377 | 0,0742 | 0,1534 | 0,1142 |
| J+5 | 365 | 48 | **88,5 %** | **0,481** | 84,4 % | 0,345 | 83,3 % | 0,419 | 0,0737 | 0,1562 | 0,1142 |
| J+6 | 350 | 45 | **83,4 %** | **0,293** | 83,1 % | 0,289 | 80,6 % | 0,327 | 0,0922 | 0,1686 | 0,1120 |
| J+7 | 365 | 48 | **82,5 %** | **0,179** | 78,9 % | 0,189 | 78,6 % | 0,291 | 0,1036 | 0,2110 | 0,1142 |
| **Toutes** | 2 500 | 327 | **88,5 %** | **0,428** | 86,1 % | 0,385 | 83,6 % | 0,400 | 0,0743 |  |  |

Critère « sans dégrader la pluie », fixé avant de lire les résultats : à la journée, toutes échéances confondues, le mélange ne perd pas plus de 1 point de bonnes annonces ni plus de 0,02 d'indice de succès critique face au meilleur modèle seul.

| Ville | Mélange : bonnes annonces | Mélange : ISC | Meilleur seul : bonnes annonces | Meilleur seul : ISC | Pluie dégradée ? |
| --- | --- | --- | --- | --- | --- |
| Toulon | 91,4 % | 0,459 | 91,1 % | 0,425 | non |
| Nice | 92,0 % | 0,380 | 89,0 % | 0,324 | non |

## Indice de fiabilité

**Prévision tenue** : pour un jour (UTC), le maximum et le minimum de température sont à moins de 2 °C de l'observé, et l'annonce de pluie (oui ou non, au seuil de 1 mm) est juste.

**Formule** : l’indice d’un jour est la part des jours passés, dans une situation semblable, où la prévision a été tenue. Une situation est définie par la tranche d’échéance, le niveau de désaccord entre modèles (écart-type moyen sur la journée) et la netteté du signal de pluie. Le taux d’une situation peu rencontrée est tiré vers le taux de sa tranche. À signal de pluie égal, l’indice ne monte jamais quand le désaccord augmente.

| Réglage | Valeur |
| --- | --- |
| Niveaux de désaccord (écart-type entre modèles) | faible < 0,6 °C ≤ moyen < 0,9 °C ≤ fort (terciles de la période de sélection) |
| Signal de pluie incertain | probabilité entre 20 % et 80 % |
| Poids du taux de la tranche | 10 jours fictifs |
| Historique minimal | 30 jours vérifiés ; en dessous, l'indice est indisponible |
| Libellés | Sûr à partir de 80 %, Probable à partir de 60 %, Incertain en dessous |

### Prévisions tenues, par échéance (du 16/11/2025 au 15/11/2026)

**Toulon**

| Échéance | Jours | Maximum à ± 2 °C | Minimum à ± 2 °C | Pluie bien annoncée | **Prévision tenue** | Indice annoncé moyen |
| --- | --- | --- | --- | --- | --- | --- |
| J+1 | 365 | 92 % | 80 % | 91 % | **67 %** | 66 % |
| J+2 | 365 | 88 % | 76 % | 88 % | **59 %** | 60 % |
| J+3 | 365 | 88 % | 74 % | 91 % | **59 %** | 55 % |
| J+4 | 365 | 84 % | 73 % | 88 % | **55 %** | 46 % |
| J+5 | 365 | 79 % | 71 % | 88 % | **51 %** | 45 % |
| J+6 | 365 | 80 % | 63 % | 84 % | **44 %** | 33 % |
| J+7 | 365 | 73 % | 58 % | 79 % | **33 %** | 34 % |

**Nice**

| Échéance | Jours | Maximum à ± 2 °C | Minimum à ± 2 °C | Pluie bien annoncée | **Prévision tenue** | Indice annoncé moyen |
| --- | --- | --- | --- | --- | --- | --- |
| J+1 | 365 | 95 % | 97 % | 94 % | **88 %** | 89 % |
| J+2 | 365 | 96 % | 97 % | 92 % | **87 %** | 89 % |
| J+3 | 365 | 92 % | 96 % | 92 % | **82 %** | 86 % |
| J+4 | 365 | 89 % | 93 % | 88 % | **75 %** | 75 % |
| J+5 | 365 | 86 % | 91 % | 88 % | **71 %** | 74 % |
| J+6 | 365 | 84 % | 88 % | 83 % | **62 %** | 55 % |
| J+7 | 365 | 76 % | 78 % | 82 % | **52 %** | 58 % |

### Effet de la tolérance (du 16/11/2025 au 15/11/2026)

Part des prévisions tenues selon la tolérance appliquée au minimum et au maximum de température.

| Ville | Tolérance | J+1 | J+2 | J+3 | J+4 | J+5 | J+6 | J+7 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Toulon | ± 1,5 °C | 47 % | 43 % | 43 % | 40 % | 33 % | 29 % | 22 % |
| Toulon | ± 2,0 °C (retenue) | 67 % | 59 % | 59 % | 55 % | 51 % | 44 % | 33 % |
| Toulon | ± 2,5 °C | 79 % | 73 % | 73 % | 69 % | 65 % | 55 % | 47 % |
| Toulon | ± 3,0 °C | 84 % | 79 % | 83 % | 79 % | 73 % | 66 % | 57 % |
| Nice | ± 1,5 °C | 78 % | 75 % | 72 % | 62 % | 53 % | 46 % | 38 % |
| Nice | ± 2,0 °C (retenue) | 88 % | 87 % | 82 % | 75 % | 71 % | 62 % | 52 % |
| Nice | ± 2,5 °C | 93 % | 90 % | 88 % | 83 % | 80 % | 71 % | 63 % |
| Nice | ± 3,0 °C | 93 % | 92 % | 89 % | 86 % | 84 % | 78 % | 72 % |

### Calibration

Quand l'indice annonce une valeur, les prévisions sont-elles tenues dans cette proportion ? Deux villes et toutes échéances confondues. Critère : dans chaque classe d'au moins 50 jours, l'écart ne dépasse pas 10 points.

**Période de validation** (du 16/05/2026 au 15/11/2026) — critère rempli :

| Indice annoncé | Jours | Indice moyen | Prévisions tenues | Écart |
| --- | --- | --- | --- | --- |
| 0 % à 30 % | 52 | 27 % | 29 % | 1 pt |
| 30 % à 40 % | 372 | 36 % | 45 % | 10 pt |
| 40 % à 50 % | 396 | 45 % | 49 % | 5 pt |
| 50 % à 60 % | 370 | 56 % | 61 % | 5 pt |
| 60 % à 70 % | 496 | 65 % | 66 % | 0 pt |
| 70 % à 80 % | 190 | 75 % | 73 % | −2 pt |
| 80 % à 90 % | 284 | 84 % | 82 % | −3 pt |
| 90 % à 100 % | 416 | 94 % | 93 % | −2 pt |

**Année entière** (du 16/11/2025 au 15/11/2026) — critère rempli :

| Indice annoncé | Jours | Indice moyen | Prévisions tenues | Écart |
| --- | --- | --- | --- | --- |
| 0 % à 30 % | 266 | 27 % | 36 % | 9 pt |
| 30 % à 40 % | 781 | 36 % | 40 % | 4 pt |
| 40 % à 50 % | 657 | 45 % | 48 % | 3 pt |
| 50 % à 60 % | 722 | 56 % | 60 % | 4 pt |
| 60 % à 70 % | 990 | 65 % | 64 % | −2 pt |
| 70 % à 80 % | 397 | 75 % | 72 % | −3 pt |
| 80 % à 90 % | 587 | 85 % | 84 % | −1 pt |
| 90 % à 100 % | 710 | 94 % | 94 % | 0 pt |

### Libellés (du 16/11/2025 au 15/11/2026)

| Ville | Libellé | Jours | Part des jours | Prévisions tenues |
| --- | --- | --- | --- | --- |
| Toulon | Sûr | 2 | 0 % | 50 % |
| Toulon | Probable | 621 | 24 % | 64 % |
| Toulon | Incertain | 1 932 | 76 % | 49 % |
| Nice | Sûr | 1 295 | 51 % | 89 % |
| Nice | Probable | 766 | 30 % | 68 % |
| Nice | Incertain | 494 | 19 % | 42 % |

# ADR 0002 — Sources de données météo

- **Statut** : proposée (à confirmer par le spike M0-02)
- **Date** : 2026-11-17
- **Issue** : M0-02

## Contexte

Quatrauro a besoin de deux choses : les prévisions de plusieurs modèles, accessibles séparément, et des observations fiables pour Toulon et Nice, qui servent de vérité terrain. L'usage est personnel et non commercial. Le backtest (M0-03) a en plus besoin d'un historique des prévisions passées.

## Décision

Proposition, à confirmer :

- **Prévisions** : Open-Meteo, qui expose séparément les modèles AROME et ARPEGE (Météo-France), IFS (ECMWF) et ICON (DWD), et éventuellement GFS (NOAA). Un seul fournisseur, un seul format.
- **Observations** : les stations Météo-France les plus proches de chaque ville, via les données publiques de Météo-France.
- **Historique** : les API d'historique d'Open-Meteo (prévisions passées par échéance, runs archivés).

## Alternatives écartées

- **Appeler directement chaque service météo national** : formats lourds (GRIB), un client par fournisseur. À reconsidérer seulement si Open-Meteo ne suffit pas ou si l'usage devient commercial.
- **Agréger des API météo grand public** (qui renvoient déjà une prévision finale) : on ne sait pas quels modèles sont derrière, donc on ne peut ni les corriger ni les pondérer proprement.

## Conséquences

- Dépendance à un seul intermédiaire pour les prévisions : une panne d'Open-Meteo arrête le pipeline. L'app continue d'afficher la dernière prévision, datée.
- L'accès gratuit est limité à un usage non commercial, avec attribution.

## À établir par le spike

Liste et portée réelle des modèles pour les deux villes ; coordonnées des points de prévision (éviter une maille « mer ») ; conditions et quotas ; profondeur de l'historique ; accès, licence et délai des observations ; station de référence de chaque ville.

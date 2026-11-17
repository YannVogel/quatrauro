# Fichiers publiés, pour les tests de l'app

`published/` contient les quatre fichiers qu'un passage du pipeline écrit pour l'app : `forecast-<ville>.json` et `verification-<ville>.json`.

Ce sont de **vrais fichiers**, produits le 17 novembre 2026 à 21 h 27 UTC par `npm run pipeline` dans un dossier local, après un amorçage sur l'historique réel (du 1er octobre 2025 au 15 novembre 2026) : prévisions d'Open-Meteo (CC BY 4.0), mesures de Météo-France (Licence Ouverte 2.0). Ils n'ont pas été publiés : la branche `data` n'existait pas encore.

Ils servent à tester la lecture des données et les écrans sur ce que l'app recevra vraiment. Ne pas les modifier à la main : pour les rafraîchir, relancer un passage local et les recopier, puis mettre à jour la date ci-dessus et les valeurs attendues des tests.

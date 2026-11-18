# Fiches des fonctionnalités

Chaque fonctionnalité notable a sa fiche ici : comportement, données, écrans, cas limites. Une fiche se crée ou se met à jour dans le même commit que le code.

| Fiche | Fonctionnalité |
|---|---|
| [backtest.md](backtest.md) | Backtest du mélange : méthode, résultats, paramètres retenus, limites, verdict du feu vert. Tableaux complets dans [backtest-resultats.md](backtest-resultats.md), généré par le script |
| [contrat-de-donnees.md](contrat-de-donnees.md) | Contrat des fichiers publiés (`forecast`, `verification`), configuration unique, séries internes |
| [melange.md](melange.md) | Mélange des modèles : où est rangée la mémoire d'un modèle, correction de biais, pondération, mélange d'une heure, agrégats quotidiens, indice de fiabilité et sa calibration |
| [conditions-et-resumes.md](conditions-et-resumes.md) | Condition d'une heure et d'un jour, résumé du jour : la table des règles, les seuils, les phrases, jour ou nuit |
| [collecte.md](collecte.md) | Collecte des prévisions et des observations : les requêtes, les vérifications à la lecture, les modèles indisponibles, les mesures rejetées, les tentatives réseau |
| [archive-et-verification.md](archive-et-verification.md) | Archive des prévisions et des mesures, état d'une ville, apprentissage heure par heure et jour par jour, scores publiés, idempotence |
| [amorcage.md](amorcage.md) | Amorçage par l'historique : la commande, ce qu'elle rejoue et écrit, les chiffres mesurés sur l'historique réel, les limites |
| [pipeline.md](pipeline.md) | Un passage complet : la commande, les étapes, tout ou rien, ce que contient la prévision publiée, le journal |
| [lecture-des-donnees.md](lecture-des-donnees.md) | Lecture des fichiers publiés dans l'app : adresse, validation, cache sur l'appareil, hors ligne, ce que rendent les hooks |
| [fraicheur-et-etats.md](fraicheur-et-etats.md) | Heure de mise à jour, prévision ancienne, heures et jours à venir, états de chargement et état vide |
| [accueil.md](accueil.md) | Accueil d'une ville : ce qu'il montre, ses règles, ses états, la navigation, l'accessibilité |
| [detail-d-un-jour.md](detail-d-un-jour.md) | Détail d'un jour : bloc du jour, heure par heure, chiffres clés, carte de désaccord entre modèles |
| [theme.md](theme.md) | Thème : Système, Clair ou Sombre, mémorisé ; le menu, les barres système, la limite de l'écran de démarrage |
| [ecran-les-modeles.md](ecran-les-modeles.md) | Écran « Les modèles » : prévision combinée, valeur et poids de chaque modèle, erreur récente, modèle absent ou hors de portée |
| [donnees.md](donnees.md) | Sources de données : modèles, points de prévision, variables, historique, observations, attributions |

# Écran « À propos des données »

Il dit ce qu'est Quatrauro, d'où viennent ses données, et ce qu'il ne faut pas lui demander. C'est aussi là que l'app s'acquitte des mentions que demandent les licences de ses sources.

| Fichier | Rôle |
|---|---|
| `app/about.tsx` | La route : `/about` |
| `src/features/about/components/AboutScreen.tsx` | L'écran |
| `src/features/about/about.ts` | Fonctions pures : fournisseurs des modèles, stations, date du dernier calcul |
| `src/features/about/links.ts` | Les pages que l'écran ouvre dans le navigateur |
| `…/SourcesCard.tsx`, `…/ExternalLink.tsx`, `…/AboutSection.tsx` | La carte des sources, une ligne de lien, un intertitre |
| `src/lib/appVersion.ts` | La version de l'app, lue dans sa configuration |

On y arrive par « À propos des données », sur l'accueil. L'écran n'est pas dans les maquettes : il est dérivé de la [spécification](../design/riviera.md) (cartes, intertitres, lignes de 48 dp).

## Ce que montre l'écran

1. **Le principe**, en quatre phrases : la comparaison aux mesures, la correction et le mélange, ce qu'est l'indice de fiabilité, ce qu'est une prévision « vérifiée ».
2. **Sources** : prévisions, modèles, observations (voir ci-dessous).
3. **Limites** : outil personnel et prévision indicative, villes couvertes, renvoi à la carte de vigilance de Météo-France.
4. **Version de l'app** et **date du dernier calcul** pour la ville affichée.

## Mentions des sources

Vérifiées sur les pages des licences le 18 novembre 2026.

| Source | Ce que demande la licence | Ce qu'affiche l'écran |
|---|---|---|
| Open-Meteo ([CC BY 4.0](https://open-meteo.com/en/licence)) | Un lien vers open-meteo.com à côté des données, un lien vers la licence, et dire si les données ont été modifiées | Le lien « Données météo par Open-Meteo.com », la phrase « Quatrauro corrige et combine ces données… », le lien « Licence CC BY 4.0 » |
| Fournisseurs des modèles | Cités par Open-Meteo sur sa page de licence | Une ligne par fournisseur, avec ses modèles : « Météo-France : AROME, ARPEGE » |
| Météo-France, observations ([Licence Ouverte 2.0](https://www.data.gouv.fr/pages/legal/licences/etalab-2.0)) | La source (au moins le nom du producteur) et la date de dernière mise à jour ; un lien vers la source convient | Le lien « Source : Météo-France » vers le jeu de données, la station de chaque ville, le lien « Licence Ouverte 2.0 », et la date du dernier calcul en bas de l'écran |

**Rien n'est écrit en dur** : les fournisseurs et les modèles viennent de `shared/models.ts`, les villes et les stations de `shared/cities.ts`. Un modèle ou une ville ajoutés à la configuration sont cités sans toucher à l'écran.

## Liens

Les cinq liens ouvrent le navigateur du téléphone (`Linking.openURL`). Ce sont des pages à lire : l'app n'y télécharge rien, et le test `__tests__/no-weather-api.test.ts` continue d'interdire les adresses d'API météo dans l'app.

L'ancienne adresse de la Licence Ouverte (etalab.gouv.fr) renvoie désormais à l'accueil de data.gouv.fr : l'écran pointe vers la page de la licence sur data.gouv.fr.

## Cas limites

| Cas | Comportement |
|---|---|
| Aucune prévision reçue (premier lancement hors ligne) | Tout l'écran s'affiche ; « Dernier calcul : indisponible » |
| Aucun navigateur ne peut ouvrir la page | L'adresse s'affiche sous le lien : « Cette page n'a pas pu être ouverte : … » |
| Version illisible | « Version indisponible » |

## Accessibilité

- Chaque lien a le rôle « lien » et l'indication « Ouvre le navigateur ».
- Les titres de cartes et les intertitres ont le rôle « titre ».
- L'icône au bout d'un lien externe (flèche qui sort d'un cadre) diffère du chevron des liens internes.

## Tests

- `src/features/about/__tests__/about.test.ts` : chaque modèle configuré est cité sous son fournisseur, un modèle ajouté l'est aussi ; station de chaque ville ; liste de noms ; date du dernier calcul à l'heure de Paris, été comme hiver.
- `src/lib/__tests__/appVersion.test.ts` : version lue dans la configuration, ou `null`.
- `__tests__/about.test.tsx` : l'écran dans l'app. Mention et lien de chaque source, principe, limites et lien de vigilance, version et dernier calcul, lien impossible à ouvrir, écran sans aucune prévision.

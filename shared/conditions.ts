// Liste fermée des conditions météo : la seule source, pour le pipeline (qui les produit à
// partir des champs mélangés) comme pour l'app (qui leur donne une icône et une couleur).
//
// Elle ne contient que ce que le mélange sait déterminer : nébulosité, pluie, neige (pluie par
// temps froid), orage et vent fort. La brume n'y est pas : aucun champ mélangé ne permet de la
// reconnaître. Le jour et la nuit ne sont pas des conditions : ils se déduisent de l'heure.

export const CONDITIONS = [
  'clear',
  'partlyCloudy',
  'cloudy',
  'rain',
  'showers',
  'thunderstorm',
  'snow',
  'windy',
] as const;

export type Condition = (typeof CONDITIONS)[number];

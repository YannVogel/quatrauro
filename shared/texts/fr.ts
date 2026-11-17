// Textes produits par le pipeline et publiés tels quels : les résumés d'un jour. Ils sont
// écrits ici, en un seul endroit, et jamais assemblés ailleurs. Les textes de l'interface,
// eux, sont dans `src/i18n/fr.ts`.

const NON_BREAKING_SPACE = ' ';

/** « 15 h », avec une espace insécable. */
const hour = (value: number): string => `${value}${NON_BREAKING_SPACE}h`;

export const SUMMARY_TEXTS = {
  rainRisk: 'Risque d’averses dans la journée',
  rainMostOfDay: 'Pluie une grande partie de la journée',
  dryMorningWetEvening: 'Matinée sèche, soirée arrosée',
  rainUntil: (end: number): string => `Pluie jusqu’à ${hour(end)}`,
  rainFrom: (start: number): string => `Pluie dès ${hour(start)}`,
  rainBetween: (start: number, end: number): string => `Pluie entre ${hour(start)} et ${hour(end)}`,
  showersBetween: (start: number, end: number): string =>
    `Averses entre ${hour(start)} et ${hour(end)}`,
  showerAround: (at: number): string => `Averse vers ${hour(at)}`,
  thunderstormAround: (at: number): string => `Orage vers ${hour(at)}`,
  gustsUpTo: (speed: number): string => `Rafales jusqu’à ${speed}${NON_BREAKING_SPACE}km/h`,
  sunnyMorningCloudyAfternoon: 'Matinée ensoleillée, après-midi nuageux',
  cloudyMorningSunnyAfternoon: 'Matinée nuageuse, après-midi ensoleillé',
} as const;

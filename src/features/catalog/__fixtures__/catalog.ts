// DONNÉES FICTIVES, pour le catalogue des composants uniquement. Aucune de ces valeurs ne
// vient d'un modèle ni d'une station : elles sont choisies pour montrer chaque composant dans
// ses états, cas limites compris (valeur absente, amplitude nulle, 0 % et 100 %).

import type { Condition } from '@shared/conditions';

export const fakeCities = [
  { id: 'toulon', label: 'Toulon' },
  { id: 'nice', label: 'Nice' },
];

/** Assez de villes pour que le sélecteur déborde. Les deux dernières n'existent pas dans l'app. */
export const fakeManyCities = [
  ...fakeCities,
  { id: 'hyeres', label: 'Hyères' },
  { id: 'saint-raphael', label: 'Saint-Raphaël' },
];

export const fakeHero = {
  temperature: 16,
  reliability: 95,
  agreement: "4 modèles d'accord",
};

export const fakeHours: readonly {
  readonly hour: number;
  readonly temperature: number | null;
  readonly rainProbability?: number | null;
}[] = [
  { hour: 17, temperature: 15 },
  { hour: 18, temperature: 14, rainProbability: 0 },
  { hour: 19, temperature: 13, rainProbability: 80 },
  { hour: 20, temperature: -1, rainProbability: 100 },
  { hour: 21, temperature: null, rainProbability: null },
];

export const fakeWeekScale = { min: 4, max: 18 };

export const fakeWeek: readonly {
  readonly dayLabel: string;
  readonly spokenDay: string;
  readonly condition: Condition | null;
  readonly min: number | null;
  readonly max: number | null;
  readonly reliability: number | null;
}[] = [
  { dayLabel: 'Mar.', spokenDay: 'mardi', condition: 'clear', min: 9, max: 16, reliability: 95 },
  {
    dayLabel: 'Mer.',
    spokenDay: 'mercredi',
    condition: 'partlyCloudy',
    min: 10,
    max: 17,
    reliability: 90,
  },
  { dayLabel: 'Jeu.', spokenDay: 'jeudi', condition: 'rain', min: 11, max: 15, reliability: 75 },
  {
    dayLabel: 'Ven.',
    spokenDay: 'vendredi',
    condition: 'thunderstorm',
    min: 9,
    max: 14,
    reliability: 60,
  },
  // Amplitude nulle : le minimum égale le maximum.
  { dayLabel: 'Sam.', spokenDay: 'samedi', condition: 'cloudy', min: 12, max: 12, reliability: 45 },
  // Valeurs hors de l'échelle de la semaine.
  { dayLabel: 'Dim.', spokenDay: 'dimanche', condition: 'windy', min: 2, max: 20, reliability: 0 },
  // Tout est absent, condition comprise.
  {
    dayLabel: 'Lun.',
    spokenDay: 'lundi',
    condition: null,
    min: null,
    max: null,
    reliability: null,
  },
];

export const fakeChart = [
  { hour: 0, temperature: 11, rainProbability: 0 },
  { hour: 3, temperature: 11, rainProbability: 6 },
  { hour: 6, temperature: 11, rainProbability: 10 },
  { hour: 9, temperature: 12, rainProbability: 10 },
  { hour: 12, temperature: 14, rainProbability: 25 },
  { hour: 15, temperature: 15, rainProbability: 80 },
  { hour: 18, temperature: 13, rainProbability: 100 },
  { hour: 21, temperature: null, rainProbability: null },
];

export const fakeStats = { wind: 35, rain: 12, humidity: 82, feelsLike: 13 };

export const fakeModels: readonly {
  readonly name: string;
  readonly provider: string;
  readonly weight: number | null;
  readonly temperature: number | null;
}[] = [
  { name: 'AROME', provider: 'Météo-France · maille fine', weight: 0.35, temperature: 17.2 },
  { name: 'IFS', provider: 'ECMWF · global', weight: 0.24, temperature: 16.6 },
  { name: 'ARPEGE', provider: 'Météo-France · Europe', weight: 0.23, temperature: 16.9 },
  { name: 'ICON', provider: 'DWD · Europe', weight: 0.18, temperature: 16.1 },
  // Un modèle qui ne couvre pas l'échéance.
  { name: 'GFS', provider: 'NOAA · global', weight: null, temperature: null },
];

export const fakeMeters: readonly (number | null)[] = [0, 0.35, 1, null];

/** Âge d'une prévision ancienne, et heures déjà vérifiées quand le recul manque. */
export const fakeStaleHours = 14;
export const fakeVerifiedHours = 60;

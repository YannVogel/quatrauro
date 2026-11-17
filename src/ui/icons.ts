// Les icônes de l'app, toutes au trait sur une grille de 24 (direction Riviera). Le reste du
// code passe par ce registre et par le composant `Icon` : la bibliothèque d'icônes n'est
// importée qu'ici.

import {
  ArrowLeft,
  ChevronRight,
  Cloud,
  CloudLightning,
  CloudMoon,
  CloudMoonRain,
  CloudRain,
  CloudSnow,
  CloudSun,
  CloudSunRain,
  Moon,
  Sun,
  SunMoon,
  Wind,
} from 'lucide-react-native';

export const icons = {
  sun: Sun,
  moon: Moon,
  cloudSun: CloudSun,
  cloudMoon: CloudMoon,
  cloud: Cloud,
  rain: CloudRain,
  showersDay: CloudSunRain,
  showersNight: CloudMoonRain,
  thunderstorm: CloudLightning,
  snow: CloudSnow,
  wind: Wind,
  back: ArrowLeft,
  /** « Ouvrir » : au bout d'une ligne qui mène à un autre écran. */
  forward: ChevronRight,
  theme: SunMoon,
} as const;

export type IconName = keyof typeof icons;

/** Épaisseur du trait, sur la grille de 24. */
export const ICON_STROKE_WIDTH = 1.8;

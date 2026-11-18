// Les icônes de l'app, toutes au trait sur une grille de 24 (direction Riviera). Le reste du
// code passe par ce registre et par le composant `Icon` : la bibliothèque d'icônes n'est
// importée qu'ici.

import {
  ArrowLeft,
  CalendarX,
  Check,
  ChevronRight,
  Cloud,
  CloudLightning,
  CloudMoon,
  CloudMoonRain,
  CloudOff,
  CloudRain,
  CloudSnow,
  CloudSun,
  CloudSunRain,
  Download,
  ExternalLink,
  History,
  Hourglass,
  Moon,
  Sun,
  SunMoon,
  TriangleAlert,
  WifiOff,
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
  /** « Ouvre le navigateur » : au bout d'une ligne qui mène hors de l'app. */
  external: ExternalLink,
  theme: SunMoon,
  /** Le choix en cours, dans un menu. */
  check: Check,
  /** Attire l'œil sur une valeur à remarquer, sans compter sur la couleur. */
  alert: TriangleAlert,
  /** États : pas de connexion, serveur muet, données anciennes, recul insuffisant, app à mettre à jour, jour sorti de la prévision. */
  offline: WifiOff,
  unavailable: CloudOff,
  stale: History,
  hourglass: Hourglass,
  update: Download,
  dayGone: CalendarX,
} as const;

export type IconName = keyof typeof icons;

/** Épaisseur du trait, sur la grille de 24. */
export const ICON_STROKE_WIDTH = 1.8;

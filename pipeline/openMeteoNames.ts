// Nom de chaque grandeur chez Open-Meteo, et l'unité dans laquelle on la demande : celle de
// Quatrauro, pour n'avoir aucune conversion à faire. Documentation : https://open-meteo.com/en/docs
// (lue le 17/11/2026).

import type { ForecastVariable } from '../shared/variables.ts';

export const OPEN_METEO_NAMES: Readonly<Record<ForecastVariable, string>> = {
  temperature: 'temperature_2m',
  humidity: 'relative_humidity_2m',
  windSpeed: 'wind_speed_10m',
  windGusts: 'wind_gusts_10m',
  windDirection: 'wind_direction_10m',
  cloudCover: 'cloud_cover',
  precipitation: 'precipitation',
};

/** Unité annoncée par Open-Meteo (`hourly_units`) pour chaque grandeur, avec les réglages demandés. */
export const OPEN_METEO_UNITS: Readonly<Record<ForecastVariable, string>> = {
  temperature: '°C',
  humidity: '%',
  windSpeed: 'km/h',
  windGusts: 'km/h',
  windDirection: '°',
  cloudCover: '%',
  precipitation: 'mm',
};

/** Code météo de l'OMM : il ne se mélange pas, il sert à reconnaître l'orage. */
export const OPEN_METEO_WEATHER_CODE = { name: 'weather_code', unit: 'wmo code' } as const;

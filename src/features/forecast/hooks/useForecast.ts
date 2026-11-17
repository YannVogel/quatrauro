import { forecastQuery } from '@/lib/queryClient';
import type { CityId } from '@shared/cities';
import type { ForecastFile } from '@shared/schemas';

import { usePublishedFile } from './usePublishedFile';
import type { PublishedData } from './usePublishedFile';

/** La prévision publiée d'une ville. */
export function useForecast(cityId: CityId): PublishedData<ForecastFile> {
  return usePublishedFile(forecastQuery(cityId));
}

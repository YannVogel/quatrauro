import { verificationQuery } from '@/lib/queryClient';
import type { CityId } from '@shared/cities';
import type { VerificationFile } from '@shared/schemas';

import { usePublishedFile } from './usePublishedFile';
import type { PublishedData } from './usePublishedFile';

/** Les scores publiés d'une ville : ce que montre l'écran « Fiabilité ». */
export function useVerification(cityId: CityId): PublishedData<VerificationFile> {
  return usePublishedFile(verificationQuery(cityId));
}

// Publication : les deux fichiers qu'une ville expose à l'app. Chacun est validé contre le
// contrat avant d'être écrit ; un fichier invalide arrête tout, et rien n'est écrit.

import type { z } from 'zod';

import type { CityId } from '../../shared/cities.ts';
import { forecastFileSchema, verificationFileSchema } from '../../shared/schemas.ts';
import type { ForecastFile, VerificationFile } from '../../shared/schemas.ts';
import { writeJson } from '../storage.ts';
import type { Storage } from '../storage.ts';

export const forecastFileOf = (cityId: CityId): string => `forecast/${cityId}.json`;
export const verificationFileOf = (cityId: CityId): string => `verification/${cityId}.json`;

function validated<Schema extends z.ZodType>(
  schema: Schema,
  value: unknown,
  file: string,
): unknown {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    const [issue] = parsed.error.issues;
    throw new Error(
      `Fichier refusé, il ne respecte pas le contrat : ${file} (${issue?.path.join('.') ?? ''} : ${issue?.message ?? ''})`,
    );
  }
  return value;
}

export async function publishCity(
  storage: Storage,
  files: { readonly forecast: ForecastFile; readonly verification: VerificationFile },
): Promise<void> {
  const forecastFile = forecastFileOf(files.forecast.city);
  const verificationFile = verificationFileOf(files.verification.city);
  // Les deux sont validés avant la première écriture.
  const forecast = validated(forecastFileSchema, files.forecast, forecastFile);
  const verification = validated(verificationFileSchema, files.verification, verificationFile);
  await writeJson(storage, forecastFile, forecast);
  await writeJson(storage, verificationFile, verification);
}

// Lecture des fichiers publiés par le pipeline. L'app ne calcule rien et n'appelle aucune API
// météo : elle télécharge ces fichiers, les valide contre le contrat de `shared/`, et refuse
// tout ce qui ne le respecte pas.

import type { z } from 'zod';

import type { CityId } from '@shared/cities';
import { SCHEMA_VERSION, forecastFileSchema, verificationFileSchema } from '@shared/schemas';
import type { ForecastFile, VerificationFile } from '@shared/schemas';

import { env } from './env';

/**
 * Pourquoi un fichier n'a pas pu être lu :
 * - `network` : pas de réponse (hors ligne, délai) ;
 * - `http` : le serveur a répondu par une erreur (fichier absent, panne) ;
 * - `version` : le fichier est d'une version du contrat que cette app ne connaît pas ;
 * - `invalid` : le fichier ne respecte pas le contrat.
 */
export type DataErrorKind = 'network' | 'http' | 'version' | 'invalid';

export class DataError extends Error {
  readonly kind: DataErrorKind;

  constructor(kind: DataErrorKind, message: string, cause?: unknown) {
    super(message, { cause });
    this.name = 'DataError';
    this.kind = kind;
  }
}

type PublishedFile = { readonly city: CityId };

/**
 * Demande au téléphone de vérifier auprès du serveur avant de resservir une réponse qu'il a
 * gardée. Sans cela, son cache HTTP peut répondre à la place d'un serveur injoignable
 * (constaté sur Android) : l'app croirait avoir rafraîchi alors qu'elle est hors ligne. Le
 * seul cache qui compte est le nôtre, celui qui dit de quand date ce qu'il montre.
 */
const REVALIDATE = { 'Cache-Control': 'no-cache' } as const;

const hasOtherVersion = (json: unknown): boolean =>
  typeof json === 'object' &&
  json !== null &&
  'schemaVersion' in json &&
  json.schemaVersion !== SCHEMA_VERSION;

async function fetchPublished<Schema extends z.ZodType<PublishedFile>>(
  file: string,
  cityId: CityId,
  schema: Schema,
): Promise<z.infer<Schema>> {
  const url = `${env.dataUrl}/${file}`;
  let response: Response;
  try {
    response = await fetch(url, { headers: REVALIDATE });
  } catch (error) {
    throw new DataError('network', `Pas de réponse pour ${file}`, error);
  }
  if (!response.ok) throw new DataError('http', `${file} : réponse ${response.status}`);

  let json: unknown;
  try {
    json = await response.json();
  } catch (error) {
    throw new DataError('invalid', `${file} n'est pas du JSON`, error);
  }
  // La version se lit avant tout le reste : un fichier d'une autre version n'est pas « invalide ».
  if (hasOtherVersion(json)) {
    throw new DataError('version', `${file} est d'une version inconnue de cette app`);
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw new DataError('invalid', `${file} ne respecte pas le contrat`, parsed.error);
  }
  if (parsed.data.city !== cityId) {
    throw new DataError('invalid', `${file} décrit une autre ville`);
  }
  return parsed.data;
}

export const fetchForecast = (cityId: CityId): Promise<ForecastFile> =>
  fetchPublished(`forecast/${cityId}.json`, cityId, forecastFileSchema);

export const fetchVerification = (cityId: CityId): Promise<VerificationFile> =>
  fetchPublished(`verification/${cityId}.json`, cityId, verificationFileSchema);

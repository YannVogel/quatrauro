import { useWindowDimensions } from 'react-native';

/**
 * Au-delà de cette taille de police, les lignes à plusieurs colonnes changent de mise en page
 * plutôt que de couper leurs chiffres. 1,3 est le plus grand réglage de beaucoup de téléphones ;
 * Android 14 monte jusqu'à 2.
 */
export const LARGE_TEXT_FROM = 1.3;

type TextScale = {
  /** Facteur choisi sur le téléphone : 1 par défaut. */
  readonly fontScale: number;
  readonly isLargeText: boolean;
};

export function useTextScale(): TextScale {
  const { fontScale } = useWindowDimensions();
  return { fontScale, isLargeText: fontScale > LARGE_TEXT_FROM };
}

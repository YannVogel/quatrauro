import { act } from '@testing-library/react-native';
import { Dimensions } from 'react-native';

import { TEST_PHONE } from './phone';

/**
 * Change la taille de police du téléphone de test : 1 par défaut, 1,3 pour le plus grand réglage
 * courant, 2 pour le maximum d'Android. À remettre à 1 en fin de test.
 */
export async function setFontScale(fontScale: number): Promise<void> {
  const metrics = { ...TEST_PHONE, fontScale };
  await act(() => {
    Dimensions.set({ window: metrics, screen: metrics });
  });
}

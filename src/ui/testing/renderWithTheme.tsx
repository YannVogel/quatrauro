import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import { ThemeProvider } from '../ThemeProvider';
import type { ThemeName } from '../theme';

/** Rend un composant dans un thème donné, pour les tests. */
export function renderWithTheme(element: ReactElement, theme: ThemeName = 'light') {
  return render(<ThemeProvider preference={theme}>{element}</ThemeProvider>);
}

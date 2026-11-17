import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';

import { themes } from './theme';
import type { Theme, ThemeName } from './theme';

/** Réglage du thème : suivre le système, ou forcer le clair ou le sombre. */
export type ThemePreference = 'system' | ThemeName;

const ThemeContext = createContext<Theme>(themes.light);

type ThemeProviderProps = {
  /** Seule la valeur « system » est branchée dans l'app ; le réglage manuel arrive avec M2-06. */
  readonly preference?: ThemePreference;
  readonly children: ReactNode;
};

export function ThemeProvider({ preference = 'system', children }: ThemeProviderProps) {
  const systemScheme = useColorScheme();
  const name: ThemeName =
    preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;
  return <ThemeContext.Provider value={themes[name]}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

type NamedStyles<T> = { [Key in keyof T]: ViewStyle | TextStyle | ImageStyle };

/**
 * Déclare des styles qui dépendent du thème. Le hook rendu recalcule les styles seulement
 * quand le thème change.
 */
export function makeStyles<T extends NamedStyles<T>>(factory: (theme: Theme) => T): () => T {
  return function useStyles(): T {
    const theme = useTheme();
    return useMemo(() => StyleSheet.create(factory(theme)), [theme]);
  };
}

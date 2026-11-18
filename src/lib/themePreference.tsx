// Le réglage du thème : suivre le téléphone, ou forcer le clair ou le sombre. Il est gardé sur
// l'appareil et appliqué avant le premier affichage.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Appearance } from 'react-native';

import { ThemeMenu, ThemeProvider } from '@/ui';
import type { ThemePreference } from '@/ui';

import { useStoredPreference } from './preferences';

const PREFERENCES: readonly string[] = ['system', 'light', 'dark'] satisfies ThemePreference[];
const isThemePreference = (value: string): value is ThemePreference => PREFERENCES.includes(value);

type ThemeSetting = {
  readonly preference: ThemePreference;
  /** Ouvre le menu du thème. */
  readonly openThemeMenu: () => void;
};

const ThemeSettingContext = createContext<ThemeSetting | null>(null);

/**
 * Donne le thème à l'app et tient le menu qui permet d'en changer. Rien n'est affiché tant que
 * le réglage enregistré n'a pas été lu : l'app ne montre jamais une image dans le mauvais thème.
 */
export function ThemePreferenceProvider({ children }: { readonly children: ReactNode }) {
  const { stored, save } = useStoredPreference('theme', isThemePreference);
  const [isMenuOpen, setMenuOpen] = useState(false);
  const preference: ThemePreference = stored ?? 'system';

  // Le téléphone est prévenu lui aussi : ses propres éléments (barres, menus natifs) suivent.
  useEffect(() => {
    if (stored === undefined) return;
    Appearance.setColorScheme(preference === 'system' ? 'auto' : preference);
  }, [stored, preference]);

  const openThemeMenu = useCallback(() => setMenuOpen(true), []);
  const value = useMemo(() => ({ preference, openThemeMenu }), [preference, openThemeMenu]);
  if (stored === undefined) return null;

  return (
    <ThemeSettingContext.Provider value={value}>
      <ThemeProvider preference={preference}>
        {children}
        <ThemeMenu
          visible={isMenuOpen}
          value={preference}
          onSelect={(choice) => {
            save(choice);
            setMenuOpen(false);
          }}
          onClose={() => setMenuOpen(false)}
        />
      </ThemeProvider>
    </ThemeSettingContext.Provider>
  );
}

export function useThemeSetting(): ThemeSetting {
  const value = useContext(ThemeSettingContext);
  if (value === null) {
    throw new Error('useThemeSetting doit être appelé sous ThemePreferenceProvider');
  }
  return value;
}

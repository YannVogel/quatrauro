// Petits réglages gardés sur l'appareil (la ville consultée, le thème choisi). Rien de
// personnel : l'app ne collecte rien.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const PREFIX = 'quatrauro-preference-';

/** Valeur enregistrée, ou `null` si elle manque, n'est plus valide, ou ne peut pas être lue. */
async function readPreference<Value extends string>(
  name: string,
  isValid: (value: string) => value is Value,
): Promise<Value | null> {
  try {
    const stored = await AsyncStorage.getItem(PREFIX + name);
    return stored !== null && isValid(stored) ? stored : null;
  } catch {
    // Un stockage illisible ne doit pas empêcher l'app de s'ouvrir : on repart du réglage par défaut.
    return null;
  }
}

export type StoredPreference<Value extends string> = {
  /** `undefined` tant que le stockage n'a pas été lu ; ensuite la valeur enregistrée, ou `null`. */
  readonly stored: Value | null | undefined;
  readonly save: (value: Value) => void;
};

/**
 * Un réglage enregistré sur l'appareil. `isValid` écarte une valeur d'une ancienne version de
 * l'app (une ville retirée de la configuration, par exemple).
 */
export function useStoredPreference<Value extends string>(
  name: string,
  isValid: (value: string) => value is Value,
): StoredPreference<Value> {
  const [stored, setStored] = useState<Value | null | undefined>(undefined);
  useEffect(() => {
    let isCurrent = true;
    void readPreference(name, isValid).then((value) => {
      if (isCurrent) setStored(value);
    });
    return () => {
      isCurrent = false;
    };
  }, [name, isValid]);

  const save = useCallback(
    (value: Value) => {
      setStored(value);
      // Si l'écriture échoue, le choix vaut pour cette ouverture seulement : rien d'autre à faire.
      AsyncStorage.setItem(PREFIX + name, value).catch(() => undefined);
    },
    [name],
  );
  return { stored, save };
}

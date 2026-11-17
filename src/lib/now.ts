import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

const MINUTE_MS = 60_000;

/**
 * L'instant présent, rafraîchi toutes les minutes et à chaque retour de l'app au premier plan.
 * Les écrans s'en servent pour ne jamais montrer une heure passée comme à venir, ni une
 * prévision ancienne comme fraîche, même s'ils restent ouverts longtemps.
 */
export function useNow(intervalMs: number = MINUTE_MS): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const update = (): void => setNow(new Date());
    const timer = setInterval(update, intervalMs);
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') update();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [intervalMs]);
  return now;
}

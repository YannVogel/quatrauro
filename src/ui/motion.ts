import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** Vrai quand l'utilisateur a demandé au téléphone de réduire les animations. */
export function useReducedMotion(): boolean {
  const [isReduced, setReduced] = useState(false);
  useEffect(() => {
    let isMounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then(
      (enabled) => {
        if (isMounted) setReduced(enabled);
      },
      // Réglage illisible : on garde l'animation, qui est discrète.
      () => undefined,
    );
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);
  return isReduced;
}

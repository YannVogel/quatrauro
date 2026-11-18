import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Animated, View } from 'react-native';
import type { DimensionValue } from 'react-native';

import { makeStyles, useTheme } from '../ThemeProvider';
import { useReducedMotion } from '../motion';

type SkeletonProps = {
  readonly height: number;
  /** Largeur ; toute la place disponible par défaut. */
  readonly width?: DimensionValue;
  /** `hero` quand la forme est posée sur le bloc d'état. */
  readonly surface?: 'card' | 'hero';
};

/** Forme pleine qui tient la place d'un contenu en cours de chargement. */
export function Skeleton({ height, width = '100%', surface = 'card' }: SkeletonProps) {
  const theme = useTheme();
  const styles = useStyles();
  return (
    <View
      style={[
        styles.shape,
        {
          height,
          width,
          backgroundColor: surface === 'hero' ? theme.colors.heroOverlay : theme.colors.track,
        },
      ]}
    />
  );
}

const PULSE_MS = 900;
const DIMMED = 0.55;

type SkeletonGroupProps = {
  /** Ce qui se charge, pour les lecteurs d'écran : « Chargement de la prévision… ». */
  readonly label: string;
  readonly children: ReactNode;
  readonly testID?: string;
};

/**
 * Réunit les formes d'un chargement : un seul élément pour les lecteurs d'écran, et une
 * respiration lente, coupée quand le téléphone demande moins d'animations.
 */
export function SkeletonGroup({ label, children, testID }: SkeletonGroupProps) {
  const styles = useStyles();
  const isReduced = useReducedMotion();
  // Une seule valeur pour toute la vie du composant : l'état la garde sans la relire d'une ref.
  const [opacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (isReduced) {
      opacity.setValue(1);
      return undefined;
    }
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: DIMMED, duration: PULSE_MS, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: PULSE_MS, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [isReduced, opacity]);

  return (
    <Animated.View
      testID={testID}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
      style={[styles.group, { opacity }]}
    >
      {children}
    </Animated.View>
  );
}

const useStyles = makeStyles((theme) => ({
  shape: { borderRadius: theme.radii.pill },
  group: { gap: theme.spacing.block },
}));

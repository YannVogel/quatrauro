import type { ReactNode } from 'react';
import { View } from 'react-native';

import { makeStyles, useTheme } from '../ThemeProvider';
import type { HeroToken } from '../theme';

type HeroBlockProps = {
  /** Couleur du bloc : celle de la condition (`conditionAppearance`), ou `heroClear` par défaut. */
  readonly tone?: HeroToken;
  readonly children: ReactNode;
  readonly testID?: string;
};

/** Bloc d'état coloré, en tête de chaque écran. Son contenu s'écrit avec la couleur `onHero`. */
export function HeroBlock({ tone = 'heroClear', children, testID }: HeroBlockProps) {
  const theme = useTheme();
  const styles = useStyles();
  return (
    <View testID={testID} style={[styles.block, { backgroundColor: theme.colors[tone] }]}>
      {children}
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  block: {
    borderRadius: theme.radii.card,
    padding: theme.spacing.card,
    gap: theme.spacing.block,
  },
}));

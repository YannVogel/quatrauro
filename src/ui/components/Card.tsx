import type { ReactNode } from 'react';
import { View } from 'react-native';

import { makeStyles } from '../ThemeProvider';

type CardProps = { readonly children: ReactNode; readonly testID?: string };

/** Carte arrondie sur fond `card`. */
export function Card({ children, testID }: CardProps) {
  const styles = useStyles();
  return (
    <View testID={testID} style={styles.card}>
      {children}
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.card,
    padding: theme.spacing.card,
    gap: theme.spacing.block,
  },
}));

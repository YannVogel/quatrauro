import { View } from 'react-native';

import { makeStyles } from '../ThemeProvider';
import { Card } from './Card';
import { HeroBlock } from './HeroBlock';
import { Skeleton, SkeletonGroup } from './Skeleton';

type LoadingSkeletonProps = {
  /** Ce qui se charge, pour les lecteurs d'écran. */
  readonly label: string;
  /** Faux quand l'écran affiche déjà son bloc d'état (l'accueil, avec son sélecteur de ville). */
  readonly withHero?: boolean;
};

const ROWS = [0, 1, 2, 3, 4];
const TILES = [0, 1, 2, 3, 4];

/** Les formes d'un écran en cours de chargement : un bloc d'état, des vignettes, une liste. */
export function LoadingSkeleton({ label, withHero = true }: LoadingSkeletonProps) {
  const styles = useStyles();
  return (
    <SkeletonGroup label={label} testID="loading-skeleton">
      {withHero ? (
        <HeroBlock>
          <Skeleton surface="hero" height={16} width="55%" />
          <Skeleton surface="hero" height={64} width="40%" />
          <Skeleton surface="hero" height={16} width="70%" />
        </HeroBlock>
      ) : null}
      <View style={styles.tiles}>
        {TILES.map((tile) => (
          <View key={tile} style={styles.tile}>
            <Skeleton height={12} width="60%" />
            <Skeleton height={28} width={28} />
            <Skeleton height={16} width="70%" />
          </View>
        ))}
      </View>
      <Card>
        <Skeleton height={16} width="45%" />
        {ROWS.map((row) => (
          <View key={row} style={styles.row}>
            <Skeleton height={14} width="22%" />
            <Skeleton height={8} width="46%" />
            <Skeleton height={14} width="12%" />
          </View>
        ))}
      </Card>
    </SkeletonGroup>
  );
}

const useStyles = makeStyles((theme) => ({
  tiles: { flexDirection: 'row', gap: theme.spacing.item },
  tile: {
    flex: 1,
    alignItems: 'center',
    gap: theme.spacing.item,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.tile,
    paddingVertical: theme.spacing.block,
    paddingHorizontal: theme.spacing.item,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
}));

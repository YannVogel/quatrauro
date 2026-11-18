import { View } from 'react-native';

import { Text } from '../Text';
import { makeStyles } from '../ThemeProvider';
import { IconButton } from './IconButton';

type HeaderAction = {
  /** Ce que fait le bouton, pour les lecteurs d'écran. */
  readonly accessibilityLabel: string;
  readonly onPress: () => void;
};

type ScreenHeaderProps = {
  readonly title: string;
  readonly subtitle?: string;
  readonly back: HeaderAction;
  /** Bouton de thème ; sans lui, sa place reste vide pour garder le titre centré. */
  readonly theme?: HeaderAction;
};

/** En-tête des écrans secondaires : retour, titre et sous-titre centrés, bouton de thème. */
export function ScreenHeader({ title, subtitle, back, theme }: ScreenHeaderProps) {
  const styles = useStyles();
  return (
    <View style={styles.header}>
      <IconButton icon="back" {...back} />
      <View style={styles.titles}>
        <Text accessibilityRole="header" variant="heading" numberOfLines={2} style={styles.title}>
          {title}
        </Text>
        {subtitle === undefined ? null : (
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      {theme === undefined ? (
        <View style={styles.placeholder} />
      ) : (
        <IconButton icon="theme" {...theme} />
      )}
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.item },
  titles: { flex: 1, alignItems: 'center' },
  title: { textAlign: 'center' },
  placeholder: { width: theme.sizes.touchTarget, height: theme.sizes.touchTarget },
}));

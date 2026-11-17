import { Pressable, ScrollView, View } from 'react-native';

import { Text } from '../Text';
import { makeStyles } from '../ThemeProvider';

export type CityOption = { readonly id: string; readonly label: string };

type CitySwitchProps = {
  readonly options: readonly CityOption[];
  readonly selectedId: string;
  readonly onSelect: (id: string) => void;
  /** Ce que choisit le sélecteur, pour les lecteurs d'écran. */
  readonly accessibilityLabel: string;
};

/**
 * Sélecteur de ville, posé sur le bloc d'état. Avec plus de villes que la largeur n'en montre,
 * la rangée défile sur le côté : aucune ville n'est coupée ni cachée derrière un menu.
 */
export function CitySwitch({ options, selectedId, onSelect, accessibilityLabel }: CitySwitchProps) {
  const styles = useStyles();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={styles.group}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
        testID="city-switch-scroll"
      >
        {options.map((option) => {
          const selected = option.id === selectedId;
          return (
            <Pressable
              key={option.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              onPress={() => onSelect(option.id)}
              style={[styles.option, selected && styles.selected]}
            >
              <Text
                variant={selected ? 'bodyStrong' : 'body'}
                color={selected ? 'onSun' : 'onHero'}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  group: {
    alignSelf: 'flex-start',
    // Jamais plus large que son conteneur : au-delà, la rangée défile.
    maxWidth: '100%',
    backgroundColor: theme.colors.heroOverlay,
    borderRadius: theme.radii.control,
    overflow: 'hidden',
  },
  // Une zone défilante prend toute la place qu'on lui laisse : celle-ci garde la hauteur de ses villes.
  scroll: { flexGrow: 0 },
  option: {
    minHeight: theme.sizes.touchTarget,
    minWidth: theme.sizes.touchTarget,
    paddingHorizontal: theme.spacing.card,
    borderRadius: theme.radii.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: { backgroundColor: theme.colors.onHero },
}));

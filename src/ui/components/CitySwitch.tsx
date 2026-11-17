import { Pressable, View } from 'react-native';

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

/** Sélecteur de ville, posé sur le bloc d'état. */
export function CitySwitch({ options, selectedId, onSelect, accessibilityLabel }: CitySwitchProps) {
  const styles = useStyles();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={styles.group}
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
            <Text variant={selected ? 'bodyStrong' : 'body'} color={selected ? 'onSun' : 'onHero'}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  group: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.heroOverlay,
    borderRadius: theme.radii.control,
  },
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

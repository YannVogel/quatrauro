import { Modal, Pressable, View } from 'react-native';

import { strings } from '@/i18n';

import { Icon } from '../Icon';
import { Text } from '../Text';
import { makeStyles } from '../ThemeProvider';
import type { ThemePreference } from '../ThemeProvider';

const OPTIONS: readonly ThemePreference[] = ['system', 'light', 'dark'];

type ThemeMenuProps = {
  readonly visible: boolean;
  /** Le réglage en vigueur. */
  readonly value: ThemePreference;
  readonly onSelect: (preference: ThemePreference) => void;
  readonly onClose: () => void;
};

/** Menu du thème : Système, Clair ou Sombre. Il se ferme en touchant un choix ou le voile. */
export function ThemeMenu({ visible, value, onSelect, onClose }: ThemeMenuProps) {
  const styles = useStyles();
  const { theme } = strings;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.screen}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={theme.close}
          onPress={onClose}
          style={styles.scrim}
        />
        <View style={styles.sheet}>
          <Text variant="section" accessibilityRole="header">
            {theme.title}
          </Text>
          <View accessibilityRole="radiogroup" accessibilityLabel={theme.title}>
            {OPTIONS.map((option) => {
              const selected = option === value;
              return (
                <Pressable
                  key={option}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={
                    option === 'system'
                      ? `${theme.options.system}, ${theme.systemHint}`
                      : theme.options[option]
                  }
                  onPress={() => onSelect(option)}
                  style={styles.option}
                >
                  <View style={styles.labels}>
                    <Text variant={selected ? 'bodyStrong' : 'body'}>{theme.options[option]}</Text>
                    {option === 'system' ? (
                      <Text variant="caption" color="textMuted">
                        {theme.systemHint}
                      </Text>
                    ) : null}
                  </View>
                  {selected ? <Icon name="check" /> : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((theme) => ({
  screen: { flex: 1, justifyContent: 'flex-end' },
  scrim: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: theme.colors.scrim,
  },
  sheet: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: theme.radii.card,
    borderTopRightRadius: theme.radii.card,
    padding: theme.spacing.card,
    paddingBottom: theme.spacing.card * 2,
    gap: theme.spacing.block,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: theme.sizes.touchTarget,
    gap: theme.spacing.item,
  },
  labels: { flex: 1 },
}));

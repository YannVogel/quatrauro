import { Pressable } from 'react-native';

import { Icon, Text, makeStyles } from '@/ui';

type LinkRowProps = { readonly label: string; readonly onPress: () => void };

/** Ligne qui mène à un autre écran : son nom, et un chevron. */
export function LinkRow({ label, onPress }: LinkRowProps) {
  const styles = useStyles();
  return (
    <Pressable accessibilityRole="link" onPress={onPress} style={styles.row}>
      <Text variant="bodyStrong" style={styles.label}>
        {label}
      </Text>
      <Icon name="forward" color="textMuted" />
    </Pressable>
  );
}

const useStyles = makeStyles((theme) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: theme.sizes.touchTarget,
    gap: theme.spacing.item,
  },
  label: { flex: 1 },
}));

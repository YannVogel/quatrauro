import { View } from 'react-native';

import { Text } from '../Text';
import { makeStyles } from '../ThemeProvider';
import type { IconName } from '../icons';
import { IconBadge } from './IconBadge';

type NoticeProps = {
  readonly icon: IconName;
  readonly title: string;
  readonly detail?: string;
  /** `alert` : annoncé par les lecteurs d'écran dès qu'il apparaît. */
  readonly role?: 'alert';
  readonly testID?: string;
};

/** Bandeau qui signale un état sans prendre la place du contenu : prévision ancienne, mise à jour manquée. */
export function Notice({ icon, title, detail, role, testID }: NoticeProps) {
  const styles = useStyles();
  return (
    // Un seul élément pour les lecteurs d'écran.
    <View testID={testID} accessible accessibilityRole={role} style={styles.notice}>
      <IconBadge icon={icon} />
      <View style={styles.texts}>
        <Text variant="bodyStrong">{title}</Text>
        {detail === undefined ? null : <Text color="textMuted">{detail}</Text>}
      </View>
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.block,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.card,
    padding: theme.spacing.card,
  },
  texts: { flex: 1, gap: 2 },
}));

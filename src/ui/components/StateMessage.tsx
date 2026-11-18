import { View } from 'react-native';

import { Text } from '../Text';
import { makeStyles } from '../ThemeProvider';
import type { IconName } from '../icons';
import { ActionButton } from './ActionButton';
import { IconBadge } from './IconBadge';

type StateMessageProps = {
  readonly icon: IconName;
  readonly title: string;
  /** Ce qui se passe, et quoi faire. */
  readonly detail: string;
  /** L'action proposée, quand il y en a une. */
  readonly action?: {
    readonly label: string;
    readonly onPress: () => void;
    readonly disabled?: boolean;
  };
  readonly testID?: string;
};

/** Ce qu'un écran dit quand il n'a pas son contenu à montrer : jamais un blanc, jamais des zéros. */
export function StateMessage({ icon, title, detail, action, testID }: StateMessageProps) {
  const styles = useStyles();
  return (
    <View testID={testID} style={styles.message}>
      <IconBadge icon={icon} size="large" />
      <View style={styles.texts}>
        <Text variant="title" accessibilityRole="header" style={styles.centered}>
          {title}
        </Text>
        <Text color="textMuted" style={styles.centered}>
          {detail}
        </Text>
      </View>
      {action === undefined ? null : <ActionButton {...action} />}
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  message: {
    alignItems: 'center',
    gap: theme.spacing.card,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.card,
    paddingVertical: theme.spacing.card + theme.spacing.block,
    paddingHorizontal: theme.spacing.card,
  },
  texts: { gap: theme.spacing.item, alignSelf: 'stretch' },
  centered: { textAlign: 'center' },
}));

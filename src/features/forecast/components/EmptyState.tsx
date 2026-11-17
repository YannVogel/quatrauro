import { View } from 'react-native';

import { strings } from '@/i18n';
import { Text, makeStyles } from '@/ui';

import type { EmptyReason } from '../freshness';

type EmptyStateProps = { readonly reason: EmptyReason };

/** Mettre l'app à jour est la seule issue : tirer pour réessayer n'y changerait rien. */
const canRetry = (reason: EmptyReason): boolean => reason !== 'version';

/** Ce que l'app dit quand elle n'a aucune prévision à montrer : jamais un écran blanc, jamais des zéros. */
export function EmptyState({ reason }: EmptyStateProps) {
  const styles = useStyles();
  return (
    <View style={styles.block}>
      <Text variant="title" accessibilityRole="header" style={styles.centered}>
        {strings.states.emptyTitle}
      </Text>
      <Text color="textMuted" style={styles.centered}>
        {strings.states.empty[reason]}
      </Text>
      {canRetry(reason) ? (
        <Text color="textMuted" style={styles.centered}>
          {strings.states.retry}
        </Text>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  block: { alignItems: 'center', gap: theme.spacing.item },
  centered: { textAlign: 'center' },
}));

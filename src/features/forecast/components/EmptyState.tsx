import { strings } from '@/i18n';
import { StateMessage } from '@/ui';
import type { IconName } from '@/ui';

import type { EmptyReason } from '../freshness';

type EmptyStateProps = {
  readonly reason: EmptyReason;
  /** Redemande la prévision. */
  readonly onRetry: () => void;
};

const ICONS: Readonly<Record<EmptyReason, IconName>> = {
  network: 'offline',
  http: 'unavailable',
  invalid: 'alert',
  version: 'update',
  none: 'hourglass',
  expired: 'stale',
};

/** Mettre l'app à jour est la seule issue : réessayer n'y changerait rien. */
const canRetry = (reason: EmptyReason): boolean => reason !== 'version';

/** Ce que l'app dit quand elle n'a aucune prévision à montrer : jamais un écran blanc, jamais des zéros. */
export function EmptyState({ reason, onRetry }: EmptyStateProps) {
  const { states } = strings;
  return (
    <StateMessage
      testID="empty-state"
      icon={ICONS[reason]}
      title={states.emptyTitles[reason]}
      detail={states.empty[reason]}
      action={canRetry(reason) ? { label: states.retry, onPress: onRetry } : undefined}
    />
  );
}

import { strings } from '@/i18n';
import { Notice } from '@/ui';

import { ageLabel } from '../freshness';
import type { ForecastView } from '../freshness';

type FreshnessNoticeProps = {
  readonly view: Extract<ForecastView, { status: 'ready' }>;
  readonly now: Date;
};

/**
 * Ce que l'écran dit d'une prévision qui n'est pas la plus fraîche : elle est ancienne, ou sa
 * mise à jour vient d'échouer. Un seul bandeau : l'âge d'abord, puis la raison quand on la connaît.
 */
export function FreshnessNotice({ view, now }: FreshnessNoticeProps) {
  const { freshness, states } = strings;
  const failure = view.refreshError === null ? null : states.refreshFailed[view.refreshError];

  if (view.isStale) {
    const age = ageLabel(view.forecast.generatedAt, now);
    return (
      <Notice
        testID="stale-notice"
        role="alert"
        icon="stale"
        title={freshness.staleTitle}
        detail={
          failure === null ? freshness.staleDetail(age) : freshness.staleAfterFailure(age, failure)
        }
      />
    );
  }
  if (failure === null) return null;
  return (
    <Notice
      testID="refresh-failed-notice"
      role="alert"
      icon={view.refreshError === 'network' ? 'offline' : 'alert'}
      title={states.refreshFailedTitle}
      detail={failure}
    />
  );
}

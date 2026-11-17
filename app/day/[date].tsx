import { PendingScreen } from '@/features/forecast';
import { strings } from '@/i18n';

/** Détail d'un jour : à écrire (M2-05). */
export default function DayRoute() {
  return <PendingScreen title={strings.pending.day} />;
}

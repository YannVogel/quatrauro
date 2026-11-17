import { View } from 'react-native';

import { strings } from '@/i18n';
import { Card, Text, makeStyles } from '@/ui';

type StaleBannerProps = {
  /** Âge de la prévision, déjà mis en forme : « 14 heures ». */
  readonly age: string;
};

/** Bandeau qui signale une prévision ancienne. Mise en forme minimale : le soin graphique vient en M4-01. */
export function StaleBanner({ age }: StaleBannerProps) {
  const styles = useStyles();
  return (
    // Un seul élément pour les lecteurs d'écran, annoncé dès qu'il apparaît.
    <View accessible accessibilityRole="alert" style={styles.banner}>
      <Card>
        <Text variant="bodyStrong">{strings.freshness.staleTitle}</Text>
        <Text color="textMuted">{strings.freshness.staleDetail(age)}</Text>
      </Card>
    </View>
  );
}

const useStyles = makeStyles(() => ({ banner: { alignSelf: 'stretch' } }));

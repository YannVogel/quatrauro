import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { strings } from '@/i18n';
import { ScreenHeader, Text, makeStyles } from '@/ui';

type PendingScreenProps = { readonly title: string };

/** Provisoire : tient la place d'un écran qui n'est pas encore écrit, pour que la navigation existe. */
export function PendingScreen({ title }: PendingScreenProps) {
  const styles = useStyles();
  const router = useRouter();
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <ScreenHeader
          title={title}
          back={{ accessibilityLabel: strings.pending.back, onPress: () => router.back() }}
        />
        <Text color="textMuted" style={styles.centered}>
          {strings.pending.body}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((theme) => ({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { gap: theme.spacing.block, padding: theme.spacing.screen },
  centered: { textAlign: 'center' },
}));

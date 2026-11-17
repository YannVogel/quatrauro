import { Link } from 'expo-router';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { strings } from '@/i18n';
import { Text, makeStyles } from '@/ui';

/** Écran provisoire : il sera remplacé par l'accueil d'une ville (M2-03). */
export function HomeScreen() {
  const styles = useStyles();
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Text accessibilityRole="header" variant="displayL" numberOfLines={1} adjustsFontSizeToFit>
          {strings.app.name}
        </Text>
        <Text variant="title">{strings.app.tagline}</Text>
        <Text color="textMuted" style={styles.centered}>
          {strings.home.placeholder}
        </Text>
        {__DEV__ ? (
          <Link href="/dev/catalog" style={styles.link}>
            <Text variant="bodyStrong">{strings.home.openCatalog}</Text>
          </Link>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((theme) => ({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.block,
    padding: theme.spacing.screen,
  },
  centered: { textAlign: 'center' },
  link: {
    minHeight: theme.sizes.touchTarget,
    paddingHorizontal: theme.spacing.card,
    textAlignVertical: 'center',
  },
}));

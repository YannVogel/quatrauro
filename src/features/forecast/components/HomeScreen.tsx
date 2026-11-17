import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { strings } from '@/i18n';

/** Écran provisoire : il sera remplacé par l'accueil d'une ville (M2-03). */
export function HomeScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Text accessibilityRole="header" style={styles.name}>
          {strings.app.name}
        </Text>
        <Text style={styles.text}>{strings.app.tagline}</Text>
        <Text style={styles.text}>{strings.home.placeholder}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 16 },
  name: { fontSize: 32, fontWeight: '700' },
  text: { fontSize: 15, textAlign: 'center' },
});

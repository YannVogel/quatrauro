import { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';

import { strings } from '@/i18n';
import { Icon, Text, makeStyles } from '@/ui';

type ExternalLinkProps = { readonly label: string; readonly url: string };

/**
 * Ligne qui ouvre une page dans le navigateur. Si rien ne peut l'ouvrir, l'adresse s'affiche :
 * elle reste lisible, et l'échec ne passe pas inaperçu.
 */
export function ExternalLink({ label, url }: ExternalLinkProps) {
  const styles = useStyles();
  const [hasFailed, setHasFailed] = useState(false);
  const open = () => {
    Linking.openURL(url).then(
      () => setHasFailed(false),
      () => setHasFailed(true),
    );
  };
  return (
    <View>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={label}
        accessibilityHint={strings.about.opensBrowser}
        onPress={open}
        style={styles.row}
      >
        <Text variant="bodyStrong" style={styles.label}>
          {label}
        </Text>
        <Icon name="external" color="textMuted" />
      </Pressable>
      {hasFailed ? (
        <Text variant="caption" color="textMuted" accessibilityRole="alert">
          {strings.about.linkFailed(url)}
        </Text>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: theme.sizes.touchTarget,
    gap: theme.spacing.item,
  },
  label: { flex: 1 },
}));

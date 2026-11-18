import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Text, makeStyles } from '@/ui';

type AboutSectionProps = { readonly title: string; readonly children: ReactNode };

/** Une partie d'une carte : un intertitre, puis son contenu. */
export function AboutSection({ title, children }: AboutSectionProps) {
  const styles = useStyles();
  return (
    <View style={styles.section}>
      <Text variant="label" color="textMuted" accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  section: { gap: theme.spacing.item },
}));

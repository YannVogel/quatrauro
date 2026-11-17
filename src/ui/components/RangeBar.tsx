import { View } from 'react-native';

import { strings } from '@/i18n';
import { formatNumber } from '@/lib/format';

import { makeStyles, useTheme } from '../ThemeProvider';

type RangeBarProps = {
  readonly min: number | null;
  readonly max: number | null;
  /** Bornes de l'échelle, communes à toutes les barres de la semaine. */
  readonly scaleMin: number;
  readonly scaleMax: number;
};

const clamp = (ratio: number): number => Math.min(Math.max(ratio, 0), 1);

/** Barre d'amplitude min–max, placée sur une échelle commune à la semaine. */
export function RangeBar({ min, max, scaleMin, scaleMax }: RangeBarProps) {
  const theme = useTheme();
  const styles = useStyles();
  const span = scaleMax - scaleMin;
  const isDrawable = min !== null && max !== null && span > 0;
  const start = isDrawable ? clamp((min - scaleMin) / span) : 0;
  const end = isDrawable ? clamp((max - scaleMin) / span) : 0;
  const label =
    min === null || max === null
      ? strings.common.unavailable
      : strings.spoken.temperatureRange(formatNumber(min), formatNumber(max));
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label} style={styles.track}>
      {isDrawable ? (
        <View
          testID="range-bar-fill"
          style={[
            styles.fill,
            // Une amplitude nulle reste visible : la barre ne descend pas sous un rond.
            {
              left: `${start * 100}%`,
              width: `${(end - start) * 100}%`,
              minWidth: theme.sizes.bar,
            },
          ]}
        />
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  track: {
    flex: 1,
    height: theme.sizes.bar,
    borderRadius: theme.sizes.bar / 2,
    backgroundColor: theme.colors.track,
  },
  fill: {
    position: 'absolute',
    height: theme.sizes.bar,
    borderRadius: theme.sizes.bar / 2,
    backgroundColor: theme.colors.bar,
  },
}));

import { render, screen } from '@testing-library/react-native';
import { StyleSheet, View } from 'react-native';
import * as ReactNative from 'react-native';

import { Text } from '../Text';
import { ThemeProvider, makeStyles, useTheme } from '../ThemeProvider';
import { colors, typography } from '../theme';

function ThemeName() {
  return <Text>{useTheme().name}</Text>;
}

const useStyles = makeStyles((theme) => ({ box: { backgroundColor: theme.colors.card } }));

function Box() {
  return <View testID="box" style={useStyles().box} />;
}

function mockSystemScheme(scheme: 'light' | 'dark' | null) {
  jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue(scheme);
}

afterEach(() => jest.restoreAllMocks());

describe('thème', () => {
  it('suit le thème du système par défaut', async () => {
    mockSystemScheme('dark');
    await render(
      <ThemeProvider>
        <ThemeName />
      </ThemeProvider>,
    );
    expect(screen.getByText('dark')).toBeOnTheScreen();
  });

  it('retombe sur le clair quand le système ne dit rien', async () => {
    mockSystemScheme(null);
    await render(
      <ThemeProvider>
        <ThemeName />
      </ThemeProvider>,
    );
    expect(screen.getByText('light')).toBeOnTheScreen();
  });

  it('change quand le thème du système change', async () => {
    // Un nouvel élément à chaque rendu : React ne redessine pas un élément inchangé.
    const tree = () => (
      <ThemeProvider>
        <Box />
      </ThemeProvider>
    );
    mockSystemScheme('light');
    const view = await render(tree());
    expect(screen.getByTestId('box')).toHaveStyle({ backgroundColor: colors.light.card });

    mockSystemScheme('dark');
    await view.rerender(tree());
    expect(screen.getByTestId('box')).toHaveStyle({ backgroundColor: colors.dark.card });
  });

  it('peut être forcé, quel que soit le système', async () => {
    mockSystemScheme('dark');
    await render(
      <ThemeProvider preference="light">
        <ThemeName />
      </ThemeProvider>,
    );
    expect(screen.getByText('light')).toBeOnTheScreen();
  });
});

describe('Text', () => {
  it('applique le style courant et la couleur du texte par défaut', async () => {
    await render(
      <ThemeProvider preference="light">
        <Text>Bonjour</Text>
      </ThemeProvider>,
    );
    expect(screen.getByText('Bonjour')).toHaveStyle({
      ...typography.body,
      color: colors.light.text,
    });
  });

  it('applique la variante et la couleur demandées, dans le thème actif', async () => {
    await render(
      <ThemeProvider preference="dark">
        <Text variant="caption" color="textMuted">
          Légende
        </Text>
      </ThemeProvider>,
    );
    expect(screen.getByText('Légende')).toHaveStyle({
      ...typography.caption,
      color: colors.dark.textMuted,
    });
  });

  it('laisse un style passé en props compléter le thème', async () => {
    await render(
      <ThemeProvider preference="light">
        <Text style={styles.centered}>Centré</Text>
      </ThemeProvider>,
    );
    expect(screen.getByText('Centré')).toHaveStyle({ textAlign: 'center', fontFamily: 'Outfit' });
  });
});

const styles = StyleSheet.create({ centered: { textAlign: 'center' } });

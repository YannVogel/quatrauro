import { AccessibilityInfo, StyleSheet } from 'react-native';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { ActionButton } from '../components/ActionButton';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { ModelRow } from '../components/ModelRow';
import { Notice } from '../components/Notice';
import { SkeletonGroup } from '../components/Skeleton';
import { StateMessage } from '../components/StateMessage';
import { Text } from '../Text';
import { renderWithTheme } from '../testing/renderWithTheme';
import { sizes, themes } from '../theme';

afterEach(() => jest.restoreAllMocks());

describe('LoadingSkeleton', () => {
  it('est un seul élément pour les lecteurs d’écran, qui dit ce qui se charge', async () => {
    await renderWithTheme(<LoadingSkeleton label="Chargement de la prévision…" />);
    const skeleton = screen.getByRole('progressbar', { name: 'Chargement de la prévision…' });
    expect(skeleton).toBeBusy();
    expect(skeleton).toHaveProp('accessible', true);
  });

  it.each(['light', 'dark'] as const)('se rend dans le thème %s', async (theme) => {
    await renderWithTheme(<LoadingSkeleton label="Chargement" withHero={false} />, theme);
    expect(screen.getByTestId('loading-skeleton')).toBeOnTheScreen();
  });
});

describe('SkeletonGroup', () => {
  const opacityOf = (): unknown =>
    StyleSheet.flatten(screen.getByTestId('group').props.style).opacity;

  it('ne respire pas quand le téléphone demande moins d’animations', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    jest.useFakeTimers();
    await renderWithTheme(
      <SkeletonGroup label="Chargement" testID="group">
        <Text>forme</Text>
      </SkeletonGroup>,
    );
    await waitFor(() => expect(AccessibilityInfo.isReduceMotionEnabled).toHaveBeenCalled());
    await jest.advanceTimersByTimeAsync(2000);
    expect(opacityOf()).toBe(1);
    jest.useRealTimers();
  });
});

describe('Notice', () => {
  it('se lit d’une traite, titre puis détail', async () => {
    await renderWithTheme(
      <Notice testID="notice" icon="stale" title="Prévision ancienne" detail="Calculée hier." />,
    );
    const notice = screen.getByTestId('notice');
    expect(notice).toHaveProp('accessible', true);
    expect(notice).toHaveTextContent('Prévision ancienneCalculée hier.');
  });

  it('est annoncé dès qu’il apparaît quand il signale un problème', async () => {
    await renderWithTheme(<Notice icon="offline" title="Mise à jour impossible" role="alert" />);
    expect(screen.getByRole('alert')).toBeOnTheScreen();
  });

  it('se passe de détail', async () => {
    await renderWithTheme(<Notice testID="notice" icon="alert" title="Seul" />);
    expect(screen.getByTestId('notice')).toHaveTextContent('Seul');
  });
});

describe('StateMessage', () => {
  it('donne un titre, dit quoi faire, et propose l’action', async () => {
    const onPress = jest.fn();
    await renderWithTheme(
      <StateMessage
        icon="offline"
        title="Pas de connexion"
        detail="Vérifiez votre connexion."
        action={{ label: 'Réessayer', onPress }}
      />,
    );
    expect(screen.getByRole('header', { name: 'Pas de connexion' })).toBeOnTheScreen();
    expect(screen.getByText('Vérifiez votre connexion.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Réessayer' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('n’a pas de bouton quand il n’y a rien à tenter', async () => {
    await renderWithTheme(
      <StateMessage icon="update" title="Mise à jour" detail="Mettez à jour." />,
    );
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('ActionButton', () => {
  it('offre une cible d’au moins 48 dp, dans les deux thèmes', async () => {
    for (const theme of ['light', 'dark'] as const) {
      const view = await renderWithTheme(
        <ActionButton label="Réessayer" onPress={jest.fn()} />,
        theme,
      );
      const style = StyleSheet.flatten(screen.getByRole('button').props.style);
      expect(style.minHeight).toBeGreaterThanOrEqual(sizes.touchTarget);
      expect(style.backgroundColor).toBe(themes[theme].colors.heroClear);
      await view.unmount();
    }
  });

  it('ne se relance pas pendant que l’action est en cours', async () => {
    const onPress = jest.fn();
    await renderWithTheme(<ActionButton label="Réessayer" onPress={onPress} disabled />);
    await fireEvent.press(screen.getByRole('button', { name: 'Réessayer' }));
    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByRole('button')).toBeDisabled();
  });
});

describe('ModelRow sans valeur', () => {
  it('écrit la raison à la place de la barre de poids, et la lit', async () => {
    await renderWithTheme(
      <ModelRow
        name="GFS"
        provider="NOAA"
        weight={null}
        value={null}
        note="Absent du dernier calcul"
      />,
    );
    expect(screen.getByText('Absent du dernier calcul')).toBeOnTheScreen();
    expect(
      screen.getByLabelText('GFS, NOAA, Absent du dernier calcul, indisponible'),
    ).toBeOnTheScreen();
    expect(screen.queryByRole('image')).toBeNull();
  });
});

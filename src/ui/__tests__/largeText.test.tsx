// Grandes polices et lecteurs d'écran : ce que les composants changent quand le téléphone
// agrandit le texte, et ce qu'ils taisent quand leur ligne parle déjà.

import { StyleSheet } from 'react-native';
import { screen } from '@testing-library/react-native';

import { ConditionBadge } from '../components/ConditionBadge';
import { DayRow } from '../components/DayRow';
import { HourlyChart } from '../components/HourlyChart';
import { MeterBar } from '../components/MeterBar';
import { ModelRow } from '../components/ModelRow';
import { RangeBar } from '../components/RangeBar';
import { setFontScale } from '../testing/fontScale';
import { renderWithTheme } from '../testing/renderWithTheme';

const NBSP = ' ';
/** Une barre décorative est masquée aux lecteurs d'écran : il faut la demander pour la trouver. */
const HIDDEN = { includeHiddenElements: true } as const;
const day = {
  dayLabel: 'Mer.',
  spokenDay: 'mercredi',
  condition: 'partlyCloudy',
  min: 14,
  max: 19,
  scaleMin: 10,
  scaleMax: 20,
  reliability: 62,
} as const;

afterEach(() => setFontScale(1));

describe('DayRow selon la taille de police', () => {
  it.each([1, 1.3])('à %s, garde sa barre et sa colonne de fiabilité', async (scale) => {
    await setFontScale(scale);
    await renderWithTheme(<DayRow {...day} />);
    expect(screen.getByTestId('range-bar-fill', HIDDEN)).toBeOnTheScreen();
    expect(screen.getByText(`62${NBSP}%`)).toBeOnTheScreen();
  });

  it('à 2, retire la barre et écrit la fiabilité sous la ligne, sans rien perdre', async () => {
    await setFontScale(2);
    await renderWithTheme(<DayRow {...day} />);
    expect(screen.queryByTestId('range-bar-fill', HIDDEN)).toBeNull();
    expect(screen.getByText('Mer.')).toBeOnTheScreen();
    expect(screen.getByText('14°')).toBeOnTheScreen();
    expect(screen.getByText('19°')).toBeOnTheScreen();
    expect(screen.getByText(`fiabilité 62${NBSP}%`)).toBeOnTheScreen();
    // Ce que lit un lecteur d'écran ne change pas.
    expect(
      screen.getByLabelText(`mercredi, Éclaircies, de 14 à 19 degrés, fiabilité 62${NBSP}%`),
    ).toBeOnTheScreen();
  });

  it('à 2, écrit « fiabilité — » quand elle est indisponible', async () => {
    await setFontScale(2);
    await renderWithTheme(<DayRow {...day} reliability={null} />);
    expect(screen.getByText('fiabilité —')).toBeOnTheScreen();
  });

  it('ne fait lire qu’une fois l’amplitude : la barre se tait dans la ligne', async () => {
    await renderWithTheme(<DayRow {...day} />);
    expect(screen.queryByRole('image')).toBeNull();
    expect(screen.getAllByLabelText(/de 14 à 19 degrés/)).toHaveLength(1);
  });
});

describe('colonnes qui suivent la taille de police', () => {
  const columns = [
    { hour: 0, temperature: 11, rainProbability: 0 },
    { hour: 3, temperature: 12, rainProbability: 40 },
  ];
  const columnWidth = (): unknown =>
    StyleSheet.flatten(screen.getAllByText(/°$/)[0]?.parent?.props.style).minWidth;

  it('HourlyChart élargit ses colonnes, et défile quand elles ne tiennent plus', async () => {
    await renderWithTheme(<HourlyChart columns={columns} />);
    const normal = columnWidth();
    await setFontScale(2);
    expect(columnWidth()).toBe(Number(normal) * 2);
    // Un seul élément pour les lecteurs d'écran, quel que soit le défilement.
    expect(screen.getAllByRole('image')).toHaveLength(1);
  });

  it('ModelRow garde le pourcentage sur une ligne', async () => {
    await setFontScale(2);
    await renderWithTheme(<ModelRow name="ICON" provider="DWD" weight={0.31} value="17,1°" />);
    const percent = screen.getByText(`31${NBSP}%`);
    expect(percent).toHaveProp('numberOfLines', 1);
    expect(StyleSheet.flatten(percent.props.style).width).toBe(88);
  });
});

describe('graphiques dans une ligne qui parle déjà', () => {
  it('RangeBar : parle seule, se tait quand elle est décorative', async () => {
    const view = await renderWithTheme(<RangeBar min={9} max={16} scaleMin={5} scaleMax={20} />);
    expect(screen.getByRole('image', { name: 'de 9 à 16 degrés' })).toBeOnTheScreen();
    await view.unmount();

    await renderWithTheme(<RangeBar min={9} max={16} scaleMin={5} scaleMax={20} decorative />);
    expect(screen.queryByRole('image')).toBeNull();
    expect(screen.queryByLabelText('de 9 à 16 degrés')).toBeNull();
    expect(screen.getByTestId('range-bar-fill', HIDDEN)).toBeOnTheScreen();
  });

  it('MeterBar : parle seule, se tait quand elle est décorative', async () => {
    const view = await renderWithTheme(<MeterBar value={0.35} />);
    expect(screen.getByRole('image', { name: `35${NBSP}%` })).toBeOnTheScreen();
    await view.unmount();

    await renderWithTheme(<MeterBar value={0.35} decorative />);
    expect(screen.queryByRole('image')).toBeNull();
    expect(screen.getByTestId('meter-bar-fill', HIDDEN)).toBeOnTheScreen();
  });

  it('ModelRow ne fait lire le poids qu’une fois', async () => {
    await renderWithTheme(<ModelRow name="ICON" provider="DWD" weight={0.31} value="17,1°" />);
    expect(screen.queryByRole('image')).toBeNull();
    expect(screen.getByLabelText(`ICON, DWD, poids 31${NBSP}%, 17,1°`)).toBeOnTheScreen();
  });

  it('ConditionBadge : dit la condition, sauf quand elle est écrite à côté', async () => {
    const view = await renderWithTheme(<ConditionBadge condition="rain" />);
    expect(screen.getByRole('image', { name: 'Pluie' })).toBeOnTheScreen();
    await view.unmount();

    await renderWithTheme(<ConditionBadge condition="rain" decorative />);
    expect(screen.queryByRole('image')).toBeNull();
  });
});

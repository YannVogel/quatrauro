import { fireEvent, screen } from '@testing-library/react-native';

import { ConditionBadge } from '../components/ConditionBadge';
import { DayRow } from '../components/DayRow';
import { HourChip } from '../components/HourChip';
import { HourlyChart } from '../components/HourlyChart';
import { RangeBar } from '../components/RangeBar';
import { StatTile } from '../components/StatTile';
import { renderWithTheme } from '../testing/renderWithTheme';
import { colors, sizes } from '../theme';

const NBSP = ' ';

describe('ConditionBadge', () => {
  it('montre le rond jaune et annonce la condition par beau temps', async () => {
    await renderWithTheme(<ConditionBadge condition="clear" />);
    const icon = screen.getByRole('image', { name: 'Ciel dégagé' });
    expect(icon.parent).toHaveStyle({
      backgroundColor: colors.light.sun,
      width: sizes.sunLarge,
      height: sizes.sunLarge,
    });
  });

  it('passe au rond pâle la nuit et sous la pluie', async () => {
    await renderWithTheme(<ConditionBadge condition="clear" isNight size="medium" />);
    expect(screen.getByRole('image', { name: 'Ciel dégagé' }).parent).toHaveStyle({
      backgroundColor: colors.light.pale,
      width: sizes.sunMedium,
    });
  });
});

describe('HourChip', () => {
  it("affiche l'heure et la température, et les lit d'un trait", async () => {
    await renderWithTheme(<HourChip hour={17} temperature={15.2} />);
    expect(screen.getByText(`17${NBSP}h`)).toBeOnTheScreen();
    expect(screen.getByText('15°')).toBeOnTheScreen();
    expect(screen.getByLabelText('17 heures, 15 degrés')).toBeOnTheScreen();
  });

  it('ajoute le risque de pluie quand il est fourni, à 0 % comme à 100 %', async () => {
    const view = await renderWithTheme(<HourChip hour={18} temperature={13} rainProbability={0} />);
    expect(screen.getByText(`0${NBSP}%`)).toBeOnTheScreen();
    expect(
      screen.getByLabelText(`18 heures, 13 degrés, risque de pluie 0${NBSP}%`),
    ).toBeOnTheScreen();
    await view.unmount();

    await renderWithTheme(<HourChip hour={18} temperature={13} rainProbability={100} />);
    expect(screen.getByText(`100${NBSP}%`)).toBeOnTheScreen();
  });

  it("n'invente rien quand une valeur manque", async () => {
    await renderWithTheme(<HourChip hour={9} temperature={null} rainProbability={null} />);
    expect(screen.getAllByText('—')).toHaveLength(2);
    expect(
      screen.getByLabelText('9 heures, indisponible, risque de pluie indisponible'),
    ).toBeOnTheScreen();
  });

  it('accorde « degré » au singulier', async () => {
    await renderWithTheme(<HourChip hour={5} temperature={1} />);
    expect(screen.getByLabelText('5 heures, 1 degré')).toBeOnTheScreen();
  });
});

describe('RangeBar', () => {
  it("s'annonce par son amplitude et se place sur l'échelle de la semaine", async () => {
    await renderWithTheme(<RangeBar min={9} max={16} scaleMin={4} scaleMax={18} />);
    expect(screen.getByRole('image', { name: 'de 9 à 16 degrés' })).toBeOnTheScreen();
    // (9 − 4) / 14 ≈ 35,7 % ; (16 − 9) / 14 = 50 %
    const style = screen.getByTestId('range-bar-fill').props.style.at(-1);
    expect(Number.parseFloat(style.left)).toBeCloseTo(35.71, 1);
    expect(Number.parseFloat(style.width)).toBeCloseTo(50, 1);
  });

  it('reste visible quand le minimum égale le maximum', async () => {
    await renderWithTheme(<RangeBar min={12} max={12} scaleMin={4} scaleMax={18} />);
    expect(screen.getByTestId('range-bar-fill')).toHaveStyle({ minWidth: sizes.bar });
    expect(screen.getByRole('image', { name: 'de 12 à 12 degrés' })).toBeOnTheScreen();
  });

  it('ne dessine rien quand une valeur manque, et le dit', async () => {
    await renderWithTheme(<RangeBar min={null} max={16} scaleMin={4} scaleMax={18} />);
    expect(screen.queryByTestId('range-bar-fill')).toBeNull();
    expect(screen.getByRole('image', { name: 'indisponible' })).toBeOnTheScreen();
  });

  it("ne déborde pas de l'échelle, et supporte une échelle nulle", async () => {
    const view = await renderWithTheme(<RangeBar min={0} max={30} scaleMin={4} scaleMax={18} />);
    const style = screen.getByTestId('range-bar-fill').props.style.at(-1);
    expect(style.left).toBe('0%');
    expect(style.width).toBe('100%');
    await view.unmount();

    await renderWithTheme(<RangeBar min={12} max={12} scaleMin={12} scaleMax={12} />);
    expect(screen.queryByTestId('range-bar-fill')).toBeNull();
    expect(screen.getByRole('image', { name: 'de 12 à 12 degrés' })).toBeOnTheScreen();
  });
});

describe('DayRow', () => {
  const day = {
    dayLabel: 'Mar.',
    spokenDay: 'mardi',
    condition: 'partlyCloudy',
    min: 9,
    max: 16,
    scaleMin: 4,
    scaleMax: 18,
    reliability: 95,
  } as const;

  it('garde sa place à l’icône et dit « indisponible » quand la condition manque', async () => {
    await renderWithTheme(<DayRow {...day} condition={null} onPress={jest.fn()} />);
    expect(
      screen.getByLabelText(`mardi, indisponible, de 9 à 16 degrés, fiabilité 95${NBSP}%`),
    ).toBeOnTheScreen();
    expect(screen.getByText('Mar.')).toBeOnTheScreen();
  });

  it('affiche le jour, les températures et la fiabilité', async () => {
    await renderWithTheme(<DayRow {...day} onPress={jest.fn()} />);
    expect(screen.getByText('Mar.')).toBeOnTheScreen();
    expect(screen.getByText('9°')).toBeOnTheScreen();
    expect(screen.getByText('16°')).toBeOnTheScreen();
    expect(screen.getByText(`95${NBSP}%`)).toBeOnTheScreen();
  });

  it('se lit en une phrase et ouvre le détail au toucher', async () => {
    const onPress = jest.fn();
    await renderWithTheme(<DayRow {...day} onPress={onPress} />);
    const row = screen.getByRole('button', {
      name: `mardi, Éclaircies, de 9 à 16 degrés, fiabilité 95${NBSP}%`,
    });
    expect(row).toHaveStyle({ minHeight: sizes.touchTarget });
    await fireEvent.press(row);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("n'invente rien quand les valeurs manquent", async () => {
    await renderWithTheme(<DayRow {...day} min={null} max={null} reliability={null} />);
    expect(screen.getAllByText('—')).toHaveLength(3);
    expect(
      screen.getByLabelText('mardi, Éclaircies, indisponible, fiabilité indisponible'),
    ).toBeOnTheScreen();
  });

  it("n'est pas un bouton sans action", async () => {
    await renderWithTheme(<DayRow {...day} />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('HourlyChart', () => {
  const columns = [
    { hour: 0, temperature: 11, rainProbability: 0 },
    { hour: 15, temperature: 15, rainProbability: 80 },
    { hour: 21, temperature: 12, rainProbability: 100 },
  ];

  it('accepte un nombre variable de colonnes', async () => {
    const view = await renderWithTheme(<HourlyChart columns={columns} />);
    expect(screen.getAllByTestId('hourly-chart-fill')).toHaveLength(3);
    await view.unmount();

    await renderWithTheme(<HourlyChart columns={columns.slice(0, 1)} />);
    expect(screen.getAllByTestId('hourly-chart-fill')).toHaveLength(1);
  });

  it('remplit chaque barre selon le risque de pluie, de 0 % à 100 %', async () => {
    await renderWithTheme(<HourlyChart columns={columns} />);
    const heights = screen
      .getAllByTestId('hourly-chart-fill')
      .map((fill) => fill.props.style.at(-1).height);
    expect(heights).toEqual(['0%', '80%', '100%']);
  });

  it('se lit colonne par colonne', async () => {
    await renderWithTheme(<HourlyChart columns={columns.slice(0, 2)} />);
    expect(
      screen.getByRole('image', {
        name: `0 heure : 11 degrés, risque de pluie 0${NBSP}% ; 15 heures : 15 degrés, risque de pluie 80${NBSP}%`,
      }),
    ).toBeOnTheScreen();
  });

  it("n'invente rien quand une valeur manque", async () => {
    await renderWithTheme(
      <HourlyChart columns={[{ hour: 6, temperature: null, rainProbability: null }]} />,
    );
    expect(screen.queryByTestId('hourly-chart-fill')).toBeNull();
    expect(screen.getByText('—')).toBeOnTheScreen();
    expect(
      screen.getByRole('image', { name: '6 heures : indisponible, risque de pluie indisponible' }),
    ).toBeOnTheScreen();
  });

  it('supporte une journée sans colonne', async () => {
    await renderWithTheme(<HourlyChart columns={[]} />);
    expect(screen.queryByTestId('hourly-chart-fill')).toBeNull();
  });
});

describe('StatTile', () => {
  it('affiche le libellé et la valeur, et les lit ensemble', async () => {
    await renderWithTheme(<StatTile label="Vent" value={`35${NBSP}km/h`} />);
    expect(screen.getByText('Vent')).toBeOnTheScreen();
    expect(screen.getByText(`35${NBSP}km/h`)).toBeOnTheScreen();
    expect(screen.getByLabelText(`Vent, 35${NBSP}km/h`)).toBeOnTheScreen();
  });

  it('dit qu’une valeur est indisponible', async () => {
    await renderWithTheme(<StatTile label="Cumul" value={null} />);
    expect(screen.getByText('—')).toBeOnTheScreen();
    expect(screen.getByLabelText('Cumul, indisponible')).toBeOnTheScreen();
  });

  it('réduit une valeur longue plutôt que de la couper', async () => {
    await renderWithTheme(<StatTile label="Rafales maximales" value={`112${NBSP}km/h`} />);
    expect(screen.getByText(`112${NBSP}km/h`)).toHaveProp('adjustsFontSizeToFit', true);
  });
});

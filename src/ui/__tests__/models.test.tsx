import { screen } from '@testing-library/react-native';

import { strings } from '@/i18n';

import { MeterBar } from '../components/MeterBar';
import { ModelRow } from '../components/ModelRow';
import { renderWithTheme } from '../testing/renderWithTheme';

const NBSP = ' ';

describe('MeterBar', () => {
  it.each([
    [0, '0%', `0${NBSP}%`],
    [0.35, '35%', `35${NBSP}%`],
    [1, '100%', `100${NBSP}%`],
  ])('se remplit à %s et le dit', async (value, width, label) => {
    await renderWithTheme(<MeterBar value={value} />);
    expect(screen.getByTestId('meter-bar-fill').props.style.at(-1).width).toBe(width);
    expect(screen.getByRole('image', { name: label })).toBeOnTheScreen();
  });

  it('borne une proportion hors de 0 à 1', async () => {
    const view = await renderWithTheme(<MeterBar value={1.4} />);
    expect(screen.getByTestId('meter-bar-fill').props.style.at(-1).width).toBe('100%');
    await view.unmount();

    await renderWithTheme(<MeterBar value={-0.2} />);
    expect(screen.getByTestId('meter-bar-fill').props.style.at(-1).width).toBe('0%');
  });

  it('reste vide et le dit quand la proportion est inconnue', async () => {
    await renderWithTheme(<MeterBar value={null} />);
    expect(screen.queryByTestId('meter-bar-fill')).toBeNull();
    expect(screen.getByRole('image', { name: 'indisponible' })).toBeOnTheScreen();
  });

  it('dit ce que mesure la barre', async () => {
    await renderWithTheme(<MeterBar value={0.35} describe={strings.spoken.weight} />);
    expect(screen.getByRole('image', { name: `poids 35${NBSP}%` })).toBeOnTheScreen();
  });
});

describe('ModelRow', () => {
  it('affiche le modèle, son fournisseur, son poids et sa valeur', async () => {
    await renderWithTheme(
      <ModelRow name="AROME" provider="Météo-France · maille fine" weight={0.35} value="17,2°" />,
    );
    expect(screen.getByText('AROME')).toBeOnTheScreen();
    expect(screen.getByText('Météo-France · maille fine')).toBeOnTheScreen();
    expect(screen.getByText(`35${NBSP}%`)).toBeOnTheScreen();
    expect(screen.getByText('17,2°')).toBeOnTheScreen();
    expect(
      screen.getByLabelText(`AROME, Météo-France · maille fine, poids 35${NBSP}%, 17,2°`),
    ).toBeOnTheScreen();
  });

  it("dit qu'un modèle ne couvre pas l'échéance", async () => {
    await renderWithTheme(
      <ModelRow name="AROME" provider="Météo-France" weight={null} value={null} />,
    );
    expect(screen.getAllByText('—')).toHaveLength(2);
    expect(screen.queryByTestId('meter-bar-fill')).toBeNull();
    expect(
      screen.getByLabelText('AROME, Météo-France, poids indisponible, indisponible'),
    ).toBeOnTheScreen();
  });

  it('garde un long nom de fournisseur sur une ligne', async () => {
    const provider = 'Centre européen pour les prévisions météorologiques à moyen terme · global';
    await renderWithTheme(<ModelRow name="IFS" provider={provider} weight={0.24} value="16,6°" />);
    expect(screen.getByText(provider)).toHaveProp('numberOfLines', 1);
  });
});

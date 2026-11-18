import { fireEvent, screen } from '@testing-library/react-native';

import { Card } from '../components/Card';
import { CitySwitch } from '../components/CitySwitch';
import { HeroBlock } from '../components/HeroBlock';
import { IconButton } from '../components/IconButton';
import { Pill } from '../components/Pill';
import { ScreenHeader } from '../components/ScreenHeader';
import { Text } from '../Text';
import { renderWithTheme } from '../testing/renderWithTheme';
import { colors, sizes } from '../theme';

const CITIES = [
  { id: 'toulon', label: 'Toulon' },
  { id: 'nice', label: 'Nice' },
];

describe('HeroBlock', () => {
  it('prend la couleur demandée, dans le thème actif', async () => {
    await renderWithTheme(
      <HeroBlock tone="heroRain" testID="hero">
        <Text>Contenu</Text>
      </HeroBlock>,
      'dark',
    );
    expect(screen.getByTestId('hero')).toHaveStyle({ backgroundColor: colors.dark.heroRain });
    expect(screen.getByText('Contenu')).toBeOnTheScreen();
  });

  it('est bleu vif par défaut', async () => {
    await renderWithTheme(
      <HeroBlock testID="hero">
        <Text>Contenu</Text>
      </HeroBlock>,
    );
    expect(screen.getByTestId('hero')).toHaveStyle({ backgroundColor: colors.light.heroClear });
  });
});

describe('Card', () => {
  it('affiche son contenu sur le fond des cartes', async () => {
    await renderWithTheme(
      <Card testID="card">
        <Text>Contenu</Text>
      </Card>,
    );
    expect(screen.getByText('Contenu')).toBeOnTheScreen();
    expect(screen.getByTestId('card')).toHaveStyle({ backgroundColor: colors.light.card });
  });
});

describe('IconButton', () => {
  it('se lit par son libellé et répond au toucher', async () => {
    const onPress = jest.fn();
    await renderWithTheme(<IconButton icon="back" accessibilityLabel="Retour" onPress={onPress} />);
    const button = screen.getByRole('button', { name: 'Retour' });
    await fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('offre une cible tactile de 48 dp', async () => {
    await renderWithTheme(
      <IconButton icon="theme" accessibilityLabel="Thème" onPress={jest.fn()} />,
    );
    expect(screen.getByRole('button', { name: 'Thème' })).toHaveStyle({
      width: sizes.touchTarget,
      height: sizes.touchTarget,
    });
    expect(sizes.touchTarget).toBeGreaterThanOrEqual(48);
  });

  it('prend le voile du bloc d’état quand il est posé dessus', async () => {
    await renderWithTheme(
      <IconButton icon="theme" accessibilityLabel="Thème" onPress={jest.fn()} surface="hero" />,
    );
    expect(screen.getByRole('button', { name: 'Thème' })).toHaveStyle({
      backgroundColor: colors.light.heroOverlay,
    });
  });
});

describe('CitySwitch', () => {
  it('annonce la ville sélectionnée', async () => {
    await renderWithTheme(
      <CitySwitch
        options={CITIES}
        selectedId="toulon"
        onSelect={jest.fn()}
        accessibilityLabel="Ville"
      />,
    );
    // Le groupe n'est pas lui-même un élément accessible : ses villes doivent rester atteignables.
    expect(screen.getByLabelText('Ville')).toHaveProp('accessibilityRole', 'radiogroup');
    expect(screen.getByRole('radio', { name: 'Toulon' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Nice' })).not.toBeChecked();
  });

  it('signale la ville touchée', async () => {
    const onSelect = jest.fn();
    await renderWithTheme(
      <CitySwitch
        options={CITIES}
        selectedId="toulon"
        onSelect={onSelect}
        accessibilityLabel="Ville"
      />,
    );
    await fireEvent.press(screen.getByRole('radio', { name: 'Nice' }));
    expect(onSelect).toHaveBeenCalledWith('nice');
  });

  it('offre une cible tactile de 48 dp par ville', async () => {
    await renderWithTheme(
      <CitySwitch
        options={CITIES}
        selectedId="nice"
        onSelect={jest.fn()}
        accessibilityLabel="Ville"
      />,
    );
    expect(screen.getByRole('radio', { name: 'Nice' })).toHaveStyle({
      minHeight: sizes.touchTarget,
    });
  });
});

describe('Pill', () => {
  it('affiche la pastille et le texte qui la suit', async () => {
    await renderWithTheme(<Pill label="Fiabilité 95 %" detail="4 modèles d'accord" />);
    expect(screen.getByText('Fiabilité 95 %')).toHaveStyle({ color: colors.light.onSun });
    expect(screen.getByText("4 modèles d'accord")).toHaveStyle({ color: colors.light.onHero });
  });

  it('se passe du texte qui suit', async () => {
    await renderWithTheme(<Pill label="Écart 1,1°" />);
    expect(screen.getByText('Écart 1,1°')).toBeOnTheScreen();
  });

  it('laisse un long texte passer à la ligne sans pousser la pastille', async () => {
    const detail = 'entre le modèle le plus chaud et le modèle le plus frais de la journée';
    await renderWithTheme(<Pill label="Écart 1,1°" detail={detail} />);
    expect(screen.getByText(detail)).toHaveStyle({ flexShrink: 1 });
  });
});

describe('ScreenHeader', () => {
  const back = { accessibilityLabel: 'Retour à la semaine', onPress: jest.fn() };
  const theme = { accessibilityLabel: 'Changer de thème', onPress: jest.fn() };

  it('affiche le titre, le sous-titre et ses deux boutons', async () => {
    await renderWithTheme(
      <ScreenHeader title="Jeudi 19 novembre" subtitle="Toulon" back={back} theme={theme} />,
    );
    expect(screen.getByRole('header', { name: 'Jeudi 19 novembre' })).toBeOnTheScreen();
    expect(screen.getByText('Toulon')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Retour à la semaine' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Changer de thème' }));
    expect(back.onPress).toHaveBeenCalledTimes(1);
    expect(theme.onPress).toHaveBeenCalledTimes(1);
  });

  it('se passe du sous-titre et du bouton de thème', async () => {
    await renderWithTheme(<ScreenHeader title="Fiabilité" back={back} />);
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('laisse deux lignes à un titre long, pas plus', async () => {
    // « Vendredi 20 novembre » ne tient pas sur une ligne avec une grande police.
    const title = 'Un titre vraiment beaucoup trop long pour tenir sur une seule ligne';
    await renderWithTheme(<ScreenHeader title={title} back={back} />);
    expect(screen.getByRole('header', { name: title })).toHaveProp('numberOfLines', 2);
  });
});

describe('CitySwitch avec beaucoup de villes', () => {
  const MANY = [
    ...CITIES,
    { id: 'hyeres', label: 'Hyères' },
    { id: 'saint-raphael', label: 'Saint-Raphaël' },
  ];

  it('range les villes dans une rangée qui défile, sans dépasser son conteneur', async () => {
    await renderWithTheme(
      <CitySwitch
        options={MANY}
        selectedId="nice"
        onSelect={jest.fn()}
        accessibilityLabel="Ville"
      />,
    );
    expect(screen.getAllByRole('radio')).toHaveLength(4);
    expect(screen.getByRole('radio', { name: 'Saint-Raphaël' })).toBeOnTheScreen();
    expect(screen.getByTestId('city-switch-scroll')).toHaveProp('horizontal', true);
    // Sans cela, la rangée s'étire sur toute la hauteur du bloc (vu sur l'émulateur).
    expect(screen.getByTestId('city-switch-scroll')).toHaveStyle({ flexGrow: 0 });
    expect(screen.getByLabelText('Ville')).toHaveStyle({ maxWidth: '100%' });
  });
});

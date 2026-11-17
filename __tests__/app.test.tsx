// L'app entière, rendue sur de vrais fichiers publiés (calculés le 17 novembre 2026 à 21 h 27
// UTC, soit 22 h 27 à Paris), servis par un faux réseau. L'horloge est figée pour chaque cas.

import { StyleSheet } from 'react-native';
import { act, cleanup, fireEvent, waitFor, within } from '@testing-library/react-native';
import { renderRouter, screen } from 'expo-router/testing-library';

import { strings } from '@/i18n';
import { queryClient } from '@/lib/queryClient';
import { allPublished, offline, published, servePublished } from '@/lib/testing/published';
import type { Reply } from '@/lib/testing/published';
import { themes } from '@/ui/theme';

const { home, freshness, states, conditions } = strings;
const NBSP = ' ';
/** Mercredi matin, 9 h 30 à Paris : ciel dégagé à Toulon, prévision vieille de onze heures. */
const CLEAR_MORNING = '2026-11-18T08:30:00Z';
/** Mardi, 17 h 20 à Paris : il pleut à Toulon. */
const RAINY_AFTERNOON = '2026-11-17T16:20:00Z';

/**
 * Ouvre l'app à un instant donné : l'horloge est figée avant le rendu, et `renderRouter` la garde.
 */
async function openAt(instant: string, files: Readonly<Record<string, Reply>> = allPublished) {
  servePublished(files);
  jest.useFakeTimers({ now: new Date(instant) });
  await renderRouter('./app');
}

/**
 * Ferme l'app après un cas : on démonte l'écran, puis on vide le cache. Les fausses minuteries
 * que `renderRouter` installe restent en place : les retirer ici ferait programmer la purge du
 * cache (dans sept jours) sur la vraie horloge, et Jest attendrait au lieu de s'arrêter.
 */
afterEach(async () => {
  await cleanup();
  queryClient.clear();
});

const heroColor = (): unknown =>
  StyleSheet.flatten(screen.getByTestId('home-hero').props.style).backgroundColor;
/** Le bloc d'état : la température s'y cherche à part, la semaine en affiche d'autres. */
const hero = () => within(screen.getByTestId('home-hero'));
const ready = () => waitFor(() => expect(screen.getByText(home.links.about)).toBeOnTheScreen());
const loaded = (text: string) => waitFor(() => expect(screen.getByText(text)).toBeOnTheScreen());

describe('accueil par beau temps', () => {
  beforeEach(async () => {
    await openAt(CLEAR_MORNING);
    await loaded(conditions.clear);
  });

  it('dit le temps qu’il fait maintenant, dans un bloc bleu vif', () => {
    expect(hero().getByText('17°')).toBeOnTheScreen();
    expect(
      screen.getByText(home.dateAndWind('Mercredi 18 novembre', `14${NBSP}km/h`)),
    ).toBeOnTheScreen();
    expect(heroColor()).toBe(themes.light.colors.heroClear);
    expect(screen.getByLabelText(conditions.clear)).toBeOnTheScreen();
  });

  it('donne la fiabilité du jour et le nombre de modèles d’accord', () => {
    expect(screen.getByText(home.reliability(`62${NBSP}%`))).toBeOnTheScreen();
    expect(screen.getByText('5 modèles d’accord')).toBeOnTheScreen();
  });

  it('montre les cinq heures qui suivent, sans parler de pluie', () => {
    const hours = within(screen.getByLabelText(home.nextHours));
    for (const hour of [10, 11, 12, 13, 14]) {
      expect(hours.getByText(`${hour}${NBSP}h`)).toBeOnTheScreen();
    }
    // L'heure en cours est dans le bloc d'état, pas dans les vignettes.
    expect(hours.queryByText(`9${NBSP}h`)).toBeNull();
    expect(hours.queryByText(`15${NBSP}h`)).toBeNull();
    expect(hours.queryByText(/%/)).toBeNull();
    expect(hours.getByLabelText('10 heures, 18 degrés')).toBeOnTheScreen();
  });

  it('montre les jours à venir, d’aujourd’hui au dernier jour publié', () => {
    const week = within(screen.getByLabelText(home.week));
    for (const day of ['Mer.', 'Jeu.', 'Ven.', 'Sam.', 'Dim.', 'Lun.']) {
      expect(week.getByText(day)).toBeOnTheScreen();
    }
    // Mardi est passé.
    expect(week.queryByText('Mar.')).toBeNull();
    expect(
      week.getByLabelText(
        'mercredi, Éclaircies, de 14 à 19 degrés, fiabilité 62 %'.replace(' %', `${NBSP}%`),
      ),
    ).toBeOnTheScreen();
  });

  it('dit de quand date la prévision, sans bandeau tant qu’elle a moins de douze heures', () => {
    expect(screen.getByText(freshness.updatedYesterday(`22${NBSP}h${NBSP}27`))).toBeOnTheScreen();
    expect(screen.queryByText(freshness.staleTitle)).toBeNull();
  });
});

describe('accueil sous la pluie', () => {
  beforeEach(async () => {
    await openAt(RAINY_AFTERNOON);
    await loaded(conditions.rain);
  });

  it('change de couleur et d’icône', () => {
    expect(heroColor()).toBe(themes.light.colors.heroRain);
    expect(screen.getByLabelText(conditions.rain)).toBeOnTheScreen();
    expect(hero().getByText('17°')).toBeOnTheScreen();
    expect(screen.getByText(home.reliability(`74${NBSP}%`))).toBeOnTheScreen();
  });

  it('affiche le risque de pluie dans les vignettes', () => {
    const hours = within(screen.getByLabelText(home.nextHours));
    expect(hours.getByText(`51${NBSP}%`)).toBeOnTheScreen();
    expect(hours.getByText(`25${NBSP}%`)).toBeOnTheScreen();
    expect(
      hours.getByLabelText(`18 heures, 17 degrés, risque de pluie 51${NBSP}%`),
    ).toBeOnTheScreen();
  });
});

describe('accueil avec des données partielles', () => {
  it('écrit « — » et dit « indisponible », sans inventer de valeur', async () => {
    const toulon = published.forecast.toulon;
    const partial = {
      ...toulon,
      hourly: toulon.hourly.map((hour) =>
        hour.time === '2026-11-18T08:00:00Z'
          ? { ...hour, temperature: null, condition: null, windSpeed: null }
          : hour,
      ),
      daily: toulon.daily.map((day) =>
        day.date === '2026-11-18'
          ? {
              ...day,
              min: null,
              condition: null,
              reliability: null,
              reliabilityLabel: null,
              modelsAgreeing: null,
            }
          : day,
      ),
    };
    await openAt(CLEAR_MORNING, { ...allPublished, 'forecast/toulon.json': { json: partial } });
    await loaded(home.conditionUnavailable);

    expect(screen.getByText(home.reliability('—'))).toBeOnTheScreen();
    expect(screen.getByText(home.dateAndWind('Mercredi 18 novembre', '—'))).toBeOnTheScreen();
    expect(screen.queryByText('5 modèles d’accord')).toBeNull();
    expect(
      screen.getByLabelText('mercredi, indisponible, indisponible, fiabilité indisponible'),
    ).toBeOnTheScreen();
    // Le bloc garde sa couleur par défaut, et aucun zéro ne tient lieu de valeur.
    expect(heroColor()).toBe(themes.light.colors.heroClear);
    expect(screen.queryByText('0°')).toBeNull();
  });
});

describe('navigation depuis l’accueil', () => {
  beforeEach(async () => {
    await openAt(CLEAR_MORNING);
    await loaded(conditions.clear);
  });

  it('ouvre le détail du jour touché', async () => {
    await fireEvent.press(screen.getByText('Jeu.'));
    expect(screen).toHavePathname('/day/2026-11-19');
    expect(screen.getByRole('header', { name: strings.pending.day })).toBeOnTheScreen();
  });

  it('ouvre « Les modèles » depuis la pastille de fiabilité', async () => {
    const pill = screen.getByRole('button', {
      name: `fiabilité 62${NBSP}%, 5 modèles d’accord, ${home.openModels}`,
    });
    await fireEvent.press(pill);
    expect(screen).toHavePathname('/models');
  });

  it('donne accès à « Fiabilité » et à « À propos des données », puis revient', async () => {
    await fireEvent.press(screen.getByRole('link', { name: home.links.reliability }));
    expect(screen).toHavePathname('/reliability');
    await fireEvent.press(screen.getByRole('button', { name: strings.pending.back }));
    expect(screen).toHavePathname('/');

    await fireEvent.press(screen.getByRole('link', { name: home.links.about }));
    expect(screen).toHavePathname('/about');
  });
});

describe('bascule entre les villes', () => {
  it('met tout l’accueil à jour, sans chargement', async () => {
    await openAt(CLEAR_MORNING);
    await loaded(conditions.clear);

    await fireEvent.press(screen.getByRole('radio', { name: 'Nice' }));
    // Nice au même instant : 17,7 °C, éclaircies, vent de 27 km/h.
    expect(hero().getByText('18°')).toBeOnTheScreen();
    expect(
      screen.getByText(home.dateAndWind('Mercredi 18 novembre', `27${NBSP}km/h`)),
    ).toBeOnTheScreen();
    expect(screen.getByText(home.reliability(`88${NBSP}%`))).toBeOnTheScreen();
    expect(screen.getByText('4 modèles sur 5 d’accord')).toBeOnTheScreen();
    expect(screen.queryByText(states.loading)).toBeNull();
  });
});

describe('fraîcheur de la prévision', () => {
  it('affiche le bandeau « prévision ancienne » au-delà de douze heures', async () => {
    await openAt('2026-11-18T11:00:00Z');
    await loaded(freshness.staleTitle);
    expect(screen.getByText(freshness.staleDetail(freshness.hours(13)))).toBeOnTheScreen();
    expect(screen.getByRole('alert')).toBeOnTheScreen();
  });

  it('fait apparaître le bandeau quand la prévision vieillit, écran resté ouvert', async () => {
    // Onze heures et cinquante-deux minutes après le calcul : pas encore ancienne.
    await openAt('2026-11-18T09:20:00Z');
    await ready();
    await loaded(home.reliability(`62${NBSP}%`));
    expect(screen.queryByText(freshness.staleTitle)).toBeNull();

    await act(() => jest.advanceTimersByTime(10 * 60_000));
    expect(screen.getByText(freshness.staleTitle)).toBeOnTheScreen();
  });

  it('n’affiche plus l’heure passée quand l’écran reste ouvert', async () => {
    await openAt('2026-11-18T08:58:00Z');
    await loaded(conditions.clear);
    await act(() => jest.advanceTimersByTime(3 * 60_000));
    // 10 h 01 à Paris : l'heure en cours est celle de 10 h, et les vignettes commencent à 11 h.
    const hours = within(screen.getByLabelText(home.nextHours));
    expect(hours.queryByText(`10${NBSP}h`)).toBeNull();
    expect(hours.getByText(`15${NBSP}h`)).toBeOnTheScreen();
    expect(screen.getByText(conditions.partlyCloudy)).toBeOnTheScreen();
  });
});

describe('sans aucune prévision', () => {
  it('premier lancement hors ligne : un état vide qui dit pourquoi, pas un écran blanc ni des zéros', async () => {
    offline();
    await renderRouter('./app');

    // Le client de l'app retente une fois, après une seconde, avant de renoncer.
    await waitFor(() => expect(screen.getByText(states.emptyTitle)).toBeOnTheScreen(), {
      timeout: 5000,
    });
    expect(screen.getByText(states.empty.network)).toBeOnTheScreen();
    expect(screen.getByText(states.retry)).toBeOnTheScreen();
    expect(screen.queryByText(/\d/)).toBeNull();
    expect(screen.queryByText(states.loading)).toBeNull();
    // Le sélecteur de ville et les accès restent là.
    expect(screen.getByRole('radio', { name: 'Nice' })).toBeOnTheScreen();
    expect(screen.getByText(home.links.about)).toBeOnTheScreen();
  });

  it('annonce le chargement tant que rien n’est arrivé', async () => {
    global.fetch = jest.fn(() => new Promise<Response>(() => undefined));
    await renderRouter('./app');
    await loaded(states.loading);
    expect(screen.queryByText(states.emptyTitle)).toBeNull();
  });

  it('demande de mettre l’app à jour quand les fichiers sont d’une version inconnue', async () => {
    servePublished({
      'forecast/toulon.json': { json: { schemaVersion: 2 } },
      'forecast/nice.json': { json: { schemaVersion: 2 } },
    });
    await renderRouter('./app');

    await waitFor(() => expect(screen.getByText(states.empty.version)).toBeOnTheScreen(), {
      timeout: 5000,
    });
    // Réessayer n'y changerait rien : l'app ne le propose pas.
    expect(screen.queryByText(states.retry)).toBeNull();
  });
});

describe('catalogue des composants', () => {
  // `__DEV__` vaut `false` dans une app distribuée.
  const setDevelopmentMode = (enabled: boolean) => Object.assign(globalThis, { __DEV__: enabled });
  afterEach(() => setDevelopmentMode(true));

  it('s’ouvre depuis l’accueil, en développement', async () => {
    offline();
    await renderRouter('./app');
    await fireEvent.press(screen.getByRole('link', { name: home.links.catalog }));

    expect(screen).toHavePathname('/dev/catalog');
    expect(screen.getByRole('header', { name: strings.catalog.title })).toBeOnTheScreen();
  });

  it('n’est pas proposé dans l’app distribuée', async () => {
    setDevelopmentMode(false);
    offline();
    await renderRouter('./app');
    expect(screen.queryByText(home.links.catalog)).toBeNull();
  });

  it('renvoie à l’accueil quand on le vise dans l’app distribuée', async () => {
    setDevelopmentMode(false);
    offline();
    await renderRouter('./app', { initialUrl: '/dev/catalog' });
    expect(screen).toHavePathname('/');
    expect(screen.queryByText(strings.catalog.title)).toBeNull();
  });
});

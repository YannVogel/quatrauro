import { formatInParis } from '../dates';

const at = (iso: string): Date => new Date(iso);

describe("mise en forme à l'heure de Paris", () => {
  it('écrit les jours et les mois en français', () => {
    expect(formatInParis(at('2026-11-17T15:02:00Z'), 'EEEE d MMMM yyyy')).toBe(
      'mardi 17 novembre 2026',
    );
  });

  it("donne l'heure de Paris, pas celle de la machine ni l'heure UTC", () => {
    expect(formatInParis(at('2026-11-17T15:02:00Z'), 'HH:mm')).toBe('16:02');
    expect(formatInParis(at('2026-07-17T15:02:00Z'), 'HH:mm')).toBe('17:02');
  });

  it('change de jour à minuit, heure de Paris', () => {
    expect(formatInParis(at('2026-11-17T22:59:00Z'), 'EEEE')).toBe('mardi');
    expect(formatInParis(at('2026-11-17T23:00:00Z'), 'EEEE')).toBe('mercredi');
  });

  it("saute de 2 h à 3 h au passage à l'heure d'été", () => {
    expect(formatInParis(at('2026-03-29T00:59:00Z'), 'HH:mm')).toBe('01:59');
    expect(formatInParis(at('2026-03-29T01:00:00Z'), 'HH:mm')).toBe('03:00');
  });

  it("repasse deux fois par 2 h au retour à l'heure d'hiver", () => {
    expect(formatInParis(at('2026-10-25T00:30:00Z'), 'HH:mm')).toBe('02:30');
    expect(formatInParis(at('2026-10-25T01:30:00Z'), 'HH:mm')).toBe('02:30');
  });

  it('fait commencer la semaine le lundi', () => {
    // Le lundi 16 novembre 2026 est le premier jour de sa semaine.
    expect(formatInParis(at('2026-11-16T12:00:00Z'), 'i')).toBe('1');
    expect(formatInParis(at('2026-11-15T12:00:00Z'), 'i')).toBe('7');
    expect(formatInParis(at('2026-11-16T12:00:00Z'), 'e')).toBe('1');
  });
});

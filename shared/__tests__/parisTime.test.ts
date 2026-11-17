import {
  parisDateKey,
  parisDayLengthHours,
  parisHour,
  parisOffsetMinutes,
  startOfParisDay,
} from '../parisTime';

const HOUR_MS = 3_600_000;
const at = (iso: string): Date => new Date(iso);

/** Décalage de Paris d'après la base de fuseaux de Node, qui sert ici de référence. */
function referenceOffsetMinutes(instant: Date): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Paris',
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(instant);
  const field = (type: string): number =>
    Number(parts.find((part) => part.type === type)?.value ?? Number.NaN);
  const wallClock = Date.UTC(
    field('year'),
    field('month') - 1,
    field('day'),
    field('hour'),
    field('minute'),
  );
  return Math.round((wallClock - instant.getTime()) / 60_000);
}

describe('décalage de Paris sur UTC', () => {
  it('vaut 60 minutes en hiver et 120 en été', () => {
    expect(parisOffsetMinutes(at('2026-01-15T12:00:00Z'))).toBe(60);
    expect(parisOffsetMinutes(at('2026-07-15T12:00:00Z'))).toBe(120);
  });

  it("passe à l'heure d'été le dernier dimanche de mars à 01 h UTC", () => {
    expect(parisOffsetMinutes(at('2026-03-29T00:59:59Z'))).toBe(60);
    expect(parisOffsetMinutes(at('2026-03-29T01:00:00Z'))).toBe(120);
  });

  it("revient à l'heure d'hiver le dernier dimanche d'octobre à 01 h UTC", () => {
    expect(parisOffsetMinutes(at('2026-10-25T00:59:59Z'))).toBe(120);
    expect(parisOffsetMinutes(at('2026-10-25T01:00:00Z'))).toBe(60);
  });

  it('donne le même décalage que la base de fuseaux, heure par heure, de 2024 à 2031', () => {
    const start = Date.UTC(2024, 0, 1);
    const end = Date.UTC(2032, 0, 1);
    for (let time = start; time < end; time += HOUR_MS) {
      const instant = new Date(time);
      if (parisOffsetMinutes(instant) !== referenceOffsetMinutes(instant)) {
        throw new Error(`Décalage faux à ${instant.toISOString()}`);
      }
    }
  });
});

describe('jours civils de Paris', () => {
  it('range un instant dans le jour de Paris, pas dans le jour UTC', () => {
    expect(parisDateKey(at('2026-11-17T22:59:00Z'))).toBe('2026-11-17');
    expect(parisDateKey(at('2026-11-17T23:00:00Z'))).toBe('2026-11-18');
    expect(parisDateKey(at('2026-07-17T22:00:00Z'))).toBe('2026-07-18');
  });

  it('fait commencer le jour à minuit, heure de Paris', () => {
    expect(startOfParisDay('2026-11-17').toISOString()).toBe('2026-11-16T23:00:00.000Z');
    expect(startOfParisDay('2026-07-17').toISOString()).toBe('2026-07-16T22:00:00.000Z');
    expect(startOfParisDay('2026-03-29').toISOString()).toBe('2026-03-28T23:00:00.000Z');
    expect(startOfParisDay('2026-10-25').toISOString()).toBe('2026-10-24T22:00:00.000Z');
  });

  it("compte 23 heures le jour du passage à l'heure d'été et 25 au retour", () => {
    expect(parisDayLengthHours('2026-03-28')).toBe(24);
    expect(parisDayLengthHours('2026-03-29')).toBe(23);
    expect(parisDayLengthHours('2026-10-25')).toBe(25);
    expect(parisDayLengthHours('2026-10-26')).toBe(24);
    expect(parisDayLengthHours('2026-12-31')).toBe(24);
  });

  it('refuse un jour mal écrit ou inexistant', () => {
    expect(() => startOfParisDay('17/11/2026')).toThrow();
    expect(() => startOfParisDay('2026-02-30')).toThrow();
  });
});

describe('heure de Paris', () => {
  it('suit le décalage de la saison', () => {
    expect(parisHour(at('2026-07-14T13:00:00Z'))).toBe(15);
    expect(parisHour(at('2026-12-10T14:00:00Z'))).toBe(15);
    expect(parisHour(at('2026-12-10T23:30:00Z'))).toBe(0);
  });

  it('passe de 1 h à 3 h la nuit du passage à l’heure d’été', () => {
    expect(parisHour(at('2026-03-29T00:00:00Z'))).toBe(1);
    expect(parisHour(at('2026-03-29T01:00:00Z'))).toBe(3);
  });
});

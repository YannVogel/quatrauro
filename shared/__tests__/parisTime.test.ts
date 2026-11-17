import { parisOffsetMinutes } from '../parisTime';

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

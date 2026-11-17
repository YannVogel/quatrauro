import { hourBlockOf } from '../grouping';

describe('blocs horaires', () => {
  it('découpe la journée en blocs égaux', () => {
    expect(hourBlockOf(23, 1)).toBe(0);
    expect(hourBlockOf(5, 4)).toBe(0);
    expect(hourBlockOf(6, 4)).toBe(1);
    expect(hourBlockOf(23, 8)).toBe(7);
    expect(hourBlockOf(13, 24)).toBe(13);
  });

  it('refuse un découpage qui ne tombe pas juste', () => {
    expect(() => hourBlockOf(3, 5)).toThrow();
    expect(() => hourBlockOf(3, 0.5)).toThrow();
  });
});

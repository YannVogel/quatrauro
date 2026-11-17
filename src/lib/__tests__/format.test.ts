import {
  formatHour,
  formatMillimetres,
  formatNumber,
  formatPercent,
  formatSpeed,
  formatTemperature,
} from '../format';

const NBSP = ' ';

describe('formats à la française', () => {
  it('écrit les décimales avec une virgule', () => {
    expect(formatNumber(16.84, 1)).toBe('16,8');
    expect(formatNumber(16.84)).toBe('17');
  });

  it('écrit les négatifs avec un vrai signe moins, sauf zéro', () => {
    expect(formatNumber(-2)).toBe('−2');
    expect(formatNumber(-0.04, 1)).toBe('0,0');
    expect(formatNumber(-0)).toBe('0');
  });

  it('colle le degré au chiffre', () => {
    expect(formatTemperature(16)).toBe('16°');
    expect(formatTemperature(16.8, 1)).toBe('16,8°');
    expect(formatTemperature(-2.4)).toBe('−2°');
  });

  it('met une espace insécable avant le pourcentage et les unités', () => {
    expect(formatPercent(95)).toBe(`95${NBSP}%`);
    expect(formatPercent(0)).toBe(`0${NBSP}%`);
    expect(formatPercent(100)).toBe(`100${NBSP}%`);
    expect(formatSpeed(35.4)).toBe(`35${NBSP}km/h`);
    expect(formatHour(17)).toBe(`17${NBSP}h`);
  });

  it('garde une décimale aux petits cumuls de pluie', () => {
    expect(formatMillimetres(12.3)).toBe(`12${NBSP}mm`);
    expect(formatMillimetres(0.4)).toBe(`0,4${NBSP}mm`);
    expect(formatMillimetres(0)).toBe(`0${NBSP}mm`);
  });

  it("n'invente pas de chiffre pour une valeur absente", () => {
    for (const format of [
      formatNumber,
      formatTemperature,
      formatPercent,
      formatSpeed,
      formatMillimetres,
      formatHour,
    ]) {
      expect(format(null)).toBe('—');
      expect(format(undefined)).toBe('—');
      expect(format(Number.NaN)).toBe('—');
    }
  });
});

import { BLEND_CONFIG, MAX_LEAD_DAYS } from '../blendConfig';
import { CITIES, CITY_IDS, findCity } from '../cities';
import { MODELS, MODEL_IDS } from '../models';
import { CORRECTED_VARIABLES, FORECAST_VARIABLES } from '../variables';

describe('villes', () => {
  it('sont Toulon et Nice, sans doublon', () => {
    expect(CITY_IDS).toEqual(['toulon', 'nice']);
    expect(new Set(CITY_IDS).size).toBe(CITIES.length);
  });

  it.each(CITIES)('$name a un point de prévision et une station de référence', (city) => {
    expect(city.latitude).toBeGreaterThan(42);
    expect(city.latitude).toBeLessThan(45);
    expect(city.longitude).toBeGreaterThan(5);
    expect(city.longitude).toBeLessThan(8);
    expect(city.station.id).toMatch(/^\d{8}$/);
    expect(city.station.id.startsWith(city.station.department)).toBe(true);
    expect(city.station.name.length).toBeGreaterThan(0);
  });

  it('se retrouvent par leur identifiant', () => {
    expect(findCity('nice').name).toBe('Nice');
  });
});

describe('modèles', () => {
  it('sont cinq, de quatre fournisseurs, sans doublon', () => {
    expect(MODEL_IDS).toEqual(['arome', 'arpege', 'ifs', 'icon', 'gfs']);
    expect(new Set(MODELS.map((model) => model.provider)).size).toBe(4);
    expect(new Set(MODELS.map((model) => model.openMeteoId)).size).toBe(MODELS.length);
  });

  it.each(MODELS)('$name a une portée, une fréquence et une échéance vérifiable', (model) => {
    expect(model.horizonHours).toBeGreaterThan(0);
    expect(model.updateEveryHours).toBeGreaterThan(0);
    expect(model.historyLeadDays).toBeGreaterThanOrEqual(1);
    expect(model.historyLeadDays).toBeLessThanOrEqual(MAX_LEAD_DAYS);
  });

  it('couvrent chaque échéance à plusieurs', () => {
    for (let leadDays = 1; leadDays <= MAX_LEAD_DAYS; leadDays += 1) {
      // Un modèle couvre un jour d'échéance entier s'il porte jusqu'à sa fin.
      const covering = MODELS.filter((model) => model.horizonHours >= leadDays * 24);
      expect(covering.length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('paramètres du mélange', () => {
  it('découpent les sept jours en tranches, sans trou ni doublon', () => {
    expect(BLEND_CONFIG.leadGrouping.flat()).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(BLEND_CONFIG.leadGrouping.flat()).toHaveLength(MAX_LEAD_DAYS);
  });

  it('découpent la journée en blocs égaux', () => {
    expect(24 % BLEND_CONFIG.hourBlocksPerDay).toBe(0);
  });

  it('ordonnent leurs seuils', () => {
    const { rain, reliability } = BLEND_CONFIG;
    expect(rain.hourlyThreshold).toBeLessThan(rain.dailyThreshold);
    expect(reliability.labels.likely).toBeLessThan(reliability.labels.sure);
    expect(reliability.uncertainRain.from).toBeLessThan(reliability.uncertainRain.to);
    expect([...reliability.spreadThresholds]).toEqual(
      [...reliability.spreadThresholds].sort((a, b) => a - b),
    );
  });
});

describe('variables', () => {
  it('distinguent celles qui sont corrigées et pondérées', () => {
    expect(CORRECTED_VARIABLES).toEqual(['temperature', 'humidity', 'windSpeed', 'windGusts']);
    for (const variable of CORRECTED_VARIABLES) expect(FORECAST_VARIABLES).toContain(variable);
    expect(new Set(FORECAST_VARIABLES).size).toBe(FORECAST_VARIABLES.length);
  });
});

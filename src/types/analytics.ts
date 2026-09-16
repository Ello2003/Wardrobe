export type ValuationMetric = 'purchasePrice' | 'estimatedResale';

export type ChartColorTheme = 'sartorial' | 'navy' | 'monochrome' | 'emerald';

export interface AnalyticsSettings {
  valuationMetric: ValuationMetric;
  targetCpw: number;
  idleWearThreshold: number;
  includeArchived: boolean;
  includeConsignment: boolean;
  chartTheme: ChartColorTheme;
  showGridlines: boolean;
  timeframeFilter: 'all' | '6m' | '12m' | 'this_year';
}

export const DEFAULT_ANALYTICS_SETTINGS: AnalyticsSettings = {
  valuationMetric: 'purchasePrice',
  targetCpw: 10,
  idleWearThreshold: 2,
  includeArchived: false,
  includeConsignment: false,
  chartTheme: 'sartorial',
  showGridlines: true,
  timeframeFilter: 'all',
};

export const THEME_PALETTES: Record<ChartColorTheme, string[]> = {
  sartorial: [
    '#1A1A1A', // Espresso / Black
    '#8C7355', // Heritage Tan / Tweed
    '#2B6CB0', // Oxford Blue
    '#2C7A7B', // Loden Teal
    '#744210', // British Tan
    '#702459', // Plum / Burgundy
    '#4A5568', // Slate Grey
    '#975A16', // Mustard / Camel
    '#234E52', // Dark Loden
    '#44337A', // Royal Navy/Purple
    '#C53030', // Crimson
  ],
  navy: [
    '#1A365D',
    '#2B6CB0',
    '#4299E1',
    '#63B3ED',
    '#90CDF4',
    '#2C5282',
    '#3182CE',
    '#4A5568',
    '#718096',
  ],
  monochrome: [
    '#1A1A1A',
    '#333333',
    '#4D4D4D',
    '#666666',
    '#808080',
    '#999999',
    '#B3B3B3',
    '#CCCCCC',
  ],
  emerald: [
    '#1C4532',
    '#22543D',
    '#276749',
    '#2F855A',
    '#38A169',
    '#48BB78',
    '#68D391',
    '#2C7A7B',
  ],
};

import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  AreaChart,
  Area,
  Line,
  ComposedChart,
  Cell,
  ReferenceLine,
} from 'recharts';
import {
  Sparkles,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Award,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import { WardrobeItem } from '../../types';
import { AnalyticsSettings, THEME_PALETTES } from '../../types/analytics';
import {
  computeCpwAnalysis,
  computePriceTierPyramid,
  computeAcquisitionTimeline,
} from '../../utils/analyticsCalculations';

interface CpwAndValueSectionProps {
  items: WardrobeItem[];
  settings: AnalyticsSettings;
  currencySymbol: string;
  formatCurrency: (val: number) => string;
}

export const CpwAndValueSection: React.FC<CpwAndValueSectionProps> = ({
  items,
  settings,
  currencySymbol,
  formatCurrency,
}) => {
  const palette = THEME_PALETTES[settings.chartTheme] || THEME_PALETTES.sartorial;

  const {
    allWithCpw,
    bestValueHeroes,
    underutilizedHighCpw,
    averageCpw,
    percentTargetMet,
  } = computeCpwAnalysis(items, settings);

  const priceTiers = computePriceTierPyramid(items);
  const acquisitionTimeline = computeAcquisitionTimeline(items);

  const totalIdleCapital = underutilizedHighCpw.reduce((acc, p) => acc + p.price, 0);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* CPW Metric Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-[#E5E5E1] shadow-xs">
          <div className="text-[11px] font-mono text-[#767670] uppercase tracking-wider">
            Average Cost Per Wear
          </div>
          <div className="text-xl font-serif font-bold text-[#1A1A1A] mt-1">
            {currencySymbol}{averageCpw} <span className="text-xs font-sans font-normal text-[#767670]">/ wear</span>
          </div>
          <div className="text-[11px] font-mono text-[#767670] mt-0.5">
            Target: {currencySymbol}{settings.targetCpw} / wear
          </div>
        </div>

        <div className="p-4 bg-white border border-[#E5E5E1] shadow-xs">
          <div className="text-[11px] font-mono text-[#767670] uppercase tracking-wider">
            CPW Target Attainment
          </div>
          <div className="text-xl font-serif font-bold text-emerald-800 mt-1">
            {percentTargetMet}%
          </div>
          <div className="text-[11px] font-mono text-[#767670] mt-0.5">
            Pieces below {currencySymbol}{settings.targetCpw} threshold
          </div>
        </div>

        <div className="p-4 bg-white border border-[#E5E5E1] shadow-xs">
          <div className="text-[11px] font-mono text-[#767670] uppercase tracking-wider">
            Value Hero Piece
          </div>
          <div className="text-xl font-serif font-bold text-[#1A1A1A] mt-1 truncate">
            {bestValueHeroes[0] ? `${bestValueHeroes[0].brand}` : 'None'}
          </div>
          <div className="text-[11px] font-mono text-emerald-800 mt-0.5 truncate">
            {bestValueHeroes[0] ? `${currencySymbol}${bestValueHeroes[0].cpw}/wear (${bestValueHeroes[0].wears} wears)` : 'Record more wears'}
          </div>
        </div>

        <div className="p-4 bg-white border border-[#E5E5E1] shadow-xs">
          <div className="text-[11px] font-mono text-[#767670] uppercase tracking-wider">
            Underutilized Capital
          </div>
          <div className="text-xl font-serif font-bold text-amber-800 mt-1">
            {formatCurrency(totalIdleCapital)}
          </div>
          <div className="text-[11px] font-mono text-[#767670] mt-0.5">
            Across {underutilizedHighCpw.length} low-wear pieces
          </div>
        </div>
      </div>

      {/* Chart Grid 1: Best Value Heroes vs Underutilized Investments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Value Heroes (Lowest CPW) */}
        <div className="p-5 bg-white border border-[#E5E5E1] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <Award className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-serif font-bold text-[#1A1A1A]">
                  Top Value Heroes (Lowest Cost Per Wear)
                </h3>
              </div>
              <p className="text-xs text-[#767670] font-mono">
                Garments that have yielded maximum return through frequent wear
              </p>
            </div>
            <span className="text-[10px] font-mono bg-emerald-50 text-emerald-800 px-2 py-0.5 border border-emerald-200 rounded">
              High Utilization
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={bestValueHeroes.map((b) => ({
                  label: `${b.brand} ${b.name}`.slice(0, 18),
                  cpw: b.cpw,
                  wears: b.wears,
                  price: b.price,
                }))}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
              >
                {settings.showGridlines && (
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0EFEA" />
                )}
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fontFamily: 'monospace', fill: '#767670' }}
                  tickFormatter={(v) => `${currencySymbol}${v}`}
                />
                <YAxis
                  dataKey="label"
                  type="category"
                  width={90}
                  tick={{ fontSize: 10, fontFamily: 'monospace', fill: '#1A1A1A' }}
                />
                <Tooltip
                  formatter={(val: any) => [`${currencySymbol}${val} / wear`, 'Cost Per Wear']}
                  contentStyle={{ backgroundColor: '#1A1A1A', color: '#FFF', fontSize: '11px' }}
                />
                <Bar dataKey="cpw" name="CPW" fill="#2C7A7B" radius={[0, 2, 2, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Underutilized Investment Pieces (Highest CPW) */}
        <div className="p-5 bg-white border border-[#E5E5E1] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-serif font-bold text-[#1A1A1A]">
                  High-Investment Idle Pieces (Underutilized)
                </h3>
              </div>
              <p className="text-xs text-[#767670] font-mono">
                Pieces with substantial invested capital but low rotation counts
              </p>
            </div>
            <span className="text-[10px] font-mono bg-amber-50 text-amber-800 px-2 py-0.5 border border-amber-200 rounded">
              Wear / Resale Candidates
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={underutilizedHighCpw.map((u) => ({
                  label: `${u.brand} ${u.name}`.slice(0, 18),
                  cpw: u.cpw,
                  price: u.price,
                  wears: u.wears,
                }))}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
              >
                {settings.showGridlines && (
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0EFEA" />
                )}
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fontFamily: 'monospace', fill: '#767670' }}
                  tickFormatter={(v) => `${currencySymbol}${v}`}
                />
                <YAxis
                  dataKey="label"
                  type="category"
                  width={90}
                  tick={{ fontSize: 10, fontFamily: 'monospace', fill: '#1A1A1A' }}
                />
                <Tooltip
                  formatter={(val: any) => [`${currencySymbol}${val} / wear`, 'Cost Per Wear']}
                  contentStyle={{ backgroundColor: '#1A1A1A', color: '#FFF', fontSize: '11px' }}
                />
                <Bar dataKey="cpw" name="CPW" fill="#C53030" radius={[0, 2, 2, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Chart Grid 2: Price Tier Pyramid & Wardrobe Acquisition Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Price Tier Distribution */}
        <div className="p-5 bg-white border border-[#E5E5E1] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-serif font-bold text-[#1A1A1A]">
                Wardrobe Investment Tier Pyramid
              </h3>
              <p className="text-xs text-[#767670] font-mono">
                Allocation across high street, contemporary, specialist heritage, and bespoke
              </p>
            </div>
            <Layers className="w-4 h-4 text-[#8C7355]" />
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={priceTiers}
                margin={{ top: 10, right: 20, left: 10, bottom: 20 }}
              >
                {settings.showGridlines && (
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0EFEA" />
                )}
                <XAxis
                  dataKey="range"
                  tick={{ fontSize: 10, fontFamily: 'monospace', fill: '#1A1A1A' }}
                />
                <YAxis
                  tick={{ fontSize: 10, fontFamily: 'monospace', fill: '#767670' }}
                  tickFormatter={(v) => `${currencySymbol}${v}`}
                />
                <Tooltip
                  formatter={(val: any, name: any) => [
                    name === 'totalValuation' ? `${currencySymbol}${val}` : val,
                    name === 'totalValuation' ? 'Capital Invested' : 'Pieces',
                  ]}
                  contentStyle={{ backgroundColor: '#1A1A1A', color: '#FFF', fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
                <Bar dataKey="totalValuation" name="Total Valuation" fill={palette[0] || '#1A1A1A'} />
                <Bar dataKey="count" name="Item Count" fill={palette[1] || '#8C7355'} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Acquisition Timeline & Cumulative Capital Growth */}
        <div className="p-5 bg-white border border-[#E5E5E1] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-serif font-bold text-[#1A1A1A]">
                Acquisition Timeline &amp; Portfolio Growth
              </h3>
              <p className="text-xs text-[#767670] font-mono">
                Cumulative capital growth over garment acquisition dates
              </p>
            </div>
            <TrendingUp className="w-4 h-4 text-[#8C7355]" />
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={acquisitionTimeline}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                {settings.showGridlines && (
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0EFEA" />
                )}
                <XAxis
                  dataKey="period"
                  tick={{ fontSize: 10, fontFamily: 'monospace', fill: '#1A1A1A' }}
                />
                <YAxis
                  tick={{ fontSize: 10, fontFamily: 'monospace', fill: '#767670' }}
                  tickFormatter={(v) => `${currencySymbol}${v}`}
                />
                <Tooltip
                  formatter={(val: any, name: any) => [
                    `${currencySymbol}${val}`,
                    name === 'cumulativeValue' ? 'Cumulative Wardrobe Capital' : 'New Acquisitions',
                  ]}
                  contentStyle={{ backgroundColor: '#1A1A1A', color: '#FFF', fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
                <Area
                  type="monotone"
                  dataKey="cumulativeValue"
                  name="Cumulative Portfolio Value"
                  stroke={palette[1] || '#8C7355'}
                  fill={palette[1] ? `${palette[1]}20` : '#8C735520'}
                />
                <Bar dataKey="investedAmount" name="Monthly Inflows" fill={palette[0] || '#1A1A1A'} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

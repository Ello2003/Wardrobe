import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { Palette, Scissors, Sparkles, Feather } from 'lucide-react';
import { WardrobeItem } from '../../types';
import { AnalyticsSettings, THEME_PALETTES } from '../../types/analytics';
import {
  computeColorDistribution,
  computeMaterialDistribution,
} from '../../utils/analyticsCalculations';

interface ColorAndFabricSectionProps {
  items: WardrobeItem[];
  settings: AnalyticsSettings;
  currencySymbol: string;
  formatCurrency: (val: number) => string;
}

export const ColorAndFabricSection: React.FC<ColorAndFabricSectionProps> = ({
  items,
  settings,
  currencySymbol,
  formatCurrency,
}) => {
  const palette = THEME_PALETTES[settings.chartTheme] || THEME_PALETTES.sartorial;

  const colorData = computeColorDistribution(items);
  const materialData = computeMaterialDistribution(items);

  const topColor = colorData[0]?.color || 'Navy';
  const topMaterial = materialData[0]?.material || 'Wool';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 1. Color Palette Spectrum */}
      <div className="p-5 bg-white border border-[#E5E5E1] shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <Palette className="w-4 h-4 text-[#8C7355]" />
              <h3 className="text-sm font-serif font-bold text-[#1A1A1A]">
                Color Palette Spectrum
              </h3>
            </div>
            <p className="text-xs text-[#767670] font-mono">
              Primary hue distribution across your collection
            </p>
          </div>
          <span className="text-[10px] font-mono bg-[#FAF9F5] text-[#8C7355] px-2 py-0.5 border border-[#E5E5E1] rounded">
            Dominant: {topColor}
          </span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={colorData}
                dataKey="count"
                nameKey="color"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
              >
                {colorData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.hex || palette[index % palette.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(val: any, name: any, item: any) => [
                  `${val} pieces (${currencySymbol}${item.payload.totalValuation})`,
                  name,
                ]}
                contentStyle={{ backgroundColor: '#1A1A1A', color: '#FFF', fontSize: '11px' }}
              />
              <Legend
                layout="horizontal"
                align="center"
                verticalAlign="bottom"
                wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Color Swatch Matrix */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#E5E5E1]">
          {colorData.slice(0, 6).map((c, i) => (
            <div
              key={i}
              className="p-2 border border-[#E5E5E1] rounded-md bg-[#FAF9F5] flex items-center gap-2"
            >
              <span
                className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0"
                style={{ backgroundColor: c.hex }}
              />
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-[#1A1A1A] truncate">{c.color}</div>
                <div className="text-[10px] font-mono text-[#767670]">{c.count} items</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Fabric & Material Composition */}
      <div className="p-5 bg-white border border-[#E5E5E1] shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <Scissors className="w-4 h-4 text-[#8C7355]" />
              <h3 className="text-sm font-serif font-bold text-[#1A1A1A]">
                Fabric &amp; Material Breakdown
              </h3>
            </div>
            <p className="text-xs text-[#767670] font-mono">
              Capital distribution across wool, cashmere, linen, and artisanal cloths
            </p>
          </div>
          <span className="text-[10px] font-mono bg-[#FAF9F5] text-[#8C7355] px-2 py-0.5 border border-[#E5E5E1] rounded">
            Top Fabric: {topMaterial}
          </span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={materialData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 35, bottom: 5 }}
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
                dataKey="material"
                type="category"
                width={85}
                tick={{ fontSize: 10, fontFamily: 'monospace', fill: '#1A1A1A' }}
              />
              <Tooltip
                formatter={(val: any, name: any, item: any) => [
                  `${currencySymbol}${val} (${item.payload.count} pieces)`,
                  'Valuation',
                ]}
                contentStyle={{ backgroundColor: '#1A1A1A', color: '#FFF', fontSize: '11px' }}
              />
              <Bar
                dataKey="totalValuation"
                name="Valuation"
                fill={palette[1] || '#8C7355'}
                radius={[0, 2, 2, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Fabric quick highlights */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E5E5E1] text-[11px] font-mono text-[#767670]">
          <div className="p-2 border border-[#E5E5E1] rounded-md bg-[#FAF9F5]">
            Natural Fibers Ratio:{' '}
            <strong className="text-[#1A1A1A]">
              {Math.round(
                (materialData
                  .filter((m) =>
                    ['Wool', 'Cashmere', 'Linen', 'Cotton', 'Silk'].includes(m.material)
                  )
                  .reduce((acc, m) => acc + m.count, 0) /
                  Math.max(1, items.length)) *
                  100
              )}
              %
            </strong>
          </div>
          <div className="p-2 border border-[#E5E5E1] rounded-md bg-[#FAF9F5]">
            Luxury Fibers (Cashmere/Silk):{' '}
            <strong className="text-[#1A1A1A]">
              {materialData
                .filter((m) => ['Cashmere', 'Silk'].includes(m.material))
                .reduce((acc, m) => acc + m.count, 0)}{' '}
              pieces
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
};

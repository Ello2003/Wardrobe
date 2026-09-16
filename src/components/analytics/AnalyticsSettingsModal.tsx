import React from 'react';
import {
  X,
  SlidersHorizontal,
  RotateCcw,
  Check,
  Palette,
  Eye,
  PoundSterling,
  Sparkles,
} from 'lucide-react';
import { AnalyticsSettings, DEFAULT_ANALYTICS_SETTINGS } from '../../types/analytics';

interface AnalyticsSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AnalyticsSettings;
  onUpdateSettings: (newSettings: AnalyticsSettings) => void;
  currencySymbol?: string;
}

export const AnalyticsSettingsModal: React.FC<AnalyticsSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  currencySymbol = '£',
}) => {
  if (!isOpen) return null;

  const handleReset = () => {
    onUpdateSettings(DEFAULT_ANALYTICS_SETTINGS);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-[#E5E5E1] rounded-xl shadow-xl w-full max-w-lg flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[#E5E5E1] flex items-center justify-between bg-[#FAF9F5]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#8C7355]/10 text-[#8C7355] flex items-center justify-center">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-serif font-bold text-[#1A1A1A]">
                Analytics &amp; Intelligence Preferences
              </h2>
              <p className="text-[11px] text-[#767670]">
                Customize valuation models, target thresholds, and visual themes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#767670] hover:text-[#1A1A1A] rounded-md hover:bg-[#F2F1ED] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Controls */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          {/* Section 1: Valuation Metric */}
          <div className="p-3.5 border border-[#E5E5E1] rounded-lg bg-white space-y-2">
            <label className="block font-semibold text-[#1A1A1A] font-mono uppercase tracking-wider text-[11px]">
              Valuation Basis Model
            </label>
            <p className="text-[11px] text-[#767670]">
              How the studio evaluates capital allocation across category and brand portfolios:
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() =>
                  onUpdateSettings({ ...settings, valuationMetric: 'purchasePrice' })
                }
                className={`py-2 px-3 rounded-lg border text-left cursor-pointer transition-all ${
                  settings.valuationMetric === 'purchasePrice'
                    ? 'bg-[#FAF9F5] border-[#8C7355] text-[#1A1A1A] font-semibold'
                    : 'bg-white border-[#E5E5E1] text-[#767670] hover:bg-[#F8F7F4]'
                }`}
              >
                <div className="font-semibold">Purchase Cost Basis</div>
                <div className="text-[10px] text-[#767670]">Original acquisition capital</div>
              </button>
              <button
                type="button"
                onClick={() =>
                  onUpdateSettings({ ...settings, valuationMetric: 'estimatedResale' })
                }
                className={`py-2 px-3 rounded-lg border text-left cursor-pointer transition-all ${
                  settings.valuationMetric === 'estimatedResale'
                    ? 'bg-[#FAF9F5] border-[#8C7355] text-[#1A1A1A] font-semibold'
                    : 'bg-white border-[#E5E5E1] text-[#767670] hover:bg-[#F8F7F4]'
                }`}
              >
                <div className="font-semibold">Estimated Liquidation Value</div>
                <div className="text-[10px] text-[#767670]">Secondary market value basis</div>
              </button>
            </div>
          </div>

          {/* Section 2: Target Cost Per Wear */}
          <div className="p-3.5 border border-[#E5E5E1] rounded-lg bg-white space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-[#1A1A1A] font-mono uppercase tracking-wider text-[11px]">
                Target Cost Per Wear (CPW)
              </label>
              <span className="font-mono font-bold text-[#8C7355] bg-[#FAF9F5] px-2 py-0.5 rounded border border-[#E5E5E1]">
                {currencySymbol}
                {settings.targetCpw} / wear
              </span>
            </div>
            <p className="text-[11px] text-[#767670]">
              Benchmark cost target to determine when a garment has mathematically paid for itself:
            </p>
            <div className="grid grid-cols-5 gap-1.5 pt-1">
              {[5, 10, 15, 20, 25].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => onUpdateSettings({ ...settings, targetCpw: amt })}
                  className={`py-1.5 text-center font-mono rounded border transition-all cursor-pointer ${
                    settings.targetCpw === amt
                      ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] font-bold shadow-2xs'
                      : 'bg-[#F8F7F4] text-[#767670] border-[#E5E5E1] hover:bg-white'
                  }`}
                >
                  {currencySymbol}
                  {amt}
                </button>
              ))}
            </div>
          </div>

          {/* Section 3: Idle Threshold */}
          <div className="p-3.5 border border-[#E5E5E1] rounded-lg bg-white space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-[#1A1A1A] font-mono uppercase tracking-wider text-[11px]">
                Idle &amp; Underutilized Threshold
              </label>
              <span className="font-mono font-bold text-[#8C7355] bg-[#FAF9F5] px-2 py-0.5 rounded border border-[#E5E5E1]">
                ≤ {settings.idleWearThreshold} wears
              </span>
            </div>
            <p className="text-[11px] text-[#767670]">
              Pieces with wear counts equal to or below this threshold are flagged in the Underutilized Investment audit:
            </p>
            <div className="grid grid-cols-4 gap-2 pt-1">
              {[0, 1, 2, 3].map((wears) => (
                <button
                  key={wears}
                  type="button"
                  onClick={() => onUpdateSettings({ ...settings, idleWearThreshold: wears })}
                  className={`py-1.5 text-center font-mono rounded border transition-all cursor-pointer ${
                    settings.idleWearThreshold === wears
                      ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] font-bold shadow-2xs'
                      : 'bg-[#F8F7F4] text-[#767670] border-[#E5E5E1] hover:bg-white'
                  }`}
                >
                  {wears === 0 ? '0 (Unworn)' : `≤ ${wears} wears`}
                </button>
              ))}
            </div>
          </div>

          {/* Section 4: Chart Palette Theme */}
          <div className="p-3.5 border border-[#E5E5E1] rounded-lg bg-white space-y-2">
            <label className="block font-semibold text-[#1A1A1A] font-mono uppercase tracking-wider text-[11px]">
              Chart Color Theme
            </label>
            <div className="grid grid-cols-2 gap-2 pt-1">
              {[
                { id: 'sartorial', name: 'Sartorial Earth & Tweed', colors: ['#1A1A1A', '#8C7355', '#2B6CB0'] },
                { id: 'navy', name: 'Oxford Navy & Blue', colors: ['#1A365D', '#2B6CB0', '#63B3ED'] },
                { id: 'monochrome', name: 'Monochrome Minimalist', colors: ['#1A1A1A', '#666666', '#B3B3B3'] },
                { id: 'emerald', name: 'Loden & Forest Green', colors: ['#1C4532', '#2F855A', '#68D391'] },
              ].map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => onUpdateSettings({ ...settings, chartTheme: theme.id as any })}
                  className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                    settings.chartTheme === theme.id
                      ? 'bg-[#FAF9F5] border-[#8C7355] shadow-2xs font-semibold'
                      : 'bg-white border-[#E5E5E1] hover:bg-[#F8F7F4]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    {theme.colors.map((c, i) => (
                      <span
                        key={i}
                        className="w-3 h-3 rounded-full border border-black/10"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] text-[#1A1A1A]">{theme.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Section 5: Filter Inclusions & Display Toggles */}
          <div className="p-3.5 border border-[#E5E5E1] rounded-lg bg-white space-y-2">
            <label className="block font-semibold text-[#1A1A1A] font-mono uppercase tracking-wider text-[11px]">
              Display &amp; Inclusion Rules
            </label>
            <div className="space-y-2 pt-1">
              <label className="flex items-center justify-between p-2 rounded hover:bg-[#FAF9F5] cursor-pointer">
                <span className="text-[#1A1A1A]">Show Chart Gridlines</span>
                <input
                  type="checkbox"
                  checked={settings.showGridlines}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, showGridlines: e.target.checked })
                  }
                  className="rounded text-[#8C7355] focus:ring-0 cursor-pointer"
                />
              </label>
              <label className="flex items-center justify-between p-2 rounded hover:bg-[#FAF9F5] cursor-pointer">
                <span className="text-[#1A1A1A]">Include Archived / Retired Garments</span>
                <input
                  type="checkbox"
                  checked={settings.includeArchived}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, includeArchived: e.target.checked })
                  }
                  className="rounded text-[#8C7355] focus:ring-0 cursor-pointer"
                />
              </label>
              <label className="flex items-center justify-between p-2 rounded hover:bg-[#FAF9F5] cursor-pointer">
                <span className="text-[#1A1A1A]">Include Consigned &amp; Active Sales Pieces</span>
                <input
                  type="checkbox"
                  checked={settings.includeConsignment}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, includeConsignment: e.target.checked })
                  }
                  className="rounded text-[#8C7355] focus:ring-0 cursor-pointer"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-[#FAF9F5] border-t border-[#E5E5E1] flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1 text-[#767670] hover:text-[#1A1A1A] font-medium cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            Reset Defaults
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#1A1A1A] hover:bg-[#333] text-white font-semibold rounded-lg text-xs cursor-pointer shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

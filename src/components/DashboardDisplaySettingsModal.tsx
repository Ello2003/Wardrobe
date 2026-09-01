import React from 'react';
import {
  SlidersHorizontal,
  X,
  RotateCcw,
  Eye,
  EyeOff,
  Sparkles,
  LayoutGrid,
  TrendingUp,
  Flame,
  AlertCircle,
  History,
  Wallet,
} from 'lucide-react';

export interface DashboardDisplaySettings {
  showHeroBanner: boolean;
  showKpiMetrics: boolean;
  showQuickWearLogger: boolean;
  showStaplesLeaderboard: boolean;
  showNeglectedLeaderboard: boolean;
  showAuditLogSnapshot: boolean;
  showFinancialOverview: boolean;
}

export const DEFAULT_DASHBOARD_DISPLAY_SETTINGS: DashboardDisplaySettings = {
  showHeroBanner: true,
  showKpiMetrics: true,
  showQuickWearLogger: true,
  showStaplesLeaderboard: true,
  showNeglectedLeaderboard: true,
  showAuditLogSnapshot: true,
  showFinancialOverview: true,
};

interface DashboardDisplaySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: DashboardDisplaySettings;
  onChange: (updated: DashboardDisplaySettings) => void;
}

export const DashboardDisplaySettingsModal: React.FC<DashboardDisplaySettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onChange,
}) => {
  if (!isOpen) return null;

  const toggleKey = (key: keyof DashboardDisplaySettings) => {
    onChange({
      ...settings,
      [key]: !settings[key],
    });
  };

  const applyPreset = (preset: 'all' | 'focused' | 'analytics' | 'minimal') => {
    if (preset === 'all') {
      onChange(DEFAULT_DASHBOARD_DISPLAY_SETTINGS);
    } else if (preset === 'focused') {
      onChange({
        showHeroBanner: false,
        showKpiMetrics: true,
        showQuickWearLogger: true,
        showStaplesLeaderboard: true,
        showNeglectedLeaderboard: false,
        showAuditLogSnapshot: false,
        showFinancialOverview: true,
      });
    } else if (preset === 'analytics') {
      onChange({
        showHeroBanner: false,
        showKpiMetrics: true,
        showQuickWearLogger: false,
        showStaplesLeaderboard: true,
        showNeglectedLeaderboard: true,
        showAuditLogSnapshot: true,
        showFinancialOverview: true,
      });
    } else if (preset === 'minimal') {
      onChange({
        showHeroBanner: false,
        showKpiMetrics: true,
        showQuickWearLogger: true,
        showStaplesLeaderboard: false,
        showNeglectedLeaderboard: false,
        showAuditLogSnapshot: false,
        showFinancialOverview: false,
      });
    }
  };

  const sections: {
    key: keyof DashboardDisplaySettings;
    label: string;
    description: string;
    icon: any;
  }[] = [
    {
      key: 'showHeroBanner',
      label: 'Welcome & AI Audit Header',
      description: 'Top greeting banner with AI Wardrobe Audit & Style New Look actions',
      icon: Sparkles,
    },
    {
      key: 'showKpiMetrics',
      label: 'Financial & Volume KPI Tiles',
      description: '4 summary cards: Total Closet Value, Monthly Spend, Lookbook Formulas, Monthly Budget',
      icon: TrendingUp,
    },
    {
      key: 'showQuickWearLogger',
      label: 'Quick Wear Logger ("What Did You Wear Today?")',
      description: 'Interactive garment carousel with one-click "+1 Wore" wear counter',
      icon: LayoutGrid,
    },
    {
      key: 'showStaplesLeaderboard',
      label: 'Most Worn Wardrobe Staples',
      description: 'High utilization leaderboard showcasing top worn closet investments',
      icon: Flame,
    },
    {
      key: 'showNeglectedLeaderboard',
      label: 'Neglected Closet Pieces (< 5 Wears)',
      description: 'Garments needing styling attention or consideration for resale',
      icon: AlertCircle,
    },
    {
      key: 'showAuditLogSnapshot',
      label: 'Live Version Audit Trail Snapshot',
      description: 'Recent revision history and rollback log',
      icon: History,
    },
    {
      key: 'showFinancialOverview',
      label: 'P&L and Resale Quick Metrics',
      description: 'Financial balance sheet and capital efficiency insights',
      icon: Wallet,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-[#E5E5E1] max-w-xl w-full p-6 shadow-2xl space-y-5 rounded-lg animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E1]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-[#F8F7F4] text-[#8C7355]">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-serif font-bold text-[#1A1A1A]">
                Dashboard Display Settings
              </h2>
              <p className="text-xs text-[#767670]">
                Customize which sections and analytical widgets appear on your Overview dashboard
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#767670] hover:text-[#1A1A1A] rounded hover:bg-[#F2F1ED] transition-colors cursor-pointer"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Presets */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-mono uppercase tracking-wider text-[#767670] font-semibold">
            Quick Layout Presets:
          </label>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => applyPreset('all')}
              className="px-2.5 py-1 text-xs font-mono border border-[#D5D5D0] bg-[#F8F7F4] hover:bg-[#EAE8E3] text-[#1A1A1A] cursor-pointer"
            >
              All Sections (Full)
            </button>
            <button
              type="button"
              onClick={() => applyPreset('focused')}
              className="px-2.5 py-1 text-xs font-mono border border-[#D5D5D0] bg-[#F8F7F4] hover:bg-[#EAE8E3] text-[#1A1A1A] cursor-pointer"
            >
              Daily Focused (KPI + Logger)
            </button>
            <button
              type="button"
              onClick={() => applyPreset('analytics')}
              className="px-2.5 py-1 text-xs font-mono border border-[#D5D5D0] bg-[#F8F7F4] hover:bg-[#EAE8E3] text-[#1A1A1A] cursor-pointer"
            >
              Deep Analytics Only
            </button>
            <button
              type="button"
              onClick={() => applyPreset('minimal')}
              className="px-2.5 py-1 text-xs font-mono border border-[#D5D5D0] bg-[#F8F7F4] hover:bg-[#EAE8E3] text-[#1A1A1A] cursor-pointer"
            >
              Minimal
            </button>
          </div>
        </div>

        {/* Section Toggles List */}
        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          <label className="text-[11px] font-mono uppercase tracking-wider text-[#767670] font-semibold block">
            Dashboard Sections ({sections.filter((s) => settings[s.key]).length}/{sections.length} Visible):
          </label>
          <div className="space-y-2">
            {sections.map((section) => {
              const isEnabled = settings[section.key];
              const Icon = section.icon;
              return (
                <div
                  key={section.key}
                  onClick={() => toggleKey(section.key)}
                  className={`flex items-center justify-between p-3 border rounded-md cursor-pointer transition-all ${
                    isEnabled
                      ? 'bg-[#FAF9F6] border-[#8C7355]/50 shadow-2xs'
                      : 'bg-[#FDFDFD] border-[#E5E5E1] opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center gap-3 pr-3">
                    <div
                      className={`p-2 rounded ${
                        isEnabled
                          ? 'bg-[#8C7355]/10 text-[#8C7355]'
                          : 'bg-[#F2F1ED] text-[#9A9A95]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-[#1A1A1A]">
                        {section.label}
                      </div>
                      <p className="text-[11px] text-[#767670] leading-tight mt-0.5">
                        {section.description}
                      </p>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <div
                    className={`w-11 h-6 rounded-full p-0.5 transition-colors relative shrink-0 ${
                      isEnabled ? 'bg-[#8C7355]' : 'bg-[#D5D5D0]'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform transform ${
                        isEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-[#E5E5E1]">
          <button
            type="button"
            onClick={() => onChange(DEFAULT_DASHBOARD_DISPLAY_SETTINGS)}
            className="flex items-center gap-1.5 text-xs font-mono text-[#8C7355] hover:text-[#1A1A1A] cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Default</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-medium uppercase tracking-wider bg-[#1A1A1A] hover:bg-[#333333] text-white shadow-xs cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  TrendingDown,
  TrendingUp,
  Shirt,
  Sparkles,
  Layers,
  ShoppingBag,
  History,
  Plus,
  Flame,
  AlertCircle,
  Calendar,
  Wallet,
  PoundSterling,
  SlidersHorizontal,
  DollarSign,
} from 'lucide-react';
import { useWardrobe } from '../context/WardrobeContext';
import { WardrobeItem } from '../types';
import { GarmentImage } from './GarmentImage';
import {
  DashboardDisplaySettings,
  DEFAULT_DASHBOARD_DISPLAY_SETTINGS,
  DashboardDisplaySettingsModal,
} from './DashboardDisplaySettingsModal';

interface DashboardViewProps {
  onOpenAddItem: () => void;
  onOpenCreateLook: () => void;
  onOpenAIStylist: () => void;
  onSelectItem: (item: WardrobeItem) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenAddItem,
  onOpenCreateLook,
  onOpenAIStylist,
  onSelectItem,
}) => {
  const {
    items,
    shoppingList,
    saleItems,
    changeLogs,
    currentVersion,
    monthlyBudget,
    spentThisMonth,
    logItemWear,
    setActiveTab,
    stats,
  } = useWardrobe();

  // Load Dashboard Display Settings from LocalStorage
  const [displaySettings, setDisplaySettings] = useState<DashboardDisplaySettings>(() => {
    try {
      const saved = localStorage.getItem('dashboard_display_settings');
      if (saved) {
        return { ...DEFAULT_DASHBOARD_DISPLAY_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error('Failed to load dashboard settings', e);
    }
    return DEFAULT_DASHBOARD_DISPLAY_SETTINGS;
  });

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const handleUpdateSettings = (updated: DashboardDisplaySettings) => {
    setDisplaySettings(updated);
    try {
      localStorage.setItem('dashboard_display_settings', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save dashboard settings', e);
    }
  };

  const recentLogs = changeLogs.slice(0, 5);

  const formatGbp = (val: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: val % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  const budgetProgressPercent = Math.min(
    Math.round((spentThisMonth / Math.max(monthlyBudget, 1)) * 100),
    100
  );

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Banner & Quick Context */}
      {displaySettings.showHeroBanner && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-[#E5E5E1] rounded-xl p-5 shadow-xs relative overflow-hidden">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-widest font-mono text-[#8C7355] font-bold">
                Inventory &amp; Wardrobe Intelligence
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#1A1A1A]">
              Sartorial Dashboard &amp; Lookbook
            </h1>
            <p className="text-xs text-[#767670] max-w-2xl">
              Real-time inventory valuation, garment utilization, outfit formula research, and
              structured change history in British Pounds (£).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              id="dash-display-settings-btn"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded-md bg-white hover:bg-[#F3F2EE] text-[#5A5A55] border border-[#E5E5E1] shadow-xs transition-all cursor-pointer"
              title="Configure Dashboard Sections"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#767670]" />
              <span>Dashboard Settings</span>
            </button>
            <button
              onClick={onOpenAIStylist}
              id="dash-ai-audit-btn"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-[#8C7355] hover:bg-[#786248] text-white shadow-xs transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-200" />
              AI Inventory Audit
            </button>
            <button
              onClick={onOpenCreateLook}
              id="dash-create-look-btn"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-white hover:bg-[#F3F2EE] text-[#1A1A1A] border border-[#E5E5E1] shadow-xs transition-all cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-[#767670]" />
              Style New Look
            </button>
          </div>
        </div>
      )}

      {/* When Top Banner is hidden, show a compact header bar with settings button */}
      {!displaySettings.showHeroBanner && (
        <div className="flex items-center justify-between pb-2 border-b border-[#E5E5E1]">
          <h2 className="text-lg font-serif font-bold text-[#1A1A1A]">Dashboard Overview</h2>
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded-md bg-white hover:bg-[#F3F2EE] text-[#5A5A55] border border-[#E5E5E1] shadow-xs transition-all cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#767670]" />
            <span>Dashboard Settings</span>
          </button>
        </div>
      )}

      {/* High-Level Metric Tiles */}
      {displaySettings.showKpiMetrics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Metric 1: Total Valuation */}
          <div className="bg-white border border-[#E5E5E1] rounded-lg p-4 space-y-1.5 shadow-xs hover:border-[#8C7355]/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#767670] uppercase tracking-wider font-mono font-semibold">
                Total Inventory Value
              </span>
              <div className="p-1.5 rounded bg-[#F8F7F4] text-[#8C7355]">
                <PoundSterling className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-serif font-bold text-[#1A1A1A]">
              {formatGbp(stats.totalValuationGbp)}
            </div>
            <div className="text-[11px] text-[#767670] flex items-center justify-between">
              <span>{stats.totalItems} pieces catalogued</span>
              <span className="text-[#1A1A1A] font-mono">
                ~{formatGbp(stats.totalValuationGbp / Math.max(stats.totalItems, 1))}/item
              </span>
            </div>
          </div>

          {/* Metric 2: Monthly Spend & Budget */}
          <div className="bg-white border border-[#E5E5E1] rounded-lg p-4 space-y-1.5 shadow-xs hover:border-[#8C7355]/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#767670] uppercase tracking-wider font-mono font-semibold">
                Monthly Purchases Spend
              </span>
              <div className="p-1.5 rounded bg-[#F8F7F4] text-[#8C7355]">
                <ShoppingBag className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-serif font-bold text-[#1A1A1A]">
              {formatGbp(spentThisMonth)}
            </div>
            <div className="text-[11px] text-[#767670] flex items-center justify-between">
              <span>Budget: {formatGbp(monthlyBudget)}</span>
              <span className="text-emerald-700 text-[10px] font-mono font-semibold">
                {Math.max(0, monthlyBudget - spentThisMonth) > 0
                  ? `${formatGbp(monthlyBudget - spentThisMonth)} left`
                  : 'Budget reached'}
              </span>
            </div>
          </div>

          {/* Metric 3: Lookbook Outfits */}
          <div className="bg-white border border-[#E5E5E1] rounded-lg p-4 space-y-1.5 shadow-xs hover:border-[#8C7355]/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#767670] uppercase tracking-wider font-mono font-semibold">
                Lookbook Formulas
              </span>
              <div className="p-1.5 rounded bg-blue-50 text-blue-700">
                <Layers className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-serif font-bold text-[#1A1A1A]">
              {stats.totalOutfitsCount}
              <span className="text-xs font-sans text-[#767670] ml-1 font-normal">styled looks</span>
            </div>
            <div className="text-[11px] text-[#767670] flex items-center justify-between">
              <span>Capsule coverage: High</span>
              <button
                onClick={() => setActiveTab('lookbook')}
                className="text-blue-700 hover:text-blue-800 font-mono text-[10px] inline-flex items-center font-semibold cursor-pointer"
              >
                Open Studio →
              </button>
            </div>
          </div>

          {/* Metric 4: Monthly Shopping Budget Tracker */}
          <div className="bg-white border border-[#E5E5E1] rounded-lg p-4 space-y-1.5 shadow-xs hover:border-[#8C7355]/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#767670] uppercase tracking-wider font-mono font-semibold">
                Monthly Budget (£)
              </span>
              <div className="p-1.5 rounded bg-amber-50 text-[#8C7355]">
                <Wallet className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-serif font-bold text-[#1A1A1A]">
              {formatGbp(spentThisMonth)}
              <span className="text-xs font-sans text-[#767670] ml-1 font-normal">
                / {formatGbp(monthlyBudget)}
              </span>
            </div>
            <div className="space-y-1">
              <div className="w-full bg-[#E5E5E1] rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    budgetProgressPercent > 90 ? 'bg-rose-500' : 'bg-[#8C7355]'
                  }`}
                  style={{ width: `${budgetProgressPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-[#767670]">
                <span>{formatGbp(stats.budgetRemainingGbp)} left</span>
                <span>{shoppingList.filter((s) => s.status === 'To Buy').length} in to-buy queue</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Financial Resale & Purchases Overview Card */}
      {displaySettings.showFinancialOverview && (
        <div className="bg-white border border-[#E5E5E1] rounded-xl p-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E5E5E1]">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded bg-emerald-50 text-emerald-800">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-serif font-bold text-[#1A1A1A]">
                  Financial Performance &amp; Resale Health
                </h3>
                <p className="text-[11px] text-[#767670]">
                  Net realised profits, active resale pipeline, and acquisition capital breakdown
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('selling')}
              className="text-[11px] font-mono text-[#8C7355] hover:text-[#786248] font-semibold cursor-pointer"
            >
              Sales &amp; Resale Studio →
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
            <div className="p-2.5 rounded-lg bg-[#FAF9F6] border border-[#E5E5E1]">
              <span className="text-[10px] font-mono uppercase text-[#767670] block">Realised Net Profit</span>
              <span className="text-base font-serif font-bold text-emerald-700">
                {formatGbp(stats.salesStats?.totalNetProfitGbp || 0)}
              </span>
              <span className="text-[10px] text-[#767670] block mt-0.5">
                {stats.salesStats?.soldItemsCount || 0} items sold
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#FAF9F6] border border-[#E5E5E1]">
              <span className="text-[10px] font-mono uppercase text-[#767670] block">Active Resale Pipeline</span>
              <span className="text-base font-serif font-bold text-[#1A1A1A]">
                {formatGbp(stats.salesStats?.activeListingsValueGbp || 0)}
              </span>
              <span className="text-[10px] text-[#767670] block mt-0.5">
                {stats.salesStats?.activeListingsCount || 0} listed pieces
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#FAF9F6] border border-[#E5E5E1]">
              <span className="text-[10px] font-mono uppercase text-[#767670] block">Wishlist Pipeline</span>
              <span className="text-base font-serif font-bold text-[#8C7355]">
                {formatGbp(shoppingList.reduce((acc, s) => acc + (s.estimatedPrice || 0), 0))}
              </span>
              <span className="text-[10px] text-[#767670] block mt-0.5">
                {shoppingList.filter((s) => s.status !== 'Purchased').length} pending purchases
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#FAF9F6] border border-[#E5E5E1]">
              <span className="text-[10px] font-mono uppercase text-[#767670] block">Avg Cost Per Wear</span>
              <span className="text-base font-serif font-bold text-[#1A1A1A]">
                {formatGbp(
                  stats.totalValuationGbp /
                    Math.max(
                      items.reduce((acc, it) => acc + it.wearCount, 0),
                      1
                    )
                )}
              </span>
              <span className="text-[10px] text-[#767670] block mt-0.5">across all wears</span>
            </div>
          </div>
        </div>
      )}

      {/* Quick Wear Logger Section */}
      {displaySettings.showQuickWearLogger && (
        <div className="bg-white border border-[#E5E5E1] rounded-xl p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-[#F8F7F4] text-[#8C7355]">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-serif font-bold text-[#1A1A1A]">
                  Quick Wear Logger: What Did You Wear Today?
                </h2>
                <p className="text-[11px] text-[#767670]">
                  Click "+1 Wore" to immediately record wear frequency and update revision audit logs.
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('wardrobe')}
              className="text-xs text-[#8C7355] hover:text-[#786248] font-mono font-semibold cursor-pointer"
            >
              View All {items.length} Items in Inventory →
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {items.slice(0, 6).map((item) => {
              return (
                <div
                  key={item.id}
                  className="bg-[#F8F7F4] border border-[#E5E5E1] hover:border-[#8C7355]/60 rounded-lg p-2.5 flex flex-col justify-between space-y-2 group transition-all"
                >
                  <div
                    className="cursor-pointer"
                    onClick={() => onSelectItem(item)}
                  >
                    <div className="aspect-square rounded-md overflow-hidden bg-white mb-1.5 relative border border-[#E5E5E1] flex items-center justify-center p-1">
                      <GarmentImage
                        src={item.imageUrl}
                        alt={item.name}
                        category={item.category}
                        className="w-full h-full max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
                        containerClassName="w-full h-full flex items-center justify-center bg-white"
                        showPlaceholderLabel={false}
                      />
                      <span className="absolute top-1 right-1 text-[9px] font-mono px-1 py-0.2 rounded bg-white/95 text-[#1A1A1A] font-semibold backdrop-blur-xs border border-[#E5E5E1]">
                        {formatGbp(item.purchasePrice)}
                      </span>
                    </div>
                    <h3 className="text-xs font-semibold text-[#1A1A1A] truncate" title={item.name}>
                      {item.name}
                    </h3>
                    <p className="text-[10px] text-[#767670] truncate">{item.brand}</p>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-[#E5E5E1]">
                    <span className="text-[10px] text-[#767670] font-mono">
                      Worn: <strong className="text-[#1A1A1A]">{item.wearCount}x</strong>
                    </span>
                    <button
                      onClick={() => logItemWear(item.id)}
                      id={`quick-wear-${item.id}`}
                      title="Log Wear for Today (+1)"
                      className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-white hover:bg-[#8C7355] hover:text-white text-[#1A1A1A] border border-[#E5E5E1] transition-all flex items-center gap-0.5 cursor-pointer shadow-xs"
                    >
                      <Plus className="w-2.5 h-2.5" /> Wore
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Deep Analytics & Performance Leaderboards */}
      {(displaySettings.showStaplesLeaderboard ||
        displaySettings.showNeglectedLeaderboard ||
        displaySettings.showAuditLogSnapshot) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Column 1: Most Worn Staples (High Utilization) */}
          {displaySettings.showStaplesLeaderboard && (
            <div className="bg-white border border-[#E5E5E1] rounded-xl p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-emerald-700" />
                  <h3 className="text-xs font-serif font-bold text-[#1A1A1A]">
                    Most Worn Inventory Staples
                  </h3>
                </div>
                <span className="text-[9px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-semibold">
                  High Utility
                </span>
              </div>

              <div className="space-y-2">
                {stats.bestValueItems.map((item, idx) => {
                  return (
                    <div
                      key={item.id}
                      onClick={() => onSelectItem(item)}
                      className="flex items-center justify-between p-2 rounded-lg bg-[#F8F7F4] hover:bg-[#F3F2EE] border border-[#E5E5E1] cursor-pointer transition-all"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-mono text-[#767670] w-3.5">#{idx + 1}</span>
                        <div className="w-8 h-8 rounded-md overflow-hidden bg-white border border-[#E5E5E1] shrink-0">
                          <GarmentImage
                            src={item.imageUrl}
                            alt={item.name}
                            category={item.category}
                            className="w-full h-full object-contain p-0.5"
                            containerClassName="w-full h-full bg-white flex items-center justify-center"
                            showPlaceholderLabel={false}
                          />
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold text-[#1A1A1A] truncate max-w-[130px]">
                            {item.name}
                          </h4>
                          <p className="text-[10px] text-[#767670]">
                            {item.brand}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-mono font-bold text-emerald-700">
                          {item.wearCount} wears
                        </div>
                        <div className="text-[9px] text-[#767670]">orig. {formatGbp(item.purchasePrice)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Column 2: Neglected Items Needing Styling Love */}
          {displaySettings.showNeglectedLeaderboard && (
            <div className="bg-white border border-[#E5E5E1] rounded-xl p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <h3 className="text-xs font-serif font-bold text-[#1A1A1A]">
                    Neglected Closet Pieces
                  </h3>
                </div>
                <span className="text-[9px] font-mono text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-semibold">
                  &lt; 5 Wears
                </span>
              </div>

              <div className="space-y-2">
                {stats.underutilizedItems.length === 0 ? (
                  <div className="text-xs text-[#767670] py-6 text-center">
                    All inventory pieces are well-utilized!
                  </div>
                ) : (
                  stats.underutilizedItems.map((item) => {
                    return (
                      <div
                        key={item.id}
                        onClick={() => onSelectItem(item)}
                        className="flex items-center justify-between p-2 rounded-lg bg-[#F8F7F4] hover:bg-[#F3F2EE] border border-[#E5E5E1] cursor-pointer transition-all"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-md overflow-hidden bg-white border border-[#E5E5E1] shrink-0">
                            <GarmentImage
                              src={item.imageUrl}
                              alt={item.name}
                              category={item.category}
                              className="w-full h-full object-contain p-0.5"
                              containerClassName="w-full h-full bg-white flex items-center justify-center"
                              showPlaceholderLabel={false}
                            />
                          </div>
                          <div>
                            <h4 className="text-xs font-semibold text-[#1A1A1A] truncate max-w-[130px]">
                              {item.name}
                            </h4>
                            <p className="text-[10px] text-amber-700 font-mono">
                              Only {item.wearCount} wear{item.wearCount === 1 ? '' : 's'} logged
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-mono font-semibold text-[#1A1A1A]">{formatGbp(item.purchasePrice)}</div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              logItemWear(item.id);
                            }}
                            className="text-[10px] text-[#8C7355] hover:underline font-mono font-semibold cursor-pointer"
                          >
                            + Wear Today
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Column 3: Live Version Audit Trail Snapshot */}
          {displaySettings.showAuditLogSnapshot && (
            <div className="bg-white border border-[#E5E5E1] rounded-xl p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <History className="w-4 h-4 text-[#8C7355]" />
                  <h3 className="text-xs font-serif font-bold text-[#1A1A1A]">
                    Recent Version Audit Log
                  </h3>
                </div>
                <button
                  onClick={() => setActiveTab('history')}
                  className="text-[10px] font-mono text-[#8C7355] hover:text-[#786248] font-semibold cursor-pointer"
                >
                  Full Log →
                </button>
              </div>

              <div className="space-y-2">
                {recentLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-2 rounded-lg bg-[#F8F7F4] border border-[#E5E5E1] text-xs space-y-0.5"
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-mono text-[#8C7355] font-bold">
                        Rev #{log.versionNumber}
                      </span>
                      <span className="text-[#767670]">
                        {new Date(log.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-[#1A1A1A] line-clamp-2 text-[11px] leading-snug">
                      {log.summary}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dashboard Display Settings Modal */}
      <DashboardDisplaySettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={displaySettings}
        onChange={handleUpdateSettings}
      />
    </div>
  );
};

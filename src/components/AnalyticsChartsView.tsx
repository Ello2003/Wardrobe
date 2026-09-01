import React, { useState, useMemo } from 'react';
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
  AreaChart,
  Area,
  LineChart,
  Line,
  CartesianGrid,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ComposedChart,
} from 'recharts';
import {
  TrendingUp,
  ShoppingBag,
  DollarSign,
  Tag,
  PieChart as PieChartIcon,
  BarChart3,
  Calendar,
  Layers,
  Sparkles,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  RefreshCw,
  Wallet,
  ShieldCheck,
  Compass,
} from 'lucide-react';
import { useWardrobe } from '../context/WardrobeContext';

const PALETTE = [
  '#1A1A1A',
  '#8C7355',
  '#4A5568',
  '#2B6CB0',
  '#2C7A7B',
  '#975A16',
  '#744210',
  '#44337A',
  '#702459',
  '#718096',
  '#4A5568',
  '#C53030',
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  currencySymbol?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  label,
  currencySymbol = '£',
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1A1A1A] text-white p-2.5 text-xs font-mono border border-[#333] shadow-lg">
        {label && <div className="font-bold text-[#E5E5E1] mb-1">{label}</div>}
        {payload.map((entry, index) => {
          const isCurrency =
            entry.name?.toLowerCase().includes('value') ||
            entry.name?.toLowerCase().includes('revenue') ||
            entry.name?.toLowerCase().includes('profit') ||
            entry.name?.toLowerCase().includes('spend') ||
            entry.name?.toLowerCase().includes('budget') ||
            entry.name?.toLowerCase().includes('cost');
          return (
            <div key={`item-${index}`} className="flex items-center justify-between gap-3 text-[11px]">
              <span style={{ color: entry.color || '#D5D5D0' }}>{entry.name}:</span>
              <span className="font-bold text-white">
                {isCurrency
                  ? `${currencySymbol}${typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}`
                  : entry.value}
              </span>
            </div>
          );
        })}
      </div>
    );
  }
  return null;
};

interface AnalyticsChartsViewProps {
  onOpenAddItem?: () => void;
}

export const AnalyticsChartsView: React.FC<AnalyticsChartsViewProps> = ({ onOpenAddItem }) => {
  const { items, shoppingList, saleItems, outfits, monthlyBudget, spentThisMonth, settings, formatCurrency } =
    useWardrobe();

  const sym = settings.currencySymbol || '£';

  // Sub-tabs
  const [activeSection, setActiveSection] = useState<'wardrobe' | 'sales' | 'purchases' | 'styling' | 'recommendations'>('wardrobe');

  // Time filter for sales
  const [salesTimeframe, setSalesTimeframe] = useState<'all' | '6m' | '12m'>('all');

  // Active items (unarchived)
  const activeItems = useMemo(() => items.filter((i) => !i.isArchived), [items]);

  // 1. WARDROBE VALUATION & ITEM BREAKDOWN BY CATEGORY
  const categoryData = useMemo(() => {
    const map: Record<string, { name: string; count: number; totalValuation: number; avgValuation: number }> = {};
    activeItems.forEach((i) => {
      const cat = i.category || 'Other';
      if (!map[cat]) {
        map[cat] = { name: cat, count: 0, totalValuation: 0, avgValuation: 0 };
      }
      map[cat].count += 1;
      map[cat].totalValuation += i.purchasePrice || 0;
    });

    return Object.values(map)
      .map((item) => ({
        ...item,
        avgValuation: item.count > 0 ? Math.round(item.totalValuation / item.count) : 0,
      }))
      .sort((a, b) => b.totalValuation - a.totalValuation);
  }, [activeItems]);

  // 2. BRAND PORTFOLIO ANALYSIS
  const brandData = useMemo(() => {
    const map: Record<string, { brand: string; count: number; totalValue: number }> = {};
    activeItems.forEach((i) => {
      const b = i.brand || 'Unspecified';
      if (!map[b]) {
        map[b] = { brand: b, count: 0, totalValue: 0 };
      }
      map[b].count += 1;
      map[b].totalValue += i.purchasePrice || 0;
    });

    return Object.values(map)
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 10);
  }, [activeItems]);

  // 3. SEASONALITY COVERAGE
  const seasonalityData = useMemo(() => {
    const counts: Record<string, { season: string; count: number; value: number }> = {
      Spring: { season: 'Spring', count: 0, value: 0 },
      Summer: { season: 'Summer', count: 0, value: 0 },
      Autumn: { season: 'Autumn', count: 0, value: 0 },
      Winter: { season: 'Winter', count: 0, value: 0 },
      'All-Season': { season: 'All-Season', count: 0, value: 0 },
    };

    activeItems.forEach((i) => {
      const seasons = Array.isArray(i.season) ? i.season : [i.season];
      seasons.forEach((s) => {
        if (counts[s]) {
          counts[s].count += 1;
          counts[s].value += i.purchasePrice || 0;
        }
      });
    });

    return Object.values(counts);
  }, [activeItems]);

  // 4. WEAR FREQUENCY HISTOGRAM
  const wearFrequencyBins = useMemo(() => {
    const bins = [
      { range: '0 Wears (Unworn)', count: 0, value: 0 },
      { range: '1-3 Wears', count: 0, value: 0 },
      { range: '4-10 Wears', count: 0, value: 0 },
      { range: '11-25 Wears', count: 0, value: 0 },
      { range: '25+ Wears (Staples)', count: 0, value: 0 },
    ];

    activeItems.forEach((i) => {
      const wears = i.wearCount || 0;
      const val = i.purchasePrice || 0;
      if (wears === 0) {
        bins[0].count += 1;
        bins[0].value += val;
      } else if (wears <= 3) {
        bins[1].count += 1;
        bins[1].value += val;
      } else if (wears <= 10) {
        bins[2].count += 1;
        bins[2].value += val;
      } else if (wears <= 25) {
        bins[3].count += 1;
        bins[3].value += val;
      } else {
        bins[4].count += 1;
        bins[4].value += val;
      }
    });

    return bins;
  }, [activeItems]);

  // 5. GARMENT CONDITION
  const conditionData = useMemo(() => {
    const map: Record<string, number> = {};
    activeItems.forEach((i) => {
      const c = i.condition || 'Pristine / New';
      map[c] = (map[c] || 0) + 1;
    });

    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [activeItems]);

  // 6. SALES & RESALE INTELLIGENCE
  const completedSales = useMemo(() => {
    return saleItems.filter((s) => s.status === 'Sold' || s.status === 'Shipped' || s.status === 'Completed');
  }, [saleItems]);

  const salesTimelineData = useMemo(() => {
    const monthlyMap: Record<string, { month: string; revenue: number; profit: number; fees: number; count: number }> = {};

    completedSales.forEach((s) => {
      const dateStr = s.soldDate || s.updatedAt || new Date().toISOString();
      const monthKey = dateStr.substring(0, 7); // e.g. 2026-08
      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = { month: monthKey, revenue: 0, profit: 0, fees: 0, count: 0 };
      }
      const price = s.soldPrice !== undefined ? s.soldPrice : s.listingPrice || 0;
      const fees = (s.platformFees || 0) + (s.shippingCostPaidBySeller || 0);
      const profit = price - (s.originalPricePaid || 0) - fees;

      monthlyMap[monthKey].revenue += price;
      monthlyMap[monthKey].fees += fees;
      monthlyMap[monthKey].profit += profit;
      monthlyMap[monthKey].count += 1;
    });

    return Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month));
  }, [completedSales]);

  // Platform breakdown
  const platformComparisonData = useMemo(() => {
    const map: Record<string, { platform: string; count: number; revenue: number; netProfit: number; avgPrice: number }> = {};

    saleItems.forEach((s) => {
      const p = s.platform || 'Other';
      if (!map[p]) {
        map[p] = { platform: p, count: 0, revenue: 0, netProfit: 0, avgPrice: 0 };
      }
      map[p].count += 1;
      const price = s.soldPrice !== undefined ? s.soldPrice : s.listingPrice || 0;
      const profit = price - (s.originalPricePaid || 0) - (s.platformFees || 0);
      map[p].revenue += price;
      map[p].netProfit += profit;
    });

    return Object.values(map).map((item) => ({
      ...item,
      avgPrice: item.count > 0 ? Math.round(item.revenue / item.count) : 0,
    }));
  }, [saleItems]);

  // Resale status funnel
  const saleStatusFunnel = useMemo(() => {
    const statuses = ['Draft', 'Listed', 'Reserved', 'Sold', 'Shipped', 'Completed'];
    return statuses.map((status) => ({
      status,
      count: saleItems.filter((s) => s.status === status).length,
      value: saleItems
        .filter((s) => s.status === status)
        .reduce((sum, s) => sum + (s.soldPrice !== undefined ? s.soldPrice : s.listingPrice || 0), 0),
    }));
  }, [saleItems]);

  // 7. PURCHASES & BUDGET ANALYTICS
  const shoppingPriorityData = useMemo(() => {
    const map: Record<string, { priority: string; count: number; totalCost: number }> = {
      'Essential / Must-Have': { priority: 'Essential', count: 0, totalCost: 0 },
      High: { priority: 'High', count: 0, totalCost: 0 },
      Medium: { priority: 'Medium', count: 0, totalCost: 0 },
      'Low / Wishlist': { priority: 'Low / Wishlist', count: 0, totalCost: 0 },
    };

    shoppingList.forEach((s) => {
      const p = s.priority || 'Medium';
      if (map[p]) {
        map[p].count += 1;
        map[p].totalCost += s.estimatedPrice || 0;
      }
    });

    return Object.values(map);
  }, [shoppingList]);

  const shoppingStatusData = useMemo(() => {
    const map: Record<string, { status: string; count: number; value: number }> = {};
    shoppingList.forEach((s) => {
      const st = s.status || 'Researching';
      if (!map[st]) map[st] = { status: st, count: 0, value: 0 };
      map[st].count += 1;
      map[st].value += s.estimatedPrice || 0;
    });
    return Object.values(map);
  }, [shoppingList]);

  const retailerSourcingData = useMemo(() => {
    const map: Record<string, { retailer: string; count: number; totalSpent: number }> = {};
    shoppingList.forEach((s) => {
      const r = s.retailerName || 'Unspecified';
      if (!map[r]) map[r] = { retailer: r, count: 0, totalSpent: 0 };
      map[r].count += 1;
      map[r].totalSpent += s.estimatedPrice || 0;
    });
    return Object.values(map).sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 8);
  }, [shoppingList]);

  // 8. STYLING & LOOKBOOK ANALYTICS
  const occasionData = useMemo(() => {
    const map: Record<string, number> = {};
    outfits.forEach((o) => {
      const occ = o.occasion || 'General';
      map[occ] = (map[occ] || 0) + 1;
    });
    return Object.entries(map).map(([name, count]) => ({ name, count }));
  }, [outfits]);

  // Core Anchor Pieces (Top 8 items worn across most outfits)
  const anchorPieces = useMemo(() => {
    const frequencyMap: Record<string, number> = {};
    outfits.forEach((o) => {
      (o.itemIds || []).forEach((id) => {
        frequencyMap[id] = (frequencyMap[id] || 0) + 1;
      });
    });

    return Object.entries(frequencyMap)
      .map(([id, lookCount]) => {
        const item = items.find((i) => i.id === id);
        return {
          id,
          lookCount,
          name: item ? `${item.brand} ${item.name}` : 'Unknown piece',
          category: item?.category || '',
          price: item?.purchasePrice || 0,
        };
      })
      .sort((a, b) => b.lookCount - a.lookCount)
      .slice(0, 8);
  }, [outfits, items]);

  // 9. STRATEGIC INSIGHTS ENGINE
  const strategicInsights = useMemo(() => {
    const list: Array<{
      type: 'warning' | 'opportunity' | 'positive' | 'neutral';
      title: string;
      description: string;
      actionText?: string;
    }> = [];

    // High value idle pieces
    const highValueIdle = activeItems.filter((i) => (i.purchasePrice || 0) >= 120 && (i.wearCount || 0) <= 2);
    if (highValueIdle.length > 0) {
      list.push({
        type: 'opportunity',
        title: `${highValueIdle.length} High-Valuation Idle Pieces Detected`,
        description: `Pieces like "${highValueIdle[0].brand} ${highValueIdle[0].name}" hold significant invested capital with low wear counts. Consider styling them into new Lookbook formulas or listing on Vinted/Vestiaire.`,
        actionText: 'Review Resale or Style in Lookbook',
      });
    }

    // Category dominance alert
    if (categoryData.length > 0) {
      const topCat = categoryData[0];
      const totalWardrobeValuation = activeItems.reduce((sum, i) => sum + (i.purchasePrice || 0), 0);
      const topCatShare = totalWardrobeValuation > 0 ? (topCat.totalValuation / totalWardrobeValuation) * 100 : 0;
      if (topCatShare > 30) {
        list.push({
          type: 'neutral',
          title: `Category Dominance: ${topCat.name} (${topCatShare.toFixed(1)}% of Wardrobe Value)`,
          description: `Your wardrobe is heavily weighted towards ${topCat.name} (${sym}${topCat.totalValuation.toFixed(2)} total value). Ensure future purchases balance out lower-indexed categories.`,
        });
      }
    }

    // Resale performance
    if (completedSales.length > 0) {
      const totalSoldRev = completedSales.reduce((sum, s) => sum + (s.soldPrice !== undefined ? s.soldPrice : s.listingPrice || 0), 0);
      const totalCostBasis = completedSales.reduce((sum, s) => sum + (s.originalPricePaid || 0), 0);
      const recoveryPercent = totalCostBasis > 0 ? (totalSoldRev / totalCostBasis) * 100 : 0;
      list.push({
        type: recoveryPercent >= 70 ? 'positive' : 'neutral',
        title: `Resale Capital Recovery Rate: ${recoveryPercent.toFixed(1)}%`,
        description: `Across ${completedSales.length} realized sales, you have recovered ${sym}${totalSoldRev.toFixed(2)} from an initial ${sym}${totalCostBasis.toFixed(2)} cost basis.`,
      });
    }

    // Wishlist budget run-rate
    const activeWishlistCost = shoppingList
      .filter((s) => s.status === 'To Buy' || s.status === 'In Basket')
      .reduce((sum, s) => sum + (s.estimatedPrice || 0), 0);

    if (activeWishlistCost > monthlyBudget * 1.5) {
      list.push({
        type: 'warning',
        title: `Wishlist Pipeline Exceeds Monthly Budget`,
        description: `Active "To Buy" items total ${sym}${activeWishlistCost.toFixed(2)}, which exceeds your monthly allowance (${sym}${monthlyBudget}). Prioritize Essential items.`,
      });
    }

    return list;
  }, [activeItems, categoryData, completedSales, shoppingList, monthlyBudget, sym]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-white border border-[#E5E5E1] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-serif font-bold text-[#1A1A1A]">
              Wardrobe Analytics & Intelligence Suite
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[#1A1A1A] text-white uppercase tracking-wider">
              Live Charts
            </span>
          </div>
          <p className="text-xs text-[#767670] mt-1 font-mono">
            Interactive charts, valuation distributions, resale performance, purchase pipelines, and styling connectivity.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 bg-[#FAF9F5] p-1 border border-[#E5E5E1] overflow-x-auto w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveSection('wardrobe')}
            className={`px-3 py-1.5 text-xs font-mono cursor-pointer transition-all whitespace-nowrap ${
              activeSection === 'wardrobe'
                ? 'bg-[#1A1A1A] text-white font-bold shadow-xs'
                : 'text-[#767670] hover:text-[#1A1A1A]'
            }`}
          >
            Wardrobe & Inventory
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('sales')}
            className={`px-3 py-1.5 text-xs font-mono cursor-pointer transition-all whitespace-nowrap ${
              activeSection === 'sales'
                ? 'bg-[#1A1A1A] text-white font-bold shadow-xs'
                : 'text-[#767670] hover:text-[#1A1A1A]'
            }`}
          >
            Sales & Resale
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('purchases')}
            className={`px-3 py-1.5 text-xs font-mono cursor-pointer transition-all whitespace-nowrap ${
              activeSection === 'purchases'
                ? 'bg-[#1A1A1A] text-white font-bold shadow-xs'
                : 'text-[#767670] hover:text-[#1A1A1A]'
            }`}
          >
            Purchases & Budget
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('styling')}
            className={`px-3 py-1.5 text-xs font-mono cursor-pointer transition-all whitespace-nowrap ${
              activeSection === 'styling'
                ? 'bg-[#1A1A1A] text-white font-bold shadow-xs'
                : 'text-[#767670] hover:text-[#1A1A1A]'
            }`}
          >
            Styling & Lookbooks
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('recommendations')}
            className={`px-3 py-1.5 text-xs font-mono cursor-pointer transition-all whitespace-nowrap ${
              activeSection === 'recommendations'
                ? 'bg-[#1A1A1A] text-white font-bold shadow-xs'
                : 'text-[#767670] hover:text-[#1A1A1A]'
            }`}
          >
            Strategic Insights ({strategicInsights.length})
          </button>
        </div>
      </div>

      {/* ===================== 1. WARDROBE & INVENTORY CHARTS ===================== */}
      {activeSection === 'wardrobe' && (
        <div className="space-y-6">
          {/* Key Metrics Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-white border border-[#E5E5E1] shadow-xs">
              <div className="text-[11px] font-mono text-[#767670] uppercase tracking-wider">
                Total Wardrobe Value
              </div>
              <div className="text-xl font-serif font-bold text-[#1A1A1A] mt-1">
                {formatCurrency(activeItems.reduce((s, i) => s + (i.purchasePrice || 0), 0))}
              </div>
              <div className="text-[11px] font-mono text-[#767670] mt-0.5">
                Across {activeItems.length} active pieces
              </div>
            </div>

            <div className="p-4 bg-white border border-[#E5E5E1] shadow-xs">
              <div className="text-[11px] font-mono text-[#767670] uppercase tracking-wider">
                Average Piece Value
              </div>
              <div className="text-xl font-serif font-bold text-[#1A1A1A] mt-1">
                {formatCurrency(
                  activeItems.length > 0
                    ? activeItems.reduce((s, i) => s + (i.purchasePrice || 0), 0) / activeItems.length
                    : 0
                )}
              </div>
              <div className="text-[11px] font-mono text-[#767670] mt-0.5">Per garment investment</div>
            </div>

            <div className="p-4 bg-white border border-[#E5E5E1] shadow-xs">
              <div className="text-[11px] font-mono text-[#767670] uppercase tracking-wider">
                Total Wears Recorded
              </div>
              <div className="text-xl font-serif font-bold text-[#1A1A1A] mt-1">
                {activeItems.reduce((s, i) => s + (i.wearCount || 0), 0)} wears
              </div>
              <div className="text-[11px] font-mono text-emerald-800 mt-0.5">
                {(
                  (activeItems.filter((i) => (i.wearCount || 0) > 0).length /
                    Math.max(1, activeItems.length)) *
                  100
                ).toFixed(0)}
                % active rotation
              </div>
            </div>

            <div className="p-4 bg-white border border-[#E5E5E1] shadow-xs">
              <div className="text-[11px] font-mono text-[#767670] uppercase tracking-wider">
                Unique Brands
              </div>
              <div className="text-xl font-serif font-bold text-[#1A1A1A] mt-1">
                {brandData.length} Brands
              </div>
              <div className="text-[11px] font-mono text-[#767670] mt-0.5">
                Top: {brandData[0]?.brand || 'N/A'}
              </div>
            </div>
          </div>

          {/* Chart Grid: Category Valuation & Brand Portfolio */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Valuation Donut */}
            <div className="p-5 bg-white border border-[#E5E5E1] shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-serif font-bold text-[#1A1A1A]">
                    Valuation by Category ({sym})
                  </h3>
                  <p className="text-xs text-[#767670] font-mono">
                    Distribution of wardrobe capital across categories
                  </p>
                </div>
                <PieChartIcon className="w-4 h-4 text-[#8C7355]" />
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="totalValuation"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip currencySymbol={sym} />} />
                    <Legend
                      layout="horizontal"
                      align="center"
                      verticalAlign="bottom"
                      wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Brand Portfolio Horizontal Bar Chart */}
            <div className="p-5 bg-white border border-[#E5E5E1] shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-serif font-bold text-[#1A1A1A]">
                    Brand Portfolio Valuation
                  </h3>
                  <p className="text-xs text-[#767670] font-mono">
                    Top 10 brands by capital invested ({sym})
                  </p>
                </div>
                <BarChart3 className="w-4 h-4 text-[#8C7355]" />
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={brandData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0EFEA" />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 10, fontFamily: 'monospace', fill: '#767670' }}
                      tickFormatter={(v) => `${sym}${v}`}
                    />
                    <YAxis
                      dataKey="brand"
                      type="category"
                      width={80}
                      tick={{ fontSize: 10, fontFamily: 'monospace', fill: '#1A1A1A' }}
                    />
                    <Tooltip content={<CustomTooltip currencySymbol={sym} />} />
                    <Bar dataKey="totalValue" name="Valuation" fill="#1A1A1A" radius={[0, 2, 2, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Chart Grid: Seasonality Radar & Wear Frequency Histogram */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Seasonality Radar */}
            <div className="p-5 bg-white border border-[#E5E5E1] shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-serif font-bold text-[#1A1A1A]">
                    Seasonality Balance & Item Counts
                  </h3>
                  <p className="text-xs text-[#767670] font-mono">
                    Garment coverage across seasonal transitions
                  </p>
                </div>
                <Compass className="w-4 h-4 text-[#8C7355]" />
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={seasonalityData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0EFEA" />
                    <XAxis
                      dataKey="season"
                      tick={{ fontSize: 11, fontFamily: 'monospace', fill: '#1A1A1A' }}
                    />
                    <YAxis
                      yAxisId="left"
                      orientation="left"
                      tick={{ fontSize: 10, fontFamily: 'monospace', fill: '#767670' }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 10, fontFamily: 'monospace', fill: '#8C7355' }}
                      tickFormatter={(v) => `${sym}${v}`}
                    />
                    <Tooltip content={<CustomTooltip currencySymbol={sym} />} />
                    <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
                    <Bar yAxisId="left" dataKey="count" name="Garment Count" fill="#1A1A1A" />
                    <Bar yAxisId="right" dataKey="value" name="Valuation" fill="#8C7355" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Wear Frequency Distribution */}
            <div className="p-5 bg-white border border-[#E5E5E1] shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-serif font-bold text-[#1A1A1A]">
                    Utilization & Wear Frequency Histogram
                  </h3>
                  <p className="text-xs text-[#767670] font-mono">
                    Garments grouped by wear count milestones
                  </p>
                </div>
                <TrendingUp className="w-4 h-4 text-[#8C7355]" />
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={wearFrequencyBins} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0EFEA" />
                    <XAxis
                      dataKey="range"
                      tick={{ fontSize: 10, fontFamily: 'monospace', fill: '#1A1A1A' }}
                    />
                    <YAxis tick={{ fontSize: 10, fontFamily: 'monospace', fill: '#767670' }} />
                    <Tooltip content={<CustomTooltip currencySymbol={sym} />} />
                    <Bar dataKey="count" name="Garments" fill="#4A5568" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== 2. SALES & RESALE CHARTS ===================== */}
      {activeSection === 'sales' && (
        <div className="space-y-6">
          {/* Key Resale Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-white border border-[#E5E5E1] shadow-xs">
              <div className="text-[11px] font-mono text-[#767670] uppercase tracking-wider">
                Total Realized Revenue
              </div>
              <div className="text-xl font-serif font-bold text-[#1A1A1A] mt-1">
                {formatCurrency(
                  completedSales.reduce(
                    (s, item) => s + (item.soldPrice !== undefined ? item.soldPrice : item.listingPrice || 0),
                    0
                  )
                )}
              </div>
              <div className="text-[11px] font-mono text-emerald-800 mt-0.5">
                {completedSales.length} items successfully sold
              </div>
            </div>

            <div className="p-4 bg-white border border-[#E5E5E1] shadow-xs">
              <div className="text-[11px] font-mono text-[#767670] uppercase tracking-wider">
                Total Net Resale Profit
              </div>
              <div className="text-xl font-serif font-bold text-emerald-800 mt-1">
                {formatCurrency(
                  completedSales.reduce((sum, item) => {
                    const price = item.soldPrice !== undefined ? item.soldPrice : item.listingPrice || 0;
                    const fees = (item.platformFees || 0) + (item.shippingCostPaidBySeller || 0);
                    return sum + (price - (item.originalPricePaid || 0) - fees);
                  }, 0)
                )}
              </div>
              <div className="text-[11px] font-mono text-[#767670] mt-0.5">After fees & shipping</div>
            </div>

            <div className="p-4 bg-white border border-[#E5E5E1] shadow-xs">
              <div className="text-[11px] font-mono text-[#767670] uppercase tracking-wider">
                Active Listings Portfolio
              </div>
              <div className="text-xl font-serif font-bold text-[#1A1A1A] mt-1">
                {formatCurrency(
                  saleItems
                    .filter((s) => s.status === 'Listed' || s.status === 'Reserved')
                    .reduce((sum, s) => sum + (s.listingPrice || 0), 0)
                )}
              </div>
              <div className="text-[11px] font-mono text-[#767670] mt-0.5">
                {saleItems.filter((s) => s.status === 'Listed' || s.status === 'Reserved').length} listed pieces
              </div>
            </div>

            <div className="p-4 bg-white border border-[#E5E5E1] shadow-xs">
              <div className="text-[11px] font-mono text-[#767670] uppercase tracking-wider">
                Average Sale Price
              </div>
              <div className="text-xl font-serif font-bold text-[#1A1A1A] mt-1">
                {formatCurrency(
                  completedSales.length > 0
                    ? completedSales.reduce(
                        (s, item) => s + (item.soldPrice !== undefined ? item.soldPrice : item.listingPrice || 0),
                        0
                      ) / completedSales.length
                    : 0
                )}
              </div>
              <div className="text-[11px] font-mono text-[#767670] mt-0.5">Per sold garment</div>
            </div>
          </div>

          {/* Sales Revenue Timeline Area Chart */}
          <div className="p-5 bg-white border border-[#E5E5E1] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-serif font-bold text-[#1A1A1A]">
                  Monthly Realized Resale Revenue & Profit Realization
                </h3>
                <p className="text-xs text-[#767670] font-mono">
                  Track monthly cash flow recovered from rotating wardrobe inventory
                </p>
              </div>
              <DollarSign className="w-4 h-4 text-[#8C7355]" />
            </div>

            {salesTimelineData.length === 0 ? (
              <div className="text-center py-12 text-xs font-mono text-[#767670]">
                No completed sales recorded yet. Mark items as sold to see monthly cash flow trends.
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesTimelineData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0EFEA" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fontFamily: 'monospace', fill: '#1A1A1A' }} />
                    <YAxis
                      tick={{ fontSize: 10, fontFamily: 'monospace', fill: '#767670' }}
                      tickFormatter={(v) => `${sym}${v}`}
                    />
                    <Tooltip content={<CustomTooltip currencySymbol={sym} />} />
                    <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      name="Gross Revenue"
                      stroke="#1A1A1A"
                      fill="#E5E5E1"
                    />
                    <Area
                      type="monotone"
                      dataKey="profit"
                      name="Net Resale Profit"
                      stroke="#2C7A7B"
                      fill="#E6FFFA"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Platform Performance & Status Funnel */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Platform Comparison */}
            <div className="p-5 bg-white border border-[#E5E5E1] shadow-xs space-y-4">
              <div>
                <h3 className="text-sm font-serif font-bold text-[#1A1A1A]">
                  Marketplace Platform Performance
                </h3>
                <p className="text-xs text-[#767670] font-mono">
                  Comparing revenue generated across Vinted, eBay, Vestiaire, Depop
                </p>
              </div>

              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={platformComparisonData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0EFEA" />
                    <XAxis
                      dataKey="platform"
                      tick={{ fontSize: 10, fontFamily: 'monospace', fill: '#1A1A1A' }}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fontFamily: 'monospace', fill: '#767670' }}
                      tickFormatter={(v) => `${sym}${v}`}
                    />
                    <Tooltip content={<CustomTooltip currencySymbol={sym} />} />
                    <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
                    <Bar dataKey="revenue" name="Total Revenue" fill="#1A1A1A" />
                    <Bar dataKey="netProfit" name="Net Profit" fill="#8C7355" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Listing Status Funnel */}
            <div className="p-5 bg-white border border-[#E5E5E1] shadow-xs space-y-4">
              <div>
                <h3 className="text-sm font-serif font-bold text-[#1A1A1A]">
                  Resale Pipeline Volume
                </h3>
                <p className="text-xs text-[#767670] font-mono">
                  Item counts at each stage of the listing lifecycle
                </p>
              </div>

              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={saleStatusFunnel} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0EFEA" />
                    <XAxis type="number" tick={{ fontSize: 10, fontFamily: 'monospace', fill: '#767670' }} />
                    <YAxis
                      dataKey="status"
                      type="category"
                      width={80}
                      tick={{ fontSize: 10, fontFamily: 'monospace', fill: '#1A1A1A' }}
                    />
                    <Tooltip content={<CustomTooltip currencySymbol={sym} />} />
                    <Bar dataKey="count" name="Item Count" fill="#2B6CB0" radius={[0, 2, 2, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== 3. PURCHASES & BUDGET CHARTS ===================== */}
      {activeSection === 'purchases' && (
        <div className="space-y-6">
          {/* Key Purchase Metrics Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-white border border-[#E5E5E1] shadow-xs">
              <div className="text-[11px] font-mono text-[#767670] uppercase tracking-wider">
                Monthly Budget
              </div>
              <div className="text-xl font-serif font-bold text-[#1A1A1A] mt-1">
                {formatCurrency(monthlyBudget)}
              </div>
              <div className="text-[11px] font-mono text-[#767670] mt-0.5">Target spend limit</div>
            </div>

            <div className="p-4 bg-white border border-[#E5E5E1] shadow-xs">
              <div className="text-[11px] font-mono text-[#767670] uppercase tracking-wider">
                Spent This Month
              </div>
              <div className="text-xl font-serif font-bold text-[#1A1A1A] mt-1">
                {formatCurrency(spentThisMonth)}
              </div>
              <div
                className={`text-[11px] font-mono mt-0.5 ${
                  spentThisMonth > monthlyBudget ? 'text-rose-700 font-bold' : 'text-emerald-800'
                }`}
              >
                {((spentThisMonth / Math.max(1, monthlyBudget)) * 100).toFixed(0)}% of monthly budget
              </div>
            </div>

            <div className="p-4 bg-white border border-[#E5E5E1] shadow-xs">
              <div className="text-[11px] font-mono text-[#767670] uppercase tracking-wider">
                Total Wishlist Pipeline
              </div>
              <div className="text-xl font-serif font-bold text-[#1A1A1A] mt-1">
                {formatCurrency(shoppingList.reduce((s, item) => s + (item.estimatedPrice || 0), 0))}
              </div>
              <div className="text-[11px] font-mono text-[#767670] mt-0.5">
                {shoppingList.length} items planned
              </div>
            </div>

            <div className="p-4 bg-white border border-[#E5E5E1] shadow-xs">
              <div className="text-[11px] font-mono text-[#767670] uppercase tracking-wider">
                Essential Items Pipeline
              </div>
              <div className="text-xl font-serif font-bold text-[#8C7355] mt-1">
                {formatCurrency(
                  shoppingList
                    .filter((s) => s.priority === 'Essential / Must-Have')
                    .reduce((sum, s) => sum + (s.estimatedPrice || 0), 0)
                )}
              </div>
              <div className="text-[11px] font-mono text-[#767670] mt-0.5">Top-priority wardrobe gaps</div>
            </div>
          </div>

          {/* Shopping Pipeline Priority Breakdown & Retailers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Priority Funnel */}
            <div className="p-5 bg-white border border-[#E5E5E1] shadow-xs space-y-4">
              <div>
                <h3 className="text-sm font-serif font-bold text-[#1A1A1A]">
                  Planned Expenditure by Priority Level ({sym})
                </h3>
                <p className="text-xs text-[#767670] font-mono">
                  Essential vs High vs Medium vs Wishlist allocations
                </p>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={shoppingPriorityData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0EFEA" />
                    <XAxis
                      dataKey="priority"
                      tick={{ fontSize: 10, fontFamily: 'monospace', fill: '#1A1A1A' }}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fontFamily: 'monospace', fill: '#767670' }}
                      tickFormatter={(v) => `${sym}${v}`}
                    />
                    <Tooltip content={<CustomTooltip currencySymbol={sym} />} />
                    <Bar dataKey="totalCost" name="Estimated Cost" fill="#1A1A1A" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Retailer Sourcing */}
            <div className="p-5 bg-white border border-[#E5E5E1] shadow-xs space-y-4">
              <div>
                <h3 className="text-sm font-serif font-bold text-[#1A1A1A]">
                  Retailer & Store Sourcing Pipeline
                </h3>
                <p className="text-xs text-[#767670] font-mono">
                  Where planned wardrobe investments are being allocated
                </p>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={retailerSourcingData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0EFEA" />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 10, fontFamily: 'monospace', fill: '#767670' }}
                      tickFormatter={(v) => `${sym}${v}`}
                    />
                    <YAxis
                      dataKey="retailer"
                      type="category"
                      width={80}
                      tick={{ fontSize: 10, fontFamily: 'monospace', fill: '#1A1A1A' }}
                    />
                    <Tooltip content={<CustomTooltip currencySymbol={sym} />} />
                    <Bar dataKey="totalSpent" name="Estimated Spend" fill="#8C7355" radius={[0, 2, 2, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== 4. STYLING & LOOKBOOK CHARTS ===================== */}
      {activeSection === 'styling' && (
        <div className="space-y-6">
          {/* Key Styling Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-white border border-[#E5E5E1] shadow-xs">
              <div className="text-[11px] font-mono text-[#767670] uppercase tracking-wider">
                Total Saved Looks
              </div>
              <div className="text-xl font-serif font-bold text-[#1A1A1A] mt-1">
                {outfits.length} Outfits
              </div>
              <div className="text-[11px] font-mono text-[#767670] mt-0.5">Styled formula catalog</div>
            </div>

            <div className="p-4 bg-white border border-[#E5E5E1] shadow-xs">
              <div className="text-[11px] font-mono text-[#767670] uppercase tracking-wider">
                Average Pieces Per Look
              </div>
              <div className="text-xl font-serif font-bold text-[#1A1A1A] mt-1">
                {outfits.length > 0
                  ? (
                      outfits.reduce((s, o) => s + (o.itemIds?.length || 0), 0) / outfits.length
                    ).toFixed(1)
                  : 0}{' '}
                pieces
              </div>
              <div className="text-[11px] font-mono text-[#767670] mt-0.5">Capsule modularity</div>
            </div>

            <div className="p-4 bg-white border border-[#E5E5E1] shadow-xs">
              <div className="text-[11px] font-mono text-[#767670] uppercase tracking-wider">
                Capsule Utilization
              </div>
              <div className="text-xl font-serif font-bold text-emerald-800 mt-1">
                {(
                  (anchorPieces.length / Math.max(1, activeItems.length)) *
                  100
                ).toFixed(0)}
                %
              </div>
              <div className="text-[11px] font-mono text-[#767670] mt-0.5">Items styled into outfits</div>
            </div>

            <div className="p-4 bg-white border border-[#E5E5E1] shadow-xs">
              <div className="text-[11px] font-mono text-[#767670] uppercase tracking-wider">
                Top Anchor Piece
              </div>
              <div className="text-sm font-serif font-bold text-[#1A1A1A] mt-1 truncate">
                {anchorPieces[0]?.name || 'N/A'}
              </div>
              <div className="text-[11px] font-mono text-[#767670] mt-0.5">
                Styled into {anchorPieces[0]?.lookCount || 0} looks
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Occasion Distribution */}
            <div className="p-5 bg-white border border-[#E5E5E1] shadow-xs space-y-4">
              <div>
                <h3 className="text-sm font-serif font-bold text-[#1A1A1A]">
                  Outfits by Occasion
                </h3>
                <p className="text-xs text-[#767670] font-mono">
                  Formula coverage across daily lifestyle settings
                </p>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={occasionData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0EFEA" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10, fontFamily: 'monospace', fill: '#1A1A1A' }}
                    />
                    <YAxis tick={{ fontSize: 10, fontFamily: 'monospace', fill: '#767670' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Outfits" fill="#1A1A1A" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Core Anchor Pieces Table */}
            <div className="p-5 bg-white border border-[#E5E5E1] shadow-xs space-y-4">
              <div>
                <h3 className="text-sm font-serif font-bold text-[#1A1A1A]">
                  Top Core Anchor Pieces
                </h3>
                <p className="text-xs text-[#767670] font-mono">
                  Garments providing maximum styling versatility across your lookbooks
                </p>
              </div>

              <div className="border border-[#E5E5E1] divide-y divide-[#E5E5E1] max-h-60 overflow-y-auto">
                {anchorPieces.map((piece, idx) => (
                  <div
                    key={piece.id}
                    className="flex items-center justify-between p-2.5 bg-white hover:bg-[#FAF9F5] text-xs font-mono"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 flex items-center justify-center bg-[#FAF9F5] border border-[#E5E5E1] text-[10px] font-bold text-[#767670]">
                        #{idx + 1}
                      </span>
                      <div>
                        <div className="font-bold text-[#1A1A1A]">{piece.name}</div>
                        <div className="text-[10px] text-[#767670]">{piece.category}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-[#8C7355]">{piece.lookCount} Looks</div>
                      <div className="text-[10px] text-[#767670]">{formatCurrency(piece.price)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== 5. STRATEGIC INSIGHTS & GAP ALERTS ===================== */}
      {activeSection === 'recommendations' && (
        <div className="space-y-4">
          <div className="p-4 bg-white border border-[#E5E5E1] shadow-xs">
            <h3 className="text-sm font-serif font-bold text-[#1A1A1A]">
              Automated Wardrobe Audit & Portfolio Insights
            </h3>
            <p className="text-xs text-[#767670] font-mono mt-0.5">
              Actionable insights generated from garment wear counts, capital allocations, and resale velocity.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {strategicInsights.map((insight, idx) => {
              const borderCol =
                insight.type === 'opportunity'
                  ? 'border-amber-400 bg-amber-50/60 text-amber-950'
                  : insight.type === 'warning'
                  ? 'border-rose-400 bg-rose-50/60 text-rose-950'
                  : insight.type === 'positive'
                  ? 'border-emerald-400 bg-emerald-50/60 text-emerald-950'
                  : 'border-[#CCCCCC] bg-white text-[#1A1A1A]';

              const icon =
                insight.type === 'opportunity' ? (
                  <Sparkles className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
                ) : insight.type === 'warning' ? (
                  <AlertCircle className="w-4 h-4 text-rose-700 mt-0.5 shrink-0" />
                ) : insight.type === 'positive' ? (
                  <CheckCircle className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
                ) : (
                  <HelpCircle className="w-4 h-4 text-[#8C7355] mt-0.5 shrink-0" />
                );

              return (
                <div key={idx} className={`p-4 border ${borderCol} shadow-xs flex items-start gap-3`}>
                  {icon}
                  <div className="flex-1 space-y-1">
                    <h4 className="text-xs font-mono font-bold">{insight.title}</h4>
                    <p className="text-xs opacity-90 leading-relaxed font-sans">{insight.description}</p>
                    {insight.actionText && (
                      <div className="pt-1">
                        <span className="text-[11px] font-mono font-semibold underline cursor-pointer">
                          → {insight.actionText}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

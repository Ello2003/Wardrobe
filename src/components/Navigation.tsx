import React from 'react';
import {
  Sparkles,
  Shirt,
  Layers,
  ShoppingBag,
  History,
  TrendingUp,
  Plus,
  Search,
  PoundSterling,
  DollarSign,
  Tag,
  BarChart3,
  Settings,
  Undo2,
} from 'lucide-react';
import { useWardrobe } from '../context/WardrobeContext';

interface NavigationProps {
  onOpenAddItem: () => void;
  onOpenCreateLook: () => void;
  onOpenAIStylist: () => void;
  onOpenCreateSnapshot: () => void;
  onOpenSettings: () => void;
  onOpenDuplicateMerge: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  onOpenAddItem,
  onOpenCreateLook,
  onOpenAIStylist,
  onOpenCreateSnapshot,
  onOpenSettings,
  onOpenDuplicateMerge,
}) => {
  const {
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    currentVersion,
    stats,
    items,
    shoppingList,
    saleItems,
    undoLastAction,
    canUndo,
    undoToast,
  } = useWardrobe();

  const tabs = [
    { id: 'dashboard', label: 'Overview', icon: TrendingUp },
    {
      id: 'wardrobe',
      label: 'Inventory',
      icon: Shirt,
      badge: items.length.toString(),
    },
    {
      id: 'shopping',
      label: 'Purchases',
      icon: ShoppingBag,
      badge: shoppingList.filter((s) => s.status !== 'Purchased').length.toString(),
    },
    {
      id: 'selling',
      label: 'Sales & Resale',
      icon: DollarSign,
      badge: saleItems.filter((s) => s.status === 'Listed' || s.status === 'Reserved').length.toString(),
    },
    {
      id: 'analytics',
      label: 'Analytics & Charts',
      icon: BarChart3,
    },
    {
      id: 'lookbook',
      label: 'Lookbook & Outfits',
      icon: Layers,
      badge: stats.totalOutfitsCount.toString(),
    },
    { id: 'trends', label: 'Trend Research', icon: Sparkles },
    {
      id: 'history',
      label: 'Audit & Versions',
      icon: History,
    },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E5E5E1] text-[#1A1A1A]">
      {/* Top Banner / Brand & Action Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 gap-4">
          {/* Logo & Identity */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#8C7355] flex items-center justify-center shadow-xs text-white">
              <Shirt className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-serif tracking-tight text-base font-semibold text-[#1A1A1A]">
                  Inventory | Purchases | Sales
                </span>
                <span className="inline-flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#F3F2EE] text-[#8C7355] border border-[#E5E5E1] font-semibold">
                  <PoundSterling className="w-2.5 h-2.5" /> GBP
                </span>
              </div>
              <p className="text-[10px] text-[#767670] font-sans tracking-tight">
                Curated Closet • Lookbook Studio • Resale &amp; P&amp;L Intelligence
              </p>
            </div>
          </div>

          {/* Search bar */}
          <div className="hidden md:flex items-center flex-1 max-w-xs relative">
            <Search className="w-3.5 h-3.5 text-[#9A9A95] absolute left-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search inventory, purchases, sales..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1 text-xs bg-[#F8F7F4] border border-[#E5E5E1] rounded-md text-[#1A1A1A] placeholder-[#9A9A95] focus:outline-none focus:ring-1 focus:ring-[#8C7355] focus:border-[#8C7355] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 text-[#9A9A95] hover:text-[#1A1A1A] text-xs font-bold"
              >
                ×
              </button>
            )}
          </div>

          {/* Primary Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => undoLastAction()}
              disabled={!canUndo}
              id="nav-undo-btn"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border shadow-xs transition-all ${
                canUndo
                  ? 'bg-white hover:bg-[#F3F2EE] text-[#1A1A1A] border-[#E5E5E1] cursor-pointer hover:border-[#8C7355]'
                  : 'bg-[#F8F7F4] text-[#A0A09A] border-[#E5E5E1]/60 cursor-not-allowed opacity-60'
              }`}
              title={canUndo ? 'Undo last change (Ctrl+Z)' : 'No recent actions to undo'}
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Undo</span>
            </button>

            <button
              onClick={onOpenDuplicateMerge}
              id="nav-merge-duplicates-btn"
              className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md bg-white hover:bg-[#F3F2EE] text-[#8C7355] border border-[#8C7355]/40 shadow-xs transition-all cursor-pointer"
              title="Detect and merge duplicates throughout the entire site"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Merge Duplicates</span>
            </button>

            <button
              onClick={onOpenAIStylist}
              id="nav-ai-stylist-btn"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-[#8C7355] hover:bg-[#786248] text-white shadow-xs transition-all cursor-pointer"
              title="Open AI Personal Stylist & Gap Advisor"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-200" />
              <span className="hidden sm:inline">AI Stylist</span>
            </button>

            <button
              onClick={onOpenAddItem}
              id="nav-add-item-btn"
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md bg-white hover:bg-[#F3F2EE] text-[#1A1A1A] border border-[#E5E5E1] shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#767670]" />
              <span className="hidden sm:inline">Add Item</span>
            </button>

            <button
              onClick={onOpenSettings}
              id="nav-settings-btn"
              className="p-1.5 text-[#767670] hover:text-[#1A1A1A] hover:bg-[#F3F2EE] rounded-md border border-[#E5E5E1] transition-all cursor-pointer"
              title="Customizable Settings & Taxonomy Manager"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex space-x-1 overflow-x-auto no-scrollbar py-1.5 border-t border-[#E5E5E1]">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-btn-${tab.id}`}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#1A1A1A] text-white shadow-xs font-semibold'
                    : 'text-[#5A5A55] hover:text-[#1A1A1A] hover:bg-[#F3F2EE]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-300' : 'text-[#767670]'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full ${
                      isActive
                        ? 'bg-stone-700 text-amber-200'
                        : 'bg-[#E5E5E1] text-[#5A5A55]'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};


import {
  BarChart3,
  History,
  Layers,
  Plus,
  PoundSterling,
  Search,
  Settings,
  Shirt,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Undo2,
  Wrench,
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

const tabs = [
  { id: 'dashboard', label: 'Overview', icon: TrendingUp },
  { id: 'wardrobe', label: 'Wardrobe', icon: Shirt, countKey: 'items' },
  { id: 'shopping', label: 'Shopping', icon: ShoppingBag, countKey: 'shoppingList' },
  { id: 'selling', label: 'Selling', icon: PoundSterling, countKey: 'saleItems' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'lookbook', label: 'Lookbook', icon: Layers, countKey: 'outfits' },
  { id: 'trends', label: 'Trends', icon: Sparkles },
  { id: 'tools', label: 'Tools', icon: Wrench },
] as const;

export const Navigation = ({
  onOpenAddItem,
  onOpenCreateLook,
  onOpenAIStylist,
  onOpenCreateSnapshot,
  onOpenSettings,
  onOpenDuplicateMerge,
}: NavigationProps) => {
  const {
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    stats,
    items,
    shoppingList,
    saleItems,
    undoLastAction,
    canUndo,
  } = useWardrobe();

  const counts = {
    items: items.length,
    shoppingList: shoppingList.length,
    saleItems: saleItems.length,
    outfits: stats.totalOutfitsCount,
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[#E5E5E1] bg-white/95 text-[#1A1A1A] backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#8C7355] text-white shadow-xs">
              <Shirt className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-serif text-base font-semibold tracking-tight">Wardrobe &amp; Style Studio</span>
                <span className="inline-flex items-center gap-0.5 rounded border border-[#E5E5E1] bg-[#F3F2EE] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#8C7355]">
                  <PoundSterling className="h-2.5 w-2.5" /> GBP
                </span>
              </div>
              <p className="font-sans text-[10px] tracking-tight text-[#767670]">
                Wardrobe, lookbook, shopping, selling and style analytics.
              </p>
            </div>
          </div>

          <div className="relative hidden max-w-xs flex-1 md:flex">
            <Search className="pointer-events-none absolute left-2.5 top-2 w-3.5 h-3.5 text-[#9A9A95]" />
            <input
              type="search"
              aria-label="Search wardrobe"
              placeholder="Search wardrobe, shopping or selling..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full rounded-md border border-[#E5E5E1] bg-[#F8F7F4] py-1 pl-8 pr-7 text-xs text-[#1A1A1A] placeholder-[#9A9A95] transition-all focus:border-[#8C7355] focus:outline-none focus:ring-1 focus:ring-[#8C7355]"
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 text-xs font-bold text-[#9A9A95] hover:text-[#1A1A1A]"
              >
                ×
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={undoLastAction}
              disabled={!canUndo}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#E5E5E1] bg-white px-2.5 py-1.5 text-xs font-medium shadow-xs transition-all hover:bg-[#F3F2EE] disabled:cursor-not-allowed disabled:opacity-50"
              title={canUndo ? 'Undo last change (Ctrl+Z)' : 'No recent changes to undo'}
            >
              <Undo2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Undo</span>
            </button>
            <button
              type="button"
              onClick={onOpenAIStylist}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#8C7355] px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-all hover:bg-[#786248]"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-200" />
              <span className="hidden sm:inline">AI Stylist</span>
            </button>
            <button
              type="button"
              onClick={onOpenAddItem}
              className="inline-flex items-center gap-1 rounded-md border border-[#E5E5E1] bg-white px-3 py-1.5 text-xs font-semibold shadow-xs transition-all hover:bg-[#F3F2EE]"
            >
              <Plus className="h-3.5 w-3.5 text-[#767670]" />
              <span className="hidden sm:inline">Add Item</span>
            </button>
            <button
              type="button"
              onClick={onOpenSettings}
              aria-label="Open settings"
              className="rounded-md border border-[#E5E5E1] p-1.5 text-[#767670] transition-all hover:bg-[#F3F2EE] hover:text-[#1A1A1A]"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>

        <nav aria-label="Primary navigation" className="flex space-x-1 overflow-x-auto border-t border-[#E5E5E1] py-1.5 no-scrollbar">
          {tabs.map(({ id, label, icon: Icon, countKey }) => {
            const isActive = activeTab === id || (id === 'tools' && activeTab === 'history');
            const count = countKey ? counts[countKey] : undefined;

            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-[#1A1A1A] font-semibold text-white shadow-xs'
                    : 'text-[#5A5A55] hover:bg-[#F3F2EE] hover:text-[#1A1A1A]'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-amber-300' : 'text-[#767670]'}`} />
                <span>{label}</span>
                {count !== undefined && (
                  <span className={`rounded-full px-1.5 py-0.2 font-mono text-[9px] ${isActive ? 'bg-stone-700 text-amber-200' : 'bg-[#E5E5E1] text-[#5A5A55]'}`}>
                    {count}
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

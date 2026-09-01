import React, { useState, useEffect } from 'react'; 
import { WardrobeProvider, useWardrobe } from './context/WardrobeContext';
import { Navigation } from './components/Navigation';
import { DashboardView } from './components/DashboardView';
import { WardrobeView } from './components/WardrobeView';
import { LookbookView } from './components/LookbookView';
import { ShoppingView } from './components/ShoppingView';
import { SellingView } from './components/SellingView';
import { AnalyticsChartsView } from './components/AnalyticsChartsView';
import { TrendResearchView } from './components/TrendResearchView';
import { VersionHistoryView } from './components/VersionHistoryView';
import { ItemDetailModal } from './components/ItemDetailModal';
import { ItemFormModal } from './components/ItemFormModal';
import { OutfitFormModal } from './components/OutfitFormModal';
import { ShoppingFormModal } from './components/ShoppingFormModal';
import { CreateSnapshotModal } from './components/CreateSnapshotModal';
import { AIStylistModal } from './components/AIStylistModal';
import { SettingsModal } from './components/SettingsModal';
import { DuplicateMergeModal } from './components/DuplicateMergeModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { WardrobeItem, LookbookOutfit, ShoppingItem } from './types';
import { PoundSterling, Sparkles, ShieldCheck, History, Settings, Undo2, X } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    currentVersion,
    stats,
    clearDatabase,
    undoLastAction,
    canUndo,
    undoToast,
    dismissUndoToast,
  } = useWardrobe();

  // Ensure browser title is explicitly set
  useEffect(() => {
    document.title = 'Inventory | Purchases | Sales';
  }, []);

  // Global Ctrl+Z / Cmd+Z Undo shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is actively typing in an input, textarea or contenteditable element
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || (document.activeElement as HTMLElement)?.isContentEditable) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        if (canUndo) {
          e.preventDefault();
          undoLastAction();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, undoLastAction]);

  // Modals state
  const [selectedDetailItem, setSelectedDetailItem] = useState<WardrobeItem | null>(null);
  const [isItemFormOpen, setIsItemFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WardrobeItem | null>(null);

  const [isOutfitFormOpen, setIsOutfitFormOpen] = useState(false);
  const [editingOutfit, setEditingOutfit] = useState<LookbookOutfit | null>(null);

  const [isShoppingFormOpen, setIsShoppingFormOpen] = useState(false);
  const [editingShoppingItem, setEditingShoppingItem] = useState<ShoppingItem | null>(null);

  const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState(false);
  const [isAIStylistOpen, setIsAIStylistOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDuplicateMergeOpen, setIsDuplicateMergeOpen] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);

  const formatGbp = (val: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: val % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  return (
    <div className="min-h-screen bg-[#F8F7F4] text-[#1A1A1A] flex flex-col font-sans selection:bg-[#8C7355] selection:text-white">
      {/* Top Main Navigation */}
      <Navigation
        onOpenAddItem={() => {
          setEditingItem(null);
          setIsItemFormOpen(true);
        }}
        onOpenCreateLook={() => {
          setEditingOutfit(null);
          setIsOutfitFormOpen(true);
        }}
        onOpenAIStylist={() => setIsAIStylistOpen(true)}
        onOpenCreateSnapshot={() => setIsSnapshotModalOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenDuplicateMerge={() => setIsDuplicateMergeOpen(true)}
      />

      {/* Main App Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            onOpenAddItem={() => {
              setEditingItem(null);
              setIsItemFormOpen(true);
            }}
            onOpenCreateLook={() => {
              setEditingOutfit(null);
              setIsOutfitFormOpen(true);
            }}
            onOpenAIStylist={() => setIsAIStylistOpen(true)}
            onSelectItem={(item) => setSelectedDetailItem(item)}
          />
        )}

        {activeTab === 'wardrobe' && (
          <WardrobeView
            onOpenAddItem={() => {
              setEditingItem(null);
              setIsItemFormOpen(true);
            }}
            onSelectItem={(item) => setSelectedDetailItem(item)}
            onEditItem={(item) => {
              setEditingItem(item);
              setIsItemFormOpen(true);
            }}
          />
        )}

        {activeTab === 'lookbook' && (
          <LookbookView
            onOpenCreateLook={() => {
              setEditingOutfit(null);
              setIsOutfitFormOpen(true);
            }}
            onEditLook={(outfit) => {
              setEditingOutfit(outfit);
              setIsOutfitFormOpen(true);
            }}
            onSelectItem={(item) => setSelectedDetailItem(item)}
          />
        )}

        {activeTab === 'shopping' && (
          <ShoppingView
            onOpenAddShoppingItem={() => {
              setEditingShoppingItem(null);
              setIsShoppingFormOpen(true);
            }}
            onEditShoppingItem={(sItem) => {
              setEditingShoppingItem(sItem);
              setIsShoppingFormOpen(true);
            }}
          />
        )}

        {activeTab === 'selling' && <SellingView />}

        {activeTab === 'analytics' && (
          <AnalyticsChartsView
            onOpenAddItem={() => {
              setEditingItem(null);
              setIsItemFormOpen(true);
            }}
          />
        )}

        {activeTab === 'trends' && (
          <TrendResearchView onOpenAIStylist={() => setIsAIStylistOpen(true)} />
        )}

        {activeTab === 'history' && (
          <VersionHistoryView
            onOpenCreateSnapshot={() => setIsSnapshotModalOpen(true)}
          />
        )}
      </main>

      {/* Persistent Global Modals */}
      <ErrorBoundary isModal onClose={() => setSelectedDetailItem(null)}>
        <ItemDetailModal
          item={selectedDetailItem}
          onClose={() => setSelectedDetailItem(null)}
          onEdit={(item) => {
            setEditingItem(item);
            setIsItemFormOpen(true);
          }}
        />
      </ErrorBoundary>

      <ErrorBoundary
        isModal
        fallbackTitle="Could not display wardrobe editor"
        onClose={() => {
          setIsItemFormOpen(false);
          setEditingItem(null);
        }}
      >
        <ItemFormModal
          isOpen={isItemFormOpen}
          onClose={() => {
            setIsItemFormOpen(false);
            setEditingItem(null);
          }}
          initialItem={editingItem}
        />
      </ErrorBoundary>

      <ErrorBoundary
        isModal
        fallbackTitle="Could not display lookbook outfit editor"
        onClose={() => {
          setIsOutfitFormOpen(false);
          setEditingOutfit(null);
        }}
      >
        <OutfitFormModal
          isOpen={isOutfitFormOpen}
          onClose={() => {
            setIsOutfitFormOpen(false);
            setEditingOutfit(null);
          }}
          initialOutfit={editingOutfit}
        />
      </ErrorBoundary>

      <ErrorBoundary
        isModal
        fallbackTitle="Could not display purchases editor"
        onClose={() => {
          setIsShoppingFormOpen(false);
          setEditingShoppingItem(null);
        }}
      >
        <ShoppingFormModal
          isOpen={isShoppingFormOpen}
          onClose={() => {
            setIsShoppingFormOpen(false);
            setEditingShoppingItem(null);
          }}
          initialItem={editingShoppingItem}
        />
      </ErrorBoundary>

      <ErrorBoundary isModal onClose={() => setIsSnapshotModalOpen(false)}>
        <CreateSnapshotModal
          isOpen={isSnapshotModalOpen}
          onClose={() => setIsSnapshotModalOpen(false)}
        />
      </ErrorBoundary>

      <ErrorBoundary isModal onClose={() => setIsAIStylistOpen(false)}>
        <AIStylistModal
          isOpen={isAIStylistOpen}
          onClose={() => setIsAIStylistOpen(false)}
        />
      </ErrorBoundary>

      <ErrorBoundary isModal onClose={() => setIsSettingsOpen(false)}>
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />
      </ErrorBoundary>

      <ErrorBoundary isModal onClose={() => setIsDuplicateMergeOpen(false)}>
        <DuplicateMergeModal
          isOpen={isDuplicateMergeOpen}
          onClose={() => setIsDuplicateMergeOpen(false)}
          initialScope="all"
        />
      </ErrorBoundary>

      {/* High Density Minimal Footer and Toast notifications */}
      {undoToast && (
        <div className="fixed bottom-4 right-4 bg-zinc-900 text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 animate-fade-in z-50 text-sm">
          <span>{undoToast}</span>
          <button 
            onClick={undoLastAction}
            className="flex items-center gap-1 text-amber-400 hover:text-amber-300 font-medium transition"
          >
            <Undo2 className="w-4 h-4" /> Undo
          </button>
          <button onClick={dismissUndoToast} className="text-zinc-400 hover:text-white transition">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <footer className="border-t border-zinc-200 bg-white py-4 text-center text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
          <div>&copy; {new Date().getFullYear()} Wardrobe System. All rights reserved.</div>
          {currentVersion && (
            <div className="flex items-center gap-1 text-zinc-400">
              <History className="w-3 h-3" /> Version: {currentVersion}
            </div>
          )}
        </div>
      </footer>
    </div>
  );
};

// Root wrapper that exports the Context Wrapper interface
export default function App() {
  return (
    <WardrobeProvider>
      <MainAppContent />
    </WardrobeProvider>
  );
}

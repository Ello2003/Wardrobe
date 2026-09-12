import React, { useState, useEffect, useCallback } from 'react';
import { WardrobeProvider, useWardrobe } from './context/WardrobeContext';
import { Navigation } from './components/Navigation';
import { DashboardView } from './components/DashboardView';
import { WardrobeView } from './components/WardrobeView';
import { LookbookView } from './components/LookbookView';
import { ShoppingView } from './components/ShoppingView';
import { SellingView } from './components/SellingView';
import { AnalyticsChartsView } from './components/AnalyticsChartsView';
import { EditorialFeedView } from './components/EditorialFeedView';
import { ToolsView } from './components/ToolsView';
import { ItemDetailModal } from './components/ItemDetailModal';
import { ItemFormModal } from './components/ItemFormModal';
import { OutfitFormModal } from './components/OutfitFormModal';
import { ShoppingFormModal } from './components/ShoppingFormModal';
import { CreateSnapshotModal } from './components/CreateSnapshotModal';
import { AIStylistModal } from './components/AIStylistModal';
import { SettingsModal } from './components/SettingsModal';
import { DuplicateMergeModal } from './components/DuplicateMergeModal';
import { GlobalSearchModal } from './components/common/GlobalSearchModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { WardrobeItem, LookbookOutfit, ShoppingItem } from './types';
import { History, Undo2, X } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const {
    activeTab,
    currentVersion,
    undoLastAction,
    canUndo,
    undoToast,
    dismissUndoToast,
  } = useWardrobe();

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
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);

  useEffect(() => {
    document.title = 'Wardrobe & Style Studio';
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+K / Cmd+K universal search shortcut
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsGlobalSearchOpen((prev) => !prev);
        return;
      }

      const activeElement = document.activeElement as HTMLElement | null;
      const activeTag = activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeElement?.isContentEditable) return;

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !event.shiftKey && canUndo) {
        event.preventDefault();
        undoLastAction();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, undoLastAction]);

  const openItemForm = useCallback((item: WardrobeItem | null = null) => {
    setEditingItem(item);
    setIsItemFormOpen(true);
  }, []);

  const openOutfitForm = useCallback((outfit: LookbookOutfit | null = null) => {
    setEditingOutfit(outfit);
    setIsOutfitFormOpen(true);
  }, []);

  const openShoppingItemForm = useCallback((item: ShoppingItem | null = null) => {
    setEditingShoppingItem(item);
    setIsShoppingFormOpen(true);
  }, []);

  const closeItemForm = useCallback(() => {
    setIsItemFormOpen(false);
    setEditingItem(null);
  }, []);

  const closeOutfitForm = useCallback(() => {
    setIsOutfitFormOpen(false);
    setEditingOutfit(null);
  }, []);

  const closeShoppingItemForm = useCallback(() => {
    setIsShoppingFormOpen(false);
    setEditingShoppingItem(null);
  }, []);

  return (
    <div className="min-h-screen bg-[#F8F7F4] text-[#1A1A1A] flex flex-col font-sans selection:bg-[#8C7355] selection:text-white">
      <Navigation
        onOpenAddItem={() => openItemForm()}
        onOpenCreateLook={() => openOutfitForm()}
        onOpenAIStylist={() => setIsAIStylistOpen(true)}
        onOpenCreateSnapshot={() => setIsSnapshotModalOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenDuplicateMerge={() => setIsDuplicateMergeOpen(true)}
        onOpenGlobalSearch={() => setIsGlobalSearchOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            onOpenAddItem={() => openItemForm()}
            onOpenCreateLook={() => openOutfitForm()}
            onOpenAIStylist={() => setIsAIStylistOpen(true)}
            onSelectItem={setSelectedDetailItem}
          />
        )}

        {activeTab === 'wardrobe' && (
          <WardrobeView
            onOpenAddItem={() => openItemForm()}
            onSelectItem={setSelectedDetailItem}
            onEditItem={openItemForm}
          />
        )}

        {activeTab === 'lookbook' && (
          <LookbookView
            onOpenCreateLook={() => openOutfitForm()}
            onEditLook={openOutfitForm}
            onSelectItem={setSelectedDetailItem}
          />
        )}

        {activeTab === 'shopping' && (
          <ShoppingView
            onOpenAddShoppingItem={() => openShoppingItemForm()}
            onEditShoppingItem={openShoppingItemForm}
          />
        )}

        {activeTab === 'selling' && <SellingView />}

        {activeTab === 'analytics' && <AnalyticsChartsView onOpenAddItem={() => openItemForm()} />}

        {activeTab === 'trends' && <EditorialFeedView onOpenAIStylist={() => setIsAIStylistOpen(true)} />}

        {(activeTab === 'tools' || activeTab === 'history') && (
          <ToolsView
            onOpenCreateSnapshot={() => setIsSnapshotModalOpen(true)}
            defaultSubTab={activeTab === 'history' ? 'audit' : 'duplicates'}
          />
        )}
      </main>

      <ErrorBoundary isModal onClose={() => setSelectedDetailItem(null)}>
        <ItemDetailModal
          item={selectedDetailItem}
          onClose={() => setSelectedDetailItem(null)}
          onEdit={openItemForm}
        />
      </ErrorBoundary>

      <ErrorBoundary
        isModal
        fallbackTitle="Could not display wardrobe editor"
        onClose={closeItemForm}
      >
        <ItemFormModal isOpen={isItemFormOpen} onClose={closeItemForm} initialItem={editingItem} />
      </ErrorBoundary>

      <ErrorBoundary
        isModal
        fallbackTitle="Could not display lookbook outfit editor"
        onClose={closeOutfitForm}
      >
        <OutfitFormModal isOpen={isOutfitFormOpen} onClose={closeOutfitForm} initialOutfit={editingOutfit} />
      </ErrorBoundary>

      <ErrorBoundary
        isModal
        fallbackTitle="Could not display shopping item editor"
        onClose={closeShoppingItemForm}
      >
        <ShoppingFormModal
          isOpen={isShoppingFormOpen}
          onClose={closeShoppingItemForm}
          initialShoppingItem={editingShoppingItem}
        />
      </ErrorBoundary>

      <ErrorBoundary isModal onClose={() => setIsSnapshotModalOpen(false)}>
        <CreateSnapshotModal isOpen={isSnapshotModalOpen} onClose={() => setIsSnapshotModalOpen(false)} />
      </ErrorBoundary>

      <ErrorBoundary isModal onClose={() => setIsAIStylistOpen(false)}>
        <AIStylistModal isOpen={isAIStylistOpen} onClose={() => setIsAIStylistOpen(false)} />
      </ErrorBoundary>

      <ErrorBoundary isModal onClose={() => setIsSettingsOpen(false)}>
        <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      </ErrorBoundary>

      <ErrorBoundary isModal onClose={() => setIsDuplicateMergeOpen(false)}>
        <DuplicateMergeModal
          isOpen={isDuplicateMergeOpen}
          onClose={() => setIsDuplicateMergeOpen(false)}
          initialScope="all"
        />
      </ErrorBoundary>

      <ErrorBoundary isModal onClose={() => setIsGlobalSearchOpen(false)}>
        <GlobalSearchModal
          isOpen={isGlobalSearchOpen}
          onClose={() => setIsGlobalSearchOpen(false)}
          onSelectItem={setSelectedDetailItem}
          onEditShoppingItem={openShoppingItemForm}
        />
      </ErrorBoundary>

      {undoToast && (
        <div className="fixed bottom-4 right-4 bg-zinc-900 text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 animate-fade-in z-50 text-sm">
          <span>{undoToast.message || undoToast.actionTitle}</span>
          <button type="button" onClick={undoLastAction} className="flex items-center gap-1 text-amber-400 hover:text-amber-300 font-medium transition cursor-pointer">
            <Undo2 className="w-4 h-4" />
            Undo
          </button>
          <button type="button" onClick={dismissUndoToast} aria-label="Dismiss undo notification" className="text-zinc-400 hover:text-white transition cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <footer className="border-t border-zinc-200 bg-white py-4 text-center text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
          <div>&copy; {new Date().getFullYear()} Wardrobe &amp; Style Studio. All rights reserved.</div>
          {currentVersion && (
            <div className="flex items-center gap-1 text-zinc-400">
              <History className="w-3 h-3" />
              Version: {currentVersion}
            </div>
          )}
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary
      fallbackTitle="Wardrobe & Style Studio Recovery"
      onClose={() => {
        try {
          localStorage.clear();
        } catch {
          // Ignore localStorage errors.
        }
        window.location.reload();
      }}
    >
      <WardrobeProvider>
        <MainAppContent />
      </WardrobeProvider>
    </ErrorBoundary>
  );
}

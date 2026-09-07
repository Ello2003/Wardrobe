
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
import { ToolsView } from './components/ToolsView';
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

  useEffect(() => {
    document.title = 'Wardrobe & Style Studio';
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement as HTMLElement | null;
      const activeTag = activeElement?.tagName.toLowerCase();

      if (
        activeTag === 'input' ||
        activeTag === 'textarea' ||
        activeElement?.isContentEditable
      ) {
        return;
      }

      if (
        (e.ctrlKey || e.metaKey) &&
        e.key.toLowerCase() === 'z' &&
        !e.shiftKey &&
        canUndo
      ) {
        e.preventDefault();
        undoLastAction();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [canUndo, undoLastAction]);

  const [selectedDetailItem, setSelectedDetailItem] =
    useState<WardrobeItem | null>(null);

  const [isItemFormOpen, setIsItemFormOpen] = useState(false);
  const [editingItem, setEditingItem] =
    useState<WardrobeItem | null>(null);

  const [isOutfitFormOpen, setIsOutfitFormOpen] = useState(false);
  const [editingOutfit, setEditingOutfit] =
    useState<LookbookOutfit | null>(null);

  const [isShoppingFormOpen, setIsShoppingFormOpen] = useState(false);
  const [editingShoppingItem, setEditingShoppingItem] =
    useState<ShoppingItem | null>(null);

  const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState(false);
  const [isAIStylistOpen, setIsAIStylistOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDuplicateMergeOpen, setIsDuplicateMergeOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8F7F4] text-[#1A1A1A] flex flex-col font-sans selection:bg-[#8C7355] selection:text-white">
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
            onEditShoppingItem={(item) => {
              setEditingShoppingItem(item);
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
          <TrendResearchView
            onOpenAIStylist={() => setIsAIStylistOpen(true)}
          />
        )}

        {(activeTab === 'tools' || activeTab === 'history') && (
          <ToolsView
            onOpenCreateSnapshot={() => setIsSnapshotModalOpen(true)}
            defaultSubTab={
              activeTab === 'history' ? 'audit' : 'duplicates'
            }
          />
        )}
      </main>

      <ErrorBoundary
        isModal
        onClose={() => setSelectedDetailItem(null)}
      >
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

      <ErrorBoundary
        isModal
        onClose={() => setIsSnapshotModalOpen(false)}
      >
        <CreateSnapshotModal
          isOpen={isSnapshotModalOpen}
          onClose={() => setIsSnapshotModalOpen(false)}
        />
      </ErrorBoundary>

      <ErrorBoundary
        isModal
        onClose={() => setIsAIStylistOpen(false)}
      >
        <AIStylistModal
          isOpen={isAIStylistOpen}
          onClose={() => setIsAIStylistOpen(false)}
        />
      </ErrorBoundary>

      <ErrorBoundary
        isModal
        onClose={() => setIsSettingsOpen(false)}
      >
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />
      </ErrorBoundary>

      <ErrorBoundary
        isModal
        onClose={() => setIsDuplicateMergeOpen(false)}
      >
        <DuplicateMergeModal
          isOpen={isDuplicateMergeOpen}
          onClose={() => setIsDuplicateMergeOpen(false)}
          initialScope="all"
        />
      </ErrorBoundary>

      {undoToast && (
        <div className="fixed bottom-4 right-4 bg-zinc-900 text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 animate-fade-in z-50 text-sm">
          <span>
            {undoToast.message || undoToast.actionTitle}
          </span>

          <button
            onClick={undoLastAction}
            className="flex items-center gap-1 text-amber-400 hover:text-amber-300 font-medium transition cursor-pointer"
          >
            <Undo2 className="w-4 h-4" />
            Undo
          </button>

          <button
            onClick={dismissUndoToast}
            className="

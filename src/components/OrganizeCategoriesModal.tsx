import React, { useState } from 'react';
import {
  X,
  ArrowRight,
  ArrowLeft,
  GripVertical,
  Check,
  Plus,
  Trash2,
  Package,
  Shirt,
  Sparkles,
  Layers,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useWardrobe } from '../context/WardrobeContext';
import { isHomewareCategory } from '../types';
import { safeConfirm } from '../utils/safeConfirm';

interface OrganizeCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OrganizeCategoriesModal: React.FC<OrganizeCategoriesModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    garmentCategories,
    homewareCategories,
    moveCategory,
    items,
    addGarmentCategory,
    addHomewareCategory,
    deleteCategory,
    resetGarmentCategories,
    resetHomewareCategories,
  } = useWardrobe();

  const [draggedCategory, setDraggedCategory] = useState<{
    name: string;
    source: 'garments' | 'homeware';
  } | null>(null);
  const [hoveredDropZone, setHoveredDropZone] = useState<'garments' | 'homeware' | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [newGarmentInput, setNewGarmentInput] = useState('');
  const [newHomewareInput, setNewHomewareInput] = useState('');

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleDragStart = (
    e: React.DragEvent,
    cat: string,
    source: 'garments' | 'homeware'
  ) => {
    setDraggedCategory({ name: cat, source });
    e.dataTransfer.setData('text/plain', cat);
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({ category: cat, sourceSection: source })
    );
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, target: 'garments' | 'homeware') => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (hoveredDropZone !== target) {
      setHoveredDropZone(target);
    }
  };

  const handleDragLeave = () => {
    setHoveredDropZone(null);
  };

  const handleDrop = (e: React.DragEvent, target: 'garments' | 'homeware') => {
    e.preventDefault();
    setHoveredDropZone(null);

    let catName = draggedCategory?.name;
    let source = draggedCategory?.source;

    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (dataStr) {
        const parsed = JSON.parse(dataStr);
        if (parsed.category) {
          catName = parsed.category;
          source = parsed.sourceSection;
        }
      }
    } catch {
      // Fallback to text/plain
      if (!catName) catName = e.dataTransfer.getData('text/plain');
    }

    if (!catName || source === target) {
      setDraggedCategory(null);
      return;
    }

    moveCategory(catName, target);
    showToast(
      `Moved "${catName}" to ${target === 'homeware' ? 'Homeware & Lifestyle' : 'Clothes & Apparel'}`
    );
    setDraggedCategory(null);
  };

  const handleDragEnd = () => {
    setDraggedCategory(null);
    setHoveredDropZone(null);
  };

  // Helper to identify shoe care categories which strictly belong to garments
  const isShoeCareCat = (c: string) => {
    const l = c.toLowerCase();
    return (
      l === 'shoe care' ||
      l === 'shoecare' ||
      l === 'shoe care & maintenance' ||
      l.includes('shoe care') ||
      l.includes('shoe tree')
    );
  };

  // Find any misclassified categories currently in garments that are true homeware keywords (excluding shoe care)
  const homewareInGarments = garmentCategories.filter(
    (c) => !isShoeCareCat(c) && isHomewareCategory(c)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#FAF9F6] border border-[#1A1A1A] w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[#E5E5E1] bg-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#8C7355]/10 text-[#8C7355]">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-serif font-bold text-[#1A1A1A]">
                Organize Category Taxonomy
              </h2>
              <p className="text-xs font-mono text-[#767670]">
                Drag and drop categories between Clothes and Homeware, or click arrows to move instantly.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#767670] hover:text-[#1A1A1A] hover:bg-[#F2F1ED] transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Toast */}
        {statusMessage && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 text-xs font-mono text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Misclassified Suggestion Banner (e.g. Homebar in garments) */}
        {homewareInGarments.length > 0 && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono text-amber-900">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                Found {homewareInGarments.length} homeware-related category in Clothes:{' '}
                <strong>{homewareInGarments.join(', ')}</strong>.
              </span>
            </div>
            <button
              onClick={() => {
                homewareInGarments.forEach((c) => moveCategory(c, 'homeware'));
                showToast(`Moved ${homewareInGarments.join(', ')} to Homeware & Living`);
              }}
              className="px-3 py-1 bg-amber-700 hover:bg-amber-800 text-white text-xs font-mono font-medium cursor-pointer flex items-center gap-1 shrink-0"
            >
              <span>Move to Homeware</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Content Columns: Clothes vs Homeware */}
        <div className="p-4 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Column 1: Clothes & Apparel */}
          <div
            onDragOver={(e) => handleDragOver(e, 'garments')}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 'garments')}
            className={`bg-white border p-4 flex flex-col transition-all min-h-[380px] ${
              hoveredDropZone === 'garments'
                ? 'border-[#8C7355] ring-2 ring-[#8C7355]/40 bg-amber-50/20'
                : 'border-[#E5E5E1]'
            }`}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E1] mb-3">
              <div className="flex items-center gap-2">
                <Shirt className="w-4 h-4 text-[#8C7355]" />
                <span className="text-xs font-mono font-bold text-[#1A1A1A] uppercase tracking-wider">
                  Clothes &amp; Apparel
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-[#F2F1ED] text-[#767670] rounded-xs font-semibold">
                  {garmentCategories.length} categories
                </span>
              </div>
              <button
                onClick={() => {
                  if (safeConfirm('Reset Clothes categories to default?')) {
                    resetGarmentCategories();
                    showToast('Reset garment categories to defaults.');
                  }
                }}
                className="text-[10px] font-mono text-[#A5A59E] hover:text-[#1A1A1A] cursor-pointer"
                title="Reset to default clothes categories"
              >
                Reset
              </button>
            </div>

            {/* Quick Add Form */}
            <div className="flex items-center gap-1 mb-3">
              <input
                type="text"
                placeholder="Add clothes category..."
                value={newGarmentInput}
                onChange={(e) => setNewGarmentInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newGarmentInput.trim()) {
                    addGarmentCategory(newGarmentInput.trim());
                    setNewGarmentInput('');
                    showToast(`Added clothes category "${newGarmentInput.trim()}"`);
                  }
                }}
                className="flex-1 px-2.5 py-1.5 text-xs bg-[#FAF9F6] border border-[#E5E5E1] font-mono text-[#1A1A1A] focus:outline-none focus:border-[#8C7355]"
              />
              <button
                onClick={() => {
                  if (newGarmentInput.trim()) {
                    addGarmentCategory(newGarmentInput.trim());
                    setNewGarmentInput('');
                    showToast(`Added clothes category "${newGarmentInput.trim()}"`);
                  }
                }}
                className="p-1.5 bg-[#8C7355] text-white hover:bg-[#786248] cursor-pointer"
                title="Add clothes category"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Drop target prompt */}
            {hoveredDropZone === 'garments' && (
              <div className="border-2 border-dashed border-[#8C7355] bg-amber-50/40 p-2.5 mb-2 text-center text-xs font-mono text-[#8C7355] animate-pulse">
                Drop category here to move into Clothes &amp; Apparel
              </div>
            )}

            {/* List of Category Cards */}
            <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[340px] pr-1">
              {garmentCategories.map((cat) => {
                const itemCount = items.filter(
                  (i) => !i.isArchived && i.category && i.category.toLowerCase() === cat.toLowerCase()
                ).length;
                const isMisclassified = !isShoeCareCat(cat) && isHomewareCategory(cat);

                return (
                  <div
                    key={cat}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, cat, 'garments')}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center justify-between p-2 border transition-all cursor-grab active:cursor-grabbing select-none ${
                      isMisclassified
                        ? 'bg-amber-50/60 border-amber-300'
                        : 'bg-[#FAF9F6] hover:bg-[#F2F1ED] border-[#E5E5E1]'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <GripVertical className="w-3.5 h-3.5 text-[#A5A59E] shrink-0" />
                      <span className="text-xs font-mono font-medium text-[#1A1A1A] truncate">
                        {cat}
                      </span>
                      {isMisclassified && (
                        <span className="text-[9px] font-mono px-1 bg-amber-200 text-amber-900 shrink-0">
                          Homeware keyword
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-mono text-[#767670] bg-white px-1.5 py-0.5 border border-[#E5E5E1]">
                        {itemCount} {itemCount === 1 ? 'item' : 'items'}
                      </span>
                      <button
                        onClick={() => {
                          moveCategory(cat, 'homeware');
                          showToast(`Moved "${cat}" to Homeware & Living`);
                        }}
                        className="p-1 text-[#8C7355] hover:text-[#1A1A1A] hover:bg-white transition-colors cursor-pointer"
                        title={`Move "${cat}" to Homeware & Living`}
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (safeConfirm(`Delete category "${cat}"? Items will be reassigned.`)) {
                            deleteCategory(cat);
                            showToast(`Deleted category "${cat}"`);
                          }
                        }}
                        className="p-1 text-[#A5A59E] hover:text-rose-600 transition-colors cursor-pointer"
                        title={`Delete category "${cat}"`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Column 2: Homeware & Lifestyle */}
          <div
            onDragOver={(e) => handleDragOver(e, 'homeware')}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 'homeware')}
            className={`bg-white border p-4 flex flex-col transition-all min-h-[380px] ${
              hoveredDropZone === 'homeware'
                ? 'border-[#8C7355] ring-2 ring-[#8C7355]/40 bg-amber-50/20'
                : 'border-[#E5E5E1]'
            }`}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E1] mb-3">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-[#8C7355]" />
                <span className="text-xs font-mono font-bold text-[#1A1A1A] uppercase tracking-wider">
                  Homeware &amp; Living
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-[#F2F1ED] text-[#767670] rounded-xs font-semibold">
                  {homewareCategories.length} categories
                </span>
              </div>
              <button
                onClick={() => {
                  if (safeConfirm('Reset Homeware categories to default?')) {
                    resetHomewareCategories();
                    showToast('Reset homeware categories to defaults.');
                  }
                }}
                className="text-[10px] font-mono text-[#A5A59E] hover:text-[#1A1A1A] cursor-pointer"
                title="Reset to default homeware categories"
              >
                Reset
              </button>
            </div>

            {/* Quick Add Form */}
            <div className="flex items-center gap-1 mb-3">
              <input
                type="text"
                placeholder="Add homeware category (e.g. Homebar)..."
                value={newHomewareInput}
                onChange={(e) => setNewHomewareInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newHomewareInput.trim()) {
                    addHomewareCategory(newHomewareInput.trim());
                    setNewHomewareInput('');
                    showToast(`Added homeware category "${newHomewareInput.trim()}"`);
                  }
                }}
                className="flex-1 px-2.5 py-1.5 text-xs bg-[#FAF9F6] border border-[#E5E5E1] font-mono text-[#1A1A1A] focus:outline-none focus:border-[#8C7355]"
              />
              <button
                onClick={() => {
                  if (newHomewareInput.trim()) {
                    addHomewareCategory(newHomewareInput.trim());
                    setNewHomewareInput('');
                    showToast(`Added homeware category "${newHomewareInput.trim()}"`);
                  }
                }}
                className="p-1.5 bg-[#8C7355] text-white hover:bg-[#786248] cursor-pointer"
                title="Add homeware category"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Drop target prompt */}
            {hoveredDropZone === 'homeware' && (
              <div className="border-2 border-dashed border-[#8C7355] bg-amber-50/40 p-2.5 mb-2 text-center text-xs font-mono text-[#8C7355] animate-pulse">
                Drop category here to move into Homeware &amp; Living
              </div>
            )}

            {/* List of Category Cards */}
            <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[340px] pr-1">
              {homewareCategories.map((cat) => {
                const itemCount = items.filter(
                  (i) => !i.isArchived && i.category && i.category.toLowerCase() === cat.toLowerCase()
                ).length;

                return (
                  <div
                    key={cat}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, cat, 'homeware')}
                    onDragEnd={handleDragEnd}
                    className="flex items-center justify-between p-2 bg-[#FAF9F6] hover:bg-[#F2F1ED] border border-[#E5E5E1] transition-all cursor-grab active:cursor-grabbing select-none"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <GripVertical className="w-3.5 h-3.5 text-[#A5A59E] shrink-0" />
                      <span className="text-xs font-mono font-medium text-[#1A1A1A] truncate">
                        {cat}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-mono text-[#767670] bg-white px-1.5 py-0.5 border border-[#E5E5E1]">
                        {itemCount} {itemCount === 1 ? 'item' : 'items'}
                      </span>
                      <button
                        onClick={() => {
                          moveCategory(cat, 'garments');
                          showToast(`Moved "${cat}" to Clothes & Apparel`);
                        }}
                        className="p-1 text-[#8C7355] hover:text-[#1A1A1A] hover:bg-white transition-colors cursor-pointer"
                        title={`Move "${cat}" to Clothes & Apparel`}
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (safeConfirm(`Delete category "${cat}"? Items will be reassigned.`)) {
                            deleteCategory(cat);
                            showToast(`Deleted category "${cat}"`);
                          }
                        }}
                        className="p-1 text-[#A5A59E] hover:text-rose-600 transition-colors cursor-pointer"
                        title={`Delete category "${cat}"`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#E5E5E1] bg-white flex items-center justify-between">
          <span className="text-xs font-mono text-[#767670]">
            Moving a category updates all assigned items automatically.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#1A1A1A] text-white text-xs font-mono font-semibold hover:bg-[#333] transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

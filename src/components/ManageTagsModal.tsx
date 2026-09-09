import React, { useState, useMemo } from 'react';
import {
  Tag,
  Search,
  Trash2,
  Edit2,
  Check,
  X,
  Plus,
  CheckSquare,
  Square,
  AlertTriangle,
  Layers,
  ShoppingBag,
  Shirt,
  Sparkles,
} from 'lucide-react';
import { useWardrobe } from '../context/WardrobeContext';

interface ManageTagsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTag?: string;
}

export const ManageTagsModal: React.FC<ManageTagsModalProps> = ({
  isOpen,
  onClose,
  initialTag,
}) => {
  const {
    items,
    saleItems,
    shoppingList,
    outfits,
    settings,
    updateSettings,
    deleteTagGlobally,
    deleteMultipleTagsGlobally,
    renameTagGlobally,
  } = useWardrobe();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editingTagValue, setEditingTagValue] = useState('');
  const [newTagInput, setNewTagInput] = useState('');
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Compute tag breakdown and usage
  const tagStats = useMemo(() => {
    const statsMap: Record<
      string,
      { tag: string; wardrobeCount: number; salesCount: number; shoppingCount: number; total: number }
    > = {};

    const registerTag = (rawTag: string, source: 'wardrobe' | 'sales' | 'shopping') => {
      const clean = rawTag.trim();
      if (!clean) return;
      if (!statsMap[clean]) {
        statsMap[clean] = { tag: clean, wardrobeCount: 0, salesCount: 0, shoppingCount: 0, total: 0 };
      }
      if (source === 'wardrobe') statsMap[clean].wardrobeCount += 1;
      if (source === 'sales') statsMap[clean].salesCount += 1;
      if (source === 'shopping') statsMap[clean].shoppingCount += 1;
      statsMap[clean].total += 1;
    };

    // Include custom tags from settings
    (settings.customTags || []).forEach((t) => {
      const clean = t.trim();
      if (clean && !statsMap[clean]) {
        statsMap[clean] = { tag: clean, wardrobeCount: 0, salesCount: 0, shoppingCount: 0, total: 0 };
      }
    });

    items.forEach((it) => {
      if (!it.isArchived && Array.isArray(it.tags)) {
        it.tags.forEach((t) => registerTag(t, 'wardrobe'));
      }
    });

    saleItems.forEach((sl) => {
      if (Array.isArray(sl.tags)) {
        sl.tags.forEach((t) => registerTag(t, 'sales'));
      }
    });

    shoppingList.forEach((sh) => {
      if (Array.isArray(sh.tags)) {
        sh.tags.forEach((t) => registerTag(t, 'shopping'));
      }
    });

    return Object.values(statsMap).sort((a, b) => b.total - a.total || a.tag.localeCompare(b.tag));
  }, [items, saleItems, shoppingList, settings.customTags]);

  const filteredTags = useMemo(() => {
    if (!searchQuery.trim()) return tagStats;
    const q = searchQuery.trim().toLowerCase();
    return tagStats.filter((t) => t.tag.toLowerCase().includes(q));
  }, [tagStats, searchQuery]);

  if (!isOpen) return null;

  const handleToggleSelect = (tag: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedTags.size === filteredTags.length) {
      setSelectedTags(new Set());
    } else {
      setSelectedTags(new Set(filteredTags.map((t) => t.tag)));
    }
  };

  const handleCreateTag = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newTagInput.trim().replace(/^#/, '');
    if (!clean) return;

    if (!settings.customTags.includes(clean)) {
      updateSettings({ customTags: [...settings.customTags, clean] });
    }
    setNewTagInput('');
    setActionNotice(`Created tag "#${clean}".`);
    setTimeout(() => setActionNotice(null), 3500);
  };

  const handleStartRename = (tag: string) => {
    setEditingTag(tag);
    setEditingTagValue(tag);
  };

  const handleSaveRename = (oldTag: string) => {
    const clean = editingTagValue.trim().replace(/^#/, '');
    if (clean && clean !== oldTag) {
      renameTagGlobally(oldTag, clean);
      setActionNotice(`Renamed tag "#${oldTag}" to "#${clean}".`);
      setTimeout(() => setActionNotice(null), 3500);
    }
    setEditingTag(null);
    setEditingTagValue('');
  };

  const handleDeleteSingle = (tag: string) => {
    deleteTagGlobally(tag);
    setSelectedTags((prev) => {
      const next = new Set(prev);
      next.delete(tag);
      return next;
    });
    setActionNotice(`Deleted tag "#${tag}" across all items.`);
    setTimeout(() => setActionNotice(null), 3500);
  };

  const handleBulkDelete = () => {
    const tagsToDelete = Array.from(selectedTags);
    if (tagsToDelete.length === 0) return;

    deleteMultipleTagsGlobally(tagsToDelete);
    setSelectedTags(new Set());
    setConfirmBulkDelete(false);
    setActionNotice(`Deleted ${tagsToDelete.length} tags across all items.`);
    setTimeout(() => setActionNotice(null), 3500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-[#FAF9F7] border border-[#D5D5D0] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-[#E5E5E1]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#8C7355]/10 border border-[#8C7355]/20 flex items-center justify-center">
              <Tag className="w-5 h-5 text-[#8C7355]" />
            </div>
            <div>
              <h2 className="text-base font-serif font-bold text-[#1A1A1A] tracking-tight">
                Manage Tags & Taxonomy
              </h2>
              <p className="text-xs font-mono text-[#767670]">
                {tagStats.length} tags across wardrobe, resale listings, and wishlist
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#767670] hover:text-[#1A1A1A] hover:bg-[#F2F1ED] transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Notice */}
        {actionNotice && (
          <div className="px-6 py-2 bg-emerald-50 border-b border-emerald-200 text-xs font-mono text-emerald-800 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{actionNotice}</span>
          </div>
        )}

        {/* Controls Bar: Search & New Tag Form */}
        <div className="p-4 bg-white border-b border-[#E5E5E1] space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#8C7355] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#FAF9F7] border border-[#D5D5D0] pl-9 pr-3 py-2 text-xs font-mono text-[#1A1A1A] focus:bg-white focus:border-[#8C7355] focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-[#A5A59E] hover:text-[#1A1A1A]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Create Tag Form */}
            <form onSubmit={handleCreateTag} className="flex gap-2 shrink-0">
              <input
                type="text"
                placeholder="Add new tag..."
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                className="w-40 bg-[#FAF9F7] border border-[#D5D5D0] px-3 py-2 text-xs font-mono text-[#1A1A1A] focus:bg-white focus:border-[#8C7355] focus:outline-none"
              />
              <button
                type="submit"
                disabled={!newTagInput.trim()}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-mono font-medium bg-[#8C7355] hover:bg-[#735D43] disabled:opacity-50 text-white transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Tag</span>
              </button>
            </form>
          </div>

          {/* Bulk Selection Bar */}
          <div className="flex items-center justify-between pt-2 border-t border-[#F0EFEA] text-xs">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSelectAll}
                className="inline-flex items-center gap-1.5 text-xs font-mono text-[#4A4A45] hover:text-[#1A1A1A] cursor-pointer"
              >
                {selectedTags.size === filteredTags.length && filteredTags.length > 0 ? (
                  <CheckSquare className="w-4 h-4 text-[#8C7355]" />
                ) : (
                  <Square className="w-4 h-4 text-[#A5A59E]" />
                )}
                <span>
                  {selectedTags.size === filteredTags.length && filteredTags.length > 0
                    ? 'Deselect All'
                    : 'Select All'}
                </span>
              </button>

              {selectedTags.size > 0 && (
                <span className="text-[11px] font-mono text-[#767670]">
                  ({selectedTags.size} selected)
                </span>
              )}
            </div>

            {selectedTags.size > 0 && (
              <div className="flex items-center gap-2">
                {confirmBulkDelete ? (
                  <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 px-3 py-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span className="text-[11px] font-mono text-rose-800">
                      Delete {selectedTags.size} tag(s) across all items?
                    </span>
                    <button
                      type="button"
                      onClick={handleBulkDelete}
                      className="px-2 py-0.5 text-[11px] font-mono font-bold bg-rose-600 text-white hover:bg-rose-700 cursor-pointer"
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmBulkDelete(false)}
                      className="text-[11px] font-mono text-[#767670] hover:text-[#1A1A1A] cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmBulkDelete(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Selected ({selectedTags.size})</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Tag List Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[50vh]">
          {filteredTags.length === 0 ? (
            <div className="text-center py-12 text-[#767670] font-mono text-xs">
              <Tag className="w-8 h-8 mx-auto text-[#CCCCCC] mb-2" />
              <p>No tags found matching &quot;{searchQuery}&quot;</p>
              <p className="text-[11px] mt-1 text-[#A5A59E]">
                Add a new tag above or clear your search filter.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filteredTags.map((t) => {
                const isSelected = selectedTags.has(t.tag);
                const isEditing = editingTag === t.tag;

                return (
                  <div
                    key={t.tag}
                    className={`flex items-center justify-between p-2.5 border transition-all ${
                      isSelected
                        ? 'bg-[#8C7355]/5 border-[#8C7355]'
                        : 'bg-white border-[#E5E5E1] hover:border-[#D5D5D0]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      {/* Checkbox */}
                      <button
                        type="button"
                        onClick={() => handleToggleSelect(t.tag)}
                        className="text-[#8C7355] cursor-pointer shrink-0"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-[#8C7355]" />
                        ) : (
                          <Square className="w-4 h-4 text-[#CCCCCC] hover:text-[#8C7355]" />
                        )}
                      </button>

                      {/* Tag Name / Rename Input */}
                      {isEditing ? (
                        <div className="flex items-center gap-1 flex-1 min-w-0">
                          <input
                            type="text"
                            value={editingTagValue}
                            onChange={(e) => setEditingTagValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveRename(t.tag);
                              if (e.key === 'Escape') setEditingTag(null);
                            }}
                            autoFocus
                            className="flex-1 bg-white border border-[#8C7355] px-2 py-0.5 text-xs font-mono text-[#1A1A1A] focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveRename(t.tag)}
                            className="p-1 text-[#8C7355] hover:text-[#735D43] cursor-pointer"
                            title="Save Rename"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingTag(null)}
                            className="p-1 text-[#767670] hover:text-[#1A1A1A] cursor-pointer"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-mono font-medium text-[#1A1A1A] truncate">
                              #{t.tag}
                            </span>
                            <span className="text-[10px] font-mono text-[#767670] shrink-0">
                              ({t.total})
                            </span>
                          </div>
                          {/* Mini breakdown indicators */}
                          <div className="flex items-center gap-2 text-[10px] font-mono text-[#A5A59E] mt-0.5">
                            {t.wardrobeCount > 0 && (
                              <span className="flex items-center gap-0.5">
                                <Shirt className="w-2.5 h-2.5 text-[#8C7355]" />
                                {t.wardrobeCount}
                              </span>
                            )}
                            {t.salesCount > 0 && (
                              <span className="flex items-center gap-0.5">
                                <ShoppingBag className="w-2.5 h-2.5 text-amber-700" />
                                {t.salesCount}
                              </span>
                            )}
                            {t.shoppingCount > 0 && (
                              <span className="flex items-center gap-0.5">
                                <Layers className="w-2.5 h-2.5 text-blue-700" />
                                {t.shoppingCount}
                              </span>
                            )}
                            {t.total === 0 && <span>Unused</span>}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Inline Actions */}
                    {!isEditing && (
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <button
                          type="button"
                          onClick={() => handleStartRename(t.tag)}
                          className="p-1 text-[#767670] hover:text-[#8C7355] hover:bg-[#F2F1ED] transition-colors cursor-pointer"
                          title={`Rename #${t.tag} globally`}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSingle(t.tag)}
                          className="p-1 text-[#A5A59E] hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                          title={`Delete #${t.tag} everywhere`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-white border-t border-[#E5E5E1] text-xs font-mono">
          <span className="text-[#767670]">
            Deleting a tag removes it from all tagged wardrobe items, looks, and listings.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#1A1A1A] hover:bg-black text-white font-medium transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

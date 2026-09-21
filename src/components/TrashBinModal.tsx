import React, { useState, useMemo } from 'react';
import {
  Trash2,
  RotateCcw,
  CopyPlus,
  Search,
  X,
  Clock,
  Shirt,
  ShoppingBag,
  PoundSterling,
  Layers,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Tag,
} from 'lucide-react';
import { useWardrobe } from '../context/WardrobeContext';
import { TrashItem, TrashReason } from '../types';
import { GarmentImage } from './GarmentImage';

interface TrashBinModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TrashBinModal: React.FC<TrashBinModalProps> = ({ isOpen, onClose }) => {
  const {
    trashItems,
    restoreFromTrash,
    permanentlyDeleteFromTrash,
    emptyTrash,
    restoreAllFromTrash,
    settings,
  } = useWardrobe();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterReason, setFilterReason] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const [selectedTrashIds, setSelectedTrashIds] = useState<string[]>([]);

  const currencySymbol = settings.currencySymbol || '£';

  // Filter and search
  const filteredTrash = useMemo(() => {
    return trashItems.filter((item) => {
      // Reason filter
      if (filterReason !== 'all' && item.reason !== filterReason) {
        return false;
      }

      // Collection Type filter
      if (filterType !== 'all' && item.itemType !== filterType) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const d = item.itemData || {};
        const titleMatch = String(d.name || '').toLowerCase().includes(query);
        const brandMatch = String(d.brand || '').toLowerCase().includes(query);
        const descMatch = String(item.description || '').toLowerCase().includes(query);
        const categoryMatch = String(d.category || '').toLowerCase().includes(query);
        const notesMatch = String(d.notes || '').toLowerCase().includes(query);
        const tagMatch = Array.isArray(d.tags) && d.tags.some((t: string) => String(t).toLowerCase().includes(query));

        if (!titleMatch && !brandMatch && !descMatch && !categoryMatch && !notesMatch && !tagMatch) {
          return false;
        }
      }

      return true;
    });
  }, [trashItems, filterReason, filterType, searchQuery]);

  const counts = useMemo(() => {
    return {
      all: trashItems.length,
      overwritten: trashItems.filter((i) => i.reason === 'overwritten').length,
      deleted: trashItems.filter((i) => i.reason === 'deleted' || i.reason === 'bulk_deleted').length,
      consolidated: trashItems.filter((i) => i.reason === 'consolidated').length,
      import_replaced: trashItems.filter((i) => i.reason === 'import_replaced').length,
      wardrobe: trashItems.filter((i) => i.itemType === 'wardrobe').length,
      shopping: trashItems.filter((i) => i.itemType === 'shopping').length,
      selling: trashItems.filter((i) => i.itemType === 'selling').length,
      outfit: trashItems.filter((i) => i.itemType === 'outfit').length,
    };
  }, [trashItems]);

  const handleSelectAll = () => {
    if (selectedTrashIds.length === filteredTrash.length) {
      setSelectedTrashIds([]);
    } else {
      setSelectedTrashIds(filteredTrash.map((i) => i.id));
    }
  };

  const handleRestoreSelected = (asNewCopy: boolean) => {
    selectedTrashIds.forEach((id) => {
      restoreFromTrash(id, asNewCopy);
    });
    setSelectedTrashIds([]);
  };

  const handleDeleteSelected = () => {
    selectedTrashIds.forEach((id) => {
      permanentlyDeleteFromTrash(id);
    });
    setSelectedTrashIds([]);
  };

  const getReasonBadge = (reason: TrashReason) => {
    switch (reason) {
      case 'overwritten':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-900 border border-amber-200">
            <RefreshCw className="w-3 h-3" />
            Overwritten During Edit
          </span>
        );
      case 'consolidated':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-100 text-sky-900 border border-sky-200">
            <Sparkles className="w-3 h-3" />
            Merged as Duplicate
          </span>
        );
      case 'bulk_deleted':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-900 border border-rose-200">
            <Trash2 className="w-3 h-3" />
            Bulk Deleted
          </span>
        );
      case 'import_replaced':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-900 border border-purple-200">
            <RefreshCw className="w-3 h-3" />
            Replaced By Import
          </span>
        );
      case 'deleted':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-100 text-zinc-800 border border-zinc-200">
            <Trash2 className="w-3 h-3" />
            Deleted
          </span>
        );
    }
  };

  const getTypeIcon = (type: TrashItem['itemType']) => {
    switch (type) {
      case 'wardrobe':
        return <Shirt className="w-3.5 h-3.5 text-[#8C7355]" />;
      case 'shopping':
        return <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />;
      case 'selling':
        return <PoundSterling className="w-3.5 h-3.5 text-purple-600" />;
      case 'outfit':
        return <Layers className="w-3.5 h-3.5 text-indigo-600" />;
    }
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    } catch {
      return 'Recently';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-4xl bg-[#FDFCFB] rounded-xl shadow-2xl border border-[#E5E5E1] max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E5E1] bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-serif font-bold text-[#1A1A1A]">
                  Trash & Overwritten Recovery
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-[#F3F2EE] text-[#767670] border border-[#E5E5E1]">
                  {trashItems.length} {trashItems.length === 1 ? 'item' : 'items'}
                </span>
              </div>
              <p className="text-xs text-[#767670]">
                Every item that is edited, overwritten, deleted, or merged is preserved here. Restore or inspect anytime.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {trashItems.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={restoreAllFromTrash}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition shadow-xs cursor-pointer"
                  title="Restore all items back into their collections"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Restore All
                </button>

                {!confirmEmpty ? (
                  <button
                    type="button"
                    onClick={() => setConfirmEmpty(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Empty Trash
                  </button>
                ) : (
                  <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 px-2 py-1 rounded-lg">
                    <span className="text-[11px] font-medium text-rose-800">Permanently empty?</span>
                    <button
                      type="button"
                      onClick={() => {
                        emptyTrash();
                        setConfirmEmpty(false);
                      }}
                      className="text-[11px] font-bold px-2 py-0.5 bg-rose-600 text-white rounded hover:bg-rose-700 transition cursor-pointer"
                    >
                      Yes, Empty
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmEmpty(false)}
                      className="text-[11px] font-medium px-1.5 py-0.5 text-zinc-600 hover:text-zinc-900 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#767670] hover:text-[#1A1A1A] hover:bg-[#F3F2EE] transition cursor-pointer"
              aria-label="Close Trash"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar & Filters */}
        <div className="p-4 border-b border-[#E5E5E1] bg-[#F8F7F4] space-y-3">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#9A9A95]" />
              <input
                type="text"
                placeholder="Search trash by brand, name, notes (e.g. 'sunspot')..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-4 py-1.5 text-xs bg-white border border-[#E5E5E1] rounded-lg text-[#1A1A1A] placeholder-[#9A9A95] focus:outline-none focus:border-[#8C7355] focus:ring-1 focus:ring-[#8C7355] transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-xs text-[#9A9A95] hover:text-[#1A1A1A]"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Collection Filter */}
            <div className="flex items-center gap-1 w-full sm:w-auto overflow-x-auto">
              <span className="text-[11px] font-medium text-[#767670] mr-1">Collection:</span>
              {(['all', 'wardrobe', 'shopping', 'selling', 'outfit'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFilterType(type)}
                  className={`px-2 py-1 rounded text-xs font-medium transition cursor-pointer ${
                    filterType === type
                      ? 'bg-[#8C7355] text-white shadow-xs'
                      : 'bg-white text-[#5A5A55] border border-[#E5E5E1] hover:bg-[#F3F2EE]'
                  }`}
                >
                  {type === 'all'
                    ? `All (${counts.all})`
                    : type === 'wardrobe'
                    ? `Wardrobe (${counts.wardrobe})`
                    : type === 'shopping'
                    ? `Shopping (${counts.shopping})`
                    : type === 'selling'
                    ? `Resale (${counts.selling})`
                    : `Looks (${counts.outfit})`}
                </button>
              ))}
            </div>
          </div>

          {/* Reason Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-medium text-[#767670]">Trigger:</span>
            {[
              { id: 'all', label: `All Reasons (${trashItems.length})` },
              { id: 'overwritten', label: `Overwritten (${counts.overwritten})` },
              { id: 'consolidated', label: `Merged Duplicates (${counts.consolidated})` },
              { id: 'deleted', label: `Deleted (${counts.deleted})` },
              { id: 'import_replaced', label: `Import Replaced (${counts.import_replaced})` },
            ].map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setFilterReason(r.id)}
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium transition cursor-pointer ${
                  filterReason === r.id
                    ? 'bg-zinc-800 text-white shadow-xs'
                    : 'bg-white text-[#767670] border border-[#E5E5E1] hover:bg-[#F3F2EE]'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Batch Bar */}
          {selectedTrashIds.length > 0 && (
            <div className="flex items-center justify-between bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg text-xs animate-fade-in">
              <span className="font-semibold text-amber-950">
                {selectedTrashIds.length} items selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleRestoreSelected(false)}
                  className="px-2.5 py-1 bg-white border border-amber-300 rounded text-amber-900 font-semibold hover:bg-amber-100 transition cursor-pointer"
                >
                  Restore Selected
                </button>
                <button
                  type="button"
                  onClick={() => handleRestoreSelected(true)}
                  className="px-2.5 py-1 bg-amber-700 text-white rounded font-semibold hover:bg-amber-800 transition cursor-pointer"
                  title="Restore as new distinct items without overwriting existing entries"
                >
                  Restore as New Copies
                </button>
                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  className="px-2.5 py-1 text-rose-700 hover:bg-rose-100 rounded font-medium transition cursor-pointer"
                >
                  Permanently Delete
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredTrash.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mx-auto mb-3">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-[#1A1A1A]">
                {trashItems.length === 0 ? 'Trash is Clean & Safe' : 'No matching items in trash'}
              </h3>
              <p className="text-xs text-[#767670] max-w-sm mx-auto mt-1">
                {trashItems.length === 0
                  ? 'Whenever you edit, overwrite, delete, or merge duplicate garments, safety copies are archived here automatically so nothing is ever lost.'
                  : 'Try clearing your search query or adjusting the filters.'}
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-xs text-[#767670] px-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={selectedTrashIds.length === filteredTrash.length && filteredTrash.length > 0}
                    onChange={handleSelectAll}
                    className="accent-[#8C7355] rounded"
                  />
                  <span>Select All ({filteredTrash.length})</span>
                </label>
                <span>Click "Restore as Separate Copy" to add an independent piece back to wardrobe</span>
              </div>

              {filteredTrash.map((item) => {
                const data = item.itemData || {};
                const isExpanded = expandedItemId === item.id;
                const isSelected = selectedTrashIds.includes(item.id);
                const title = data.name || 'Untitled Garment';
                const brand = data.brand || 'Unbranded';
                const price = data.purchasePrice || data.listingPrice || data.estimatedPrice || data.actualPricePaid || 0;

                return (
                  <div
                    key={item.id}
                    className={`border rounded-lg bg-white transition-all ${
                      isSelected ? 'border-[#8C7355] ring-1 ring-[#8C7355] bg-amber-50/20' : 'border-[#E5E5E1] hover:border-[#8C7355]/40'
                    }`}
                  >
                    <div className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Left: Thumbnail & Info */}
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTrashIds((prev) => [...prev, item.id]);
                            } else {
                              setSelectedTrashIds((prev) => prev.filter((id) => id !== item.id));
                            }
                          }}
                          className="accent-[#8C7355] rounded shrink-0"
                        />

                        {/* Image */}
                        <div className="w-12 h-14 rounded-md border border-[#E5E5E1] overflow-hidden bg-[#F8F7F4] shrink-0 flex items-center justify-center">
                          {data.imageUrl ? (
                            <GarmentImage
                              src={data.imageUrl}
                              alt={title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Shirt className="w-5 h-5 text-[#9A9A95]" />
                          )}
                        </div>

                        {/* Title & Metadata */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-[#1A1A1A] truncate">
                              {brand} · {title}
                            </span>
                            {getReasonBadge(item.reason)}
                            <span className="inline-flex items-center gap-1 text-[11px] text-[#767670] font-mono">
                              {getTypeIcon(item.itemType)}
                              <span className="capitalize">{item.itemType}</span>
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-[#767670] mt-0.5 flex-wrap">
                            {data.category && <span>{data.category}</span>}
                            {data.color && (
                              <>
                                <span>•</span>
                                <span>{data.color}</span>
                              </>
                            )}
                            {data.size && (
                              <>
                                <span>•</span>
                                <span>Size: {data.size}</span>
                              </>
                            )}
                            {price > 0 && (
                              <>
                                <span>•</span>
                                <span className="font-semibold text-[#1A1A1A]">
                                  {currencySymbol}
                                  {price}
                                </span>
                              </>
                            )}
                            <span>•</span>
                            <span className="inline-flex items-center gap-1 text-[#9A9A95]">
                              <Clock className="w-3 h-3" />
                              {formatRelativeTime(item.deletedAt)}
                            </span>
                          </div>

                          {item.description && (
                            <p className="text-[11px] text-amber-900/80 font-medium mt-1">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                          className="p-1.5 text-xs text-[#767670] hover:text-[#1A1A1A] hover:bg-[#F3F2EE] rounded-md transition cursor-pointer"
                          title="View all garment details"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => restoreFromTrash(item.id, false)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold bg-[#8C7355] text-white hover:bg-[#786247] transition shadow-xs cursor-pointer"
                          title="Restore item back to original place"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Restore</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => restoreFromTrash(item.id, true)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold bg-white border border-[#E5E5E1] text-[#1A1A1A] hover:bg-[#F3F2EE] transition shadow-xs cursor-pointer"
                          title="Restore as an independent duplicate copy so existing items remain untouched"
                        >
                          <CopyPlus className="w-3.5 h-3.5 text-[#8C7355]" />
                          <span>As New Copy</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => permanentlyDeleteFromTrash(item.id)}
                          className="p-1.5 rounded-md text-rose-600 hover:text-rose-800 hover:bg-rose-50 transition cursor-pointer"
                          title="Permanently remove from trash"
                          aria-label="Permanently delete item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Expanded Detail View */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-2 border-t border-[#E5E5E1] bg-[#F8F7F4]/50 text-xs space-y-2">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[#5A5A55]">
                          <div>
                            <span className="block text-[10px] uppercase font-mono text-[#9A9A95]">Item ID</span>
                            <span className="font-mono text-[11px] text-[#1A1A1A]">{item.originalId}</span>
                          </div>
                          <div>
                            <span className="block text-[10px] uppercase font-mono text-[#9A9A95]">Condition</span>
                            <span>{data.condition || 'Good'}</span>
                          </div>
                          <div>
                            <span className="block text-[10px] uppercase font-mono text-[#9A9A95]">Material</span>
                            <span>{data.material || 'Standard'}</span>
                          </div>
                          <div>
                            <span className="block text-[10px] uppercase font-mono text-[#9A9A95]">Location</span>
                            <span>{data.storageLocation || 'Main Wardrobe'}</span>
                          </div>
                          {data.purchaseDate && (
                            <div>
                              <span className="block text-[10px] uppercase font-mono text-[#9A9A95]">Purchase Date</span>
                              <span>{data.purchaseDate}</span>
                            </div>
                          )}
                          {data.wearCount !== undefined && (
                            <div>
                              <span className="block text-[10px] uppercase font-mono text-[#9A9A95]">Times Worn</span>
                              <span>{data.wearCount}</span>
                            </div>
                          )}
                          {item.overwrittenBy?.name && (
                            <div className="col-span-2">
                              <span className="block text-[10px] uppercase font-mono text-[#9A9A95]">Overwritten / Merged By</span>
                              <span className="font-semibold text-amber-900">{item.overwrittenBy.name}</span>
                            </div>
                          )}
                        </div>

                        {data.notes && (
                          <div className="bg-white p-2.5 rounded border border-[#E5E5E1]">
                            <span className="block text-[10px] uppercase font-mono text-[#9A9A95] mb-0.5">Notes</span>
                            <p className="text-xs text-[#1A1A1A] whitespace-pre-wrap">{data.notes}</p>
                          </div>
                        )}

                        {Array.isArray(data.tags) && data.tags.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap pt-1">
                            <Tag className="w-3 h-3 text-[#9A9A95]" />
                            {data.tags.map((t: string, idx: number) => (
                              <span
                                key={idx}
                                className="px-1.5 py-0.5 rounded text-[10px] bg-white border border-[#E5E5E1] text-[#767670]"
                              >
                                #{t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#E5E5E1] bg-white flex items-center justify-between text-xs text-[#767670]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Trash is saved locally and kept safe from accidental overrides.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-[#E5E5E1] font-semibold text-[#1A1A1A] hover:bg-[#F3F2EE] transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

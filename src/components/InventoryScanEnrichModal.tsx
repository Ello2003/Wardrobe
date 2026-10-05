import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Search,
  CheckCircle2,
  X,
  Palette,
  Layers,
  Ruler,
  Sliders,
  Scissors,
  PoundSterling,
  Camera,
  RotateCcw,
  Check,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Tag,
  ExternalLink,
  ChevronRight,
  EyeOff,
  Filter,
  RefreshCw,
  Plus,
  Edit2,
  ListPlus,
} from 'lucide-react';
import { useWardrobe } from '../context/WardrobeContext';
import { WardrobeItem, Category } from '../types';
import { GarmentImage } from './GarmentImage';
import {
  ProposedEnrichment,
  scanInventoryBatch,
  enrichSingleGarment,
  checkItemIncomplete,
  ScanFilterTab,
  scanGarmentPhotoWithVision,
} from '../services/inventoryScannerService';
import { getColorSwatchHex } from './duplicateMerge/duplicateUtils';
import { ProductImagePickerModal } from './ProductImagePickerModal';
import { CategorySelect } from './common/CategorySelect';

interface InventoryScanEnrichModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenBatchPaste?: () => void;
  initialFilter?: ScanFilterTab;
}

export const InventoryScanEnrichModal: React.FC<InventoryScanEnrichModalProps> = ({
  isOpen,
  onClose,
  onOpenBatchPaste,
  initialFilter = 'all',
}) => {
  const { items, categories, updateItem, batchUpdateItems, undoLastAction, canUndo, formatCurrency } =
    useWardrobe();

  // Scanning state
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<{ current: number; total: number; title: string }>({
    current: 0,
    total: 0,
    title: '',
  });

  // Enrichment proposals
  const [proposals, setProposals] = useState<ProposedEnrichment[]>([]);
  const [dismissedItemIds, setDismissedItemIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('inventory_scan_dismissed_ids');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  // User-selected fields to apply per proposal: itemId -> { [field]: boolean }
  const [selectedFieldsMap, setSelectedFieldsMap] = useState<Record<string, Record<string, boolean>>>({});
  // Selected photo overrides if user picked an alternative candidate thumbnail
  const [photoOverrides, setPhotoOverrides] = useState<Record<string, string>>({});
  const [pickerProposal, setPickerProposal] = useState<ProposedEnrichment | null>(null);

  // Intelligence Scan Mode: Deep Gemini AI vs Fast Offline Heuristics
  const [scanMode, setScanMode] = useState<'deep_ai' | 'fast_only'>('deep_ai');
  const [scanningPhotoItemId, setScanningPhotoItemId] = useState<string | null>(null);

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState<ScanFilterTab>(initialFilter);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'cards' | 'compact'>('cards');
  const [lastActionMessage, setLastActionMessage] = useState<string | null>(null);

  // Edit / Fine-Tune Drawer state for single item
  const [fineTuneItem, setFineTuneItem] = useState<ProposedEnrichment | null>(null);
  const [fineTuneDraft, setFineTuneDraft] = useState<Partial<WardrobeItem>>({});

  // Auto-scan on initial open if no proposals exist yet
  const runAutoScan = useCallback(async (customMode?: 'deep_ai' | 'fast_only') => {
    setIsScanning(true);
    const activeMode = customMode || scanMode;
    try {
      const results = await scanInventoryBatch(
        items,
        (current, total, title) => {
          setScanProgress({ current, total, title });
        },
        activeMode
      );
      setProposals(results);

      // Initialize default field selections (everything checked by default)
      const initialMap: Record<string, Record<string, boolean>> = {};
      results.forEach((p) => {
        initialMap[p.itemId] = {
          photo: Boolean(p.proposedImageUrl && (!p.originalItem.imageUrl || p.originalItem.imageUrl === '')),
          brand: Boolean(p.proposedBrand && p.proposedBrand !== p.originalItem.brand),
          name: Boolean(p.proposedName && p.proposedName !== p.originalItem.name),
          category: Boolean(p.proposedCategory && p.proposedCategory !== p.originalItem.category),
          color: Boolean(p.proposedColor && p.proposedColor !== p.originalItem.color),
          material: Boolean(p.proposedMaterial && p.proposedMaterial !== p.originalItem.material),
          size: Boolean(p.proposedSize && p.proposedSize !== p.originalItem.size),
          careNotes: Boolean(p.proposedCareNotes && !p.originalItem.careNotes),
          rrp: Boolean(p.proposedRrp && !p.originalItem.rrp),
          tags: true,
        };
      });
      setSelectedFieldsMap(initialMap);
    } catch (e) {
      console.error('Inventory scan failed:', e);
    } finally {
      setIsScanning(false);
    }
  }, [items, scanMode]);

  useEffect(() => {
    if (isOpen && proposals.length === 0) {
      runAutoScan();
    }
  }, [isOpen, proposals.length, runAutoScan]);

  // Persist dismissed IDs
  const handleDismiss = (itemId: string) => {
    setDismissedItemIds((prev) => {
      const next = new Set(prev);
      next.add(itemId);
      try {
        localStorage.setItem('inventory_scan_dismissed_ids', JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  const handleRestoreDismissed = (itemId: string) => {
    setDismissedItemIds((prev) => {
      const next = new Set(prev);
      next.delete(itemId);
      try {
        localStorage.setItem('inventory_scan_dismissed_ids', JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  const handleRestoreAllDismissed = () => {
    setDismissedItemIds(new Set());
    try {
      localStorage.removeItem('inventory_scan_dismissed_ids');
    } catch {}
  };

  // Toggle individual field to apply
  const toggleFieldSelection = (itemId: string, field: string) => {
    setSelectedFieldsMap((prev) => {
      const current = prev[itemId] || {};
      return {
        ...prev,
        [itemId]: {
          ...current,
          [field]: !current[field],
        },
      };
    });
  };

  // Select alternative candidate photo
  const handleSelectCandidatePhoto = (itemId: string, photoUrl: string) => {
    setPhotoOverrides((prev) => ({
      ...prev,
      [itemId]: photoUrl,
    }));
  };

  // Perform immediate single photo vision inspection with Gemini Vision AI
  const handleVisionScanSingle = async (proposal: ProposedEnrichment) => {
    const photoToScan = photoOverrides[proposal.itemId] || proposal.originalItem.imageUrl || proposal.proposedImageUrl;
    if (!photoToScan) return;
    setScanningPhotoItemId(proposal.itemId);
    try {
      const auditResult = await scanGarmentPhotoWithVision(proposal.originalItem, photoToScan);
      if (auditResult) {
        setProposals((prev) =>
          prev.map((p) => (p.itemId === proposal.itemId ? { ...auditResult, isApplied: false } : p))
        );
        setSelectedFieldsMap((prev) => ({
          ...prev,
          [proposal.itemId]: {
            ...(prev[proposal.itemId] || {}),
            brand: true,
            name: true,
            category: true,
            color: true,
            material: true,
            size: Boolean(auditResult.proposedSize),
            careNotes: Boolean(auditResult.proposedCareNotes),
            rrp: Boolean(auditResult.proposedRrp),
          },
        }));
        setLastActionMessage(
          `Gemini Vision AI successfully audited "${proposal.originalItem.brand || ''} ${proposal.originalItem.name}".`
        );
      }
    } catch (err) {
      console.error('Vision scan error:', err);
    } finally {
      setScanningPhotoItemId(null);
    }
  };

  // Single Item: Apply enrichment
  const handleApplySingle = (proposal: ProposedEnrichment) => {
    const selected = selectedFieldsMap[proposal.itemId] || {};
    const photoToApply = photoOverrides[proposal.itemId] || proposal.proposedImageUrl;

    const updates: Partial<WardrobeItem> = {};
    if (selected.photo && photoToApply) updates.imageUrl = photoToApply;
    if (selected.brand && proposal.proposedBrand) updates.brand = proposal.proposedBrand;
    if (selected.name && proposal.proposedName) updates.name = proposal.proposedName;
    if (selected.category && proposal.proposedCategory) {
      updates.category = proposal.proposedCategory;
      if (proposal.proposedSubcategory) updates.subcategory = proposal.proposedSubcategory;
    }
    if (selected.color && proposal.proposedColor) {
      updates.color = proposal.proposedColor;
      updates.colorHex = proposal.proposedColorHex;
    }
    if (selected.material && proposal.proposedMaterial) updates.material = proposal.proposedMaterial;
    if (selected.size && proposal.proposedSize) updates.size = proposal.proposedSize;
    if (selected.careNotes && proposal.proposedCareNotes) updates.careNotes = proposal.proposedCareNotes;
    if (selected.rrp && proposal.proposedRrp) updates.rrp = proposal.proposedRrp;
    if (selected.tags && proposal.proposedTags) {
      updates.tags = Array.from(new Set([...(proposal.originalItem.tags || []), ...proposal.proposedTags]));
    }

    updateItem(proposal.itemId, updates);

    // Mark as applied in local state
    setProposals((prev) =>
      prev.map((p) => (p.itemId === proposal.itemId ? { ...p, isApplied: true } : p))
    );

    setLastActionMessage(
      `Updated "${proposal.originalItem.brand || ''} ${proposal.originalItem.name}" with enriched attributes.`
    );
  };

  // Batch Apply All High-Confidence Enrichments
  const handleBatchApplyAll = () => {
    const activeProposals = proposals.filter(
      (p) => !p.isApplied && !dismissedItemIds.has(p.itemId)
    );

    if (activeProposals.length === 0) return;

    let appliedCount = 0;
    activeProposals.forEach((p) => {
      const selected = selectedFieldsMap[p.itemId] || {};
      const photoToApply = photoOverrides[p.itemId] || p.proposedImageUrl;

      const updates: Partial<WardrobeItem> = {};
      if (selected.photo && photoToApply) updates.imageUrl = photoToApply;
      if (selected.brand && p.proposedBrand) updates.brand = p.proposedBrand;
      if (selected.name && p.proposedName) updates.name = p.proposedName;
      if (selected.category && p.proposedCategory) updates.category = p.proposedCategory;
      if (selected.color && p.proposedColor) {
        updates.color = p.proposedColor;
        updates.colorHex = p.proposedColorHex;
      }
      if (selected.material && p.proposedMaterial) updates.material = p.proposedMaterial;
      if (selected.size && p.proposedSize) updates.size = p.proposedSize;
      if (selected.careNotes && p.proposedCareNotes) updates.careNotes = p.proposedCareNotes;
      if (selected.rrp && p.proposedRrp) updates.rrp = p.proposedRrp;
      if (selected.tags && p.proposedTags) {
        updates.tags = Array.from(new Set([...(p.originalItem.tags || []), ...p.proposedTags]));
      }

      if (Object.keys(updates).length > 0) {
        updateItem(p.itemId, updates);
        appliedCount++;
      }
    });

    setProposals((prev) =>
      prev.map((p) => (!dismissedItemIds.has(p.itemId) ? { ...p, isApplied: true } : p))
    );

    setLastActionMessage(`Successfully auto-enriched ${appliedCount} wardrobe pieces in inventory.`);
  };

  // Filter proposals according to active tabs & search
  const filteredProposals = useMemo(() => {
    return proposals.filter((p) => {
      const isDismissed = dismissedItemIds.has(p.itemId);
      if (activeTab === 'dismissed') {
        if (!isDismissed) return false;
      } else {
        if (isDismissed) return false;
        if (p.isApplied) return false;

        // Specific Tab Filters
        if (activeTab === 'missing_photo') {
          if (p.originalItem.imageUrl && p.originalItem.imageUrl.trim() !== '') return false;
        } else if (activeTab === 'missing_material') {
          const mat = (p.originalItem.material || '').toLowerCase();
          if (mat && !mat.includes('natural fiber') && !mat.includes('quality fabric') && mat !== 'unspecified') {
            return false;
          }
        } else if (activeTab === 'missing_color') {
          const col = (p.originalItem.color || '').toLowerCase();
          if (col && col !== 'neutral' && col !== 'unspecified') return false;
        } else if (activeTab === 'missing_size') {
          if (p.originalItem.size && p.originalItem.size.trim() !== '') return false;
        } else if (activeTab === 'missing_valuation') {
          if (p.originalItem.rrp && p.originalItem.rrp > 0) return false;
        }
      }

      // Category Filter
      if (selectedCategoryFilter !== 'All') {
        if ((p.originalItem.category || '').toLowerCase() !== selectedCategoryFilter.toLowerCase()) {
          return false;
        }
      }

      // Search Query
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase();
        const matchTitle = p.originalItem.name.toLowerCase().includes(q) || (p.proposedName || '').toLowerCase().includes(q);
        const matchBrand = p.originalItem.brand.toLowerCase().includes(q) || (p.proposedBrand || '').toLowerCase().includes(q);
        const matchCat = (p.originalItem.category || '').toLowerCase().includes(q);
        const matchMat = (p.proposedMaterial || '').toLowerCase().includes(q);
        const matchCol = (p.proposedColor || '').toLowerCase().includes(q);
        const matchSize = (p.proposedSize || '').toLowerCase().includes(q) || (p.originalItem.size || '').toLowerCase().includes(q);
        if (!matchTitle && !matchBrand && !matchCat && !matchMat && !matchCol && !matchSize) {
          return false;
        }
      }

      return true;
    });
  }, [proposals, dismissedItemIds, activeTab, selectedCategoryFilter, searchFilter]);

  // Tab counts
  const tabCounts = useMemo(() => {
    const active = proposals.filter((p) => !p.isApplied && !dismissedItemIds.has(p.itemId));
    return {
      all: active.length,
      missing_photo: active.filter((p) => !p.originalItem.imageUrl).length,
      missing_material: active.filter((p) => checkItemIncomplete(p.originalItem).missingMaterial).length,
      missing_color: active.filter((p) => checkItemIncomplete(p.originalItem).missingColor).length,
      missing_size: active.filter((p) => checkItemIncomplete(p.originalItem).missingSize).length,
      missing_valuation: active.filter((p) => !p.originalItem.rrp).length,
      dismissed: dismissedItemIds.size,
    };
  }, [proposals, dismissedItemIds]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/65 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="bg-[#FAF9F6] border border-[#E5E5E1] shadow-2xl w-full max-w-7xl h-[94vh] flex flex-col overflow-hidden rounded-xs">
        {/* ================= TOP HEADER (HUMIDOR STANDARD) ================= */}
        <div className="bg-white border-b border-[#E5E5E1] px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xs bg-[#8C7355] text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-serif font-bold text-[#1A1A1A]">
                  Inventory Intelligence &amp; Autofill Scanner
                </h2>
                <span className="bg-[#8C7355]/10 text-[#8C7355] text-[11px] font-mono font-bold px-2 py-0.5 rounded-xs border border-[#8C7355]/30">
                  Autonomous Multi-Engine Scout
                </span>
              </div>
              <p className="text-xs text-[#767670] mt-0.5">
                Automatically scans inventory pieces for missing photos, fabric composition, colorways, categories, and retail valuation with side-by-side verification.
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2">
            {canUndo && (
              <button
                type="button"
                onClick={undoLastAction}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono bg-white hover:bg-[#F2F1ED] text-[#1A1A1A] border border-[#D5D5D0] rounded-xs shadow-2xs transition-colors cursor-pointer"
                title="Undo last applied enrichment"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#8C7355]" />
                <span>Undo</span>
              </button>
            )}

            {onOpenBatchPaste && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenBatchPaste();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold bg-white hover:bg-[#F2F1ED] text-[#8C7355] border border-[#8C7355]/40 rounded-xs shadow-xs transition-colors cursor-pointer"
                title="Paste a multi-line list of items to create them in batch"
              >
                <ListPlus className="w-3.5 h-3.5" />
                <span>Batch Paste Lines</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => runAutoScan()}
              disabled={isScanning}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold bg-white hover:bg-[#F2F1ED] text-[#1A1A1A] border border-[#D5D5D0] rounded-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              title="Run a complete scan across closet inventory"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#8C7355] ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Scanning...' : 'Re-Scan Closet'}</span>
            </button>

            <button
              type="button"
              onClick={handleBatchApplyAll}
              disabled={filteredProposals.length === 0 || isScanning}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold bg-[#8C7355] hover:bg-[#735D43] text-white rounded-xs shadow-xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title="Apply all verified high-confidence enrichments across all items at once"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-200" />
              <span>Accept All Enriched ({filteredProposals.length})</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-[#767670] hover:text-[#1A1A1A] rounded-xs hover:bg-[#F2F1ED] transition-colors cursor-pointer"
              title="Close Scanner"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Scan Progress Banner */}
        {isScanning && (
          <div className="bg-[#FAF0E6] border-b border-[#E6D7C8] px-5 py-2.5 flex items-center justify-between text-xs font-mono text-[#5C4033] shrink-0">
            <div className="flex items-center gap-2.5">
              <RefreshCw className="w-4 h-4 text-[#8C7355] animate-spin shrink-0" />
              <span>
                Scouting Web &amp; Analyzing Catalogues: Item <strong>{scanProgress.current}</strong> of{' '}
                <strong>{scanProgress.total}</strong> — <em>"{scanProgress.title}"</em>
              </span>
            </div>
            <div className="w-32 bg-stone-200 h-2 rounded-full overflow-hidden border border-stone-300">
              <div
                className="bg-[#8C7355] h-full transition-all duration-300"
                style={{
                  width: `${scanProgress.total ? (scanProgress.current / scanProgress.total) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Action Confirmation Banner */}
        {lastActionMessage && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-2 flex items-center justify-between text-xs font-mono text-emerald-900 shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{lastActionMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setLastActionMessage(null)}
              className="text-emerald-700 hover:text-emerald-950 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* ================= TOOLBAR & SEARCH ================= */}
        <div className="bg-[#F8F7F4] border-b border-[#E5E5E1] p-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Filter by piece, brand, fabric, color, or category..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs font-mono bg-white border border-[#D5D5D0] rounded-xs text-[#1A1A1A] placeholder:text-[#A5A59E] focus:outline-none focus:border-[#8C7355]"
              />
              <Search className="w-3.5 h-3.5 text-[#8C7355] absolute left-2.5 top-2.5" />
            </div>

            <div className="w-48 shrink-0">
              <CategorySelect
                value={selectedCategoryFilter}
                onChange={(val) => setSelectedCategoryFilter(val)}
                categories={categories}
                includeAllOption={true}
                allOptionLabel="All Categories"
                className="px-2.5 py-1.5 text-xs font-mono"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Intelligence Engine Selector */}
            <div className="flex items-center bg-white border border-[#D5D5D0] p-0.5 rounded-xs text-[11px] font-mono">
              <button
                type="button"
                onClick={() => {
                  setScanMode('deep_ai');
                  runAutoScan('deep_ai');
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-2xs cursor-pointer font-bold transition-all ${
                  scanMode === 'deep_ai'
                    ? 'bg-[#8C7355] text-white shadow-2xs'
                    : 'text-[#767670] hover:text-[#1A1A1A]'
                }`}
                title="Deep audit using Gemini 3.8 Flash luxury & heritage curation knowledge"
              >
                <Sparkles className={`w-3 h-3 ${scanMode === 'deep_ai' ? 'text-amber-200' : 'text-[#8C7355]'}`} />
                <span>Gemini 3.8 Flash AI</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setScanMode('fast_only');
                  runAutoScan('fast_only');
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-2xs cursor-pointer font-semibold transition-all ${
                  scanMode === 'fast_only'
                    ? 'bg-[#8C7355] text-white shadow-2xs'
                    : 'text-[#767670] hover:text-[#1A1A1A]'
                }`}
                title="Instant offline catalog parsing"
              >
                <span>Fast Heuristic Engine</span>
              </button>
            </div>

            <div className="text-xs font-mono text-[#767670]">
              Showing <strong className="text-[#1A1A1A]">{filteredProposals.length}</strong> items to review
            </div>
          </div>
        </div>

        {/* ================= AUDIT / SCOPE TABS ================= */}
        <div className="bg-white border-b border-[#E5E5E1] px-4 flex items-center justify-between shrink-0 text-xs font-mono overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-2.5 border-b-2 font-bold transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'border-[#8C7355] text-[#8C7355]'
                  : 'border-transparent text-[#767670] hover:text-[#1A1A1A]'
              }`}
            >
              All Incomplete ({tabCounts.all})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('missing_photo')}
              className={`px-3 py-2.5 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'missing_photo'
                  ? 'border-[#8C7355] text-[#8C7355] font-bold'
                  : 'border-transparent text-[#767670] hover:text-[#1A1A1A]'
              }`}
            >
              <Camera className="w-3.5 h-3.5 text-amber-600" />
              <span>Missing Photos ({tabCounts.missing_photo})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('missing_material')}
              className={`px-3 py-2.5 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'missing_material'
                  ? 'border-[#8C7355] text-[#8C7355] font-bold'
                  : 'border-transparent text-[#767670] hover:text-[#1A1A1A]'
              }`}
            >
              <Scissors className="w-3.5 h-3.5 text-blue-600" />
              <span>Missing Fabrics ({tabCounts.missing_material})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('missing_color')}
              className={`px-3 py-2.5 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'missing_color'
                  ? 'border-[#8C7355] text-[#8C7355] font-bold'
                  : 'border-transparent text-[#767670] hover:text-[#1A1A1A]'
              }`}
            >
              <Palette className="w-3.5 h-3.5 text-teal-600" />
              <span>Missing Colors ({tabCounts.missing_color})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('missing_size')}
              className={`px-3 py-2.5 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'missing_size'
                  ? 'border-[#8C7355] text-[#8C7355] font-bold'
                  : 'border-transparent text-[#767670] hover:text-[#1A1A1A]'
              }`}
            >
              <Ruler className="w-3.5 h-3.5 text-indigo-600" />
              <span>Missing Sizing ({tabCounts.missing_size})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('missing_valuation')}
              className={`px-3 py-2.5 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'missing_valuation'
                  ? 'border-[#8C7355] text-[#8C7355] font-bold'
                  : 'border-transparent text-[#767670] hover:text-[#1A1A1A]'
              }`}
            >
              <PoundSterling className="w-3.5 h-3.5 text-emerald-600" />
              <span>Missing Valuation / RRP ({tabCounts.missing_valuation})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('dismissed')}
              className={`px-3 py-2.5 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ml-2 ${
                activeTab === 'dismissed'
                  ? 'border-stone-800 text-stone-900 font-bold bg-stone-50'
                  : 'border-transparent text-[#767670] hover:text-[#1A1A1A]'
              }`}
            >
              <EyeOff className="w-3.5 h-3.5 text-stone-500" />
              <span>Dismissed ({tabCounts.dismissed})</span>
            </button>
          </div>

          {activeTab === 'dismissed' && tabCounts.dismissed > 0 && (
            <button
              type="button"
              onClick={handleRestoreAllDismissed}
              className="flex items-center gap-1 text-xs font-mono text-[#8C7355] hover:text-[#735D43] font-bold cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restore All Dismissed</span>
            </button>
          )}
        </div>

        {/* ================= REVIEW CONTENT (SIDE-BY-SIDE DIFF CARDS) ================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {filteredProposals.length > 0 ? (
            filteredProposals.map((proposal) => {
              const item = proposal.originalItem;
              const selected = selectedFieldsMap[proposal.itemId] || {};
              const currentActivePhoto = photoOverrides[proposal.itemId] || proposal.proposedImageUrl;
              const incompleteInfo = checkItemIncomplete(item);

              return (
                <div
                  key={proposal.itemId}
                  className="bg-white border border-[#E5E5E1] shadow-xs rounded-xs overflow-hidden transition-all hover:border-[#D5D5D0]"
                >
                  {/* Card Header */}
                  <div className="bg-[#FAF9F6] border-b border-[#E5E5E1] px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-serif font-bold text-sm text-[#1A1A1A]">
                        {item.brand && item.brand !== 'Curated Brand' ? `${item.brand} — ` : ''}
                        {item.name}
                      </span>
                      <span className="bg-[#8C7355]/10 text-[#8C7355] text-[10px] font-mono font-semibold px-2 py-0.5 rounded-xs border border-[#8C7355]/30">
                        {item.category}
                      </span>
                      {proposal.engineUsed?.includes('gemini') ? (
                        <span className="flex items-center gap-1 bg-purple-50 text-purple-700 text-[10px] font-mono font-bold px-2 py-0.5 rounded-xs border border-purple-200">
                          <Sparkles className="w-2.5 h-2.5 text-purple-600" />
                          Gemini 3.8 Flash AI
                        </span>
                      ) : (
                        <span className="bg-stone-100 text-stone-600 text-[10px] font-mono px-2 py-0.5 rounded-xs border border-stone-200">
                          Heuristic Engine
                        </span>
                      )}
                      {incompleteInfo.missingPhoto && (
                        <span className="bg-rose-50 text-rose-700 text-[10px] font-mono px-1.5 py-0.2 rounded-xs border border-rose-200">
                          Missing Photo
                        </span>
                      )}
                      {incompleteInfo.missingMaterial && (
                        <span className="bg-amber-50 text-amber-800 text-[10px] font-mono px-1.5 py-0.2 rounded-xs border border-amber-200">
                          Missing Fabric
                        </span>
                      )}
                      {incompleteInfo.missingSize && (
                        <span className="bg-indigo-50 text-indigo-700 text-[10px] font-mono px-1.5 py-0.2 rounded-xs border border-indigo-200">
                          Missing Sizing
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 border border-emerald-200 rounded-xs">
                        {proposal.confidence}% Confidence
                      </span>
                      <span className="text-[#767670]">•</span>
                      <span className="text-[#767670]">
                        {proposal.improvements.join(' · ')}
                      </span>
                    </div>
                  </div>

                  {/* Dual Column Side-by-Side Diff Layout */}
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 divide-y md:divide-y-0 md:divide-x divide-[#E5E5E1]">
                    {/* LEFT COLUMN: Current Inventory Record */}
                    <div className="space-y-3 md:pr-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono font-bold text-[#767670] uppercase tracking-wider">
                          Current Closet Record
                        </span>
                        <span className="text-[11px] font-mono text-[#A5A59E]">
                          Value: {formatCurrency(item.purchasePrice || 0)}
                        </span>
                      </div>

                      <div className="flex gap-3.5">
                        {/* Current Garment Photo */}
                        <div className="w-24 h-28 bg-[#F8F7F4] border border-[#E5E5E1] rounded-xs overflow-hidden shrink-0 flex flex-col items-center justify-center relative">
                          {item.imageUrl ? (
                            <GarmentImage
                              src={item.imageUrl}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="text-center p-2">
                              <Camera className="w-6 h-6 text-[#A5A59E] mx-auto mb-1" />
                              <span className="text-[9px] font-mono text-rose-600 font-semibold block">
                                No Photo
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Current Attributes */}
                        <div className="flex-1 space-y-1 text-xs font-mono">
                          <div>
                            <span className="text-[#767670]">Brand: </span>
                            <strong className="text-[#1A1A1A]">{item.brand || 'Unbranded'}</strong>
                          </div>
                          <div>
                            <span className="text-[#767670]">Model: </span>
                            <span className="text-[#1A1A1A]">{item.name}</span>
                          </div>
                          <div>
                            <span className="text-[#767670]">Category: </span>
                            <span className="text-[#1A1A1A]">{item.category} {item.subcategory ? `(${item.subcategory})` : ''}</span>
                          </div>
                          <div>
                            <span className="text-[#767670]">Size: </span>
                            <span className={incompleteInfo.missingSize ? 'text-amber-800 italic' : 'text-[#1A1A1A] font-semibold'}>
                              {item.size || 'Unspecified (Missing)'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[#767670]">Colour: </span>
                            <span
                              className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0"
                              style={{ backgroundColor: getColorSwatchHex(item.color) }}
                            />
                            <span className="text-[#1A1A1A]">{item.color || 'Unspecified'}</span>
                          </div>
                          <div>
                            <span className="text-[#767670]">Fabric: </span>
                            <span className={incompleteInfo.missingMaterial ? 'text-amber-800 italic' : 'text-[#1A1A1A]'}>
                              {item.material || 'Unspecified (Missing)'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[#767670]">Est. RRP: </span>
                            <span className="text-[#1A1A1A]">
                              {item.rrp ? formatCurrency(item.rrp) : 'Not specified'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* RIGHT COLUMN: Found & Discovered Updates */}
                    <div className="space-y-3 md:pl-4 pt-3 md:pt-0 bg-amber-50/20 p-2.5 rounded-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono font-bold text-[#8C7355] uppercase tracking-wider flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Discovered &amp; Proposed Autofill</span>
                        </span>
                        <span className="text-[10px] font-mono text-[#8C7355] font-semibold">
                          Select fields to apply
                        </span>
                      </div>

                      <div className="flex gap-3.5">
                        {/* Found Photo + Candidate Thumbs */}
                        <div className="space-y-1.5 shrink-0">
                          <div className="w-24 h-28 bg-white border-2 border-[#8C7355] rounded-xs overflow-hidden relative shadow-xs">
                            {currentActivePhoto ? (
                              <GarmentImage
                                src={currentActivePhoto}
                                alt="Discovered garment photo"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center p-2 text-center text-[9px] font-mono text-[#767670]">
                                No photo located
                              </div>
                            )}
                            {currentActivePhoto && (
                              <span className="absolute bottom-0 inset-x-0 bg-emerald-800 text-white text-[8px] font-mono font-bold text-center py-0.5">
                                DISCOVERED
                              </span>
                            )}
                          </div>

                          {/* Candidate Thumbnails Strip */}
                          {proposal.candidateImages && proposal.candidateImages.length > 1 && (
                            <div className="w-24">
                              <span className="text-[8px] font-mono text-[#767670] block text-center mb-0.5">
                                Alternate photos:
                              </span>
                              <div className="flex gap-1 overflow-x-auto no-scrollbar pb-0.5">
                                {proposal.candidateImages.slice(0, 4).map((cUrl, cIdx) => (
                                  <button
                                    key={cIdx}
                                    type="button"
                                    onClick={() => handleSelectCandidatePhoto(proposal.itemId, cUrl)}
                                    className={`w-5 h-6 rounded-2xs border overflow-hidden shrink-0 cursor-pointer ${
                                      currentActivePhoto === cUrl
                                        ? 'border-[#8C7355] ring-1 ring-[#8C7355]'
                                        : 'border-[#D5D5D0] opacity-70 hover:opacity-100'
                                    }`}
                                    title="Click to select this photo"
                                  >
                                    <img src={cUrl} alt="" className="w-full h-full object-cover" />
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Search Photo across Google & Brand Sites */}
                          <button
                            type="button"
                            onClick={() => setPickerProposal(proposal)}
                            className="w-24 px-1.5 py-1 bg-white hover:bg-[#FAF0E6] border border-[#8C7355]/40 text-[#8C7355] text-[9px] font-mono font-bold rounded-2xs flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-2xs"
                            title="Search Google Grounding, Brand Stores & Luxury Stockists"
                          >
                            <Search className="w-2.5 h-2.5" />
                            <span>Find Photo</span>
                          </button>

                          {/* Vision AI Audit Button */}
                          {(currentActivePhoto || item.imageUrl) && (
                            <button
                              type="button"
                              onClick={() => handleVisionScanSingle(proposal)}
                              disabled={scanningPhotoItemId === proposal.itemId}
                              className="w-24 px-1.5 py-1 bg-white hover:bg-purple-50 border border-purple-300 text-purple-700 text-[9px] font-mono font-bold rounded-2xs flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-2xs disabled:opacity-50"
                              title="Inspect garment photo with Gemini Vision AI"
                            >
                              <Sparkles className={`w-2.5 h-2.5 ${scanningPhotoItemId === proposal.itemId ? 'animate-spin' : ''}`} />
                              <span>{scanningPhotoItemId === proposal.itemId ? 'Auditing...' : 'Vision Audit'}</span>
                            </button>
                          )}
                        </div>

                        {/* Interactive Proposed Attributes with Checkboxes */}
                        <div className="flex-1 space-y-1.5 text-xs font-mono">
                          {/* Photo checkbox */}
                          <label className="flex items-center gap-1.5 cursor-pointer text-[#1A1A1A]">
                            <input
                              type="checkbox"
                              checked={Boolean(selected.photo)}
                              onChange={() => toggleFieldSelection(proposal.itemId, 'photo')}
                              className="accent-[#8C7355] cursor-pointer"
                            />
                            <span className="text-[#767670]">Apply Photo</span>
                            {currentActivePhoto && (
                              <span className="text-emerald-700 font-bold text-[10px] bg-emerald-100/80 px-1 py-0.2 rounded-2xs">
                                High-Res
                              </span>
                            )}
                          </label>

                          {/* Brand checkbox */}
                          <label className="flex items-center gap-1.5 cursor-pointer text-[#1A1A1A]">
                            <input
                              type="checkbox"
                              checked={Boolean(selected.brand)}
                              onChange={() => toggleFieldSelection(proposal.itemId, 'brand')}
                              className="accent-[#8C7355] cursor-pointer"
                            />
                            <span className="text-[#767670]">Brand:</span>
                            <strong className="text-[#1A1A1A]">{proposal.proposedBrand}</strong>
                          </label>

                          {/* Model Title checkbox */}
                          <label className="flex items-center gap-1.5 cursor-pointer text-[#1A1A1A]">
                            <input
                              type="checkbox"
                              checked={Boolean(selected.name)}
                              onChange={() => toggleFieldSelection(proposal.itemId, 'name')}
                              className="accent-[#8C7355] cursor-pointer"
                            />
                            <span className="text-[#767670]">Clean Title:</span>
                            <span className="text-[#1A1A1A]">{proposal.proposedName}</span>
                          </label>

                          {/* Category checkbox */}
                          <label className="flex items-center gap-1.5 cursor-pointer text-[#1A1A1A]">
                            <input
                              type="checkbox"
                              checked={Boolean(selected.category)}
                              onChange={() => toggleFieldSelection(proposal.itemId, 'category')}
                              className="accent-[#8C7355] cursor-pointer"
                            />
                            <span className="text-[#767670]">Category:</span>
                            <span className="text-[#8C7355] font-semibold">
                              {proposal.proposedCategory} {proposal.proposedSubcategory ? `(${proposal.proposedSubcategory})` : ''}
                            </span>
                          </label>

                          {/* Size checkbox */}
                          {proposal.proposedSize && (
                            <label className="flex items-center gap-1.5 cursor-pointer text-[#1A1A1A]">
                              <input
                                type="checkbox"
                                checked={Boolean(selected.size)}
                                onChange={() => toggleFieldSelection(proposal.itemId, 'size')}
                                className="accent-[#8C7355] cursor-pointer"
                              />
                              <span className="text-[#767670]">Size:</span>
                              <strong className="text-[#1A1A1A] bg-stone-100 px-1.5 py-0.2 rounded-2xs border border-stone-300">
                                {proposal.proposedSize}
                              </strong>
                            </label>
                          )}

                          {/* Color checkbox */}
                          <label className="flex items-center gap-1.5 cursor-pointer text-[#1A1A1A]">
                            <input
                              type="checkbox"
                              checked={Boolean(selected.color)}
                              onChange={() => toggleFieldSelection(proposal.itemId, 'color')}
                              className="accent-[#8C7355] cursor-pointer"
                            />
                            <span className="text-[#767670]">Colourway:</span>
                            <span
                              className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0"
                              style={{ backgroundColor: proposal.proposedColorHex }}
                            />
                            <span className="font-semibold text-[#1A1A1A]">{proposal.proposedColor}</span>
                          </label>

                          {/* Material / Fabric checkbox */}
                          <label className="flex items-center gap-1.5 cursor-pointer text-[#1A1A1A]">
                            <input
                              type="checkbox"
                              checked={Boolean(selected.material)}
                              onChange={() => toggleFieldSelection(proposal.itemId, 'material')}
                              className="accent-[#8C7355] cursor-pointer"
                            />
                            <span className="text-[#767670]">Fabric:</span>
                            <strong className="text-emerald-800 bg-emerald-50 px-1 py-0.2 rounded-2xs border border-emerald-200">
                              {proposal.proposedMaterial}
                            </strong>
                          </label>

                          {/* RRP checkbox */}
                          <label className="flex items-center gap-1.5 cursor-pointer text-[#1A1A1A]">
                            <input
                              type="checkbox"
                              checked={Boolean(selected.rrp)}
                              onChange={() => toggleFieldSelection(proposal.itemId, 'rrp')}
                              className="accent-[#8C7355] cursor-pointer"
                            />
                            <span className="text-[#767670]">Est. RRP:</span>
                            <span className="text-[#1A1A1A] font-bold">
                              {proposal.proposedRrp ? formatCurrency(proposal.proposedRrp) : '—'}
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom Actions Bar */}
                  <div className="bg-[#FAF9F6] border-t border-[#E5E5E1] px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="text-[11px] font-mono text-[#767670] shrink-0">
                        Tags: {proposal.proposedTags.slice(0, 4).map((t) => `#${t}`).join(' ')}
                      </span>
                      {proposal.proposedCareNotes && (
                        <>
                          <span className="text-[#D5D5D0]">•</span>
                          <span className="text-[11px] font-mono text-stone-500 truncate max-w-xs" title={proposal.proposedCareNotes}>
                            Care: {proposal.proposedCareNotes}
                          </span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleDismiss(proposal.itemId)}
                        className="px-2.5 py-1 text-xs font-mono text-[#767670] hover:text-[#1A1A1A] hover:bg-[#EAE8E3] rounded-xs transition-colors cursor-pointer"
                        title="Dismiss this suggestion without updating"
                      >
                        Dismiss
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApplySingle(proposal)}
                        className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-bold bg-[#8C7355] hover:bg-[#735D43] text-white rounded-xs shadow-xs transition-colors cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5 text-amber-200" />
                        <span>Accept &amp; Apply Updates</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="h-full min-h-[340px] flex flex-col items-center justify-center text-center p-8 bg-white border border-[#E5E5E1] rounded-xs">
              <div className="w-12 h-12 rounded-full bg-[#FAF9F6] border border-[#E5E5E1] flex items-center justify-center text-[#8C7355] mb-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-base font-serif font-bold text-[#1A1A1A]">
                {activeTab === 'dismissed'
                  ? 'No Dismissed Suggestions'
                  : 'All Closet Items in this View are Complete & Enriched'}
              </h3>
              <p className="text-xs text-[#767670] font-mono max-w-md mt-1 mb-4">
                {activeTab === 'dismissed'
                  ? 'You have not dismissed any auto-fill suggestions.'
                  : 'Your inventory pieces have complete photos, fabrics, colorways, and categories. Try switching tabs or re-scanning.'}
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => runAutoScan()}
                  disabled={isScanning}
                  className="px-3.5 py-1.5 bg-[#8C7355] text-white text-xs font-mono font-bold rounded-xs cursor-pointer shadow-xs hover:bg-[#735D43]"
                >
                  Run Deep Re-Scan
                </button>

                {onOpenBatchPaste && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenBatchPaste();
                    }}
                    className="px-3.5 py-1.5 bg-white border border-[#D5D5D0] text-[#1A1A1A] text-xs font-mono rounded-xs cursor-pointer hover:bg-[#F2F1ED]"
                  >
                    Paste New Items in Batch
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ================= FOOTER ================= */}
        <div className="bg-white border-t border-[#E5E5E1] px-5 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs font-mono text-[#767670]">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#8C7355]" />
              <strong>Intelligent Autofill Scanner:</strong> Powered by Gemini 3.8 Flash luxury &amp; archive intelligence with autonomous high-res photo scouting.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-mono bg-[#F2F1ED] hover:bg-[#E5E3DC] text-[#1A1A1A] rounded-xs cursor-pointer"
            >
              Done / Close
            </button>
          </div>
        </div>

        {/* Product Image Picker Modal for single item in scanner */}
        {pickerProposal && (
          <ProductImagePickerModal
            isOpen={pickerProposal !== null}
            onClose={() => setPickerProposal(null)}
            onSelectImage={(newImg) => {
              handleSelectCandidatePhoto(pickerProposal.itemId, newImg);
              // Ensure photo checkbox is selected to apply
              setSelectedFieldsMap((prev) => ({
                ...prev,
                [pickerProposal.itemId]: {
                  ...(prev[pickerProposal.itemId] || {}),
                  photo: true,
                },
              }));
              setPickerProposal(null);
            }}
            brand={pickerProposal.proposedBrand || pickerProposal.originalItem.brand}
            name={pickerProposal.proposedName || pickerProposal.originalItem.name}
            color={pickerProposal.proposedColor || pickerProposal.originalItem.color}
            category={pickerProposal.proposedCategory || pickerProposal.originalItem.category}
            currentImageUrl={photoOverrides[pickerProposal.itemId] || pickerProposal.proposedImageUrl}
          />
        )}
      </div>
    </div>
  );
};

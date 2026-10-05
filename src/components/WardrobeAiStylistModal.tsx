import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Shirt,
  Layers,
  Palette,
  CheckCircle2,
  Calendar,
  Globe,
  RotateCcw,
  Plus,
  ArrowRight,
  Eye,
  Check,
  AlertCircle,
  HelpCircle,
  Clock,
  Compass,
} from 'lucide-react';
import { useWardrobe } from '../context/WardrobeContext';
import { WardrobeItem, LookbookOutfit, Season } from '../types';
import { GarmentImage } from './GarmentImage';
import {
  WardrobeCombination,
  generateLocalWardrobeCombinations,
} from '../utils/wardrobeCombinationEngine';
import { safeApiFetch } from '../utils/apiHelper';

interface WardrobeAiStylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectItem?: (item: WardrobeItem) => void;
  preselectedFocalItem?: WardrobeItem | null;
}

export const WardrobeAiStylistModal: React.FC<WardrobeAiStylistModalProps> = ({
  isOpen,
  onClose,
  onSelectItem,
  preselectedFocalItem,
}) => {
  const { items, addOutfit, logItemWear } = useWardrobe();

  // Wearable closet pieces only (exclude homeware)
  const wearableItems = items.filter(
    (item) => !item.isArchived && item.itemType !== 'homeware_lifestyle'
  );

  const [selectedOccasion, setSelectedOccasion] = useState<string>('All');
  const [selectedSeason, setSelectedSeason] = useState<string>('All');
  const [focalItemId, setFocalItemId] = useState<string>(preselectedFocalItem?.id || '');
  const [useGoogleSearchAi, setUseGoogleSearchAi] = useState<boolean>(true);

  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [combinations, setCombinations] = useState<WardrobeCombination[]>([]);
  const [activeEngine, setActiveEngine] = useState<string | null>(null);
  const [savedOutfitIds, setSavedOutfitIds] = useState<Set<string>>(new Set());
  const [wornOutfitIds, setWornOutfitIds] = useState<Set<string>>(new Set());
  const [statusNotification, setStatusNotification] = useState<string | null>(null);

  if (!isOpen) return null;

  const occasions = [
    'All',
    'Work & Office',
    'Weekend Casual',
    'Evening & Dining',
    'Formal & Events',
    'Date Night',
    'Travel Capsule',
    'Seasonal Transition',
  ];

  const seasons = ['All', 'Autumn', 'Winter', 'Spring', 'Summer', 'All-Season'];

  const showToast = (msg: string) => {
    setStatusNotification(msg);
    setTimeout(() => setStatusNotification(null), 3500);
  };

  const handleGenerateCombinations = async () => {
    if (wearableItems.length < 2) {
      showToast('You need at least 2 wearable items in your wardrobe to generate combinations.');
      return;
    }

    setIsAnalyzing(true);
    setCombinations([]);
    setStatusNotification(null);

    // If user prefers Google Search Gemini AI, attempt server API first
    if (useGoogleSearchAi) {
      try {
        const response = await safeApiFetch('/api/gemini/wardrobe-combinations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wardrobeItems: wearableItems,
            occasion: selectedOccasion,
            season: selectedSeason,
            focalItemId: focalItemId || undefined,
            numCombinations: 4,
            enableGoogleSearch: true,
          }),
        });

        if (response.success && response.data) {
          const data = response.data;
          if (Array.isArray(data.combinations) && data.combinations.length > 0) {
            setCombinations(data.combinations);
            setActiveEngine(data.engine || 'gemini_grounded');
            showToast(
              data.engine === 'gemini_grounded'
                ? 'Synthesized looks using Gemini Ask AI with Google Search Grounding.'
                : 'Generated looks via deterministic local color-harmony engine.'
            );
            setIsAnalyzing(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Server Gemini call failed, engaging deterministic local engine fallback:', err);
      }
    }

    // Deterministic free local fallback (always fast, free, and robust)
    const localCombos = generateLocalWardrobeCombinations(wearableItems, {
      occasion: selectedOccasion,
      season: selectedSeason,
      focalItemId: focalItemId || undefined,
      numCombinations: 4,
    });

    setCombinations(localCombos);
    setActiveEngine('deterministic_local');
    showToast('Generated combinations with deterministic local color-theory engine.');
    setIsAnalyzing(false);
  };

  const handleSaveToLookbook = (combo: WardrobeCombination) => {
    try {
      const outfitData = {
        title: combo.title,
        occasion: combo.occasion,
        season: combo.season,
        itemIds: combo.itemIds,
        notes: `${combo.stylingRationale}\n\nStyling Tips:\n${combo.stylingTips.map((t) => `• ${t}`).join('\n')}`,
        imageUrl: combo.items[0]?.imageUrl || '',
        isFavorite: false,
        tags: [
          'AI Suggested',
          combo.vibe,
          combo.occasion,
          ...(combo.colorPalette || []).slice(0, 3),
        ],
      };

      addOutfit(outfitData as any);
      setSavedOutfitIds((prev) => new Set(prev).add(combo.id));
      showToast(`Saved "${combo.title}" to Lookbook Outfits!`);
    } catch (err) {
      console.error('Failed to save outfit:', err);
      showToast('Could not save outfit to lookbook.');
    }
  };

  const handleWearOutfit = (combo: WardrobeCombination) => {
    combo.itemIds.forEach((id) => {
      logItemWear(id);
    });
    setWornOutfitIds((prev) => new Set(prev).add(combo.id));
    showToast(`Logged wear for all ${combo.itemIds.length} pieces in this look!`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#FAF9F6] border border-[#1A1A1A] w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[#E5E5E1] bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#8C7355]/10 text-[#8C7355]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-serif font-bold text-[#1A1A1A]">
                  AI Wardrobe Stylist &amp; Combinations Analyzer
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold">
                  Zero Paid Tokens / Unlimited Free
                </span>
              </div>
              <p className="text-xs font-mono text-[#767670]">
                Synthesize high-utility outfit combinations using your actual garments, colors, fabrics, and photos.
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
        {statusNotification && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs font-mono text-amber-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-amber-700 shrink-0" />
            <span>{statusNotification}</span>
          </div>
        )}

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Controls Bar */}
          <div className="bg-white border border-[#E5E5E1] p-4 shadow-xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Occasion Filter */}
              <div>
                <label className="block text-[10px] font-mono font-bold text-[#767670] uppercase tracking-wider mb-1">
                  Occasion
                </label>
                <select
                  value={selectedOccasion}
                  onChange={(e) => setSelectedOccasion(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-[#FAF9F6] border border-[#E5E5E1] font-mono text-[#1A1A1A] focus:outline-none focus:border-[#8C7355]"
                >
                  {occasions.map((occ) => (
                    <option key={occ} value={occ}>
                      {occ}
                    </option>
                  ))}
                </select>
              </div>

              {/* Season Filter */}
              <div>
                <label className="block text-[10px] font-mono font-bold text-[#767670] uppercase tracking-wider mb-1">
                  Season
                </label>
                <select
                  value={selectedSeason}
                  onChange={(e) => setSelectedSeason(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-[#FAF9F6] border border-[#E5E5E1] font-mono text-[#1A1A1A] focus:outline-none focus:border-[#8C7355]"
                >
                  {seasons.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Anchor / Focal Garment Piece (Optional) */}
              <div>
                <label className="block text-[10px] font-mono font-bold text-[#767670] uppercase tracking-wider mb-1">
                  Anchor / Hero Piece (Optional)
                </label>
                <select
                  value={focalItemId}
                  onChange={(e) => setFocalItemId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-[#FAF9F6] border border-[#E5E5E1] font-mono text-[#1A1A1A] focus:outline-none focus:border-[#8C7355]"
                >
                  <option value="">-- No specific anchor (auto-balance) --</option>
                  {wearableItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.brand} - {item.name} ({item.category})
                    </option>
                  ))}
                </select>
              </div>

              {/* AI Engine Selection */}
              <div>
                <label className="block text-[10px] font-mono font-bold text-[#767670] uppercase tracking-wider mb-1">
                  Intelligence Engine
                </label>
                <div className="flex items-center gap-2 pt-1">
                  <label className="flex items-center gap-1.5 text-xs font-mono text-[#1A1A1A] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useGoogleSearchAi}
                      onChange={(e) => setUseGoogleSearchAi(e.target.checked)}
                      className="accent-[#8C7355] rounded-xs"
                    />
                    <Globe className="w-3.5 h-3.5 text-[#8C7355]" />
                    <span className="truncate">Google Search Gemini AI</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-[#E5E5E1]/60">
              <span className="text-[11px] font-mono text-[#767670]">
                Scanning {wearableItems.length} wearable closet pieces for texture, color harmony, and drape.
              </span>
              <button
                onClick={handleGenerateCombinations}
                disabled={isAnalyzing}
                className="px-5 py-2 bg-[#8C7355] hover:bg-[#786248] disabled:opacity-50 text-white text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Sparkles className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
                <span>{isAnalyzing ? 'Synthesizing Combinations...' : 'Generate Combinations'}</span>
              </button>
            </div>
          </div>

          {/* Results Grid */}
          {combinations.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono font-bold text-[#1A1A1A] uppercase tracking-wider flex items-center gap-2">
                  <span>Suggested Combinations ({combinations.length})</span>
                  {activeEngine && (
                    <span className="text-[10px] font-normal px-2 py-0.5 bg-[#F2F1ED] text-[#767670] border border-[#E5E5E1]">
                      Engine: {activeEngine === 'gemini_grounded' ? 'Gemini Ask AI + Google Search Grounding' : 'Deterministic Local Color-Theory'}
                    </span>
                  )}
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {combinations.map((combo, idx) => {
                  const isSaved = savedOutfitIds.has(combo.id);
                  const isWorn = wornOutfitIds.has(combo.id);

                  return (
                    <div
                      key={combo.id || idx}
                      className="bg-white border border-[#E5E5E1] p-4 shadow-xs hover:border-[#8C7355] transition-all space-y-3.5"
                    >
                      {/* Outfit Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#E5E5E1]">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-serif font-bold text-[#1A1A1A]">
                              {combo.title}
                            </h4>
                            <span className="text-[10px] font-mono px-2 py-0.5 bg-[#8C7355]/10 text-[#8C7355] font-semibold">
                              {combo.occasion}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 bg-[#F2F1ED] text-[#767670]">
                              {combo.season}
                            </span>
                          </div>
                          {combo.vibe && (
                            <p className="text-[11px] font-mono text-[#767670]">
                              Aesthetic: {combo.vibe}
                            </p>
                          )}
                        </div>

                        {/* Top Action Buttons */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSaveToLookbook(combo)}
                            disabled={isSaved}
                            className={`px-3 py-1 text-xs font-mono flex items-center gap-1.5 border transition-all cursor-pointer ${
                              isSaved
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : 'bg-[#FAF9F6] hover:bg-[#F2F1ED] text-[#1A1A1A] border-[#E5E5E1]'
                            }`}
                          >
                            {isSaved ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span>Saved to Lookbook</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3 h-3 text-[#8C7355]" />
                                <span>Save to Lookbook</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => handleWearOutfit(combo)}
                            disabled={isWorn}
                            className={`px-3 py-1 text-xs font-mono flex items-center gap-1.5 border transition-all cursor-pointer ${
                              isWorn
                                ? 'bg-amber-50 text-amber-900 border-amber-300'
                                : 'bg-[#FAF9F6] hover:bg-[#F2F1ED] text-[#1A1A1A] border-[#E5E5E1]'
                            }`}
                          >
                            <Calendar className="w-3 h-3 text-[#8C7355]" />
                            <span>{isWorn ? 'Wear Logged' : 'Wear Today'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Outfit Pieces Gallery */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {combo.items.map((piece) => (
                          <div
                            key={piece.id}
                            onClick={() => onSelectItem && onSelectItem(piece)}
                            className="bg-[#FAF9F6] border border-[#E5E5E1] p-2 flex flex-col justify-between group hover:border-[#8C7355] transition-all cursor-pointer"
                          >
                            <div className="aspect-square bg-[#F2F1ED] overflow-hidden mb-2 relative">
                              <GarmentImage
                                src={piece.imageUrl}
                                alt={piece.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                              {piece.id === combo.focalItemId && (
                                <span className="absolute top-1 left-1 text-[8px] font-mono px-1 py-0.5 bg-[#8C7355] text-white font-bold">
                                  ANCHOR
                                </span>
                              )}
                            </div>
                            <div>
                              <span className="text-[10px] font-mono text-[#8C7355] font-semibold uppercase block truncate">
                                {piece.brand}
                              </span>
                              <h5 className="text-xs font-serif font-bold text-[#1A1A1A] line-clamp-1">
                                {piece.name}
                              </h5>
                              <div className="flex items-center justify-between text-[10px] font-mono text-[#767670] mt-1 pt-1 border-t border-[#E5E5E1]/60">
                                <span>{piece.category}</span>
                                <span>{piece.color || 'Neutral'}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Styling Breakdown & Rationale */}
                      <div className="bg-[#FAF9F6] border border-[#E5E5E1] p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <Palette className="w-3.5 h-3.5 text-[#8C7355]" />
                          <span className="text-[11px] font-mono font-bold text-[#1A1A1A] uppercase tracking-wider">
                            Harmonious Palette:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {combo.colorPalette?.map((color, cIdx) => (
                              <span
                                key={cIdx}
                                className="text-[10px] font-mono px-1.5 py-0.5 bg-white border border-[#E5E5E1] text-[#4A4A45]"
                              >
                                #{color}
                              </span>
                            ))}
                          </div>
                        </div>

                        <p className="text-xs font-sans text-[#4A4A45] leading-relaxed">
                          {combo.stylingRationale}
                        </p>

                        {combo.stylingTips && combo.stylingTips.length > 0 && (
                          <div className="pt-1.5 border-t border-[#E5E5E1]/60">
                            <span className="text-[10px] font-mono font-bold text-[#767670] uppercase block mb-1">
                              Styling Notes:
                            </span>
                            <ul className="text-xs font-mono text-[#5A5A55] space-y-0.5 list-disc list-inside">
                              {combo.stylingTips.map((tip, tIdx) => (
                                <li key={tIdx}>{tip}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {combo.groundingInsights && (
                          <div className="pt-1 text-[11px] font-mono text-[#8C7355] flex items-center gap-1.5">
                            <Globe className="w-3 h-3 shrink-0" />
                            <span>{combo.groundingInsights}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-[#E5E5E1] p-8 text-center space-y-3">
              <div className="w-12 h-12 mx-auto bg-[#8C7355]/10 text-[#8C7355] flex items-center justify-center">
                <Shirt className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-serif font-bold text-[#1A1A1A]">
                Ready to Analyze Your Wardrobe
              </h3>
              <p className="text-xs font-mono text-[#767670] max-w-md mx-auto">
                Select your desired occasion and season above, or click Generate Combinations to get instant, harmonious outfits synthesized from your actual garments.
              </p>
              <button
                onClick={handleGenerateCombinations}
                disabled={isAnalyzing}
                className="px-4 py-2 bg-[#8C7355] hover:bg-[#786248] text-white text-xs font-mono font-semibold cursor-pointer inline-flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Generate Outfits Now</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#E5E5E1] bg-white flex items-center justify-between">
          <span className="text-xs font-mono text-[#767670]">
            Combinations are saved directly to Lookbook Outfits and can be filtered anytime.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#1A1A1A] text-white text-xs font-mono font-semibold hover:bg-[#333] transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Sun,
  CloudSun,
  Wind,
  Snowflake,
  CloudRain,
  SunMedium,
  Layers,
  Plus,
  Check,
  CheckCircle2,
  Calendar,
  ShoppingBag,
  Shirt,
  SlidersHorizontal,
  ExternalLink,
  RotateCcw,
  Palette,
  Eye,
  ArrowRight,
  Info,
} from 'lucide-react';
import { useWardrobe } from '../context/WardrobeContext';
import {
  WardrobeItem,
  OutfitMatcherCombination,
  OutfitMatcherWeatherPreset,
  Season,
} from '../types';
import {
  WEATHER_PRESETS,
  matchOutfitsForWeatherAndOccasion,
} from '../services/outfitMatcherService';
import { GarmentImage } from './GarmentImage';
import { formatGbp } from '../utils/formatters';

interface OutfitMatcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectItem?: (item: WardrobeItem) => void;
  onOpenShopTheLook?: (combination: OutfitMatcherCombination) => void;
  initialAnchorItemId?: string;
}

export const OutfitMatcherModal: React.FC<OutfitMatcherModalProps> = ({
  isOpen,
  onClose,
  onSelectItem,
  onOpenShopTheLook,
  initialAnchorItemId,
}) => {
  const { items, addOutfit, logItemWear, addShoppingItem } = useWardrobe();

  // Wearable garments only
  const wearableItems = items.filter(
    (item) => !item.isArchived && item.itemType !== 'homeware_lifestyle'
  );

  // Configuration state
  const [selectedWeatherId, setSelectedWeatherId] = useState<string>('mild_transitional');
  const [selectedOccasion, setSelectedOccasion] = useState<string>('Smart Casual');
  const [selectedAnchorItemId, setSelectedAnchorItemId] = useState<string>(
    initialAnchorItemId || ''
  );
  const [customTemp, setCustomTemp] = useState<number | ''>('');
  const [showAdvancedWeather, setShowAdvancedWeather] = useState<boolean>(false);

  // Execution state
  const [isMatching, setIsMatching] = useState<boolean>(false);
  const [combinations, setCombinations] = useState<OutfitMatcherCombination[]>([]);
  const [activeEngine, setActiveEngine] = useState<string | null>(null);
  const [savedOutfitTitles, setSavedOutfitTitles] = useState<Set<string>>(new Set());
  const [wornOutfitTitles, setWornOutfitTitles] = useState<Set<string>>(new Set());
  const [addedMissingPieces, setAddedMissingPieces] = useState<Set<string>>(new Set());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const occasions = [
    'Smart Casual',
    'Weekend Casual',
    'Work & Office',
    'Evening & Dining',
    'Date Night',
    'Travel Capsule',
    'Formal & Events',
    'Seasonal Transition',
  ];

  const activePreset =
    WEATHER_PRESETS.find((p) => p.id === selectedWeatherId) || WEATHER_PRESETS[0];

  const getWeatherIcon = (presetId: string) => {
    switch (presetId) {
      case 'sunny_warm':
        return <Sun className="w-4 h-4 text-amber-500" />;
      case 'mild_transitional':
        return <CloudSun className="w-4 h-4 text-sky-500" />;
      case 'breezy_chilly':
        return <Wind className="w-4 h-4 text-teal-600" />;
      case 'cold_winter':
        return <Snowflake className="w-4 h-4 text-blue-500" />;
      case 'rainy_damp':
        return <CloudRain className="w-4 h-4 text-indigo-500" />;
      case 'hot_summer':
        return <SunMedium className="w-4 h-4 text-orange-500" />;
      default:
        return <CloudSun className="w-4 h-4 text-sky-500" />;
    }
  };

  const handleGenerateMatches = async () => {
    if (wearableItems.length < 2) {
      showToast('You need at least 2 wearable items in your wardrobe to match outfits.');
      return;
    }

    setIsMatching(true);
    setCombinations([]);
    setToastMessage(null);

    try {
      const res = await matchOutfitsForWeatherAndOccasion({
        wardrobeItems: wearableItems,
        weatherPresetId: selectedWeatherId,
        customTempC: customTemp !== '' ? Number(customTemp) : undefined,
        occasion: selectedOccasion,
        focalItemId: selectedAnchorItemId || undefined,
        numCombinations: 3,
      });

      if (res && res.combinations) {
        setCombinations(res.combinations);
        setActiveEngine(res.engine);
        if (res.combinations.length === 0) {
          showToast('No valid combinations could be synthesized for these constraints. Try changing anchor piece.');
        }
      }
    } catch (err: any) {
      console.error('Failed to match outfits:', err);
      showToast('Error matching outfits. Please try again.');
    } finally {
      setIsMatching(false);
    }
  };

  // Save outfit to lookbook
  const handleSaveToLookbook = (combo: OutfitMatcherCombination) => {
    if (savedOutfitTitles.has(combo.title)) return;

    try {
      addOutfit({
        title: combo.title,
        description: `${combo.weatherRecommendation || ''} ${combo.stylingRationale}`,
        occasion: combo.occasion as any,
        season: combo.season as Season,
        itemIds: combo.itemIds,
        tags: [
          'AI Outfit Matcher',
          combo.occasion,
          activePreset.label.split(' ')[0],
          combo.vibe || 'Curated',
        ],
        colorPalette: combo.colorPalette,
        isFavorite: false,
      });

      setSavedOutfitTitles((prev) => new Set([...prev, combo.title]));
      showToast(`Saved "${combo.title}" to your Lookbook!`);
    } catch (err: any) {
      console.error('Failed to save outfit:', err);
    }
  };

  // Log wear for all items in this outfit
  const handleLogWearToday = (combo: OutfitMatcherCombination) => {
    if (wornOutfitTitles.has(combo.title)) return;

    combo.itemIds.forEach((id) => {
      logItemWear(id);
    });

    setWornOutfitTitles((prev) => new Set([...prev, combo.title]));
    showToast(`Logged wear for all items in "${combo.title}"!`);
  };

  // Add suggested missing piece to To-Buy list
  const handleAddMissingPieceToWishlist = (combo: OutfitMatcherCombination) => {
    if (!combo.suggestedMissingPiece) return;
    const piece = combo.suggestedMissingPiece;
    if (addedMissingPieces.has(piece.name)) return;

    try {
      addShoppingItem({
        name: piece.name,
        brand: piece.suggestedRetailer || 'Curated Brand',
        category: (piece.category as any) || 'Accessories',
        estimatedPrice: piece.estimatedPriceGbp || 85,
        status: 'To Buy',
        priority: 'Medium',
        season: combo.season as Season,
        reasonOrGap: `Suggested by AI Outfit Matcher for "${combo.title}": ${piece.reason}`,
        matchingWardrobeItemIds: combo.itemIds,
        imageUrl: '',
        retailerName: piece.suggestedRetailer,
        storeUrl: `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(piece.searchQuery || piece.name)}`,
        targetStoreUrl: `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(piece.searchQuery || piece.name)}`,
        tags: ['Outfit Matcher Suggestion', piece.suggestedRetailer],
      });

      setAddedMissingPieces((prev) => new Set([...prev, piece.name]));
      showToast(`Added complementary piece "${piece.name}" to your 'To Buy' list!`);
    } catch (err) {
      console.error('Failed to add missing piece:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs animate-fadeIn">
      <div className="bg-[#FAF9F7] border border-[#D5D5D0] shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden text-[#1A1A1A] rounded-xl">
        {/* Header */}
        <div className="bg-[#1A1A1A] text-white px-5 py-3.5 flex items-center justify-between border-b border-[#333] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#8C7355]/20 border border-[#8C7355]/40 flex items-center justify-center text-amber-200 shrink-0">
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold tracking-wider text-[#8C7355] uppercase">
                  AI Outfit Matcher
                </span>
                <span className="text-[#666]">|</span>
                <span className="text-xs font-mono text-[#D5D5D0]">
                  Lookbook Weather &amp; Occasion Studio
                </span>
              </div>
              <p className="text-[11px] text-[#A5A59E]">
                Analyzes existing wardrobe pieces to synthesize cohesive combinations based on weather &amp; occasion
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#A5A59E] hover:text-white rounded-md hover:bg-white/10 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Configuration Bar */}
        <div className="p-4 bg-white border-b border-[#E5E5E1] space-y-4 shrink-0">
          {/* Weather Presets Picker */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-mono font-bold text-[#767670] uppercase tracking-wider flex items-center gap-1.5">
                <span>1. Select Today's Weather / Temperature</span>
              </label>
              <button
                type="button"
                onClick={() => setShowAdvancedWeather(!showAdvancedWeather)}
                className="text-[11px] font-mono text-[#8C7355] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <SlidersHorizontal className="w-3 h-3" />
                <span>{showAdvancedWeather ? 'Hide Custom Temp' : 'Custom Temperature (°C)'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {WEATHER_PRESETS.map((preset) => {
                const isSelected = selectedWeatherId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSelectedWeatherId(preset.id)}
                    className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-[#F8F7F4] border-[#8C7355] ring-1 ring-[#8C7355] shadow-xs'
                        : 'bg-white border-[#E5E5E1] hover:border-[#D5D5D0] hover:bg-[#FAF9F7]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      {getWeatherIcon(preset.id)}
                      <span className="text-[10px] font-mono font-bold text-[#8C7355]">
                        {preset.temperature}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-[#1A1A1A] line-clamp-1">
                      {preset.label.split('(')[0].trim()}
                    </div>
                    <div className="text-[10px] text-[#767670] line-clamp-1 mt-0.5">
                      {preset.conditionDescription}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Custom Temperature Input */}
            {showAdvancedWeather && (
              <div className="mt-2.5 p-3 bg-[#F8F7F4] border border-[#E5E5E1] rounded-lg flex items-center gap-3 animate-fadeIn">
                <span className="text-xs text-[#5A5A55] font-mono">Custom Temperature Override:</span>
                <input
                  type="number"
                  placeholder="e.g. 15"
                  value={customTemp}
                  onChange={(e) => setCustomTemp(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-20 px-2 py-1 bg-white border border-[#E5E5E1] rounded text-xs font-mono"
                />
                <span className="text-xs text-[#767670]">°C</span>
                <span className="text-[11px] text-[#767670] italic">
                  (Overrides the preset target temperature for thermal fabric layering calculations)
                </span>
              </div>
            )}
          </div>

          {/* Occasion & Anchor Item Picker */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
            {/* Occasion */}
            <div className="sm:col-span-5 space-y-1">
              <label className="text-[11px] font-mono font-bold text-[#767670] uppercase tracking-wider block">
                2. Target Occasion
              </label>
              <select
                value={selectedOccasion}
                onChange={(e) => setSelectedOccasion(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8F7F4] border border-[#E5E5E1] rounded-lg text-xs font-semibold text-[#1A1A1A] focus:outline-hidden focus:ring-1 focus:ring-[#8C7355]"
              >
                {occasions.map((occ) => (
                  <option key={occ} value={occ}>
                    {occ}
                  </option>
                ))}
              </select>
            </div>

            {/* Anchor Item */}
            <div className="sm:col-span-5 space-y-1">
              <label className="text-[11px] font-mono font-bold text-[#767670] uppercase tracking-wider block">
                3. Anchor / Focal Piece (Optional)
              </label>
              <select
                value={selectedAnchorItemId}
                onChange={(e) => setSelectedAnchorItemId(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8F7F4] border border-[#E5E5E1] rounded-lg text-xs text-[#1A1A1A] focus:outline-hidden focus:ring-1 focus:ring-[#8C7355]"
              >
                <option value="">-- Match freely from all wardrobe pieces --</option>
                {wearableItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.brand} - {item.name} ({item.category})
                  </option>
                ))}
              </select>
            </div>

            {/* Launch Button */}
            <div className="sm:col-span-2 flex items-end">
              <button
                type="button"
                onClick={handleGenerateMatches}
                disabled={isMatching}
                className="w-full py-2 px-3 bg-[#8C7355] hover:bg-[#786248] text-white text-xs font-semibold rounded-lg shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isMatching ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Match Outfits</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Toast Feedback */}
        {toastMessage && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-2 text-xs font-mono text-emerald-800 flex items-center justify-between animate-fadeIn shrink-0">
            <span className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              {toastMessage}
            </span>
            <button
              onClick={() => setToastMessage(null)}
              className="text-emerald-600 hover:text-emerald-900 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Results Container */}
        <div className="flex-1 overflow-y-auto p-5">
          {isMatching ? (
            <div className="py-24 flex flex-col items-center justify-center space-y-3">
              <div className="w-10 h-10 border-3 border-[#8C7355] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-serif font-bold text-[#1A1A1A]">
                AI Matcher is analyzing your wardrobe...
              </p>
              <p className="text-xs text-[#767670] max-w-sm text-center">
                Cross-referencing {wearableItems.length} clothing pieces for {activePreset.label} and {selectedOccasion}.
              </p>
            </div>
          ) : combinations.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#8C7355]/10 text-[#8C7355] flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-base font-serif font-bold text-[#1A1A1A]">
                Ready to match cohesive combinations
              </h3>
              <p className="text-xs text-[#767670] max-w-md mx-auto">
                Select your weather conditions and target occasion above, then click <strong>"Match Outfits"</strong> to synthesize weather-optimized looks using your actual closet items.
              </p>
              <button
                onClick={handleGenerateMatches}
                className="px-4 py-2 bg-[#8C7355] hover:bg-[#786248] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Synthesize Combinations Now</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between text-xs text-[#767670]">
                <span>
                  Showing <strong>{combinations.length}</strong> cohesive outfits synthesized for <strong>{activePreset.label}</strong> ({selectedOccasion})
                </span>
                <span className="font-mono text-[10px]">
                  Engine: {activeEngine === 'gemini_grounded' ? 'Gemini AI Grounded' : 'Meteorological Thermal Matcher'}
                </span>
              </div>

              {/* Combination Cards */}
              <div className="space-y-6">
                {combinations.map((combo) => {
                  const comboItems = combo.items || [];
                  const isSaved = savedOutfitTitles.has(combo.title);
                  const isWorn = wornOutfitTitles.has(combo.title);
                  const totalValuation = comboItems.reduce(
                    (acc, it) => acc + (Number(it.purchasePrice) || 0),
                    0
                  );

                  return (
                    <div
                      key={combo.id}
                      className="bg-white border border-[#E5E5E1] hover:border-[#8C7355] rounded-xl p-5 shadow-xs transition-all space-y-4"
                    >
                      {/* Header row */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5E5E1] pb-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#FAF9F7] text-[#8C7355] border border-[#E5E5E1] font-semibold">
                              {combo.occasion}
                            </span>
                            <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-emerald-600" />
                              {combo.cohesionScore || 95}% Cohesive Match
                            </span>
                            {combo.vibe && (
                              <span className="text-xs font-mono px-2 py-0.5 rounded bg-black/80 text-white font-semibold">
                                {combo.vibe}
                              </span>
                            )}
                          </div>
                          <h3 className="text-base font-serif font-bold text-[#1A1A1A] mt-1">
                            {combo.title}
                          </h3>
                        </div>

                        <div className="flex items-center gap-2 text-xs font-mono text-[#767670]">
                          <span>Valuation: <strong>{formatGbp(totalValuation)}</strong></span>
                          <span>·</span>
                          <span>{comboItems.length} Pieces</span>
                        </div>
                      </div>

                      {/* Weather Rationale Callout */}
                      {combo.weatherRecommendation && (
                        <div className="p-3 bg-[#F8F7F4] border border-[#E5E5E1] rounded-lg text-xs space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-[#8C7355]">
                            {getWeatherIcon(selectedWeatherId)}
                            <span>Weather Suitability ({activePreset.temperature}):</span>
                          </div>
                          <p className="text-[#4A4A45] leading-relaxed">
                            {combo.weatherRecommendation}
                          </p>
                        </div>
                      )}

                      {/* Wardrobe Items Grid */}
                      <div className="space-y-1.5">
                        <div className="text-[11px] font-mono font-bold text-[#767670] uppercase tracking-wider">
                          Wardrobe Pieces ({comboItems.length}):
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {comboItems.map((piece) => (
                            <div
                              key={piece.id}
                              onClick={() => onSelectItem && onSelectItem(piece)}
                              className="p-2 bg-[#FAF9F7] hover:bg-[#F3F2EE] border border-[#E5E5E1] rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer group"
                              title="Click to view garment details"
                            >
                              <div className="w-12 h-12 rounded bg-white border border-[#E5E5E1] overflow-hidden shrink-0 flex items-center justify-center">
                                <GarmentImage
                                  src={piece.imageUrl}
                                  alt={piece.name}
                                  category={piece.category}
                                  className="w-full h-full object-contain p-1"
                                  showPlaceholderLabel={false}
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="text-[10px] font-mono text-[#8C7355] truncate font-semibold">
                                  {piece.brand}
                                </div>
                                <div className="text-xs font-bold text-[#1A1A1A] truncate group-hover:text-[#8C7355]">
                                  {piece.name}
                                </div>
                                <div className="text-[10px] font-mono text-[#767670]">
                                  {piece.category}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Color Palette & Styling Advice */}
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2">
                        {/* Styling Tips */}
                        <div className="sm:col-span-8 space-y-1">
                          <span className="text-[10px] font-mono font-bold text-[#767670] uppercase">
                            Sartorial Styling Directives:
                          </span>
                          <p className="text-xs text-[#5A5A55] leading-relaxed">
                            {combo.stylingRationale}
                          </p>
                          {Array.isArray(combo.stylingTips) && combo.stylingTips.length > 0 && (
                            <ul className="list-disc list-inside text-[11px] text-[#767670] pt-1 space-y-0.5">
                              {combo.stylingTips.map((tip, idx) => (
                                <li key={idx}>{tip}</li>
                              ))}
                            </ul>
                          )}
                        </div>

                        {/* Palette Swatches */}
                        {Array.isArray(combo.colorPalette) && combo.colorPalette.length > 0 && (
                          <div className="sm:col-span-4 space-y-1">
                            <span className="text-[10px] font-mono font-bold text-[#767670] uppercase">
                              Harmonious Color Story:
                            </span>
                            <div className="flex items-center gap-1.5 pt-1">
                              {combo.colorPalette.map((col, idx) => (
                                <div
                                  key={idx}
                                  style={{
                                    backgroundColor: col.startsWith('#')
                                      ? col
                                      : '#8C7355',
                                  }}
                                  className="w-6 h-6 rounded-md border border-black/15 shadow-2xs flex items-center justify-center text-[9px] font-mono text-white"
                                  title={col}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Suggested Missing Complement Piece (Shop the Look link) */}
                      {combo.suggestedMissingPiece && (
                        <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-amber-900 uppercase text-[10px]">
                                Complementary Piece Recommendation:
                              </span>
                              <span className="font-bold text-[#1A1A1A]">
                                {combo.suggestedMissingPiece.name}
                              </span>
                              <span className="font-mono text-[#8C7355] text-[10px]">
                                (~{formatGbp(combo.suggestedMissingPiece.estimatedPriceGbp)})
                              </span>
                            </div>
                            <p className="text-[11px] text-amber-800 leading-snug">
                              {combo.suggestedMissingPiece.reason}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {onOpenShopTheLook && (
                              <button
                                type="button"
                                onClick={() => onOpenShopTheLook(combo)}
                                className="px-2.5 py-1 text-[11px] font-mono font-semibold rounded bg-white hover:bg-[#FAF9F7] text-[#8C7355] border border-[#8C7355]/40 transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <ShoppingBag className="w-3 h-3" />
                                <span>Shop Similar Online</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleAddMissingPieceToWishlist(combo)}
                              disabled={addedMissingPieces.has(combo.suggestedMissingPiece.name)}
                              className={`px-2.5 py-1 text-[11px] font-mono font-semibold rounded transition-colors flex items-center gap-1 cursor-pointer ${
                                addedMissingPieces.has(combo.suggestedMissingPiece.name)
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-amber-600 hover:bg-amber-700 text-white'
                              }`}
                            >
                              {addedMissingPieces.has(combo.suggestedMissingPiece.name) ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-700" />
                                  <span>Added to 'To Buy'</span>
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3 h-3" />
                                  <span>+ Add to 'To Buy'</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Action Bar */}
                      <div className="pt-3 border-t border-[#E5E5E1] flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleLogWearToday(combo)}
                            disabled={isWorn}
                            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors cursor-pointer ${
                              isWorn
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : 'bg-white hover:bg-[#F3F2EE] text-[#1A1A1A] border-[#E5E5E1]'
                            }`}
                            title="Log wear today for all pieces in this outfit"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{isWorn ? 'Worn Logged Today' : 'Wear Today (+1)'}</span>
                          </button>

                          {onOpenShopTheLook && (
                            <button
                              type="button"
                              onClick={() => onOpenShopTheLook(combo)}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md bg-[#FAF9F7] hover:bg-[#F3F2EE] text-[#8C7355] border border-[#8C7355]/40 transition-colors cursor-pointer"
                              title="Search similar pieces available to purchase online"
                            >
                              <ShoppingBag className="w-3.5 h-3.5" />
                              <span>Shop the Look</span>
                            </button>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSaveToLookbook(combo)}
                          disabled={isSaved}
                          className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer ${
                            isSaved
                              ? 'bg-emerald-600 text-white'
                              : 'bg-[#8C7355] hover:bg-[#786248] text-white'
                          }`}
                        >
                          {isSaved ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Saved to Lookbook</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>Save to Lookbook</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#F8F7F4] border-t border-[#E5E5E1] flex items-center justify-between text-xs text-[#767670] shrink-0">
          <div className="flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-[#8C7355]" />
            <span>Outfits are synthesized exclusively using items from your existing wardrobe database.</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1 text-xs font-semibold text-[#1A1A1A] bg-white border border-[#E5E5E1] rounded-md hover:bg-[#F3F2EE] cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

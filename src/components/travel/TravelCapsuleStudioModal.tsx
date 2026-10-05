import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Compass,
  Plane,
  Luggage,
  Calendar,
  CloudSun,
  Sparkles,
  Check,
  CheckSquare,
  Plus,
  Trash2,
  Copy,
  Layers,
  Shirt,
  Info,
  ArrowRight,
  AlertCircle,
  Bookmark,
  Droplets,
  Wind,
  Sun,
  CloudRain,
  Flame,
  WashingMachine,
  RefreshCw,
  Sliders,
  Filter,
} from 'lucide-react';
import { useWardrobe } from '../../context/WardrobeContext';
import { WardrobeItem, Season, TravelCapsuleTrip, LookbookOutfit } from '../../types';
import { GarmentImage } from '../GarmentImage';
import {
  DESTINATION_PRESETS,
  DestinationPreset,
  estimateItemWeightGrams,
  buildAlgorithmicTravelCapsule,
  generateMeteorologicalForecast,
  generateAllCapsulePermutations,
  synthesizeDailyItineraryOutfits,
  calculateLaundryTurnaroundPlan,
  DEFAULT_TRAVEL_ESSENTIALS,
  TravelEssentialChecklistItem,
  CapsulePermutation,
  MeteorologicalDayForecast,
  getSavedTravelTrips,
  saveTravelTrip,
  deleteTravelTrip,
} from '../../services/travelCapsuleService';
import { formatGbp } from '../../utils/formatters';

interface TravelCapsuleStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectItem?: (item: WardrobeItem) => void;
}

export const TravelCapsuleStudioModal: React.FC<TravelCapsuleStudioModalProps> = ({
  isOpen,
  onClose,
  onSelectItem,
}) => {
  const { items, addOutfit } = useWardrobe();

  // Active view tab inside modal
  const [activeTab, setActiveTab] = useState<
    'capsule' | 'daily_outfits' | 'permutations' | 'laundry_plan' | 'packing_list' | 'saved_trips'
  >('capsule');

  // Trip Configuration
  const [destination, setDestination] = useState('Edinburgh, United Kingdom');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 11);
    return d.toISOString().split('T')[0];
  });
  const [vibe, setVibe] = useState('Rainy Autumn / Smart Casual');
  const [luggageLimit, setLuggageLimit] = useState<
    'Carry-On (10kg)' | 'Checked Luggage (20kg)' | 'Weekend Duffle (7kg)' | 'Light Backpack (5kg)'
  >('Carry-On (10kg)');

  // Selected capsule items
  const [capsuleItemIds, setCapsuleItemIds] = useState<string[]>([]);
  const [transitItemIds, setTransitItemIds] = useState<string[]>([]);
  const [packedItemIds, setPackedItemIds] = useState<string[]>([]);
  const [dailyOutfits, setDailyOutfits] = useState<Array<{
    day: number;
    title: string;
    itemIds: string[];
    occasion: string;
    notes?: string;
    weatherMatchScore?: number;
  }>>([]);
  const [stylingRationale, setStylingRationale] = useState<string>('');
  const [weatherAdvice, setWeatherAdvice] = useState<string>('');

  // Laundry turnaround state
  const [laundryDays, setLaundryDays] = useState<number[]>([3]);

  // Travel Essentials Checklist
  const [travelEssentials, setTravelEssentials] = useState<TravelEssentialChecklistItem[]>(DEFAULT_TRAVEL_ESSENTIALS);

  // Permutation filter
  const [permutationOccasionFilter, setPermutationOccasionFilter] = useState<string>('All');

  // Generation status
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [lookbookSavedNotification, setLookbookSavedNotification] = useState<string | null>(null);

  // Saved trips list
  const [savedTrips, setSavedTrips] = useState<TravelCapsuleTrip[]>([]);
  const [isAddingItemManually, setIsAddingItemManually] = useState(false);

  // Compute trip days
  const daysCount = useMemo(() => {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    if (isNaN(start) || isNaN(end) || end < start) return 4;
    return Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);
  }, [startDate, endDate]);

  // Detected destination preset or default
  const matchedPreset = useMemo<DestinationPreset | null>(() => {
    const q = destination.toLowerCase();
    return DESTINATION_PRESETS.find((p) => q.includes(p.city.toLowerCase())) || null;
  }, [destination]);

  // Inferred season based on trip start date
  const tripSeason = useMemo<Season>(() => {
    const month = new Date(startDate).getMonth(); // 0 to 11
    if (month >= 2 && month <= 4) return 'Spring';
    if (month >= 5 && month <= 7) return 'Summer';
    if (month >= 8 && month <= 10) return 'Autumn';
    return 'Winter';
  }, [startDate]);

  // Meteorological Weather Forecast Engine
  const meteorologicalForecasts = useMemo<MeteorologicalDayForecast[]>(() => {
    return generateMeteorologicalForecast(destination, startDate, daysCount, tripSeason);
  }, [destination, startDate, daysCount, tripSeason]);

  // Active weather profile
  const weatherInfo = useMemo(() => {
    if (matchedPreset) {
      const s = matchedPreset.seasons[tripSeason];
      return {
        tempMin: s.tempMin,
        tempMax: s.tempMax,
        rainProb: s.rainProb,
        advice: s.advice,
      };
    }
    const fallbacks = {
      Spring: { tempMin: 9, tempMax: 17, rainProb: 35, advice: 'Versatile mid-layers and water-resistant footwear recommended.' },
      Summer: { tempMin: 18, tempMax: 28, rainProb: 20, advice: 'Breathable lightweight linens, poplin shirting, and sun protection.' },
      Autumn: { tempMin: 8, tempMax: 15, rainProb: 45, advice: 'Layer heavy knitwear with a structured wool or weather-proof overcoat.' },
      Winter: { tempMin: 1, tempMax: 8, rainProb: 50, advice: 'Thermal base layers, heavy outerwear, and insulating accessories.' },
    };
    return fallbacks[tripSeason];
  }, [matchedPreset, tripSeason]);

  // Load saved trips on mount
  useEffect(() => {
    if (isOpen) {
      setSavedTrips(getSavedTravelTrips());
    }
  }, [isOpen]);

  // Initialize initial capsule if empty
  useEffect(() => {
    if (isOpen && capsuleItemIds.length === 0 && items.length > 0) {
      handleAutoGenerateCapsule(false);
    }
  }, [isOpen]);

  // Max weight allowance in grams
  const maxWeightGrams = useMemo(() => {
    if (luggageLimit === 'Checked Luggage (20kg)') return 20000;
    if (luggageLimit === 'Weekend Duffle (7kg)') return 7000;
    if (luggageLimit === 'Light Backpack (5kg)') return 5000;
    return 10000; // default 10kg
  }, [luggageLimit]);

  // Resolved items in the capsule
  const capsuleItems = useMemo(() => {
    return items.filter((item) => capsuleItemIds.includes(item.id));
  }, [items, capsuleItemIds]);

  // Items worn on transit
  const transitItems = useMemo(() => {
    return items.filter((item) => transitItemIds.includes(item.id));
  }, [items, transitItemIds]);

  // Items packed in luggage
  const packedLuggageItems = useMemo(() => {
    return capsuleItems.filter((item) => !transitItemIds.includes(item.id));
  }, [capsuleItems, transitItemIds]);

  // Luggage weight calculation
  const totalPackedGarmentsWeightGrams = useMemo(() => {
    return packedLuggageItems.reduce((acc, item) => acc + estimateItemWeightGrams(item), 0);
  }, [packedLuggageItems]);

  const totalEssentialsWeightGrams = useMemo(() => {
    return travelEssentials
      .filter((e) => e.isPacked)
      .reduce((acc, e) => acc + e.weightEstimateGrams, 0);
  }, [travelEssentials]);

  const totalPackedWeightGrams = totalPackedGarmentsWeightGrams + totalEssentialsWeightGrams;

  const transitWeightSavedGrams = useMemo(() => {
    return transitItems.reduce((acc, item) => acc + estimateItemWeightGrams(item), 0);
  }, [transitItems]);

  const totalCapsuleValuation = useMemo(() => {
    return capsuleItems.reduce((acc, item) => acc + (item.purchasePrice || 0), 0);
  }, [capsuleItems]);

  // All Possible Capsule Permutations (15+ Looks)
  const allPermutations = useMemo<CapsulePermutation[]>(() => {
    if (capsuleItems.length === 0) return [];
    return generateAllCapsulePermutations(capsuleItems, meteorologicalForecasts, vibe);
  }, [capsuleItems, meteorologicalForecasts, vibe]);

  // Filtered permutations
  const filteredPermutations = useMemo(() => {
    if (permutationOccasionFilter === 'All') return allPermutations;
    return allPermutations.filter((p) => p.occasion === permutationOccasionFilter);
  }, [allPermutations, permutationOccasionFilter]);

  // Laundry turnaround plan calculation
  const laundryPlan = useMemo(() => {
    return calculateLaundryTurnaroundPlan(daysCount, capsuleItems, dailyOutfits, laundryDays);
  }, [daysCount, capsuleItems, dailyOutfits, laundryDays]);

  // Generation handler
  const handleAutoGenerateCapsule = async (useAi: boolean = true) => {
    if (items.length === 0) return;
    setIsGenerating(true);

    try {
      if (useAi) {
        const res = await fetch('/api/gemini/generate-travel-capsule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wardrobeItems: items,
            destination,
            daysCount,
            vibe,
            weatherTemp: `${weatherInfo.tempMin}°C - ${weatherInfo.tempMax}°C, ${weatherInfo.rainProb}% rain chance (${tripSeason})`,
            luggageLimit,
          }),
        });
        const data = await res.json();
        if (data.success && data.data && Array.isArray(data.data.capsuleItemIds)) {
          setCapsuleItemIds(data.data.capsuleItemIds);
          setTransitItemIds(data.data.transitItemIds || []);
          setDailyOutfits(data.data.dailyOutfits || []);
          setStylingRationale(data.data.rationale || '');
          setWeatherAdvice(data.data.weatherAdvice || weatherInfo.advice);
          setIsGenerating(false);
          return;
        }
      }
    } catch (err) {
      console.warn('AI travel capsule generation notice, using algorithmic engine:', err);
    }

    // Algorithmic Minimalist Permutation Engine
    const fallback = buildAlgorithmicTravelCapsule(items, daysCount, vibe, tripSeason);
    setCapsuleItemIds(fallback.capsuleItems.map((i) => i.id));
    setTransitItemIds(fallback.transitItems.map((i) => i.id));
    setStylingRationale(fallback.rationale);
    setWeatherAdvice(weatherInfo.advice);

    const generatedOutfits = synthesizeDailyItineraryOutfits(
      fallback.capsuleItems,
      daysCount,
      vibe,
      meteorologicalForecasts
    );
    setDailyOutfits(generatedOutfits);
    setIsGenerating(false);
  };

  // Toggle item in capsule
  const handleToggleCapsuleItem = (itemId: string) => {
    if (capsuleItemIds.includes(itemId)) {
      setCapsuleItemIds((prev) => prev.filter((id) => id !== itemId));
      setTransitItemIds((prev) => prev.filter((id) => id !== itemId));
      setPackedItemIds((prev) => prev.filter((id) => id !== itemId));
    } else {
      setCapsuleItemIds((prev) => [...prev, itemId]);
    }
  };

  // Toggle transit worn status
  const handleToggleTransitItem = (itemId: string) => {
    if (transitItemIds.includes(itemId)) {
      setTransitItemIds((prev) => prev.filter((id) => id !== itemId));
    } else {
      setTransitItemIds((prev) => [...prev, itemId]);
    }
  };

  // Toggle checklist checkbox
  const handleToggleChecklistPacked = (itemId: string) => {
    if (packedItemIds.includes(itemId)) {
      setPackedItemIds((prev) => prev.filter((id) => id !== itemId));
    } else {
      setPackedItemIds((prev) => [...prev, itemId]);
    }
  };

  // Toggle travel essential item
  const handleToggleEssentialPacked = (essentialId: string) => {
    setTravelEssentials((prev) =>
      prev.map((e) => (e.id === essentialId ? { ...e, isPacked: !e.isPacked } : e))
    );
  };

  // Toggle laundry day
  const handleToggleLaundryDay = (day: number) => {
    setLaundryDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)
    );
  };

  // Save current trip to saved trips
  const handleSaveCurrentTrip = () => {
    const newTrip: TravelCapsuleTrip = {
      id: `trip-${Date.now()}`,
      destination,
      startDate,
      endDate,
      daysCount,
      vibe,
      temperatureRange: `${weatherInfo.tempMin}°C - ${weatherInfo.tempMax}°C`,
      weatherAdvice: weatherAdvice || weatherInfo.advice,
      luggageType: luggageLimit,
      selectedItemIds: capsuleItemIds,
      packedItemIds,
      transitItemIds,
      laundryDays,
      weatherForecast: meteorologicalForecasts,
      dailyOutfits,
      allPermutationsCount: allPermutations.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveTravelTrip(newTrip);
    setSavedTrips(getSavedTravelTrips());
    setLookbookSavedNotification('Trip capsule & permutation formulas saved successfully!');
    setTimeout(() => setLookbookSavedNotification(null), 3500);
  };

  // Load a saved trip
  const handleLoadTrip = (trip: TravelCapsuleTrip) => {
    setDestination(trip.destination);
    setStartDate(trip.startDate);
    setEndDate(trip.endDate);
    setVibe(trip.vibe);
    setLuggageLimit(trip.luggageType as any);
    setCapsuleItemIds(trip.selectedItemIds);
    setPackedItemIds(trip.packedItemIds || []);
    setTransitItemIds(trip.transitItemIds || []);
    setLaundryDays(trip.laundryDays || [3]);
    setDailyOutfits(trip.dailyOutfits || []);
    setActiveTab('capsule');
  };

  // Delete saved trip
  const handleDeleteTrip = (tripId: string) => {
    deleteTravelTrip(tripId);
    setSavedTrips(getSavedTravelTrips());
  };

  // Export all daily outfits into Lookbook formulas
  const handleExportAllToLookbook = () => {
    if (dailyOutfits.length === 0) return;

    dailyOutfits.forEach((daily) => {
      const outfitData: Omit<LookbookOutfit, 'id'> = {
        title: `${daily.title} (${destination.split(',')[0]})`,
        description: daily.notes || `Curated travel look for ${destination}`,
        occasion: 'Travel Capsule',
        season: tripSeason,
        itemIds: daily.itemIds,
        tags: ['Travel Capsule', destination.split(',')[0].trim(), vibe],
        photographicMood: 'Studio Flatlay',
        thermalCohesionScore: daily.weatherMatchScore || 92,
        isFavorite: false,
        timesWorn: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      addOutfit(outfitData);
    });

    setLookbookSavedNotification(`Added ${dailyOutfits.length} travel formulas to your Lookbook!`);
    setTimeout(() => setLookbookSavedNotification(null), 4000);
  };

  // Export all 15+ permutations to Lookbook
  const handleExportAllPermutationsToLookbook = () => {
    if (allPermutations.length === 0) return;

    allPermutations.forEach((perm) => {
      const outfitData: Omit<LookbookOutfit, 'id'> = {
        title: `${perm.title} (${destination.split(',')[0]})`,
        description: perm.notes,
        occasion: 'Travel Capsule',
        season: tripSeason,
        itemIds: perm.itemIds,
        tags: ['Travel Capsule', 'Permutation Matrix', destination.split(',')[0].trim()],
        photographicMood: 'Studio Flatlay',
        thermalCohesionScore: perm.thermalScore,
        thermalComfortRange: perm.temperatureMatch,
        isFavorite: false,
        timesWorn: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      addOutfit(outfitData);
    });

    setLookbookSavedNotification(`Exported all ${allPermutations.length} permutations to your Lookbook!`);
    setTimeout(() => setLookbookSavedNotification(null), 4000);
  };

  // Copy packing manifest to clipboard
  const handleCopyPackingManifest = () => {
    const text = [
      `TRAVEL CAPSULE PACKING & ROTATION MANIFEST`,
      `===========================================`,
      `Destination: ${destination}`,
      `Dates: ${startDate} to ${endDate} (${daysCount} Days)`,
      `Trip Vibe: ${vibe}`,
      `Forecast: ${weatherInfo.tempMin}°C - ${weatherInfo.tempMax}°C · ${tripSeason}`,
      `Luggage Allowance: ${luggageLimit} (Estimated Total Packed: ${(totalPackedWeightGrams / 1000).toFixed(1)}kg)`,
      `Permutations Available: ${allPermutations.length} unique looks`,
      `Laundry Turnaround: ${laundryDays.length > 0 ? `Day ${laundryDays.join(', ')}` : 'None'} (Saves ~${(laundryPlan.weightSavedGrams / 1000).toFixed(1)}kg)`,
      ``,
      `--- 1. WORN ON TRANSIT (${transitItems.length} items, saves ${(transitWeightSavedGrams / 1000).toFixed(1)}kg luggage weight) ---`,
      ...transitItems.map((i) => `[WORN] ${i.brand} - ${i.name} (${i.color}) ~${estimateItemWeightGrams(i)}g`),
      ``,
      `--- 2. PACKED CLOTHING IN CARRY-ON (${packedLuggageItems.length} items, ~${(totalPackedGarmentsWeightGrams / 1000).toFixed(1)}kg) ---`,
      ...packedLuggageItems.map(
        (i) => `[${packedItemIds.includes(i.id) ? 'X' : ' '}] ${i.brand} - ${i.name} (${i.color}) ~${estimateItemWeightGrams(i)}g`
      ),
      ``,
      `--- 3. TRAVEL ESSENTIALS & LAUNDRY CARE (${travelEssentials.length} items) ---`,
      ...travelEssentials.map(
        (e) => `[${e.isPacked ? 'X' : ' '}] ${e.name} (${e.category}) ~${e.weightEstimateGrams}g`
      ),
      ``,
      `--- 4. DAILY ITINERARY SCHEDULE (${dailyOutfits.length} looks) ---`,
      ...dailyOutfits.map((o) => `Day ${o.day}: ${o.title}\n  Pieces: ${o.itemIds.map((id) => items.find((it) => it.id === id)?.name).filter(Boolean).join(' + ')}\n  ${o.notes}`),
    ].join('\n');

    navigator.clipboard.writeText(text);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-[#FAF9F5] border border-[#E5E5E1] w-full max-w-6xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="px-5 py-3.5 bg-white border-b border-[#E5E5E1] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xs bg-[#FAF9F5] border border-[#D5D5D0] flex items-center justify-center text-[#8C7355]">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-serif font-bold text-[#1A1A1A] flex items-center gap-2">
                Travel Capsule &amp; Packing Studio
              </h2>
              <div className="flex items-center gap-2 text-xs text-[#767670] font-mono mt-0.5">
                <span>{destination}</span>
                <span aria-hidden="true">·</span>
                <span>{daysCount} Days</span>
                <span aria-hidden="true">·</span>
                <span>{vibe}</span>
                <span aria-hidden="true">·</span>
                <span>{tripSeason}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveCurrentTrip}
              className="px-3 py-1.5 text-xs font-mono font-medium text-[#1A1A1A] bg-[#FAF9F5] hover:bg-[#F2F1ED] border border-[#D5D5D0] transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <Bookmark className="w-3.5 h-3.5 text-[#8C7355]" />
              <span>Save Trip</span>
            </button>
            <button
              type="button"
              onClick={handleExportAllToLookbook}
              className="px-3 py-1.5 text-xs font-mono font-medium text-[#8C7355] bg-white hover:bg-[#FAF9F5] border border-[#8C7355]/40 transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
              title="Save all daily outfits to Lookbook"
            >
              <Layers className="w-3.5 h-3.5 text-[#8C7355]" />
              <span className="hidden sm:inline">Export Looks to Lookbook</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-[#767670] hover:text-[#1A1A1A] rounded-xs hover:bg-[#F2F1ED] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Trip Configuration Bar */}
        <div className="bg-[#F8F7F4] border-b border-[#E5E5E1] px-5 py-3 shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
            {/* Destination */}
            <div className="lg:col-span-2">
              <label className="block text-[11px] font-mono text-[#5A5A55] font-semibold mb-1">
                Destination City
              </label>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="e.g. Edinburgh, Florence, Paris..."
                className="w-full px-2.5 py-1.5 bg-white border border-[#D5D5D0] text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
              />
              {/* Quick Presets */}
              <div className="flex items-center gap-1 mt-1.5 overflow-x-auto no-scrollbar py-0.5">
                {DESTINATION_PRESETS.slice(0, 7).map((preset) => (
                  <button
                    key={preset.city}
                    type="button"
                    onClick={() => {
                      setDestination(`${preset.city}, ${preset.country}`);
                      setVibe(preset.vibeDefault);
                    }}
                    className={`px-1.5 py-0.5 text-[10px] font-mono border transition-colors cursor-pointer whitespace-nowrap ${
                      destination.toLowerCase().includes(preset.city.toLowerCase())
                        ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                        : 'bg-white text-[#5A5A55] border-[#E5E5E1] hover:border-[#8C7355]'
                    }`}
                  >
                    {preset.city}
                  </button>
                ))}
              </div>
            </div>

            {/* Travel Dates */}
            <div>
              <label className="block text-[11px] font-mono text-[#5A5A55] font-semibold mb-1">
                Departure &amp; Return
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-2 py-1 bg-white border border-[#D5D5D0] text-[11px] font-mono text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-2 py-1 bg-white border border-[#D5D5D0] text-[11px] font-mono text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
                />
              </div>
              <span className="text-[10px] font-mono text-[#767670] mt-1 block">
                Duration: <strong>{daysCount} Days</strong>
              </span>
            </div>

            {/* Trip Vibe */}
            <div>
              <label className="block text-[11px] font-mono text-[#5A5A55] font-semibold mb-1">
                Dress Code / Vibe
              </label>
              <input
                type="text"
                value={vibe}
                onChange={(e) => setVibe(e.target.value)}
                placeholder="e.g. Rainy Autumn / Smart Casual"
                className="w-full px-2.5 py-1.5 bg-white border border-[#D5D5D0] text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
              />
              <span className="text-[10px] font-mono text-[#767670] mt-1 block">
                Tailored for day-to-night
              </span>
            </div>

            {/* Luggage Allowance & Generate Trigger */}
            <div>
              <label className="block text-[11px] font-mono text-[#5A5A55] font-semibold mb-1">
                Luggage Allowance
              </label>
              <select
                value={luggageLimit}
                onChange={(e) => setLuggageLimit(e.target.value as any)}
                className="w-full px-2.5 py-1.5 bg-white border border-[#D5D5D0] text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none mb-1.5"
              >
                <option value="Carry-On (10kg)">Carry-On (10kg)</option>
                <option value="Checked Luggage (20kg)">Checked Luggage (20kg)</option>
                <option value="Weekend Duffle (7kg)">Weekend Duffle (7kg)</option>
                <option value="Light Backpack (5kg)">Light Backpack (5kg)</option>
              </select>

              <button
                type="button"
                onClick={() => handleAutoGenerateCapsule(true)}
                disabled={isGenerating}
                className="w-full py-1.5 bg-[#8C7355] hover:bg-[#735D43] text-white text-xs font-mono font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isGenerating ? 'Synthesizing...' : 'Regenerate Capsule'}</span>
              </button>
            </div>
          </div>

          {/* Meteorological & Thermal Layering Banner */}
          <div className="mt-2.5 pt-2.5 border-t border-[#E5E5E1] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1 text-[#8C7355] font-semibold">
                <CloudSun className="w-3.5 h-3.5" />
                <span>Meteorological Baseline:</span>
              </span>
              <span className="text-[#1A1A1A] font-bold">
                {weatherInfo.tempMin}°C to {weatherInfo.tempMax}°C
              </span>
              <span className="text-[#767670]">({weatherInfo.rainProb}% rain probability)</span>
              <span className="hidden md:inline text-[#767670] italic">
                "{weatherInfo.advice}"
              </span>
            </div>

            {/* Luggage Weight Meter */}
            <div className="flex items-center gap-2">
              <span className="text-[#5A5A55]">Packed Weight:</span>
              <strong className={totalPackedWeightGrams > maxWeightGrams ? 'text-rose-600' : 'text-emerald-700'}>
                {(totalPackedWeightGrams / 1000).toFixed(1)}kg / {(maxWeightGrams / 1000).toFixed(0)}kg
              </strong>
              {transitWeightSavedGrams > 0 && (
                <span className="text-[10px] text-[#8C7355]">
                  (Saved {(transitWeightSavedGrams / 1000).toFixed(1)}kg on transit)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 border-b border-[#E5E5E1] bg-white flex items-center justify-between shrink-0 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('capsule')}
              className={`px-3 py-2 text-xs font-mono font-medium border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'capsule'
                  ? 'border-[#8C7355] text-[#8C7355] font-bold'
                  : 'border-transparent text-[#767670] hover:text-[#1A1A1A]'
              }`}
            >
              <Shirt className="w-3.5 h-3.5" />
              <span>Compact Capsule ({capsuleItems.length} Pieces)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('permutations')}
              className={`px-3 py-2 text-xs font-mono font-medium border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'permutations'
                  ? 'border-[#8C7355] text-[#8C7355] font-bold'
                  : 'border-transparent text-[#767670] hover:text-[#1A1A1A]'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-[#8C7355]" />
              <span>Permutation Engine ({allPermutations.length} Looks)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('daily_outfits')}
              className={`px-3 py-2 text-xs font-mono font-medium border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'daily_outfits'
                  ? 'border-[#8C7355] text-[#8C7355] font-bold'
                  : 'border-transparent text-[#767670] hover:text-[#1A1A1A]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Daily Itinerary ({dailyOutfits.length} Days)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('laundry_plan')}
              className={`px-3 py-2 text-xs font-mono font-medium border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'laundry_plan'
                  ? 'border-[#8C7355] text-[#8C7355] font-bold'
                  : 'border-transparent text-[#767670] hover:text-[#1A1A1A]'
              }`}
            >
              <WashingMachine className="w-3.5 h-3.5" />
              <span>Laundry Turnaround</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('packing_list')}
              className={`px-3 py-2 text-xs font-mono font-medium border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'packing_list'
                  ? 'border-[#8C7355] text-[#8C7355] font-bold'
                  : 'border-transparent text-[#767670] hover:text-[#1A1A1A]'
              }`}
            >
              <Luggage className="w-3.5 h-3.5" />
              <span>Luggage Checklist ({packedItemIds.length}/{capsuleItems.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('saved_trips')}
              className={`px-3 py-2 text-xs font-mono font-medium border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'saved_trips'
                  ? 'border-[#8C7355] text-[#8C7355] font-bold'
                  : 'border-transparent text-[#767670] hover:text-[#1A1A1A]'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Saved Trips ({savedTrips.length})</span>
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="hidden lg:flex items-center gap-3 text-xs font-mono text-[#767670] shrink-0">
            <span>Valuation: <strong>{formatGbp(totalCapsuleValuation)}</strong></span>
            <span aria-hidden="true">·</span>
            <span>Permutations: <strong>{allPermutations.length} Looks</strong></span>
          </div>
        </div>

        {/* Notification Toast */}
        {lookbookSavedNotification && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-2 text-xs font-mono text-emerald-800 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              {lookbookSavedNotification}
            </span>
          </div>
        )}

        {/* Modal Scroll Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* TAB 1: CAPSULE WARDROBE PIECES */}
          {activeTab === 'capsule' && (
            <div className="space-y-4">
              {/* Rationale Bar */}
              {stylingRationale && (
                <div className="p-3.5 bg-white border border-[#E5E5E1] text-xs font-mono leading-relaxed text-[#4A4A45]">
                  <span className="text-[#8C7355] font-bold uppercase tracking-wider block mb-1">
                    Minimalist Permutation Architecture:
                  </span>
                  {stylingRationale}
                </div>
              )}

              {/* Transit Strategy Callout */}
              <div className="p-3 bg-[#FAF0E6]/60 border border-[#E8DEC8] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-2 text-[#5C4830]">
                  <Plane className="w-4 h-4 text-[#8C7355]" />
                  <span>
                    <strong>Transit Wear Strategy:</strong> Mark pieces to wear on the plane or train. They do not count toward luggage weight!
                  </span>
                </div>
                <div className="text-[#7A6A55] text-[11px]">
                  {transitItems.length} transit pieces selected (Saves {(transitWeightSavedGrams / 1000).toFixed(1)}kg)
                </div>
              </div>

              {/* Capsule Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {capsuleItems.map((item) => {
                  const isTransit = transitItemIds.includes(item.id);
                  const weightGrams = estimateItemWeightGrams(item);

                  return (
                    <div
                      key={item.id}
                      className={`group border bg-white flex flex-col justify-between transition-all relative overflow-hidden ${
                        isTransit ? 'border-[#8C7355] shadow-xs' : 'border-[#E5E5E1] hover:border-[#D5D5D0]'
                      }`}
                    >
                      {/* Photo Thumbnail */}
                      <div className="aspect-square bg-[#FAF9F5] border-b border-[#E5E5E1] relative overflow-hidden flex items-center justify-center p-2">
                        <GarmentImage
                          src={item.imageUrl}
                          alt={item.name}
                          category={item.category}
                          className="max-h-full max-w-full object-contain"
                          containerClassName="w-full h-full flex items-center justify-center"
                        />

                        {/* Transit Badge */}
                        {isTransit && (
                          <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-[#8C7355] text-white text-[9px] font-mono font-bold flex items-center gap-1 shadow-xs">
                            <Plane className="w-2.5 h-2.5" />
                            <span>Transit</span>
                          </div>
                        )}

                        {/* Remove from capsule button */}
                        <button
                          type="button"
                          onClick={() => handleToggleCapsuleItem(item.id)}
                          className="absolute top-1.5 right-1.5 p-1 bg-white/90 text-[#767670] hover:text-rose-600 border border-[#E5E5E1] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          title="Remove from capsule"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Item Details */}
                      <div className="p-2.5 space-y-1">
                        <span className="text-[10px] font-mono text-[#8C7355] uppercase tracking-wider block font-bold truncate">
                          {item.brand || 'Unbranded'}
                        </span>
                        <h4 className="text-xs font-serif font-bold text-[#1A1A1A] line-clamp-1">
                          {item.name}
                        </h4>
                        <div className="text-[10px] font-mono text-[#767670] flex items-center justify-between pt-1 border-t border-[#F2F1ED]">
                          <span>{item.category}</span>
                          <span>~{weightGrams}g</span>
                        </div>

                        {/* Toggle Transit Button */}
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => handleToggleTransitItem(item.id)}
                            className={`w-full py-1 text-[10px] font-mono border transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                              isTransit
                                ? 'bg-[#FAF9F5] text-[#8C7355] border-[#8C7355] font-semibold'
                                : 'bg-white text-[#5A5A55] border-[#E5E5E1] hover:border-[#8C7355]'
                            }`}
                          >
                            <Plane className="w-3 h-3" />
                            <span>{isTransit ? 'Worn on Flight' : 'Wear on Transit'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Custom Pieces Drawer Toggle */}
              <div className="pt-2 border-t border-[#E5E5E1]">
                <button
                  type="button"
                  onClick={() => setIsAddingItemManually(!isAddingItemManually)}
                  className="px-3 py-1.5 bg-white hover:bg-[#F2F1ED] border border-[#D5D5D0] text-xs font-mono text-[#1A1A1A] transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5 text-[#8C7355]" />
                  <span>{isAddingItemManually ? 'Hide Closet Items' : 'Add Items from Full Wardrobe'}</span>
                </button>

                {isAddingItemManually && (
                  <div className="mt-3 p-4 bg-white border border-[#E5E5E1] space-y-3">
                    <span className="text-xs font-mono font-bold text-[#1A1A1A] block">
                      Select additional pieces from your closet to include in this capsule:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-60 overflow-y-auto p-1">
                      {items
                        .filter((i) => !i.isArchived && !capsuleItemIds.includes(i.id))
                        .map((item) => (
                          <div
                            key={item.id}
                            onClick={() => handleToggleCapsuleItem(item.id)}
                            className="p-2 border border-[#E5E5E1] hover:border-[#8C7355] bg-[#FAF9F5] cursor-pointer flex flex-col items-center text-center space-y-1 transition-all"
                          >
                            <div className="w-12 h-12 flex items-center justify-center">
                              <GarmentImage src={item.imageUrl} alt={item.name} category={item.category} className="max-h-full object-contain" />
                            </div>
                            <span className="text-[10px] font-mono text-[#1A1A1A] font-bold line-clamp-1">{item.brand}</span>
                            <span className="text-[9px] text-[#767670] line-clamp-1">{item.name}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: MINIMALIST PERMUTATION ENGINE (15+ DISTINCT LOOKS) */}
          {activeTab === 'permutations' && (
            <div className="space-y-4">
              {/* Permutation Engine Header */}
              <div className="bg-white border border-[#E5E5E1] p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-serif font-bold text-[#1A1A1A] flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#8C7355]" />
                    Minimalist Permutation Matrix ({allPermutations.length} Distinct Looks)
                  </h3>
                  <p className="text-xs font-mono text-[#767670] mt-0.5">
                    Your {capsuleItems.length} core pieces unlock <strong>{allPermutations.length} cohesive formulas</strong>, each scored for thermal comfort and meteorological protection.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {/* Occasion Filter */}
                  <div className="flex items-center gap-1.5 text-xs font-mono">
                    <Filter className="w-3.5 h-3.5 text-[#767670]" />
                    <select
                      value={permutationOccasionFilter}
                      onChange={(e) => setPermutationOccasionFilter(e.target.value)}
                      className="px-2 py-1 bg-[#FAF9F5] border border-[#D5D5D0] text-xs font-mono text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
                    >
                      <option value="All">All Occasions ({allPermutations.length})</option>
                      <option value="Day Exploration & City Walk">Day Exploration</option>
                      <option value="Smart Casual & Dining">Smart Casual Dining</option>
                      <option value="Inclement Weather & Rain Layering">Rain & Weather Ready</option>
                      <option value="Art Gallery & Afternoon Café">Art Gallery &amp; Café</option>
                      <option value="Evening Drinks & Nightcap">Evening Drinks</option>
                      <option value="Travel Transit & Departure">Travel Transit</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleExportAllPermutationsToLookbook}
                    className="px-3 py-1 bg-[#8C7355] hover:bg-[#735D43] text-white text-xs font-mono font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>Save All {allPermutations.length} to Lookbook</span>
                  </button>
                </div>
              </div>

              {/* Permutation Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPermutations.map((perm, idx) => {
                  const permValuation = perm.pieces.reduce((acc, it) => acc + (it.purchasePrice || 0), 0);

                  return (
                    <div
                      key={perm.id}
                      className="bg-white border border-[#E5E5E1] p-4 flex flex-col justify-between space-y-3 hover:border-[#8C7355] transition-all shadow-xs"
                    >
                      <div>
                        {/* Permutation Header */}
                        <div className="flex items-center justify-between pb-2 border-b border-[#F2F1ED] text-xs font-mono">
                          <span className="text-[#8C7355] font-bold">
                            Formula #{idx + 1}
                          </span>
                          <span className="px-1.5 py-0.5 bg-[#FAF9F5] border border-[#E5E5E1] text-[10px] text-[#5A5A55]">
                            {perm.occasion}
                          </span>
                        </div>

                        {/* Title */}
                        <h4 className="text-xs font-serif font-bold text-[#1A1A1A] mt-2 line-clamp-2">
                          {perm.title}
                        </h4>

                        {/* Meteorological Badges */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-800 text-[10px] font-mono border border-emerald-200 flex items-center gap-1">
                            <Flame className="w-2.5 h-2.5 text-emerald-600" />
                            <span>Thermal: {perm.thermalScore}/100</span>
                          </span>

                          <span className="px-1.5 py-0.5 bg-[#FAF9F5] text-[#5A5A55] text-[10px] font-mono border border-[#E5E5E1]">
                            {perm.temperatureMatch}
                          </span>

                          {perm.isRainReady && (
                            <span className="px-1.5 py-0.5 bg-sky-50 text-sky-800 text-[10px] font-mono border border-sky-200 flex items-center gap-1">
                              <CloudRain className="w-2.5 h-2.5 text-sky-600" />
                              <span>Rain-Ready</span>
                            </span>
                          )}
                        </div>

                        {/* Pieces Thumbnails */}
                        <div className="grid grid-cols-4 gap-1.5 pt-3">
                          {perm.pieces.map((piece) => (
                            <div
                              key={piece.id}
                              className="p-1 border border-[#E5E5E1] bg-[#FAF9F5] flex flex-col items-center text-center"
                              title={`${piece.brand} ${piece.name} (${piece.category})`}
                            >
                              <div className="w-10 h-10 flex items-center justify-center">
                                <GarmentImage src={piece.imageUrl} alt={piece.name} category={piece.category} className="max-h-full object-contain" />
                              </div>
                              <span className="text-[8px] font-mono text-[#1A1A1A] line-clamp-1 font-bold mt-0.5">
                                {piece.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="pt-2 border-t border-[#F2F1ED] flex items-center justify-between text-xs font-mono">
                        <span className="text-[#767670] text-[11px]">
                          {formatGbp(permValuation)}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            addOutfit({
                              title: `${perm.title} (${destination.split(',')[0]})`,
                              description: perm.notes,
                              occasion: 'Travel Capsule',
                              season: tripSeason,
                              itemIds: perm.itemIds,
                              tags: ['Travel Capsule', destination.split(',')[0].trim()],
                              isFavorite: false,
                              photographicMood: 'Studio Flatlay',
                              thermalCohesionScore: perm.thermalScore,
                              thermalComfortRange: perm.temperatureMatch,
                            });
                            setLookbookSavedNotification(`Added "${perm.title}" to Lookbook!`);
                            setTimeout(() => setLookbookSavedNotification(null), 3000);
                          }}
                          className="px-2 py-1 bg-[#FAF9F5] hover:bg-[#F2F1ED] border border-[#D5D5D0] text-[#8C7355] text-[11px] font-semibold transition-colors cursor-pointer"
                        >
                          + Save Formula
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: DAILY ITINERARY WITH METEOROLOGICAL FORECAST */}
          {activeTab === 'daily_outfits' && (
            <div className="space-y-4">
              {/* Daily Meteorological Forecast Strip */}
              <div className="bg-white border border-[#E5E5E1] p-4 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-[#1A1A1A] flex items-center gap-1.5">
                    <CloudSun className="w-4 h-4 text-[#8C7355]" />
                    Meteorological Weather Forecast ({destination})
                  </span>
                  <span className="text-[#767670]">{tripSeason} Season</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                  {meteorologicalForecasts.map((f) => (
                    <div
                      key={f.day}
                      className="p-2.5 border border-[#E5E5E1] bg-[#FAF9F5] text-center space-y-1 text-xs font-mono"
                    >
                      <span className="text-[10px] text-[#8C7355] font-bold block">
                        Day {f.day}
                      </span>
                      <div className="flex items-center justify-center py-1">
                        {f.rainProb >= 50 ? (
                          <CloudRain className="w-5 h-5 text-sky-600" />
                        ) : f.tempMax >= 20 ? (
                          <Sun className="w-5 h-5 text-amber-500" />
                        ) : (
                          <CloudSun className="w-5 h-5 text-[#8C7355]" />
                        )}
                      </div>
                      <strong className="text-xs text-[#1A1A1A] block">
                        {f.tempMin}° / {f.tempMax}°C
                      </strong>
                      <span className="text-[10px] text-[#767670] block">
                        {f.rainProb}% Rain
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Day-by-day Itinerary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dailyOutfits.map((daily) => {
                  const outfitPieces = items.filter((it) => daily.itemIds.includes(it.id));
                  const outfitValuation = outfitPieces.reduce((acc, it) => acc + (it.purchasePrice || 0), 0);
                  const dayForecast = meteorologicalForecasts[daily.day - 1];

                  return (
                    <div
                      key={daily.day}
                      className="bg-white border border-[#E5E5E1] p-4 flex flex-col justify-between space-y-3 shadow-xs"
                    >
                      <div>
                        {/* Day Header */}
                        <div className="flex items-center justify-between pb-2 border-b border-[#F2F1ED] text-xs font-mono">
                          <span className="text-[#8C7355] font-bold uppercase tracking-wider">
                            Day {daily.day} Itinerary
                          </span>
                          <span className="text-[#767670]">{daily.occasion}</span>
                        </div>

                        {/* Title & Notes */}
                        <h4 className="text-sm font-serif font-bold text-[#1A1A1A] mt-2">
                          {daily.title}
                        </h4>

                        {dayForecast && (
                          <div className="flex items-center gap-2 mt-1 text-[11px] font-mono text-[#5A5A55]">
                            <span className="font-semibold text-[#8C7355]">Forecast:</span>
                            <span>{dayForecast.tempMin}°C - {dayForecast.tempMax}°C · {dayForecast.condition} ({dayForecast.rainProb}% rain)</span>
                          </div>
                        )}

                        <p className="text-xs text-[#767670] mt-1 leading-relaxed font-mono">
                          {daily.notes}
                        </p>

                        {/* Pieces Thumbnails */}
                        <div className="grid grid-cols-4 gap-2 pt-3">
                          {outfitPieces.map((piece) => (
                            <div
                              key={piece.id}
                              className="p-1.5 border border-[#E5E5E1] bg-[#FAF9F5] flex flex-col items-center text-center space-y-1"
                              title={`${piece.brand} ${piece.name} (${piece.category})`}
                            >
                              <div className="w-12 h-12 flex items-center justify-center">
                                <GarmentImage src={piece.imageUrl} alt={piece.name} category={piece.category} className="max-h-full object-contain" />
                              </div>
                              <span className="text-[9px] font-mono text-[#1A1A1A] line-clamp-1 font-bold">{piece.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="pt-2 border-t border-[#F2F1ED] flex items-center justify-between text-xs font-mono">
                        <span className="text-[#767670]">
                          Look Value: <strong>{formatGbp(outfitValuation)}</strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            addOutfit({
                              title: `${daily.title} (${destination.split(',')[0]})`,
                              description: daily.notes || `Curated travel look for ${destination}`,
                              occasion: 'Travel Capsule',
                              season: tripSeason,
                              itemIds: daily.itemIds,
                              tags: ['Travel Capsule', destination.split(',')[0].trim()],
                              isFavorite: false,
                            });
                            setLookbookSavedNotification(`Added "${daily.title}" to Lookbook!`);
                            setTimeout(() => setLookbookSavedNotification(null), 3000);
                          }}
                          className="px-2 py-1 bg-[#FAF9F5] hover:bg-[#F2F1ED] border border-[#D5D5D0] text-[#8C7355] text-[11px] font-semibold transition-colors cursor-pointer"
                        >
                          + Save to Lookbook
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: TRAVEL LAUNDRY & REFRESH TURNAROUND PLANNING */}
          {activeTab === 'laundry_plan' && (
            <div className="space-y-4">
              {/* Laundry Header Card */}
              <div className="bg-white border border-[#E5E5E1] p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <WashingMachine className="w-5 h-5 text-[#8C7355]" />
                    <div>
                      <h3 className="text-sm font-serif font-bold text-[#1A1A1A]">
                        Travel Laundry &amp; Garment Refresh Turnaround
                      </h3>
                      <p className="text-xs font-mono text-[#767670]">
                        Plan mid-trip laundering or garment steaming to safely rewear core pieces and save luggage allowance.
                      </p>
                    </div>
                  </div>

                  {/* Weight Saved Badge */}
                  <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono font-bold flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Luggage Space Saved: ~{(laundryPlan.weightSavedGrams / 1000).toFixed(1)}kg</span>
                  </div>
                </div>

                {/* Day Turnaround Picker */}
                <div className="pt-2 border-t border-[#F2F1ED] flex flex-wrap items-center gap-2 text-xs font-mono">
                  <span className="text-[#5A5A55] font-semibold">Select Laundry Turnaround Day(s):</span>
                  {Array.from({ length: daysCount }, (_, i) => i + 1).map((dayNum) => {
                    const isLaundryDay = laundryDays.includes(dayNum);
                    return (
                      <button
                        key={dayNum}
                        type="button"
                        onClick={() => handleToggleLaundryDay(dayNum)}
                        className={`px-3 py-1 border transition-colors cursor-pointer ${
                          isLaundryDay
                            ? 'bg-[#8C7355] text-white border-[#8C7355] font-bold'
                            : 'bg-white text-[#5A5A55] border-[#E5E5E1] hover:border-[#8C7355]'
                        }`}
                      >
                        Day {dayNum} {isLaundryDay ? '✓ Laundry' : ''}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Turnaround Strategy Summary */}
              <div className="p-3.5 bg-[#FAF0E6]/50 border border-[#E8DEC8] text-xs font-mono text-[#5C4830] leading-relaxed">
                <strong>Strategic Turnaround Logic:</strong> {laundryPlan.turnaroundSummary}
              </div>

              {/* Garment Rewear Lifecycle Table */}
              <div className="bg-white border border-[#E5E5E1] p-4 space-y-3">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#1A1A1A] block">
                  Garment Rewear Lifecycle &amp; Rotation Schedule
                </span>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-[#E5E5E1] text-[#767670] pb-2">
                        <th className="py-2">Garment Piece</th>
                        <th className="py-2">Category</th>
                        <th className="py-2">Scheduled Worn Days</th>
                        <th className="py-2">Rewear Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F2F1ED]">
                      {laundryPlan.rewearLog.map((log) => (
                        <tr key={log.itemId} className="hover:bg-[#FAF9F5]">
                          <td className="py-2.5 font-medium text-[#1A1A1A]">
                            {log.brand} - {log.itemName}
                          </td>
                          <td className="py-2.5 text-[#767670]">{log.category}</td>
                          <td className="py-2.5">
                            {log.wornDays.length > 0 ? (
                              <div className="flex items-center gap-1">
                                {log.wornDays.map((d) => (
                                  <span key={d} className="px-1.5 py-0.5 bg-[#FAF9F5] border border-[#D5D5D0] text-[10px]">
                                    Day {d}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[#A5A59E]">Reserve piece</span>
                            )}
                          </td>
                          <td className="py-2.5">
                            {log.wornDays.length > 1 ? (
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                                Reworn ({log.wornDays.length}x) {log.isRefreshedByLaundry ? '· Washed' : ''}
                              </span>
                            ) : (
                              <span className="text-[#767670] text-[11px]">Single wear</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: PACKING CHECKLIST & WEIGHT */}
          {activeTab === 'packing_list' && (
            <div className="space-y-4">
              {/* Checklist Progress Bar */}
              <div className="bg-white border border-[#E5E5E1] p-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-[#1A1A1A]">
                    Packing Readiness: {packedItemIds.length} of {capsuleItems.length} garments checked
                  </span>
                  <span className="text-[#8C7355] font-bold">
                    {Math.round((packedItemIds.length / (capsuleItems.length || 1)) * 100)}% Ready
                  </span>
                </div>
                <div className="w-full h-2 bg-[#E5E5E1] overflow-hidden rounded-xs">
                  <div
                    className="h-full bg-[#8C7355] transition-all duration-300"
                    style={{ width: `${(packedItemIds.length / (capsuleItems.length || 1)) * 100}%` }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPackedItemIds(capsuleItems.map((i) => i.id))}
                    className="px-2.5 py-1 bg-white border border-[#D5D5D0] hover:bg-[#F2F1ED] text-[#1A1A1A] cursor-pointer"
                  >
                    Check All Packed
                  </button>
                  <button
                    type="button"
                    onClick={() => setPackedItemIds([])}
                    className="px-2.5 py-1 bg-white border border-[#D5D5D0] hover:bg-[#F2F1ED] text-[#767670] cursor-pointer"
                  >
                    Uncheck All
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleCopyPackingManifest}
                  className="px-3 py-1.5 bg-[#8C7355] text-white hover:bg-[#735D43] transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs font-semibold"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedNotification ? 'Copied Manifest!' : 'Copy Complete Packing Manifest'}</span>
                </button>
              </div>

              {/* Section 1: Worn on Transit */}
              <div className="bg-white border border-[#E5E5E1] p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#F2F1ED] text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <Plane className="w-4 h-4 text-[#8C7355]" />
                    <span className="font-bold text-[#1A1A1A] uppercase tracking-wider">
                      Worn on Departure Transit ({transitItems.length} items)
                    </span>
                  </div>
                  <span className="text-[#8C7355]">
                    Saved {(transitWeightSavedGrams / 1000).toFixed(1)}kg in bag
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {transitItems.map((item) => (
                    <label
                      key={item.id}
                      className="p-2.5 border border-[#E5E5E1] bg-[#FAF9F5] flex items-center justify-between cursor-pointer hover:border-[#8C7355]"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <input
                          type="checkbox"
                          checked={packedItemIds.includes(item.id)}
                          onChange={() => handleToggleChecklistPacked(item.id)}
                          className="accent-[#8C7355] w-4 h-4 cursor-pointer"
                        />
                        <div className="truncate">
                          <span className="text-xs font-serif font-bold text-[#1A1A1A] block truncate">{item.name}</span>
                          <span className="text-[10px] font-mono text-[#767670]">{item.brand} · {item.category}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-[#8C7355] shrink-0 font-semibold">
                        ~{estimateItemWeightGrams(item)}g
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Section 2: Packed in Luggage Bag */}
              <div className="bg-white border border-[#E5E5E1] p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#F2F1ED] text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <Luggage className="w-4 h-4 text-[#8C7355]" />
                    <span className="font-bold text-[#1A1A1A] uppercase tracking-wider">
                      Packed in Luggage Case ({packedLuggageItems.length} items)
                    </span>
                  </div>
                  <span className={totalPackedWeightGrams > maxWeightGrams ? 'text-rose-600 font-bold' : 'text-emerald-700 font-bold'}>
                    Total Packed: {(totalPackedWeightGrams / 1000).toFixed(1)}kg / {(maxWeightGrams / 1000).toFixed(0)}kg
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {packedLuggageItems.map((item) => {
                    const isChecked = packedItemIds.includes(item.id);
                    return (
                      <label
                        key={item.id}
                        className={`p-2.5 border flex items-center justify-between cursor-pointer transition-colors ${
                          isChecked ? 'bg-[#EBF3ED] border-[#BBDBC2]' : 'bg-white border-[#E5E5E1] hover:border-[#8C7355]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleChecklistPacked(item.id)}
                            className="accent-[#8C7355] w-4 h-4 cursor-pointer"
                          />
                          <div className="truncate">
                            <span className={`text-xs font-serif font-bold block truncate ${isChecked ? 'line-through text-[#5A5A55]' : 'text-[#1A1A1A]'}`}>
                              {item.name}
                            </span>
                            <span className="text-[10px] font-mono text-[#767670]">{item.brand} · {item.category}</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-[#767670] shrink-0 font-medium">
                          ~{estimateItemWeightGrams(item)}g
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Section 3: Travel Essentials & Laundry Care Checklist */}
              <div className="bg-white border border-[#E5E5E1] p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#F2F1ED] text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <Droplets className="w-4 h-4 text-[#8C7355]" />
                    <span className="font-bold text-[#1A1A1A] uppercase tracking-wider">
                      Travel Essentials &amp; Garment Care Kit
                    </span>
                  </div>
                  <span className="text-[#767670]">
                    {(totalEssentialsWeightGrams / 1000).toFixed(2)}kg
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {travelEssentials.map((item) => (
                    <label
                      key={item.id}
                      className={`p-2.5 border flex items-center justify-between cursor-pointer transition-colors ${
                        item.isPacked ? 'bg-[#EBF3ED] border-[#BBDBC2]' : 'bg-white border-[#E5E5E1] hover:border-[#8C7355]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <input
                          type="checkbox"
                          checked={item.isPacked}
                          onChange={() => handleToggleEssentialPacked(item.id)}
                          className="accent-[#8C7355] w-4 h-4 cursor-pointer"
                        />
                        <div className="truncate">
                          <span className={`text-xs font-mono font-medium block truncate ${item.isPacked ? 'line-through text-[#5A5A55]' : 'text-[#1A1A1A]'}`}>
                            {item.name}
                          </span>
                          <span className="text-[10px] font-mono text-[#767670]">{item.category}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-[#767670] shrink-0 font-medium">
                        ~{item.weightEstimateGrams}g
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: SAVED TRIPS */}
          {activeTab === 'saved_trips' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[#5A5A55]">
                  Manage and reload your past travel wardrobe capsules.
                </span>
                <span className="text-[#767670]">({savedTrips.length} saved trips)</span>
              </div>

              {savedTrips.length === 0 ? (
                <div className="p-8 text-center bg-white border border-[#E5E5E1] space-y-2">
                  <Compass className="w-8 h-8 text-[#A5A59E] mx-auto" />
                  <p className="text-xs font-mono text-[#767670]">
                    No saved trips yet. Click "Save Trip" at the top to bookmark your current configuration.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {savedTrips.map((trip) => (
                    <div
                      key={trip.id}
                      className="p-4 bg-white border border-[#E5E5E1] flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-1 text-xs">
                        <span className="text-[10px] font-mono text-[#8C7355] uppercase tracking-wider font-bold block">
                          {trip.vibe}
                        </span>
                        <h4 className="text-sm font-serif font-bold text-[#1A1A1A]">
                          {trip.destination}
                        </h4>
                        <div className="text-[11px] font-mono text-[#767670] pt-1">
                          {trip.daysCount} Days · {trip.selectedItemIds.length} pieces · {trip.temperatureRange}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-[#F2F1ED] text-xs font-mono">
                        <button
                          type="button"
                          onClick={() => handleLoadTrip(trip)}
                          className="flex-1 py-1 bg-[#FAF9F5] hover:bg-[#F2F1ED] border border-[#D5D5D0] text-[#1A1A1A] font-medium transition-colors cursor-pointer text-center"
                        >
                          Load Capsule
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTrip(trip.id)}
                          className="p-1 text-[#767670] hover:text-rose-600 hover:bg-rose-50 border border-transparent rounded cursor-pointer"
                          title="Delete trip"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

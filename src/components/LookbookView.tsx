import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Sparkles,
  Heart,
  Edit2,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { useWardrobe } from '../context/WardrobeContext';
import { LookbookOutfit, WardrobeItem } from '../types';
import { GarmentImage } from './GarmentImage';

interface LookbookViewProps {
  onOpenCreateLook: () => void;
  onEditLook: (outfit: LookbookOutfit) => void;
  onSelectItem: (item: WardrobeItem) => void;
}

export const LookbookView: React.FC<LookbookViewProps> = ({
  onOpenCreateLook,
  onEditLook,
  onSelectItem,
}) => {
  const {
    outfits,
    items,
    logOutfitWear,
    toggleOutfitFavorite,
    deleteOutfit,
    addOutfit,
  } = useWardrobe();

  const [selectedOccasion, setSelectedOccasion] = useState<string>('All');
  const [selectedSeason, setSelectedSeason] = useState<string>('All');
  const [isGeneratingAI, setIsGeneratingAI] = useState<boolean>(false);
  const [aiGeneratedOutfits, setAiGeneratedOutfits] = useState<any[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);

  const occasions = [
    'All',
    'Work & Office',
    'Weekend Casual',
    'Evening & Dining',
    'Formal & Events',
    'Travel Capsule',
    'Date Night',
    'Seasonal Transition',
  ];

  const seasons = ['All', 'Autumn', 'Winter', 'Spring', 'Summer', 'All-Season'];

  const filteredOutfits = outfits.filter((outfit) => {
    if (selectedOccasion !== 'All' && outfit.occasion !== selectedOccasion) return false;
    if (selectedSeason !== 'All' && outfit.season !== selectedSeason && outfit.season !== 'All-Season')
      return false;
    return true;
  });

  const formatGbp = (val: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: val % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  // Trigger Gemini AI Outfit Generator
  const handleGenerateAIOutfits = async () => {
    try {
      setIsGeneratingAI(true);
      setAiError(null);

      const res = await fetch('/api/gemini/generate-outfits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wardrobeItems: items,
          occasion: selectedOccasion === 'All' ? 'Smart Casual' : selectedOccasion,
          season: selectedSeason === 'All' ? 'Autumn' : selectedSeason,
          weatherTemp: 'Mild British Weather (15°C)',
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Server returned an error.');
      }

      const data = await res.json();
      if (data.outfits && Array.isArray(data.outfits)) {
        setAiGeneratedOutfits(data.outfits);
      }
    } catch (err: any) {
      console.error('Failed to generate AI outfits', err);
      setAiError(err.message || 'AI generation failed. Please check Gemini API key in Settings.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleSaveAiOutfit = (aiOutfit: any) => {
    addOutfit({
      title: aiOutfit.title,
      description: aiOutfit.description,
      occasion: aiOutfit.occasion || 'Weekend Casual',
      season: aiOutfit.season || 'Autumn',
      itemIds: aiOutfit.itemIds || [],
      tags: ['AI Curated', aiOutfit.occasion || 'Smart Casual'],
      isFavorite: false,
    });

    // Remove from temporary list
    setAiGeneratedOutfits((prev) => prev.filter((o) => o.title !== aiOutfit.title));
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-[#E5E5E1] rounded-xl p-4 shadow-xs">
        <div>
          <h1 className="text-xl font-serif font-bold text-[#1A1A1A]">
            Lookbook &amp; Outfit Styling Studio
          </h1>
          <p className="text-xs text-[#767670]">
            Design, save, and test outfit formulas from your wardrobe pieces.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerateAIOutfits}
            disabled={isGeneratingAI}
            id="lookbook-ai-gen-btn"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-[#F8F7F4] hover:bg-[#F3F2EE] text-[#8C7355] border border-[#E5E5E1] shadow-xs transition-all disabled:opacity-50 cursor-pointer"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isGeneratingAI ? 'animate-spin' : 'text-[#8C7355]'}`} />
            {isGeneratingAI ? 'Styling with AI...' : 'AI Generate Looks'}
          </button>

          <button
            onClick={onOpenCreateLook}
            id="lookbook-create-btn"
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md bg-[#8C7355] hover:bg-[#786248] text-white shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Style New Look
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-white border border-[#E5E5E1] rounded-xl p-3 shadow-xs">
        {/* Occasions */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          <span className="text-[11px] text-[#767670] font-mono mr-1 font-semibold">Occasion:</span>
          {occasions.map((occ) => (
            <button
              key={occ}
              onClick={() => setSelectedOccasion(occ)}
              className={`px-2.5 py-0.5 text-xs rounded-md whitespace-nowrap transition-all cursor-pointer ${
                selectedOccasion === occ
                  ? 'bg-[#1A1A1A] text-white font-semibold shadow-xs'
                  : 'bg-[#F8F7F4] text-[#5A5A55] hover:bg-[#F3F2EE] border border-[#E5E5E1]'
              }`}
            >
              {occ}
            </button>
          ))}
        </div>

        {/* Season Selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-[#767670] font-mono">Season:</span>
          <select
            value={selectedSeason}
            onChange={(e) => setSelectedSeason(e.target.value)}
            className="bg-[#F8F7F4] border border-[#E5E5E1] text-[#1A1A1A] text-xs rounded-md px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-[#8C7355]"
          >
            {seasons.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* AI Generated Outfits Drawer (if generated) */}
      {aiGeneratedOutfits.length > 0 && (
        <div className="bg-white border border-[#8C7355]/40 rounded-xl p-4 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#8C7355]" />
              <div>
                <h3 className="text-sm font-serif font-bold text-[#1A1A1A]">
                  AI Styled Outfit Proposals
                </h3>
                <p className="text-[11px] text-[#767670]">
                  Generated by Gemini AI based on your active closet collection.
                </p>
              </div>
            </div>
            <button
              onClick={() => setAiGeneratedOutfits([])}
              className="text-xs text-[#767670] hover:text-[#1A1A1A] cursor-pointer"
            >
              Dismiss
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {aiGeneratedOutfits.map((aiLook, idx) => {
              const matchedItems = (aiLook.itemIds || [])
                .map((id: string) => items.find((i) => i.id === id))
                .filter(Boolean) as WardrobeItem[];
              const totalVal = matchedItems.reduce((acc, i) => acc + i.purchasePrice, 0);

              return (
                <div
                  key={idx}
                  className="bg-[#F8F7F4] border border-[#E5E5E1] rounded-lg p-3 flex flex-col justify-between space-y-2"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white text-[#8C7355] border border-[#E5E5E1] font-semibold">
                        {aiLook.occasion}
                      </span>
                      <span className="text-xs font-mono font-semibold text-[#1A1A1A]">
                        Total {formatGbp(totalVal || aiLook.totalValuationGbp || 0)}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-[#1A1A1A]">
                      {aiLook.title}
                    </h4>
                    <p className="text-[11px] text-[#767670] leading-snug">
                      {aiLook.description}
                    </p>

                    {aiLook.stylingTip && (
                      <div className="text-[10px] text-[#8C7355] italic bg-white p-1.5 rounded border border-[#E5E5E1]">
                        Tip: {aiLook.stylingTip}
                      </div>
                    )}

                    {/* Pieces Mini Avatars */}
                    <div className="flex items-center gap-1 pt-1 overflow-x-auto no-scrollbar">
                      {matchedItems.map((item) => (
                        <div
                          key={item.id}
                          title={`${item.brand} - ${item.name}`}
                          className="w-7 h-7 rounded overflow-hidden border border-[#E5E5E1] bg-stone-100 flex-shrink-0"
                        >
                          <GarmentImage
                            src={item.imageUrl}
                            alt={item.name}
                            category={item.category}
                            className="w-full h-full object-contain p-0.5"
                            containerClassName="w-full h-full bg-stone-100 flex items-center justify-center"
                            showPlaceholderLabel={false}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => handleSaveAiOutfit(aiLook)}
                    className="w-full py-1.5 text-xs font-semibold rounded-md bg-[#8C7355] hover:bg-[#786248] text-white flex items-center justify-center gap-1 transition-colors shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    Save to Lookbook
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {aiError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
          <strong>AI Styling Notice:</strong> {aiError}
        </div>
      )}

      {/* Outfits Grid */}
      {filteredOutfits.length === 0 ? (
        <div className="text-center py-12 bg-white border border-dashed border-[#E5E5E1] rounded-xl space-y-2">
          <Layers className="w-6 h-6 text-[#767670] mx-auto" />
          <h3 className="text-sm font-semibold text-[#1A1A1A]">No lookbook formulas found</h3>
          <p className="text-xs text-[#767670] max-w-sm mx-auto">
            Create an outfit by combining pieces from your wardrobe or use the AI Generator above.
          </p>
          <button
            onClick={onOpenCreateLook}
            className="px-3 py-1.5 text-xs font-semibold rounded-md bg-[#8C7355] hover:bg-[#786248] text-white cursor-pointer shadow-xs"
          >
            Style First Look
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOutfits.map((outfit) => {
            const outfitItems = outfit.itemIds
              .map((id) => items.find((i) => i.id === id))
              .filter(Boolean) as WardrobeItem[];

            const totalOutfitValuation = outfitItems.reduce(
              (acc, item) => acc + item.purchasePrice,
              0
            );

            return (
              <div
                key={outfit.id}
                className="bg-white border border-[#E5E5E1] hover:border-[#8C7355]/60 rounded-xl overflow-hidden shadow-xs flex flex-col justify-between group transition-all"
              >
                {/* Visual Cover / Collage: Full Containment */}
                <div className="relative aspect-[16/10] bg-[#F8F7F4] overflow-hidden border-b border-[#E5E5E1] flex items-center justify-center">
                  {outfit.imageUrl ? (
                    <img
                      src={outfit.imageUrl}
                      alt={outfit.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain p-1.5 group-hover:scale-103 transition-transform duration-300"
                    />
                  ) : (
                    /* Dynamic Collage of first 3 items: uncropped */
                    <div className="grid grid-cols-3 h-full w-full bg-[#F8F7F4]">
                      {outfitItems.slice(0, 3).map((item, i) => (
                        <div key={i} className="h-full border-r border-[#E5E5E1] last:border-r-0 flex items-center justify-center p-1">
                          <GarmentImage
                            src={item.imageUrl}
                            alt={item.name}
                            category={item.category}
                            className="w-full h-full max-h-full max-w-full object-contain"
                            containerClassName="w-full h-full bg-[#F8F7F4] flex items-center justify-center"
                            showPlaceholderLabel={false}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Badges Overlay */}
                  <div className="absolute top-2 left-2 flex items-center gap-1">
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/90 text-[#8C7355] backdrop-blur-xs border border-[#E5E5E1] font-semibold">
                      {outfit.occasion}
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/90 text-[#1A1A1A] backdrop-blur-xs border border-[#E5E5E1]">
                      {outfit.season}
                    </span>
                  </div>

                  <div className="absolute top-2 right-2 flex items-center gap-1">
                    <button
                      onClick={() => toggleOutfitFavorite(outfit.id)}
                      className="p-1 rounded-full bg-white/90 text-[#767670] hover:text-rose-600 backdrop-blur-xs border border-[#E5E5E1] cursor-pointer"
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${
                          outfit.isFavorite ? 'fill-rose-500 text-rose-500' : ''
                        }`}
                      />
                    </button>
                  </div>

                  {/* Total Valuation Tag */}
                  <div className="absolute bottom-2 right-2">
                    <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-white/95 text-[#1A1A1A] backdrop-blur-xs border border-[#E5E5E1] shadow-xs">
                      Value: {formatGbp(totalOutfitValuation)}
                    </span>
                  </div>
                </div>

                {/* Details Section */}
                <div className="p-3.5 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-1">
                    <h3 className="text-sm font-serif font-bold text-[#1A1A1A] group-hover:text-[#8C7355] transition-colors">
                      {outfit.title}
                    </h3>
                    {outfit.description && (
                      <p className="text-xs text-[#767670] line-clamp-2 leading-relaxed">
                        {outfit.description}
                      </p>
                    )}
                  </div>

                  {/* Individual Pieces List */}
                  <div className="space-y-1.5 pt-2 border-t border-[#E5E5E1]">
                    <div className="text-[10px] font-mono text-[#767670] uppercase tracking-wider font-semibold">
                      Pieces ({outfitItems.length}):
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {outfitItems.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => onSelectItem(item)}
                          className="flex items-center gap-1.5 p-1 rounded-md bg-[#F8F7F4] hover:bg-[#F3F2EE] border border-[#E5E5E1] cursor-pointer transition-colors"
                        >
                          <div className="w-7 h-7 rounded overflow-hidden flex-shrink-0 bg-white border border-[#E5E5E1]">
                            <GarmentImage
                              src={item.imageUrl}
                              alt={item.name}
                              category={item.category}
                              className="w-full h-full object-contain p-0.5"
                              containerClassName="w-full h-full bg-white flex items-center justify-center"
                              showPlaceholderLabel={false}
                            />
                          </div>
                          <div className="truncate">
                            <div className="text-[10px] font-semibold text-[#1A1A1A] truncate">
                              {item.name}
                            </div>
                            <div className="text-[9px] text-[#767670] font-mono">
                              {formatGbp(item.purchasePrice)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div className="pt-2.5 border-t border-[#E5E5E1] flex items-center justify-between gap-2">
                    <div className="text-[10px] font-mono text-[#767670]">
                      Worn: <strong className="text-[#1A1A1A]">{outfit.timesWorn}x</strong>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onEditLook(outfit)}
                        className="p-1 text-[#767670] hover:text-[#1A1A1A] rounded hover:bg-[#F3F2EE] transition-colors cursor-pointer"
                        title="Edit Look Formula"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>

                      <button
                        onClick={() => deleteOutfit(outfit.id)}
                        className="p-1 text-[#767670] hover:text-rose-600 rounded hover:bg-[#F3F2EE] transition-colors cursor-pointer"
                        title="Delete Look"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>

                      <button
                        onClick={() => logOutfitWear(outfit.id)}
                        id={`wear-look-${outfit.id}`}
                        className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md bg-[#8C7355] hover:bg-[#786248] text-white shadow-xs transition-all cursor-pointer"
                        title="Log wear for all items in this outfit today"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        Wore Look (+1)
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};


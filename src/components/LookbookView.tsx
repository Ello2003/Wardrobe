import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Sparkles,
  Heart,
  Edit2,
  Trash2,
  CheckCircle2,
  Camera,
  Globe,
  ExternalLink,
  ShoppingBag,
  Eye,
  Shirt,
  Palette,
  Compass,
} from 'lucide-react';
import { useWardrobe } from '../context/WardrobeContext';
import { LookbookOutfit, WardrobeItem } from '../types';
import { GarmentImage } from './GarmentImage';
import { safeApiFetch } from '../utils/apiHelper';
import { ImportLookbookIdeaModal } from './ImportLookbookIdeaModal';
import { EditorialLookbookModal } from './EditorialLookbookModal';
import { EDITORIAL_RESEARCH_IDEAS } from '../data/editorialInspirations';
import { formatGbp } from '../utils/formatters';
import { EmptyState } from './common/EmptyState';

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
  const [lookbookFilter, setLookbookFilter] = useState<'all' | 'closet' | 'editorial' | 'favorites'>('all');
  const [isGeneratingAI, setIsGeneratingAI] = useState<boolean>(false);
  const [aiGeneratedOutfits, setAiGeneratedOutfits] = useState<any[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);

  // Modals
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedEditorialOutfit, setSelectedEditorialOutfit] = useState<LookbookOutfit | null>(null);

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

    if (lookbookFilter === 'closet' && outfit.isEditorialIdea) return false;
    if (lookbookFilter === 'editorial' && !outfit.isEditorialIdea && !outfit.sourceUrl) return false;
    if (lookbookFilter === 'favorites' && !outfit.isFavorite) return false;

    return true;
  });

  const editorialCount = outfits.filter(
    (o) => o.isEditorialIdea || Boolean(o.sourceUrl)
  ).length;

  const closetCount = outfits.filter((o) => !o.isEditorialIdea).length;

  // Trigger Gemini AI Outfit Generator
  const handleGenerateAIOutfits = async () => {
    try {
      setIsGeneratingAI(true);
      setAiError(null);

      const res = await safeApiFetch('/api/gemini/generate-outfits', {
        method: 'POST',
        body: JSON.stringify({
          wardrobeItems: items,
          occasion: selectedOccasion === 'All' ? 'Smart Casual' : selectedOccasion,
          season: selectedSeason === 'All' ? 'Autumn' : selectedSeason,
          weatherTemp: 'Mild British Weather (15°C)',
        }),
      });

      if (!res.success) {
        throw new Error(res.error || 'Server returned an error.');
      }

      if (res.data?.outfits && Array.isArray(res.data.outfits)) {
        setAiGeneratedOutfits(res.data.outfits);
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

  // Recreate an editorial idea in closet
  const handleRecreateEditorialLook = (idea: any, matchedIds: string[]) => {
    const templateOutfit: LookbookOutfit = {
      id: '',
      title: `My Version: ${idea.title || 'Editorial Formula'}`,
      description: idea.description || '',
      occasion: idea.occasion || 'Weekend Casual',
      season: idea.season || 'Autumn',
      itemIds: matchedIds,
      tags: ['Wardrobe Re-creation', idea.aesthetic || 'Editorial'],
      imageUrl: idea.imageUrl,
      aesthetic: idea.aesthetic,
      colorPalette: idea.colorPalette,
      isFavorite: false,
      timesWorn: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onEditLook(templateOutfit);
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-[#E5E5E1] rounded-xl p-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-serif font-bold text-[#1A1A1A]">
              Lookbook &amp; Editorial Research Studio
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 bg-[#F8F7F4] text-[#8C7355] border border-[#E5E5E1] rounded font-semibold">
              Atelier Curated
            </span>
          </div>
          <p className="text-xs text-[#767670] mt-0.5">
            Photographic street-style research, web styling imports, and bespoke wardrobe formulas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Internet Research / Scout Ideas */}
          <button
            onClick={() => setIsImportModalOpen(true)}
            id="lookbook-scout-ideas-btn"
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-mono font-bold rounded-md bg-[#FAF9F7] hover:bg-[#F3F2EE] text-[#8C7355] border border-[#8C7355] shadow-2xs transition-all cursor-pointer"
            title="Import editorial style ideas from web URLs, street style photos, or curated archives"
          >
            <Camera className="w-3.5 h-3.5 text-[#8C7355]" />
            <span>Research &amp; Import Ideas</span>
          </button>

          {/* AI Generator */}
          <button
            onClick={handleGenerateAIOutfits}
            disabled={isGeneratingAI}
            id="lookbook-ai-gen-btn"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-[#F8F7F4] hover:bg-[#F3F2EE] text-[#5A5A55] border border-[#E5E5E1] shadow-xs transition-all disabled:opacity-50 cursor-pointer"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isGeneratingAI ? 'animate-spin text-[#8C7355]' : 'text-[#8C7355]'}`} />
            <span>{isGeneratingAI ? 'Styling with AI...' : 'AI Generate Looks'}</span>
          </button>

          {/* Style New Look from Scratch */}
          <button
            onClick={onOpenCreateLook}
            id="lookbook-create-btn"
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md bg-[#8C7355] hover:bg-[#786248] text-white shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Style New Look</span>
          </button>
        </div>
      </div>

      {/* Sub-Navigation: Scope Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-[#E5E5E1] rounded-xl p-3 shadow-xs">
        {/* Scope Tabs */}
        <div className="flex items-center gap-1.5 bg-[#FAF9F7] p-1 border border-[#E5E5E1] rounded-lg">
          <button
            onClick={() => setLookbookFilter('all')}
            className={`px-3 py-1 text-xs font-mono rounded transition-colors cursor-pointer ${
              lookbookFilter === 'all'
                ? 'bg-white text-[#1A1A1A] font-bold shadow-2xs border border-[#D5D5D0]'
                : 'text-[#767670] hover:text-[#1A1A1A]'
            }`}
          >
            All Formulas ({outfits.length})
          </button>
          <button
            onClick={() => setLookbookFilter('closet')}
            className={`px-3 py-1 text-xs font-mono rounded transition-colors cursor-pointer ${
              lookbookFilter === 'closet'
                ? 'bg-white text-[#1A1A1A] font-bold shadow-2xs border border-[#D5D5D0]'
                : 'text-[#767670] hover:text-[#1A1A1A]'
            }`}
          >
            Wardrobe Formulations ({closetCount})
          </button>
          <button
            onClick={() => setLookbookFilter('editorial')}
            className={`px-3 py-1 text-xs font-mono rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
              lookbookFilter === 'editorial'
                ? 'bg-white text-[#8C7355] font-bold shadow-2xs border border-[#8C7355]'
                : 'text-[#767670] hover:text-[#1A1A1A]'
            }`}
          >
            <Camera className="w-3 h-3" />
            <span>Photographic Ideas ({editorialCount})</span>
          </button>
          <button
            onClick={() => setLookbookFilter('favorites')}
            className={`px-3 py-1 text-xs font-mono rounded transition-colors cursor-pointer flex items-center gap-1 ${
              lookbookFilter === 'favorites'
                ? 'bg-white text-rose-600 font-bold shadow-2xs border border-[#D5D5D0]'
                : 'text-[#767670] hover:text-[#1A1A1A]'
            }`}
          >
            <Heart className="w-3 h-3" />
            <span>Favorites</span>
          </button>
        </div>

        {/* Occasion & Season Selectors */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Occasions dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-[#767670] font-mono">Occasion:</span>
            <select
              value={selectedOccasion}
              onChange={(e) => setSelectedOccasion(e.target.value)}
              className="bg-[#FAF9F7] border border-[#E5E5E1] text-[#1A1A1A] text-xs rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#8C7355]"
            >
              {occasions.map((occ) => (
                <option key={occ} value={occ}>
                  {occ}
                </option>
              ))}
            </select>
          </div>

          {/* Season Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-[#767670] font-mono">Season:</span>
            <select
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value)}
              className="bg-[#FAF9F7] border border-[#E5E5E1] text-[#1A1A1A] text-xs rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#8C7355]"
            >
              {seasons.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* AI Generated Outfits Drawer (if generated) */}
      {aiGeneratedOutfits.length > 0 && (
        <div className="bg-white border border-[#8C7355]/40 rounded-xl p-4 space-y-3 shadow-xs animate-fadeIn">
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
                          className="w-7 h-7 rounded overflow-hidden border border-[#E5E5E1] bg-stone-100 shrink-0"
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
        <EmptyState
          icon={Camera}
          title="No lookbook formulas matching this filter"
          description="Explore photographic editorial street-style archives, import looks from Pinterest or GQ articles, or assemble pieces directly from your closet."
          onResetFilters={() => {
            setSelectedOccasion('All');
            setSelectedSeason('All');
            setLookbookFilter('all');
          }}
          actions={[
            {
              label: 'Explore Editorial Ideas Archive',
              icon: Camera,
              primary: true,
              onClick: () => setIsImportModalOpen(true),
            },
            {
              label: 'Style First Closet Look',
              icon: Plus,
              onClick: onOpenCreateLook,
            },
          ]}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredOutfits.map((outfit) => {
            const outfitItems = outfit.itemIds
              .map((id) => items.find((i) => i.id === id))
              .filter(Boolean) as WardrobeItem[];

            const totalOutfitValuation = outfitItems.reduce(
              (acc, item) => acc + item.purchasePrice,
              0
            );

            const isEditorial = Boolean(outfit.isEditorialIdea || outfit.sourceUrl || outfit.photographicMood);

            return (
              <div
                key={outfit.id}
                className="bg-white border border-[#E5E5E1] hover:border-[#8C7355] rounded-xl overflow-hidden shadow-xs flex flex-col justify-between group transition-all"
              >
                {/* Visual Cover: Highly Photographic for Editorial Looks, Uncropped Collage for Closet Formulas */}
                <div
                  onClick={() => setSelectedEditorialOutfit(outfit)}
                  className={`relative cursor-pointer overflow-hidden border-b border-[#E5E5E1] ${
                    isEditorial ? 'aspect-[4/5] bg-stone-100' : 'aspect-[16/10] bg-[#F8F7F4]'
                  }`}
                >
                  {outfit.imageUrl ? (
                    <div className="w-full h-full relative group">
                      <img
                        src={outfit.imageUrl}
                        alt={outfit.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />
                    </div>
                  ) : (
                    /* Dynamic Collage of first 3 items */
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
                  <div className="absolute top-2.5 left-2.5 flex flex-wrap items-center gap-1">
                    {outfit.aesthetic && (
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-black/80 text-[#8C7355] backdrop-blur-xs font-semibold">
                        {outfit.aesthetic}
                      </span>
                    )}
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/90 text-[#1A1A1A] backdrop-blur-xs border border-[#E5E5E1]">
                      {outfit.occasion}
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/90 text-[#1A1A1A] backdrop-blur-xs border border-[#E5E5E1]">
                      {outfit.season}
                    </span>
                  </div>

                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleOutfitFavorite(outfit.id);
                      }}
                      className="p-1.5 rounded-full bg-white/90 hover:bg-white text-[#767670] hover:text-rose-600 backdrop-blur-xs border border-[#E5E5E1] cursor-pointer shadow-xs transition-colors"
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${
                          outfit.isFavorite ? 'fill-rose-500 text-rose-500' : ''
                        }`}
                      />
                    </button>
                  </div>

                  {/* Photographic Mood / Valuation Tag */}
                  <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between">
                    {outfit.photographicMood ? (
                      <span className="text-[9px] font-mono font-semibold px-2 py-0.5 rounded bg-black/85 text-white backdrop-blur-xs">
                        {outfit.photographicMood}
                      </span>
                    ) : (
                      <span />
                    )}

                    {totalOutfitValuation > 0 && (
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-white/95 text-[#1A1A1A] backdrop-blur-xs border border-[#E5E5E1] shadow-xs">
                        Value: {formatGbp(totalOutfitValuation)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Details Section */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div
                      onClick={() => setSelectedEditorialOutfit(outfit)}
                      className="cursor-pointer"
                    >
                      <h3 className="text-sm font-serif font-bold text-[#1A1A1A] group-hover:text-[#8C7355] transition-colors line-clamp-1">
                        {outfit.title}
                      </h3>
                      {outfit.description && (
                        <p className="text-xs text-[#767670] line-clamp-2 leading-relaxed mt-0.5">
                          {outfit.description}
                        </p>
                      )}
                    </div>

                    {/* Color Story Palette (if present) */}
                    {Array.isArray(outfit.colorPalette) && outfit.colorPalette.length > 0 && (
                      <div className="flex items-center gap-1 pt-1">
                        <span className="text-[9px] font-mono text-[#767670] mr-1">Palette:</span>
                        {outfit.colorPalette.map((hex, idx) => (
                          <span
                            key={idx}
                            style={{ backgroundColor: hex }}
                            className="w-3.5 h-3.5 rounded-full border border-black/15 shadow-2xs inline-block"
                            title={hex}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Individual Pieces List or Editorial Pieces */}
                  <div className="space-y-1.5 pt-2.5 border-t border-[#E5E5E1]">
                    {outfitItems.length > 0 ? (
                      <div>
                        <div className="text-[10px] font-mono text-[#767670] uppercase tracking-wider font-semibold mb-1">
                          Closet Pieces ({outfitItems.length}):
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {outfitItems.slice(0, 4).map((item) => (
                            <div
                              key={item.id}
                              onClick={() => onSelectItem(item)}
                              className="flex items-center gap-1.5 p-1 rounded-md bg-[#F8F7F4] hover:bg-[#F3F2EE] border border-[#E5E5E1] cursor-pointer transition-colors"
                            >
                              <div className="w-7 h-7 rounded overflow-hidden shrink-0 bg-white border border-[#E5E5E1]">
                                <GarmentImage
                                  src={item.imageUrl}
                                  alt={item.name}
                                  category={item.category}
                                  className="w-full h-full object-contain p-0.5"
                                  containerClassName="w-full h-full bg-white flex items-center justify-center"
                                  showPlaceholderLabel={false}
                                />
                              </div>
                              <div className="truncate min-w-0">
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
                    ) : Array.isArray(outfit.pieceBreakdown) && outfit.pieceBreakdown.length > 0 ? (
                      <div>
                        <div className="text-[10px] font-mono text-[#767670] uppercase tracking-wider font-semibold mb-1">
                          Editorial Pieces ({outfit.pieceBreakdown.length}):
                        </div>
                        <div className="space-y-1">
                          {outfit.pieceBreakdown.slice(0, 3).map((p, idx) => (
                            <div
                              key={idx}
                              className="text-[11px] text-[#1A1A1A] flex items-center justify-between bg-[#FAF9F7] px-2 py-0.5 rounded border border-[#E5E5E1]"
                            >
                              <span className="truncate">{p.name}</span>
                              <span className="text-[9px] font-mono text-[#8C7355] shrink-0 ml-1">
                                {p.category}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {/* Action Bar */}
                  <div className="pt-2.5 border-t border-[#E5E5E1] flex items-center justify-between gap-2">
                    <div className="text-[10px] font-mono text-[#767670]">
                      Worn: <strong className="text-[#1A1A1A]">{outfit.timesWorn}x</strong>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setSelectedEditorialOutfit(outfit)}
                        className="p-1 text-[#767670] hover:text-[#8C7355] rounded hover:bg-[#F3F2EE] transition-colors cursor-pointer"
                        title="Inspect Full Editorial Breakdown"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

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
                        <span>Wore Look (+1)</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Import & Research Modal */}
      <ImportLookbookIdeaModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSelectForRecreation={handleRecreateEditorialLook}
      />

      {/* Editorial Look Inspector Modal */}
      <EditorialLookbookModal
        isOpen={Boolean(selectedEditorialOutfit)}
        onClose={() => setSelectedEditorialOutfit(null)}
        outfit={selectedEditorialOutfit}
        onEdit={(outfitToEdit) => {
          setSelectedEditorialOutfit(null);
          onEditLook(outfitToEdit);
        }}
        onSelectItem={onSelectItem}
        onRecreateWithWardrobe={(outfitToRecreate) => {
          setSelectedEditorialOutfit(null);
          handleRecreateEditorialLook(
            outfitToRecreate,
            outfitToRecreate.itemIds || []
          );
        }}
      />
    </div>
  );
};

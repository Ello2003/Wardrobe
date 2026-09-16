import React, { useState, useEffect } from 'react';
import {
  Search,
  Sparkles,
  Globe,
  Copy,
  Check,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  ShoppingBag,
  Layers,
  Palette,
  Calendar,
  Tag,
  Sliders,
  RotateCcw,
  Trash2,
  Plus,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  Eye,
  Shirt,
  Compass,
} from 'lucide-react';
import Markdown from 'react-markdown';
import { useWardrobe } from '../context/WardrobeContext';
import {
  GoogleAiEditorialResearchResult,
  LookbookOutfit,
  Category,
  Season,
} from '../types';
import { safeApiFetch } from '../utils/apiHelper';
import { formatGbp } from '../utils/formatters';

interface GoogleAiResearchStudioProps {
  onClose?: () => void;
  onNavigateToLookbook?: () => void;
}

const RESEARCH_PROMPT_PRESETS = [
  {
    label: 'Paris A/W 25 Overcoats',
    query: 'Paris Fashion Week Autumn/Winter Menswear Overcoat Trends & Layering Formulas 2025/2026',
    aesthetic: 'Modern Minimalist',
    season: 'Autumn' as Season,
  },
  {
    label: 'Quiet Luxury Navy & Cream',
    query: 'Quiet Luxury tailored navy blazer with pleated cream trousers and Belgian loafers styling rules',
    aesthetic: 'Quiet Luxury',
    season: 'All-Season' as Season,
  },
  {
    label: 'British Heritage Raincoat',
    query: 'British heritage waxed jacket & trench coat layering with chunky fisherman knitwear for rainy weather',
    aesthetic: 'British Heritage',
    season: 'Autumn' as Season,
  },
  {
    label: 'Tokyo Ivy & Selvedge',
    query: 'Tokyo Ivy League styling: unstructured tweed jacket, vintage oxford cloth button-down, rolled selvedge denim, penny loafers',
    aesthetic: 'Tokyo Ivy',
    season: 'Spring' as Season,
  },
  {
    label: 'Sartorial Flannel & Tweed',
    query: 'Old money sartorial charcoal flannel trousers with camel double-breasted coat and cashmere scarf',
    aesthetic: 'Old Money Sartorial',
    season: 'Winter' as Season,
  },
  {
    label: 'Riviera Resort Tailoring',
    query: 'Riviera summer resort styling: unlined linen jacket, camp-collar silk shirt, drawcord linen trousers, woven espadrilles',
    aesthetic: 'Riviera Resort',
    season: 'Summer' as Season,
  },
];

const STORAGE_KEY = 'wardrobe_ai_editorial_research_archive';

export const GoogleAiResearchStudio: React.FC<GoogleAiResearchStudioProps> = ({
  onClose,
  onNavigateToLookbook,
}) => {
  const { items, outfits, addOutfit, addShoppingItem } = useWardrobe();

  // Query State
  const [query, setQuery] = useState('');
  const [aestheticFocus, setAestheticFocus] = useState('Quiet Luxury');
  const [selectedSeason, setSelectedSeason] = useState<Season>('Autumn');
  const [selectedOccasion, setSelectedOccasion] = useState<LookbookOutfit['occasion']>('Weekend Casual');
  const [enableGoogleSearch, setEnableGoogleSearch] = useState(true);
  const [crossReferenceCloset, setCrossReferenceCloset] = useState(true);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Execution State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentResult, setCurrentResult] = useState<GoogleAiEditorialResearchResult | null>(null);

  // Feedback State
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [savedToLookbook, setSavedToLookbook] = useState(false);
  const [savedToArchive, setSavedToArchive] = useState(false);
  const [addedGapsCount, setAddedGapsCount] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'studio' | 'archive'>('studio');

  // Archive State
  const [savedArchive, setSavedArchive] = useState<GoogleAiEditorialResearchResult[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Persist archive changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedArchive));
    } catch (e) {
      console.warn('Failed to persist research archive to localStorage', e);
    }
  }, [savedArchive]);

  // Execute Gemini Research with Google Search Grounding
  const handleExecuteResearch = async (overrideQuery?: string) => {
    const targetQuery = (overrideQuery ?? query).trim();
    if (!targetQuery) {
      setError('Please provide a research query or select an editorial topic preset.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setSavedToLookbook(false);
      setSavedToArchive(false);
      setAddedGapsCount(null);

      const res = await safeApiFetch('/api/gemini/editorial-research', {
        method: 'POST',
        body: JSON.stringify({
          query: targetQuery,
          aestheticFocus,
          occasion: selectedOccasion,
          season: selectedSeason,
          wardrobeItems: crossReferenceCloset ? items : [],
          enableGoogleSearch,
        }),
      });

      if (!res.success) {
        throw new Error(res.error || 'Editorial research request failed.');
      }

      const data = res.data;
      if (!data) {
        throw new Error('No data returned from AI research service.');
      }

      const newResult: GoogleAiEditorialResearchResult = {
        id: `ai-research-${Date.now()}`,
        query: targetQuery,
        timestamp: data.timestamp || new Date().toISOString(),
        researchMarkdown: data.researchMarkdown || '',
        structuredBreakdown: data.structuredBreakdown || {
          title: `${targetQuery} Study`,
          aesthetic: aestheticFocus,
          occasion: selectedOccasion,
          season: selectedSeason,
          summary: 'Editorial research overview.',
          colorPalette: ['#1C1D21', '#8C7355', '#E5E5E1', '#4A5568'],
          tags: ['Google AI Research', aestheticFocus],
          pieces: [],
        },
        groundingSources: data.groundingSources || [],
        searchQueries: data.searchQueries || [],
        isSaved: false,
      };

      setCurrentResult(newResult);
      setActiveTab('studio');
    } catch (err: any) {
      console.error('Editorial research failed:', err);
      setError(err.message || 'An unexpected error occurred while executing Google AI research.');
    } finally {
      setIsLoading(false);
    }
  };

  // Copy to clipboard helper
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => {
      setCopiedText(null);
    }, 2500);
  };

  // Copy all color hex codes
  const handleCopyPalette = () => {
    if (!currentResult?.structuredBreakdown.colorPalette?.length) return;
    const paletteStr = currentResult.structuredBreakdown.colorPalette.join(', ');
    handleCopy(paletteStr, 'Palette Hex Codes');
  };

  // Save as a Lookbook Outfit in the active wardrobe database
  const handleSaveToLookbook = () => {
    if (!currentResult) return;
    const { structuredBreakdown } = currentResult;

    // Collect matched wardrobe item IDs
    const matchedItemIds = structuredBreakdown.pieces
      ?.filter((p) => p.matchedWardrobeItemId)
      .map((p) => p.matchedWardrobeItemId as string) || [];

    addOutfit({
      title: structuredBreakdown.title || `${currentResult.query.slice(0, 40)} Formula`,
      description: `${structuredBreakdown.summary || ''}\n\nKey Styling Principle: ${structuredBreakdown.stylingTip || 'Focus on silhouette drape.'}`,
      occasion: structuredBreakdown.occasion || selectedOccasion,
      season: structuredBreakdown.season || selectedSeason,
      itemIds: matchedItemIds,
      tags: [
        'Google AI Research',
        structuredBreakdown.aesthetic || aestheticFocus,
        ...(structuredBreakdown.tags || []),
      ].filter((v, i, a) => a.indexOf(v) === i),
      aesthetic: structuredBreakdown.aesthetic || aestheticFocus,
      colorPalette: structuredBreakdown.colorPalette,
      isEditorialIdea: true,
      photographicMood: structuredBreakdown.photographicMood || 'Editorial Street Style',
      inspirationSource: `Google AI Editorial Studio (${enableGoogleSearch ? 'Live Web Search' : 'Atelier Archive'})`,
      sourceUrl: currentResult.groundingSources?.[0]?.url || '',
      isFavorite: false,
      pieceBreakdown: structuredBreakdown.pieces.map((p) => ({
        name: p.name,
        category: p.category,
        color: p.color,
        suggestedBrand: p.suggestedBrand,
        estimatedPrice: p.estimatedPrice,
        stylingRole: p.stylingRole,
        isGap: p.isGap,
        matchedWardrobeItemId: p.matchedWardrobeItemId,
      })),
    });

    setSavedToLookbook(true);
    setTimeout(() => setSavedToLookbook(false), 4000);
  };

  // Save current research to persistent Archive
  const handleSaveToArchive = () => {
    if (!currentResult) return;
    const existingIndex = savedArchive.findIndex((a) => a.id === currentResult.id);

    if (existingIndex >= 0) {
      // Already in archive, refresh
      const updated = [...savedArchive];
      updated[existingIndex] = { ...currentResult, isSaved: true };
      setSavedArchive(updated);
    } else {
      setSavedArchive([{ ...currentResult, isSaved: true }, ...savedArchive]);
    }

    setSavedToArchive(true);
    setTimeout(() => setSavedToArchive(false), 3000);
  };

  // Delete an archived research
  const handleDeleteArchived = (id: string) => {
    setSavedArchive((prev) => prev.filter((item) => item.id !== id));
    if (currentResult?.id === id) {
      setCurrentResult(null);
    }
  };

  // 1-Click Send wardrobe gaps to Shopping Wishlist
  const handleSendGapsToWishlist = () => {
    if (!currentResult?.structuredBreakdown.pieces) return;
    const gapPieces = currentResult.structuredBreakdown.pieces.filter((p) => p.isGap);
    if (!gapPieces.length) return;

    gapPieces.forEach((piece) => {
      addShoppingItem({
        name: piece.name,
        brand: piece.suggestedBrand || 'Curated Editorial',
        category: piece.category || 'Outerwear',
        estimatedPrice: piece.estimatedPrice || 150,
        priority: 'High',
        status: 'Researching',
        season: currentResult.structuredBreakdown.season || selectedSeason,
        matchingWardrobeItemIds: [],
        imageUrl: '',
        reasonOrGap: `Identified as essential piece in Google AI Editorial Research: "${currentResult.structuredBreakdown.title}". Role: ${piece.stylingRole || 'Silhouette anchor'}.`,
        tags: [
          'Editorial Gap',
          currentResult.structuredBreakdown.aesthetic || aestheticFocus,
          'Google AI Scout',
        ],
        notes: `Color: ${piece.color}. Recommended brands: ${piece.suggestedBrand || 'Designer'}.`,
      });
    });

    setAddedGapsCount(gapPieces.length);
    setTimeout(() => setAddedGapsCount(null), 4000);
  };

  return (
    <div className="bg-[#FAF9F6] border border-[#E5E5E1] rounded-2xl p-4 sm:p-6 shadow-xs space-y-6 transition-all">
      {/* Studio Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E8E8E3] pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-[#8C7355]/10 text-[#8C7355] border border-[#8C7355]/20 rounded-full font-mono text-[11px] font-semibold">
              <Sparkles className="w-3 h-3 text-[#8C7355]" />
              <span>Google AI Editorial Engine</span>
            </div>
            {enableGoogleSearch && (
              <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full font-mono text-[11px] font-medium">
                <Globe className="w-3 h-3 text-emerald-600" />
                <span>Live Google Search Grounding Active</span>
              </div>
            )}
            <span className="text-xs text-[#8A8A82] font-mono">Gemini 3.8 Flash</span>
          </div>

          <h2 className="text-2xl font-serif font-bold text-[#1A1A1A] tracking-tight">
            Lookbook &amp; Editorial Research Studio
          </h2>
          <p className="text-xs sm:text-sm text-[#666660] max-w-3xl leading-relaxed">
            Conduct live web fashion research powered by Google AI with Google Search grounding.
            Synthesize runway developments, extract harmonious color stories, deconstruct garment silhouettes,
            and seamlessly save findings into your Lookbook formulas or personal research archive.
          </p>
        </div>

        {/* View Switcher & Action Close */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <div className="flex items-center bg-[#EFEFEA] p-1 rounded-lg text-xs font-mono">
            <button
              onClick={() => setActiveTab('studio')}
              id="ai-studio-tab-active"
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                activeTab === 'studio'
                  ? 'bg-white text-[#1A1A1A] font-bold shadow-2xs'
                  : 'text-[#666660] hover:text-[#1A1A1A]'
              }`}
            >
              Studio Workstation
            </button>
            <button
              onClick={() => setActiveTab('archive')}
              id="ai-studio-tab-archive"
              className={`px-3 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'archive'
                  ? 'bg-white text-[#8C7355] font-bold shadow-2xs'
                  : 'text-[#666660] hover:text-[#1A1A1A]'
              }`}
            >
              <Bookmark className="w-3 h-3" />
              <span>Saved Archive ({savedArchive.length})</span>
            </button>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-[#767670] hover:text-[#1A1A1A] hover:bg-[#EFEFEA] rounded-lg transition-colors cursor-pointer"
              title="Close Research Studio"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {activeTab === 'studio' ? (
        <div className="space-y-6">
          {/* Research Input & Configuration Bar */}
          <div className="bg-white border border-[#E5E5E1] rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-mono font-semibold uppercase tracking-wider text-[#5A5A55] flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-[#8C7355]" />
                  Editorial Research Prompt / Styling Query
                </span>
                <span className="text-[11px] font-normal lowercase text-[#8A8A82]">
                  e.g., runway trends, silhouette formulas, color harmonies
                </span>
              </label>

              <div className="relative flex items-center">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isLoading) {
                      handleExecuteResearch();
                    }
                  }}
                  id="ai-research-query-input"
                  placeholder="e.g., Paris Fashion Week Autumn/Winter Menswear Overcoat Trends & Layering Formulas..."
                  className="w-full pl-4 pr-32 py-3 bg-[#FCFCFA] border border-[#D5D5CF] rounded-lg text-sm text-[#1A1A1A] placeholder-[#9E9E97] focus:outline-hidden focus:border-[#8C7355] focus:ring-1 focus:ring-[#8C7355] transition-all shadow-inner"
                />

                <div className="absolute right-2 flex items-center gap-1.5">
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery('')}
                      className="p-1 text-[#9E9E97] hover:text-[#1A1A1A] rounded transition-colors cursor-pointer"
                      title="Clear prompt"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleExecuteResearch()}
                    disabled={isLoading || !query.trim()}
                    id="ai-research-submit-btn"
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#8C7355] hover:bg-[#786248] text-white text-xs font-semibold rounded-md shadow-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <Sparkles className="w-3.5 h-3.5 animate-spin" />
                        <span>Searching Web...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Research</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Inspiration Presets */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-mono text-[#767670] uppercase tracking-wider block">
                Editorial Research Presets:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {RESEARCH_PROMPT_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setQuery(preset.query);
                      setAestheticFocus(preset.aesthetic);
                      setSelectedSeason(preset.season);
                      handleExecuteResearch(preset.query);
                    }}
                    className="px-2.5 py-1 text-xs font-mono rounded-md bg-[#FAF9F7] hover:bg-[#F0EEEA] text-[#555550] hover:text-[#1A1A1A] border border-[#E5E5E1] transition-colors cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Controls Strip: Google Search toggle, aesthetic, season, wardrobe sync */}
            <div className="pt-3 border-t border-[#F0F0EA] flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                {/* Google Search Grounding Toggle */}
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={enableGoogleSearch}
                    onChange={(e) => setEnableGoogleSearch(e.target.checked)}
                    className="rounded border-[#D5D5CF] text-[#8C7355] focus:ring-[#8C7355] w-3.5 h-3.5 cursor-pointer"
                  />
                  <span className="font-mono text-[#4A4A45] flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Live Google Search Grounding</span>
                  </span>
                </label>

                {/* Cross-reference Wardrobe */}
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={crossReferenceCloset}
                    onChange={(e) => setCrossReferenceCloset(e.target.checked)}
                    className="rounded border-[#D5D5CF] text-[#8C7355] focus:ring-[#8C7355] w-3.5 h-3.5 cursor-pointer"
                  />
                  <span className="font-mono text-[#4A4A45] flex items-center gap-1">
                    <Shirt className="w-3.5 h-3.5 text-[#8C7355]" />
                    <span>Cross-reference closet ({items.length} garments)</span>
                  </span>
                </label>
              </div>

              {/* Advanced Parameters Button */}
              <button
                type="button"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="flex items-center gap-1 font-mono text-[#767670] hover:text-[#1A1A1A] cursor-pointer"
              >
                <Sliders className="w-3 h-3" />
                <span>{showAdvancedFilters ? 'Hide Filters' : 'Fine-Tune Parameters'}</span>
              </button>
            </div>

            {/* Advanced Parameter Selectors */}
            {showAdvancedFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-[#F0F0EA] animate-fadeIn">
                <div>
                  <label className="block text-[11px] font-mono text-[#767670] mb-1">
                    Aesthetic Archetype:
                  </label>
                  <select
                    value={aestheticFocus}
                    onChange={(e) => setAestheticFocus(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#FAF9F7] border border-[#D5D5CF] rounded text-xs text-[#1A1A1A] cursor-pointer"
                  >
                    <option value="Quiet Luxury">Quiet Luxury</option>
                    <option value="Old Money Sartorial">Old Money Sartorial</option>
                    <option value="Modern Minimalist">Modern Minimalist</option>
                    <option value="Tokyo Ivy">Tokyo Ivy</option>
                    <option value="British Heritage">British Heritage</option>
                    <option value="Riviera Resort">Riviera Resort</option>
                    <option value="Utilitarian Workwear">Utilitarian Workwear</option>
                    <option value="Cyber Sartorial">Cyber Tailoring</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-[#767670] mb-1">
                    Target Season:
                  </label>
                  <select
                    value={selectedSeason}
                    onChange={(e) => setSelectedSeason(e.target.value as Season)}
                    className="w-full px-2.5 py-1.5 bg-[#FAF9F7] border border-[#D5D5CF] rounded text-xs text-[#1A1A1A] cursor-pointer"
                  >
                    <option value="Autumn">Autumn</option>
                    <option value="Winter">Winter</option>
                    <option value="Spring">Spring</option>
                    <option value="Summer">Summer</option>
                    <option value="All-Season">All-Season</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-[#767670] mb-1">
                    Target Occasion:
                  </label>
                  <select
                    value={selectedOccasion}
                    onChange={(e) => setSelectedOccasion(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 bg-[#FAF9F7] border border-[#D5D5CF] rounded text-xs text-[#1A1A1A] cursor-pointer"
                  >
                    <option value="Weekend Casual">Weekend Casual</option>
                    <option value="Work & Office">Work & Office</option>
                    <option value="Evening & Dining">Evening & Dining</option>
                    <option value="Formal & Events">Formal & Events</option>
                    <option value="Travel Capsule">Travel Capsule</option>
                    <option value="Seasonal Transition">Seasonal Transition</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Loading Indicator */}
          {isLoading && (
            <div className="bg-white border border-[#E5E5E1] rounded-xl p-8 text-center space-y-3 shadow-xs animate-pulse">
              <div className="w-10 h-10 mx-auto rounded-full bg-[#8C7355]/10 flex items-center justify-center text-[#8C7355]">
                <Sparkles className="w-5 h-5 animate-spin" />
              </div>
              <h3 className="text-base font-serif font-bold text-[#1A1A1A]">
                Synthesizing Fashion Intelligence with Google AI
              </h3>
              <p className="text-xs text-[#767670] max-w-md mx-auto leading-relaxed">
                Consulting real-time Google Search sources for runway collections, deconstructing silhouettes,
                calculating color harmonies, and cross-referencing your closet...
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">Research Generation Alert</p>
                <p>{error}</p>
              </div>
            </div>
          )}

          {/* Research Results Canvas */}
          {currentResult && !isLoading && (
            <div className="space-y-5 animate-fadeIn">
              {/* Studio Canvas Header & Action Suite */}
              <div className="bg-white border border-[#E5E5E1] rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-[#F4F3EE] text-[#8C7355] border border-[#E0DED7] rounded-full font-mono text-[11px] font-semibold">
                      {currentResult.structuredBreakdown.aesthetic || aestheticFocus}
                    </span>
                    <span className="px-2.5 py-0.5 bg-[#FAF9F7] text-[#666660] border border-[#E5E5E1] rounded-full font-mono text-[11px]">
                      {currentResult.structuredBreakdown.season}
                    </span>
                    <span className="px-2.5 py-0.5 bg-[#FAF9F7] text-[#666660] border border-[#E5E5E1] rounded-full font-mono text-[11px]">
                      {currentResult.structuredBreakdown.occasion}
                    </span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-serif font-bold text-[#1A1A1A]">
                    {currentResult.structuredBreakdown.title}
                  </h3>
                  <p className="text-xs text-[#767670] max-w-2xl leading-relaxed">
                    {currentResult.structuredBreakdown.summary}
                  </p>
                </div>

                {/* Primary Action Suite */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Copy Text / Markdown */}
                  <button
                    onClick={() => handleCopy(currentResult.researchMarkdown, 'Research Markdown')}
                    id="ai-copy-markdown-btn"
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-mono font-medium rounded-md bg-[#FAF9F7] hover:bg-[#F3F2EE] text-[#4A4A45] border border-[#D5D5CF] transition-colors cursor-pointer"
                    title="Copy full research article formatted in Markdown"
                  >
                    {copiedText === 'Research Markdown' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-bold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-[#767670]" />
                        <span>Copy Article</span>
                      </>
                    )}
                  </button>

                  {/* Save to Lookbook Formula */}
                  <button
                    onClick={handleSaveToLookbook}
                    id="ai-save-to-lookbook-btn"
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md bg-[#8C7355] hover:bg-[#786248] text-white shadow-xs transition-all cursor-pointer"
                    title="Save this styled formula into your Lookbook outfits collection"
                  >
                    {savedToLookbook ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Saved to Lookbook!</span>
                      </>
                    ) : (
                      <>
                        <Layers className="w-3.5 h-3.5" />
                        <span>Save to Lookbook</span>
                      </>
                    )}
                  </button>

                  {/* Save to Research Archive */}
                  <button
                    onClick={handleSaveToArchive}
                    id="ai-save-to-archive-btn"
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-mono font-medium rounded-md bg-white hover:bg-[#FAF9F7] text-[#555550] border border-[#D5D5CF] transition-colors cursor-pointer"
                    title="Store in your persistent Research Archive library"
                  >
                    {savedToArchive ? (
                      <>
                        <BookmarkCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-bold">Archived</span>
                      </>
                    ) : (
                      <>
                        <Bookmark className="w-3.5 h-3.5 text-[#767670]" />
                        <span>Archive Study</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Grounding Sources & Search Queries Verified Citations */}
              {currentResult.groundingSources.length > 0 && (
                <div className="bg-[#FAF9F6] border border-[#E0DED7] rounded-xl p-4 shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#5A5A55] flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-emerald-600" />
                      Live Google Search Grounding Sources ({currentResult.groundingSources.length}):
                    </span>
                    {currentResult.searchQueries && currentResult.searchQueries.length > 0 && (
                      <span className="text-[11px] font-mono text-[#8A8A82]">
                        Queries: {currentResult.searchQueries.join(' • ')}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {currentResult.groundingSources.map((source, index) => (
                      <a
                        key={index}
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-[#F3F2EE] border border-[#D5D5CF] rounded-md text-xs text-[#2A2A28] hover:text-[#8C7355] transition-colors shadow-2xs group"
                      >
                        <span className="font-mono text-[10px] px-1 bg-[#F0EFEA] rounded text-[#666660] group-hover:text-[#8C7355]">
                          {source.domain || 'web'}
                        </span>
                        <span className="font-medium truncate max-w-[200px] sm:max-w-xs">{source.title}</span>
                        <ExternalLink className="w-3 h-3 text-[#9E9E97] group-hover:text-[#8C7355]" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Atmospheric Color Palette Story */}
              {currentResult.structuredBreakdown.colorPalette?.length > 0 && (
                <div className="bg-white border border-[#E5E5E1] rounded-xl p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Palette className="w-4 h-4 text-[#8C7355]" />
                      <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#1A1A1A]">
                        Atmospheric Harmonious Color Palette
                      </h4>
                    </div>

                    <button
                      onClick={handleCopyPalette}
                      className="text-xs font-mono text-[#767670] hover:text-[#1A1A1A] flex items-center gap-1 cursor-pointer transition-colors"
                      title="Copy all hex values to clipboard"
                    >
                      {copiedText === 'Palette Hex Codes' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-700 font-semibold">Hex Codes Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Hex Codes</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {currentResult.structuredBreakdown.colorPalette.map((hex, index) => {
                      const colorName =
                        currentResult.structuredBreakdown.paletteNames?.[index] || `Shade ${index + 1}`;
                      return (
                        <div
                          key={index}
                          onClick={() => handleCopy(hex, `Hex ${hex}`)}
                          className="bg-[#FCFCFA] border border-[#E5E5E1] rounded-lg p-2.5 flex items-center gap-3 cursor-pointer hover:border-[#8C7355] transition-all group"
                          title="Click to copy hex code"
                        >
                          <div
                            className="w-8 h-8 rounded-md border border-black/10 shadow-inner shrink-0"
                            style={{ backgroundColor: hex }}
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-[#1A1A1A] truncate group-hover:text-[#8C7355]">
                              {colorName}
                            </p>
                            <p className="text-[11px] font-mono text-[#767670]">{hex}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Deconstructed Garments Breakdown & Closet Gaps */}
              {currentResult.structuredBreakdown.pieces?.length > 0 && (
                <div className="bg-white border border-[#E5E5E1] rounded-xl p-5 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#F0F0EA] pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Shirt className="w-4 h-4 text-[#8C7355]" />
                        <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#1A1A1A]">
                          Deconstructed Garment Components &amp; Closet Synergy
                        </h4>
                      </div>
                      <p className="text-xs text-[#767670] mt-0.5">
                        Identifies matching garments in your active wardrobe and highlights structural gaps.
                      </p>
                    </div>

                    {/* Gap to Wishlist Action */}
                    {currentResult.structuredBreakdown.pieces.some((p) => p.isGap) && (
                      <button
                        onClick={handleSendGapsToWishlist}
                        id="ai-send-gaps-wishlist-btn"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF9F7] hover:bg-[#F3F2EE] text-[#8C7355] border border-[#8C7355] text-xs font-mono font-semibold rounded-md shadow-2xs transition-all cursor-pointer"
                        title="Add missing wardrobe gap pieces to your Shopping Wishlist"
                      >
                        {addedGapsCount !== null ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700 font-bold">
                              Added {addedGapsCount} Gap(s) to Wishlist!
                            </span>
                          </>
                        ) : (
                          <>
                            <ShoppingBag className="w-3.5 h-3.5" />
                            <span>Export Gaps to Wishlist</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {currentResult.structuredBreakdown.pieces.map((piece, pIdx) => (
                      <div
                        key={pIdx}
                        className={`border rounded-lg p-3.5 space-y-2.5 transition-all ${
                          piece.isGap
                            ? 'bg-[#FAF8F5] border-[#E8DFC8]'
                            : 'bg-emerald-50/40 border-emerald-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-white border border-[#D5D5CF] rounded text-[#666660] font-semibold">
                                {piece.category}
                              </span>
                              <span className="text-xs font-mono text-[#8C7355] font-semibold">
                                {piece.color}
                              </span>
                            </div>
                            <h5 className="text-sm font-semibold text-[#1A1A1A] mt-1">
                              {piece.name}
                            </h5>
                          </div>

                          {/* Status Badge */}
                          {piece.isGap ? (
                            <span className="text-[10px] font-mono px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-full font-bold shrink-0">
                              Wardrobe Gap
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-full font-bold flex items-center gap-1 shrink-0">
                              <Check className="w-3 h-3" />
                              Matched in Closet
                            </span>
                          )}
                        </div>

                        {/* Closet Match or Recommendation */}
                        {piece.matchedItemName ? (
                          <div className="text-xs bg-white/80 border border-emerald-200 rounded p-2 text-emerald-950 flex items-center justify-between">
                            <span className="font-medium">Matched: {piece.matchedItemName}</span>
                            <span className="text-[10px] font-mono text-emerald-700">In Inventory</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between text-xs text-[#767670] bg-white/70 border border-[#E5E5E1] rounded p-2">
                            <span>Suggested Brands: {piece.suggestedBrand || 'Designer/Heritage'}</span>
                            {piece.estimatedPrice && (
                              <span className="font-mono font-semibold text-[#1A1A1A]">
                                ~{formatGbp(piece.estimatedPrice)}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Styling Role & Silhouette */}
                        <p className="text-xs text-[#555550] italic leading-relaxed">
                          Role: {piece.stylingRole}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Full Editorial Synthesis Markdown Article */}
              <div className="bg-white border border-[#E5E5E1] rounded-xl p-6 sm:p-8 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#F0F0EA] pb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#8C7355]" />
                    <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#1A1A1A]">
                      Editorial Dossier &amp; Trend Synthesis
                    </h4>
                  </div>

                  <button
                    onClick={() => handleCopy(currentResult.researchMarkdown, 'Full Article Text')}
                    className="text-xs font-mono text-[#767670] hover:text-[#1A1A1A] flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    {copiedText === 'Full Article Text' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-700 font-semibold">Article Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Dossier</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="markdown-body prose prose-stone max-w-none text-sm leading-relaxed text-[#2A2A28]">
                  <Markdown>{currentResult.researchMarkdown}</Markdown>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Saved Research Archive Tab */
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#E8E8E3] pb-3">
            <div>
              <h3 className="text-base font-serif font-bold text-[#1A1A1A]">
                Saved Editorial Research Library
              </h3>
              <p className="text-xs text-[#767670]">
                Access and revisit past Google AI research dossiers, formulas, and color stories.
              </p>
            </div>

            {savedArchive.length > 0 && (
              <button
                onClick={() => {
                  if (window.confirm('Clear all archived research studies?')) {
                    setSavedArchive([]);
                  }
                }}
                className="text-xs font-mono text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear Archive</span>
              </button>
            )}
          </div>

          {savedArchive.length === 0 ? (
            <div className="bg-white border border-[#E5E5E1] rounded-xl p-8 text-center space-y-2">
              <Bookmark className="w-8 h-8 mx-auto text-[#8C7355]/40" />
              <h4 className="text-sm font-serif font-bold text-[#1A1A1A]">No Archived Studies Yet</h4>
              <p className="text-xs text-[#767670] max-w-sm mx-auto">
                When you perform an editorial inquiry in the studio workstation, click "Archive Study" to save it permanently for future reference.
              </p>
              <button
                onClick={() => setActiveTab('studio')}
                className="mt-2 px-3 py-1.5 bg-[#8C7355] text-white text-xs font-semibold rounded-md hover:bg-[#786248] transition-colors cursor-pointer"
              >
                Start New Research
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedArchive.map((item) => (
                <div
                  key={item.id}
                  className="bg-white border border-[#E5E5E1] hover:border-[#8C7355] rounded-xl p-4 shadow-xs space-y-3 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-[#F4F3EE] text-[#8C7355] border border-[#E0DED7] rounded-full font-semibold">
                        {item.structuredBreakdown.aesthetic}
                      </span>
                      <h4 className="text-base font-serif font-bold text-[#1A1A1A] mt-1">
                        {item.structuredBreakdown.title}
                      </h4>
                      <p className="text-[11px] font-mono text-[#8A8A82]">
                        {new Date(item.timestamp).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>

                    <button
                      onClick={() => handleDeleteArchived(item.id)}
                      className="p-1 text-[#9E9E97] hover:text-rose-600 rounded transition-colors cursor-pointer"
                      title="Delete archived study"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-xs text-[#666660] line-clamp-2 leading-relaxed">
                    {item.structuredBreakdown.summary}
                  </p>

                  {/* Palette Preview */}
                  {item.structuredBreakdown.colorPalette && (
                    <div className="flex items-center gap-1.5 pt-1">
                      {item.structuredBreakdown.colorPalette.slice(0, 5).map((hex, hIdx) => (
                        <div
                          key={hIdx}
                          className="w-4 h-4 rounded-full border border-black/10 shadow-2xs"
                          style={{ backgroundColor: hex }}
                          title={hex}
                        />
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="pt-2 border-t border-[#F0F0EA] flex items-center justify-between text-xs">
                    <span className="text-[11px] font-mono text-[#767670]">
                      {item.groundingSources?.length || 0} Web Sources Grounded
                    </span>

                    <button
                      onClick={() => {
                        setCurrentResult(item);
                        setActiveTab('studio');
                      }}
                      className="text-xs font-mono font-bold text-[#8C7355] hover:text-[#786248] flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Open in Studio</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

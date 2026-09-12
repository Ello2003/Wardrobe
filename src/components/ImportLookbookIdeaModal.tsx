import React, { useState, useRef } from 'react';
import {
  X,
  Sparkles,
  Link2,
  Upload,
  Camera,
  Layers,
  Check,
  Plus,
  ExternalLink,
  ShoppingBag,
  Shirt,
  Palette,
  Eye,
  ArrowRight,
  Info,
  Globe,
  Tag,
  Clock,
  Compass,
} from 'lucide-react';
import { useWardrobe } from '../context/WardrobeContext';
import { LookbookOutfit, Category, Season, LookbookOutfitPiece } from '../types';
import { EDITORIAL_RESEARCH_IDEAS, EditorialResearchIdea } from '../data/editorialInspirations';
import { GarmentImage } from './GarmentImage';
import { safeApiFetch } from '../utils/apiHelper';

interface ImportLookbookIdeaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectForRecreation?: (idea: any, matchedItemIds: string[]) => void;
}

export const ImportLookbookIdeaModal: React.FC<ImportLookbookIdeaModalProps> = ({
  isOpen,
  onClose,
  onSelectForRecreation,
}) => {
  const { items, addOutfit, addShoppingItem } = useWardrobe();

  const [activeTab, setActiveTab] = useState<'curated' | 'url' | 'photo'>('curated');

  // URL extraction state
  const [urlInput, setUrlInput] = useState('');
  const [urlNotes, setUrlNotes] = useState('');
  const [isExtractingUrl, setIsExtractingUrl] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  // Photo upload extraction state
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoNotes, setPhotoNotes] = useState('');
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Curated ideas filter state
  const [curatedOccasion, setCuratedOccasion] = useState<string>('All');
  const [curatedSeason, setCuratedSeason] = useState<string>('All');
  const [selectedCuratedIdea, setSelectedCuratedIdea] = useState<EditorialResearchIdea>(EDITORIAL_RESEARCH_IDEAS[0]);

  // Active extracted idea preview (either from curated, url, or photo)
  const [stagedIdea, setStagedIdea] = useState<any>(null);
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const [addedWishlistPieces, setAddedWishlistPieces] = useState<Set<string>>(new Set());
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const formatGbp = (val: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: val % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  // Match pieces of an idea against user's actual wardrobe items
  const matchPiecesAgainstWardrobe = (pieces: any[]): LookbookOutfitPiece[] => {
    return pieces.map((piece) => {
      const pName = (piece.name || '').toLowerCase();
      const pCat = piece.category;
      const pColor = (piece.color || '').toLowerCase();

      // Find best wardrobe match
      const matched = items.find((item) => {
        if (pCat && item.category !== pCat) return false;
        const itemName = (item.name || '').toLowerCase();
        const itemColor = (item.color || '').toLowerCase();
        if (pColor && itemColor.includes(pColor)) return true;
        const words = pName.split(' ').filter((w: string) => w.length > 3);
        return words.some((w: string) => itemName.includes(w));
      });

      return {
        name: piece.name,
        category: piece.category as Category,
        suggestedBrand: piece.suggestedBrand,
        color: piece.color,
        estimatedPrice: piece.estimatedPrice || 150,
        matchedWardrobeItemId: matched ? matched.id : undefined,
        isGap: !matched,
      };
    });
  };

  // Select a curated idea for inspection
  const handleSelectCurated = (idea: EditorialResearchIdea) => {
    setSelectedCuratedIdea(idea);
    const enrichedPieces = matchPiecesAgainstWardrobe(idea.pieceBreakdown);
    setStagedIdea({
      title: idea.title,
      description: idea.description,
      aesthetic: idea.aesthetic,
      photographicMood: idea.photographicMood,
      occasion: idea.occasion,
      season: idea.season,
      imageUrl: idea.imageUrl,
      sourceUrl: idea.sourceUrl,
      inspirationSource: idea.inspirationSource,
      colorPalette: idea.colorPalette,
      tags: idea.tags,
      pieceBreakdown: enrichedPieces,
    });
    setSaveSuccessMessage(null);
  };

  // URL extraction submit
  const handleExtractFromUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    try {
      setIsExtractingUrl(true);
      setUrlError(null);
      setSaveSuccessMessage(null);

      const res = await safeApiFetch('/api/gemini/extract-lookbook-idea', {
        method: 'POST',
        body: JSON.stringify({
          url: urlInput.trim(),
          promptText: urlNotes.trim(),
          wardrobeItems: items,
        }),
      });

      if (!res.success) {
        throw new Error(res.error || 'Extraction failed');
      }

      const idea = res.data?.idea;
      if (!idea) throw new Error('No lookbook data returned');

      setStagedIdea(idea);
    } catch (err: any) {
      console.error('URL extraction error:', err);
      setUrlError(err.message || 'Failed to extract style idea from this link.');
    } finally {
      setIsExtractingUrl(false);
    }
  };

  // Photo upload submit
  const handleAnalyzePhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoPreview) return;

    try {
      setIsAnalyzingPhoto(true);
      setPhotoError(null);
      setSaveSuccessMessage(null);

      const res = await safeApiFetch('/api/gemini/extract-lookbook-idea', {
        method: 'POST',
        body: JSON.stringify({
          imageBase64: photoPreview,
          imageMimeType: selectedPhotoFile?.type || 'image/jpeg',
          promptText: photoNotes.trim(),
          wardrobeItems: items,
        }),
      });

      if (!res.success) {
        throw new Error(res.error || 'Photo analysis failed');
      }

      const idea = res.data?.idea;
      if (!idea) throw new Error('No lookbook data returned');

      // If user uploaded a local image, preserve the local data URL as the preview image
      if (!idea.imageUrl && photoPreview) {
        idea.imageUrl = photoPreview;
      }

      setStagedIdea(idea);
    } catch (err: any) {
      console.error('Photo analysis error:', err);
      setPhotoError(err.message || 'Failed to analyze this photograph.');
    } finally {
      setIsAnalyzingPhoto(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setPhotoPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Copy hex code to clipboard
  const handleCopyHex = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedHex(hex);
    setTimeout(() => setCopiedHex(null), 1800);
  };

  // Save single gap piece to Shopping Wishlist
  const handleAddPieceToWishlist = (piece: LookbookOutfitPiece) => {
    if (addedWishlistPieces.has(piece.name)) return;

    addShoppingItem({
      name: piece.name,
      brand: piece.suggestedBrand || 'Curated Heritage',
      category: piece.category,
      estimatedPrice: piece.estimatedPrice || 150,
      priority: 'High',
      status: 'Researching',
      season: stagedIdea?.season || 'Autumn',
      matchingWardrobeItemIds: items.slice(0, 3).map((i) => i.id),
      imageUrl: stagedIdea?.imageUrl || '',
      reasonOrGap: `Researched from Lookbook idea "${stagedIdea?.title}": ${piece.color || ''} staple gap.`,
      estimatedWearsPerYear: 30,
      tags: ['Lookbook Gap', stagedIdea?.aesthetic || 'Editorial Research'],
    });

    setAddedWishlistPieces((prev) => new Set([...prev, piece.name]));
  };

  // Save the full editorial idea into Lookbook
  const handleSaveToLookbook = () => {
    if (!stagedIdea) return;

    // Collect matched wardrobe item IDs
    const matchedIds: string[] = (stagedIdea.pieceBreakdown || [])
      .map((p: any) => p.matchedWardrobeItemId)
      .filter(Boolean) as string[];

    addOutfit({
      title: stagedIdea.title,
      description: stagedIdea.description,
      occasion: stagedIdea.occasion || 'Weekend Casual',
      season: stagedIdea.season || 'Autumn',
      itemIds: matchedIds,
      tags: [
        ...(stagedIdea.tags || []),
        stagedIdea.aesthetic || 'Editorial Research',
        'Internet Idea',
      ],
      imageUrl: stagedIdea.imageUrl,
      sourceUrl: stagedIdea.sourceUrl,
      inspirationSource: stagedIdea.inspirationSource,
      aesthetic: stagedIdea.aesthetic,
      colorPalette: stagedIdea.colorPalette,
      pieceBreakdown: stagedIdea.pieceBreakdown,
      isEditorialIdea: true,
      photographicMood: stagedIdea.photographicMood,
      isFavorite: false,
    });

    setSaveSuccessMessage(`"${stagedIdea.title}" saved into your Lookbook!`);
  };

  // Recreate with my pieces (calls parent modal if provided)
  const handleRecreateWithMyPieces = () => {
    if (!stagedIdea) return;
    const matchedIds: string[] = (stagedIdea.pieceBreakdown || [])
      .map((p: any) => p.matchedWardrobeItemId)
      .filter(Boolean) as string[];

    if (onSelectForRecreation) {
      onSelectForRecreation(stagedIdea, matchedIds);
      onClose();
    }
  };

  const filteredCurated = EDITORIAL_RESEARCH_IDEAS.filter((idea) => {
    if (curatedOccasion !== 'All' && idea.occasion !== curatedOccasion) return false;
    if (curatedSeason !== 'All' && idea.season !== curatedSeason && idea.season !== 'All-Season')
      return false;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-xs animate-fadeIn">
      <div className="bg-[#FAF9F7] border border-[#D5D5D0] shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden text-[#1A1A1A]">
        {/* Header */}
        <div className="bg-[#1A1A1A] text-white px-5 py-3.5 flex items-center justify-between border-b border-[#333]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-[#8C7355] flex items-center justify-center text-white">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-serif font-bold tracking-wide">
                Photographic Lookbook &amp; Internet Research Studio
              </h2>
              <p className="text-[11px] text-[#A5A59E] font-mono">
                Scout editorial street style, extract color stories, and match wardrobe gaps.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#A5A59E] hover:text-white hover:bg-white/10 rounded cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#E5E5E1] bg-white px-5 pt-2">
          <button
            onClick={() => {
              setActiveTab('curated');
              if (!stagedIdea) handleSelectCurated(selectedCuratedIdea);
            }}
            className={`pb-2.5 px-4 text-xs font-mono font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'curated'
                ? 'border-[#8C7355] text-[#8C7355]'
                : 'border-transparent text-[#767670] hover:text-[#1A1A1A]'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            Editorial Archives ({EDITORIAL_RESEARCH_IDEAS.length})
          </button>
          <button
            onClick={() => setActiveTab('url')}
            className={`pb-2.5 px-4 text-xs font-mono font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'url'
                ? 'border-[#8C7355] text-[#8C7355]'
                : 'border-transparent text-[#767670] hover:text-[#1A1A1A]'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            Web URL Scout &amp; Extract
          </button>
          <button
            onClick={() => setActiveTab('photo')}
            className={`pb-2.5 px-4 text-xs font-mono font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'photo'
                ? 'border-[#8C7355] text-[#8C7355]'
                : 'border-transparent text-[#767670] hover:text-[#1A1A1A]'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Upload Inspiration Photo
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Source Input / Gallery (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* TAB 1: Curated Editorial Archives */}
            {activeTab === 'curated' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-serif font-bold text-[#1A1A1A]">
                    Curated Photographic Formulas
                  </span>
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#767670]">
                    <span>Filter:</span>
                    <select
                      value={curatedSeason}
                      onChange={(e) => setCuratedSeason(e.target.value)}
                      className="bg-white border border-[#E5E5E1] text-[#1A1A1A] text-xs px-2 py-0.5"
                    >
                      <option value="All">All Seasons</option>
                      <option value="Autumn">Autumn</option>
                      <option value="Winter">Winter</option>
                      <option value="Spring">Spring</option>
                      <option value="Summer">Summer</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2.5 max-h-[60vh] overflow-y-auto pr-1">
                  {filteredCurated.map((idea) => {
                    const isSelected = stagedIdea?.title === idea.title;
                    return (
                      <div
                        key={idea.id}
                        onClick={() => handleSelectCurated(idea)}
                        className={`p-2.5 border transition-all cursor-pointer flex gap-3 group ${
                          isSelected
                            ? 'bg-white border-[#8C7355] ring-1 ring-[#8C7355] shadow-xs'
                            : 'bg-white border-[#E5E5E1] hover:border-[#8C7355]/60'
                        }`}
                      >
                        <div className="w-20 h-24 flex-shrink-0 bg-stone-100 overflow-hidden relative border border-[#E5E5E1]">
                          <img
                            src={idea.imageUrl}
                            alt={idea.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>

                        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                          <div>
                            <div className="flex items-center justify-between text-[10px] font-mono text-[#8C7355] mb-0.5">
                              <span>{idea.aesthetic}</span>
                              <span className="text-[#767670]">{idea.season}</span>
                            </div>
                            <h4 className="text-xs font-serif font-bold text-[#1A1A1A] line-clamp-1">
                              {idea.title}
                            </h4>
                            <p className="text-[11px] text-[#767670] line-clamp-2 mt-0.5">
                              {idea.description}
                            </p>
                          </div>

                          {/* Color Swatches Mini */}
                          <div className="flex items-center gap-1 mt-1">
                            {idea.colorPalette.map((hex, i) => (
                              <span
                                key={i}
                                style={{ backgroundColor: hex }}
                                className="w-3.5 h-3.5 rounded-full border border-black/10 inline-block"
                                title={hex}
                              />
                            ))}
                            <span className="text-[10px] font-mono text-[#767670] ml-1">
                              {idea.pieceBreakdown.length} pieces
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: URL Scout */}
            {activeTab === 'url' && (
              <form onSubmit={handleExtractFromUrl} className="bg-white border border-[#E5E5E1] p-4 space-y-4">
                <div className="space-y-1">
                  <h3 className="text-xs font-serif font-bold text-[#1A1A1A]">
                    Import from Web Article, Pinterest, or Direct Image
                  </h3>
                  <p className="text-[11px] text-[#767670] leading-relaxed">
                    Paste any URL from GQ, Vogue Runway, Mr Porter, Pinterest, fashion blogs, or a high-res JPG/PNG link. Gemini AI will retrieve the photograph, decompose pieces, and extract the color story.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono text-[#767670] uppercase tracking-wider font-semibold">
                    Page or Photo URL:
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://images.unsplash.com/... or https://www.gq.com/..."
                      required
                      className="w-full pl-8 pr-3 py-2 text-xs bg-[#FAF9F7] border border-[#D5D5D0] focus:border-[#8C7355] focus:outline-hidden font-mono"
                    />
                    <Link2 className="w-4 h-4 text-[#767670] absolute left-2.5 top-2.5" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono text-[#767670] uppercase tracking-wider font-semibold">
                    Styling Context / Notes (Optional):
                  </label>
                  <input
                    type="text"
                    value={urlNotes}
                    onChange={(e) => setUrlNotes(e.target.value)}
                    placeholder="e.g. Focus on the double-breasted coat and suede boots"
                    className="w-full px-3 py-1.5 text-xs bg-[#FAF9F7] border border-[#D5D5D0] focus:border-[#8C7355] focus:outline-hidden"
                  />
                </div>

                {/* Quick Presets for Demo */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-mono text-[#767670] uppercase font-semibold">
                    Quick Research Presets:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setUrlInput('https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=1200')}
                      className="text-[10px] font-mono px-2 py-1 bg-[#FAF9F7] hover:bg-[#EFECE6] border border-[#D5D5D0] text-[#1A1A1A] cursor-pointer"
                    >
                      Pitti Uomo Flannel
                    </button>
                    <button
                      type="button"
                      onClick={() => setUrlInput('https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1200')}
                      className="text-[10px] font-mono px-2 py-1 bg-[#FAF9F7] hover:bg-[#EFECE6] border border-[#D5D5D0] text-[#1A1A1A] cursor-pointer"
                    >
                      Nordic Minimalist
                    </button>
                    <button
                      type="button"
                      onClick={() => setUrlInput('https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=1200')}
                      className="text-[10px] font-mono px-2 py-1 bg-[#FAF9F7] hover:bg-[#EFECE6] border border-[#D5D5D0] text-[#1A1A1A] cursor-pointer"
                    >
                      Mayfair Evening Velvet
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isExtractingUrl || !urlInput.trim()}
                  className="w-full py-2 bg-[#8C7355] hover:bg-[#735D43] text-white text-xs font-mono font-bold flex items-center justify-center gap-2 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isExtractingUrl ? 'animate-spin' : ''}`} />
                  {isExtractingUrl ? 'Scouting & Extracting...' : 'Extract Photographic Idea'}
                </button>

                {urlError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 text-xs text-rose-800">
                    {urlError}
                  </div>
                )}
              </form>
            )}

            {/* TAB 3: Photo Upload */}
            {activeTab === 'photo' && (
              <form onSubmit={handleAnalyzePhoto} className="bg-white border border-[#E5E5E1] p-4 space-y-4">
                <div className="space-y-1">
                  <h3 className="text-xs font-serif font-bold text-[#1A1A1A]">
                    Upload Street-Style Photo or Magazine Screenshot
                  </h3>
                  <p className="text-[11px] text-[#767670]">
                    Upload a high-resolution photograph. Gemini multimodal vision will examine textures, garments, and color palettes.
                  </p>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#D5D5D0] hover:border-[#8C7355] p-6 text-center cursor-pointer transition-colors bg-[#FAF9F7]"
                >
                  {photoPreview ? (
                    <div className="space-y-2">
                      <img
                        src={photoPreview}
                        alt="Upload Preview"
                        className="max-h-48 mx-auto object-contain border border-[#E5E5E1]"
                      />
                      <p className="text-[11px] text-[#8C7355] font-mono">
                        Click to choose a different photo
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-8 h-8 text-[#767670] mx-auto" />
                      <p className="text-xs font-medium text-[#1A1A1A]">
                        Click or drag &amp; drop an editorial photo here
                      </p>
                      <p className="text-[10px] text-[#767670] font-mono">
                        PNG, JPG, WEBP up to 10MB
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono text-[#767670] uppercase tracking-wider font-semibold">
                    Optional Directives:
                  </label>
                  <input
                    type="text"
                    value={photoNotes}
                    onChange={(e) => setPhotoNotes(e.target.value)}
                    placeholder="e.g. Focus on the tailoring and shoe details"
                    className="w-full px-3 py-1.5 text-xs bg-[#FAF9F7] border border-[#D5D5D0] focus:border-[#8C7355] focus:outline-hidden"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isAnalyzingPhoto || !photoPreview}
                  className="w-full py-2 bg-[#8C7355] hover:bg-[#735D43] text-white text-xs font-mono font-bold flex items-center justify-center gap-2 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isAnalyzingPhoto ? 'animate-spin' : ''}`} />
                  {isAnalyzingPhoto ? 'Analyzing with Gemini Vision...' : 'Decompose Photo & Palette'}
                </button>

                {photoError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 text-xs text-rose-800">
                    {photoError}
                  </div>
                )}
              </form>
            )}
          </div>

          {/* Right Column: Editorial Photographic Inspector (7 cols) */}
          <div className="lg:col-span-7 bg-white border border-[#E5E5E1] p-5 flex flex-col justify-between space-y-4">
            {stagedIdea ? (
              <div className="space-y-5">
                {/* Photo Presentation and Headline */}
                <div className="flex flex-col sm:flex-row gap-4 items-start">
                  {/* High-Resolution Photo */}
                  <div className="w-full sm:w-48 aspect-[3/4] bg-stone-100 flex-shrink-0 overflow-hidden relative border border-[#E5E5E1] shadow-xs">
                    {stagedIdea.imageUrl ? (
                      <img
                        src={stagedIdea.imageUrl}
                        alt={stagedIdea.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#767670]">
                        <Camera className="w-8 h-8" />
                      </div>
                    )}
                    <span className="absolute bottom-2 left-2 text-[9px] font-mono px-1.5 py-0.5 bg-black/80 text-white backdrop-blur-xs">
                      {stagedIdea.photographicMood || 'Editorial Look'}
                    </span>
                  </div>

                  {/* Title & Metadata */}
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-[#F8F7F4] text-[#8C7355] border border-[#E5E5E1] font-semibold">
                        {stagedIdea.aesthetic || 'Sartorial Blueprint'}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-[#FAF9F7] text-[#1A1A1A] border border-[#E5E5E1]">
                        {stagedIdea.occasion}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-[#FAF9F7] text-[#1A1A1A] border border-[#E5E5E1]">
                        {stagedIdea.season}
                      </span>
                    </div>

                    <h3 className="text-lg font-serif font-bold text-[#1A1A1A] leading-tight">
                      {stagedIdea.title}
                    </h3>

                    <p className="text-xs text-[#767670] leading-relaxed">
                      {stagedIdea.description}
                    </p>

                    {/* Source Attribution */}
                    {stagedIdea.inspirationSource && (
                      <div className="flex items-center gap-1 text-[11px] text-[#8C7355] font-mono pt-1">
                        <span>Source: {stagedIdea.inspirationSource}</span>
                        {stagedIdea.sourceUrl && (
                          <a
                            href={stagedIdea.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline flex items-center gap-0.5"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    )}

                    {/* Color Story Palette */}
                    {Array.isArray(stagedIdea.colorPalette) && stagedIdea.colorPalette.length > 0 && (
                      <div className="pt-2 border-t border-[#E5E5E1] space-y-1">
                        <span className="text-[10px] font-mono text-[#767670] uppercase font-semibold">
                          Harmonious Color Story (Click to copy hex):
                        </span>
                        <div className="flex items-center gap-2">
                          {stagedIdea.colorPalette.map((hex: string, idx: number) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleCopyHex(hex)}
                              style={{ backgroundColor: hex }}
                              className="w-7 h-7 rounded border border-black/20 shadow-xs flex items-center justify-center text-[9px] font-mono font-bold text-white transition-transform hover:scale-110 cursor-pointer"
                              title={`Copy ${hex}`}
                            >
                              {copiedHex === hex && <Check className="w-3.5 h-3.5 stroke-[3] text-white" />}
                            </button>
                          ))}
                          {copiedHex && (
                            <span className="text-[10px] font-mono text-emerald-700 ml-1 animate-fadeIn">
                              Copied {copiedHex}!
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Decomposed Garment Breakdown */}
                <div className="space-y-2 pt-2 border-t border-[#E5E5E1]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-serif font-bold text-[#1A1A1A]">
                      Garment Decomposition &amp; Closet Matching
                    </span>
                    <span className="text-[11px] font-mono text-[#767670]">
                      {(stagedIdea.pieceBreakdown || []).filter((p: any) => !p.isGap).length} / {(stagedIdea.pieceBreakdown || []).length} pieces in closet
                    </span>
                  </div>

                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {(stagedIdea.pieceBreakdown || []).map((piece: any, idx: number) => {
                      const matchedItem = piece.matchedWardrobeItemId
                        ? items.find((i) => i.id === piece.matchedWardrobeItemId)
                        : null;
                      const isAddedToWishlist = addedWishlistPieces.has(piece.name);

                      return (
                        <div
                          key={idx}
                          className="p-2.5 bg-[#FAF9F7] border border-[#E5E5E1] flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-0.5 flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[#1A1A1A] truncate">{piece.name}</span>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white text-[#767670] border border-[#E5E5E1]">
                                {piece.category}
                              </span>
                              {piece.color && (
                                <span className="text-[10px] text-[#8C7355] font-mono">
                                  {piece.color}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-[#767670] truncate">
                              {piece.stylingRole || `Suggested: ${piece.suggestedBrand || 'Contemporary Brand'}`}
                            </p>
                          </div>

                          {/* Matching Status */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {matchedItem ? (
                              <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-mono font-medium">
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span>In Closet: {matchedItem.name}</span>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleAddPieceToWishlist(piece)}
                                disabled={isAddedToWishlist}
                                className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono font-semibold border transition-colors cursor-pointer ${
                                  isAddedToWishlist
                                    ? 'bg-stone-100 text-[#767670] border-[#D5D5D0]'
                                    : 'bg-[#F8F7F4] hover:bg-[#8C7355] text-[#8C7355] hover:text-white border-[#8C7355]'
                                }`}
                              >
                                {isAddedToWishlist ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-600" />
                                    <span>Wishlisted</span>
                                  </>
                                ) : (
                                  <>
                                    <ShoppingBag className="w-3 h-3" />
                                    <span>Add Gap ({formatGbp(piece.estimatedPrice || 150)})</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {saveSuccessMessage && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-mono flex items-center gap-2 animate-fadeIn">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>{saveSuccessMessage}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center p-8 border border-dashed border-[#D5D5D0] space-y-2 text-[#767670]">
                <Eye className="w-8 h-8 text-[#A5A59E]" />
                <p className="text-xs font-serif font-bold text-[#1A1A1A]">
                  Select or scout an editorial idea
                </p>
                <p className="text-[11px] font-mono max-w-xs">
                  Choose a look from the curated archive, paste an internet URL, or upload a photo to inspect its breakdown.
                </p>
              </div>
            )}

            {/* Bottom Modal Actions */}
            {stagedIdea && (
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#E5E5E1]">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-mono text-[#767670] hover:text-[#1A1A1A] cursor-pointer"
                >
                  Close
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRecreateWithMyPieces}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-mono font-semibold bg-[#F8F7F4] hover:bg-[#EFECE6] text-[#1A1A1A] border border-[#D5D5D0] cursor-pointer transition-colors shadow-xs"
                    title="Build an outfit with your closet items based on this formula"
                  >
                    <Shirt className="w-3.5 h-3.5 text-[#8C7355]" />
                    <span>Recreate with My Closet</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveToLookbook}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-mono font-bold bg-[#8C7355] hover:bg-[#735D43] text-white cursor-pointer transition-colors shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Save to Lookbook</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

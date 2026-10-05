import React, { useState, useEffect } from 'react';
import {
  Search,
  Loader2,
  Image as ImageIcon,
  X,
  Check,
  Globe,
  RefreshCw,
  AlertCircle,
  Building2,
  ShoppingBag,
  Sparkles,
  Link as LinkIcon,
} from 'lucide-react';
import { getBrandOfficialDomain } from '../services/productImageLookupService';

export type ImageSearchProvider = 'all' | 'google' | 'brand_site' | 'retailer' | 'web';

export interface ProductImagePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectImage: (imageUrl: string) => void;
  initialQuery?: string;
  brand?: string;
  name?: string;
  color?: string;
  category?: string;
  currentImageUrl?: string;
}

export const ProductImagePickerModal: React.FC<ProductImagePickerModalProps> = ({
  isOpen,
  onClose,
  onSelectImage,
  initialQuery = '',
  brand = '',
  name = '',
  color = '',
  category = '',
  currentImageUrl = '',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<ImageSearchProvider>('all');
  const [images, setImages] = useState<
    Array<{
      title: string;
      imageUrl: string;
      thumbnail?: string;
      source?: string;
      sourceType?: 'google' | 'brand_site' | 'retailer' | 'web';
    }>
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [showDirectUrlInput, setShowDirectUrlInput] = useState(false);

  const detectedBrandDomain = brand ? getBrandOfficialDomain(brand) : null;

  useEffect(() => {
    if (isOpen) {
      const defaultQuery = initialQuery || [brand, name, color].filter(Boolean).join(' ') || 'fashion garment';
      setSearchQuery(defaultQuery);
      fetchImages(defaultQuery, selectedProvider);
    }
  }, [isOpen, initialQuery, brand, name, color]);

  const fetchImages = async (queryToSearch: string, provider: ImageSearchProvider = selectedProvider) => {
    const q = queryToSearch.trim();
    if (!q && !brand && !name) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/scraper/lookup-product-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          brand,
          name,
          color,
          category,
          provider,
          brandDomain: detectedBrandDomain,
          limit: 16,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to search product images.');
      }

      const results = Array.isArray(data.images) ? data.images : [];
      setImages(results);
      if (results.length === 0) {
        setError('No photographs found for this search. Try refining the brand or garment title, or choose a different source tab.');
      }
    } catch (err: any) {
      console.warn('Product image search error:', err);
      setError(err?.message || 'Could not connect to photo search service.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchImages(searchQuery, selectedProvider);
  };

  const handleProviderChange = (provider: ImageSearchProvider) => {
    setSelectedProvider(provider);
    fetchImages(searchQuery, provider);
  };

  const handleApplyCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const url = customUrlInput.trim();
    if (url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:image/'))) {
      onSelectImage(url);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/65 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-white rounded-xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-100 bg-[#FAF9F6]">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-[#8C7355] text-white rounded-md shadow-xs">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-serif font-bold text-stone-900">Find Product Photograph</h2>
              <p className="text-xs text-stone-500">
                Search Google Grounding, Brand Official Sites &amp; Luxury Stockists
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Source Provider Tabs */}
        <div className="px-5 pt-3 pb-2 border-b border-stone-100 bg-stone-50/70 flex flex-wrap items-center gap-1.5 text-xs font-mono">
          <button
            type="button"
            onClick={() => handleProviderChange('all')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 cursor-pointer transition-all ${
              selectedProvider === 'all'
                ? 'bg-[#1A1A1A] text-white font-bold shadow-xs'
                : 'bg-white text-stone-600 hover:bg-stone-200/60 border border-stone-200'
            }`}
          >
            <Sparkles className="w-3 h-3 text-amber-300" />
            <span>All Sources</span>
          </button>

          <button
            type="button"
            onClick={() => handleProviderChange('google')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 cursor-pointer transition-all ${
              selectedProvider === 'google'
                ? 'bg-[#1A1A1A] text-white font-bold shadow-xs'
                : 'bg-white text-stone-600 hover:bg-stone-200/60 border border-stone-200'
            }`}
          >
            <Search className="w-3 h-3 text-sky-400" />
            <span>Google Search</span>
          </button>

          <button
            type="button"
            onClick={() => handleProviderChange('brand_site')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 cursor-pointer transition-all ${
              selectedProvider === 'brand_site'
                ? 'bg-[#1A1A1A] text-white font-bold shadow-xs'
                : 'bg-white text-stone-600 hover:bg-stone-200/60 border border-stone-200'
            }`}
          >
            <Building2 className="w-3 h-3 text-emerald-500" />
            <span>Brand Official {detectedBrandDomain ? `(${detectedBrandDomain})` : 'Store'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleProviderChange('retailer')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 cursor-pointer transition-all ${
              selectedProvider === 'retailer'
                ? 'bg-[#1A1A1A] text-white font-bold shadow-xs'
                : 'bg-white text-stone-600 hover:bg-stone-200/60 border border-stone-200'
            }`}
          >
            <ShoppingBag className="w-3 h-3 text-purple-400" />
            <span>Luxury Stockists (Mr Porter/SSENSE)</span>
          </button>

          <button
            type="button"
            onClick={() => handleProviderChange('web')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 cursor-pointer transition-all ${
              selectedProvider === 'web'
                ? 'bg-[#1A1A1A] text-white font-bold shadow-xs'
                : 'bg-white text-stone-600 hover:bg-stone-200/60 border border-stone-200'
            }`}
          >
            <Globe className="w-3 h-3 text-stone-400" />
            <span>Web Catalogues</span>
          </button>

          <button
            type="button"
            onClick={() => setShowDirectUrlInput(!showDirectUrlInput)}
            className={`ml-auto px-2.5 py-1.5 rounded-md flex items-center gap-1 text-[11px] cursor-pointer transition-all ${
              showDirectUrlInput
                ? 'bg-amber-100 text-amber-900 font-bold border border-amber-300'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            <LinkIcon className="w-3 h-3 text-stone-500" />
            <span>Paste Direct URL</span>
          </button>
        </div>

        {/* Direct URL Input Bar (Collapsible) */}
        {showDirectUrlInput && (
          <div className="px-5 py-2.5 bg-amber-50/60 border-b border-amber-200 animate-fadeIn">
            <form onSubmit={handleApplyCustomUrl} className="flex gap-2">
              <input
                type="url"
                value={customUrlInput}
                onChange={(e) => setCustomUrlInput(e.target.value)}
                placeholder="https://... direct image link (.jpg, .png, .webp)"
                className="flex-1 px-3 py-1.5 text-xs bg-white border border-amber-300 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <button
                type="submit"
                disabled={!customUrlInput.trim()}
                className="px-3 py-1.5 text-xs font-mono font-bold bg-[#8C7355] text-white rounded-md hover:bg-[#735D43] disabled:opacity-50 cursor-pointer"
              >
                Use This Image
              </button>
            </form>
          </div>
        )}

        {/* Search Bar */}
        <div className="p-4 border-b border-stone-100 bg-white">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search brand, garment name, color..."
                className="w-full pl-9 pr-4 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900 focus:bg-white text-stone-900 transition-all font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !searchQuery.trim()}
              className="px-4 py-2 text-xs font-mono font-bold text-white bg-[#1A1A1A] hover:bg-stone-800 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Scouting...
                </>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5" />
                  Search
                </>
              )}
            </button>
          </form>
        </div>

        {/* Image Grid / Content */}
        <div className="flex-1 overflow-y-auto p-4 min-h-[300px]">
          {isLoading ? (
            <div className="h-64 flex flex-col items-center justify-center space-y-3 text-stone-500">
              <Loader2 className="w-8 h-8 animate-spin text-[#8C7355]" />
              <p className="text-sm font-medium font-serif text-stone-800">
                Scouting high-resolution photography across {selectedProvider === 'all' ? 'Google, official brand domains, and luxury retailers' : selectedProvider}...
              </p>
              <p className="text-xs text-stone-400 font-mono">Verifying dimensions and image validity</p>
            </div>
          ) : error ? (
            <div className="h-64 flex flex-col items-center justify-center p-6 text-center space-y-3">
              <div className="p-3 bg-stone-100 text-stone-600 rounded-full">
                <AlertCircle className="w-6 h-6" />
              </div>
              <p className="text-sm text-stone-700 max-w-sm">{error}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fetchImages(searchQuery, selectedProvider)}
                  className="px-3 py-1.5 bg-[#FAF9F6] border border-stone-300 text-xs font-mono text-stone-900 rounded-md hover:bg-stone-100 flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Retry Search
                </button>
                <button
                  type="button"
                  onClick={() => handleProviderChange('all')}
                  className="px-3 py-1.5 bg-[#1A1A1A] text-white text-xs font-mono rounded-md hover:bg-stone-800 flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  Try All Sources
                </button>
              </div>
            </div>
          ) : images.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {images.map((img, idx) => {
                const isSelected = currentImageUrl === img.imageUrl;
                const sourceBadge = img.source || (
                  img.sourceType === 'brand_site'
                    ? `Brand Store (${detectedBrandDomain || 'Official'})`
                    : img.sourceType === 'retailer'
                    ? 'Luxury Retailer'
                    : img.sourceType === 'google'
                    ? 'Google Search'
                    : 'Web Catalogue'
                );

                return (
                  <button
                    key={`${img.imageUrl}-${idx}`}
                    type="button"
                    onClick={() => {
                      onSelectImage(img.imageUrl);
                      onClose();
                    }}
                    className={`group relative rounded-lg border overflow-hidden aspect-square bg-[#FAF9F6] text-left transition-all hover:shadow-md hover:scale-[1.02] cursor-pointer ${
                      isSelected
                        ? 'border-[#8C7355] ring-2 ring-[#8C7355]'
                        : 'border-stone-200 hover:border-stone-400'
                    }`}
                  >
                    <img
                      src={img.thumbnail || img.imageUrl}
                      alt={img.title || 'Product'}
                      className="w-full h-full object-cover group-hover:opacity-95 transition-opacity"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLElement).parentElement?.classList.add('hidden');
                      }}
                    />
                    {isSelected && (
                      <div className="absolute top-2 right-2 bg-[#8C7355] text-white rounded-full p-1 shadow-sm">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                    {/* Provenance Badge */}
                    <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-xs text-white text-[9px] font-mono px-1.5 py-0.5 rounded-xs flex items-center gap-1">
                      {img.sourceType === 'brand_site' ? (
                        <Building2 className="w-2.5 h-2.5 text-emerald-400" />
                      ) : img.sourceType === 'retailer' ? (
                        <ShoppingBag className="w-2.5 h-2.5 text-purple-300" />
                      ) : img.sourceType === 'google' ? (
                        <Search className="w-2.5 h-2.5 text-sky-300" />
                      ) : (
                        <Globe className="w-2.5 h-2.5 text-stone-300" />
                      )}
                      <span className="truncate max-w-[100px]">{sourceBadge}</span>
                    </div>

                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-[10px] text-white font-medium line-clamp-1">
                        {img.title || 'Select photo'}
                      </p>
                      <p className="text-[9px] text-stone-300 font-mono truncate">
                        Click to apply this photograph
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-stone-100 bg-[#FAF9F6] flex items-center justify-between text-xs text-stone-500 font-mono">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>{images.length} photographs found · Click any image to apply to your piece</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-mono text-stone-700 hover:bg-stone-200/60 rounded-md transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};


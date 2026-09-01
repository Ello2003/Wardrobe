import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Copy,
  Check,
  Tag,
  PoundSterling,
  RotateCcw,
  Sliders,
  Share2,
} from 'lucide-react';
import { SaleItem, SellingPlatform } from '../types';
import { useWardrobe } from '../context/WardrobeContext';

interface AiListingGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  saleItem: SaleItem | null;
  onApplyToListing?: (generated: {
    description: string;
    tags: string[];
    listingPrice?: number;
  }) => void;
}

export const AiListingGeneratorModal: React.FC<AiListingGeneratorModalProps> = ({
  isOpen,
  onClose,
  saleItem,
  onApplyToListing,
}) => {
  const { updateSaleItem } = useWardrobe();

  const [platform, setPlatform] = useState<SellingPlatform>(
    saleItem?.platform || 'Vinted'
  );
  const [tone, setTone] = useState<'minimal' | 'enthusiast' | 'luxury' | 'deal'>(
    'enthusiast'
  );
  const [includeMeasurements, setIncludeMeasurements] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // Result state
  const [generatedTitle, setGeneratedTitle] = useState('');
  const [generatedDescription, setGeneratedDescription] = useState('');
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [suggestedPrice, setSuggestedPrice] = useState<number | null>(null);
  const [pricingStrategyTip, setPricingStrategyTip] = useState('');

  React.useEffect(() => {
    if (saleItem && isOpen) {
      setPlatform(saleItem.platform || 'Vinted');
      generateListing(saleItem, saleItem.platform || 'Vinted', tone, includeMeasurements);
    }
  }, [saleItem, isOpen]);

  const generateListing = async (
    item: SaleItem,
    targetPlatform: SellingPlatform,
    styleTone: string,
    withMeasurements: boolean
  ) => {
    setIsGenerating(true);

    try {
      // Attempt backend Gemini endpoint
      const res = await fetch('/api/gemini/generate-listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item,
          platform: targetPlatform,
          tone: styleTone,
          includeMeasurements: withMeasurements,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setGeneratedTitle(data.title);
        setGeneratedDescription(data.description);
        setSuggestedTags(data.tags || []);
        setSuggestedPrice(data.suggestedPriceGbp || item.listingPrice);
        setPricingStrategyTip(data.pricingTip || '');
        setIsGenerating(false);
        return;
      }
    } catch {
      // Fallback to local heuristic generator
    }

    // Heuristic generator
    setTimeout(() => {
      const conditionNote =
        item.condition === 'Pristine / New'
          ? 'Brand new with tags / flawless condition. Never worn.'
          : item.condition === 'Excellent'
          ? 'Gently worn a few times and meticulously cared for. Zero flaws, stains, or pulls.'
          : 'Good pre-loved condition with normal signs of gentle wear.';

      const title =
        targetPlatform === 'Vinted'
          ? `${item.brand} ${item.name} - Size ${item.size || 'M'} - ${item.condition}`
          : targetPlatform === 'eBay'
          ? `${item.brand} ${item.name} ${item.color || ''} Size ${item.size || 'M'} ${item.condition} Authentic`
          : `${item.brand} ${item.name} (${item.size || 'M'})`;

      let desc = `Authentic ${item.brand} ${item.name} in ${item.color || 'timeless colorway'}.\n\n`;
      desc += `✦ Condition: ${item.condition} — ${conditionNote}\n`;
      desc += `✦ Size: ${item.size || 'Standard Fit'}\n`;
      desc += `✦ Category: ${item.category}\n\n`;

      if (withMeasurements) {
        desc += `Approximate Flat Measurements:\n`;
        desc += `• Pit to Pit: Available on request\n`;
        desc += `• Length: Regular\n\n`;
      }

      desc += `Features & Notes:\n`;
      desc += `• Genuine British/European designer piece\n`;
      desc += `• Stored in a smoke-free and pet-free clean environment\n`;
      desc += `• Dispatched quickly and securely via tracked delivery\n\n`;
      desc += `Feel free to ask questions or make a reasonable offer!`;

      const tags = [
        item.brand.replace(/\s+/g, ''),
        item.category.replace(/[^a-zA-Z]/g, ''),
        targetPlatform.replace(/\s+/g, ''),
        'Designer',
        'WardrobeClearout',
        item.condition.replace(/[^a-zA-Z]/g, ''),
      ];

      setGeneratedTitle(title);
      setGeneratedDescription(desc);
      setSuggestedTags(tags);
      setSuggestedPrice(item.listingPrice);
      setPricingStrategyTip(
        targetPlatform === 'Vinted'
          ? 'Tip: List at £' +
            Math.round(item.listingPrice * 1.1) +
            ' to leave room for buyer offers, then accept £' +
            item.listingPrice +
            '.'
          : 'Tip: Consider offering free standard shipping to earn higher search ranking on ' +
            targetPlatform +
            '.'
      );
      setIsGenerating(false);
    }, 400);
  };

  if (!isOpen || !saleItem) return null;

  const handleCopy = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handleApplyToExistingListing = () => {
    if (onApplyToListing) {
      onApplyToListing({
        description: generatedDescription,
        tags: suggestedTags,
        listingPrice: suggestedPrice || undefined,
      });
    } else {
      updateSaleItem(saleItem.id, {
        description: generatedDescription,
        tags: suggestedTags,
        platform,
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-[#E5E5E1] rounded-xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col justify-between">
        {/* Header */}
        <div className="p-4 border-b border-[#E5E5E1] flex items-center justify-between bg-[#F8F7F4]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-amber-100 text-[#8C7355]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-serif font-bold text-[#1A1A1A]">
                AI Listing Copywriter &amp; SEO Optimizer
              </h2>
              <p className="text-[11px] text-[#767670]">
                Generating optimized titles, descriptions, and hashtags for{' '}
                {saleItem.brand} {saleItem.name}.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[#767670] hover:text-[#1A1A1A] hover:bg-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Controls Bar */}
        <div className="p-4 bg-[#FAF9F6] border-b border-[#E5E5E1] grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="font-mono text-[10px] uppercase font-bold text-[#5A5A55] block mb-1">
              Target Platform
            </label>
            <select
              value={platform}
              onChange={(e) => {
                const newP = e.target.value as SellingPlatform;
                setPlatform(newP);
                generateListing(saleItem, newP, tone, includeMeasurements);
              }}
              className="w-full px-2 py-1.5 bg-white border border-[#E5E5E1] rounded-md text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
            >
              <option value="Vinted">Vinted</option>
              <option value="eBay">eBay UK</option>
              <option value="Vestiaire Collective">Vestiaire Collective</option>
              <option value="Depop">Depop</option>
              <option value="Grailed">Grailed</option>
            </select>
          </div>

          <div>
            <label className="font-mono text-[10px] uppercase font-bold text-[#5A5A55] block mb-1">
              Listing Tone
            </label>
            <select
              value={tone}
              onChange={(e) => {
                const newT = e.target.value as any;
                setTone(newT);
                generateListing(saleItem, platform, newT, includeMeasurements);
              }}
              className="w-full px-2 py-1.5 bg-white border border-[#E5E5E1] rounded-md text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
            >
              <option value="enthusiast">Fashion Enthusiast / Detailed</option>
              <option value="minimal">Minimalist &amp; Direct</option>
              <option value="luxury">Luxury &amp; Editorial</option>
              <option value="deal">Quick Resale / High Value Deal</option>
            </select>
          </div>

          <div className="flex flex-col justify-end">
            <button
              type="button"
              disabled={isGenerating}
              onClick={() =>
                generateListing(saleItem, platform, tone, includeMeasurements)
              }
              className="w-full py-1.5 px-3 bg-white border border-[#E5E5E1] hover:bg-[#F3F2EE] text-[#1A1A1A] rounded-md font-mono text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <RotateCcw
                className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`}
              />
              <span>Regenerate Copy</span>
            </button>
          </div>
        </div>

        {/* Generated Output */}
        <div className="p-5 space-y-4 flex-1">
          {/* Title Output */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#5A5A55]">
                Optimized Listing Title
              </span>
              <button
                type="button"
                onClick={() => handleCopy(generatedTitle, 'title')}
                className="text-xs text-[#8C7355] hover:text-[#786248] flex items-center gap-1 cursor-pointer font-mono"
              >
                {copiedSection === 'title' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedSection === 'title' ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
            <div className="p-2.5 bg-[#F8F7F4] border border-[#E5E5E1] rounded-md text-xs font-semibold text-[#1A1A1A]">
              {generatedTitle}
            </div>
          </div>

          {/* Description Output */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#5A5A55]">
                Description &amp; Condition Disclosure
              </span>
              <button
                type="button"
                onClick={() => handleCopy(generatedDescription, 'desc')}
                className="text-xs text-[#8C7355] hover:text-[#786248] flex items-center gap-1 cursor-pointer font-mono"
              >
                {copiedSection === 'desc' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedSection === 'desc' ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
            <textarea
              rows={7}
              value={generatedDescription}
              onChange={(e) => setGeneratedDescription(e.target.value)}
              className="w-full p-2.5 bg-white border border-[#E5E5E1] rounded-md text-xs text-[#1A1A1A] font-sans leading-relaxed focus:border-[#8C7355] focus:outline-none"
            />
          </div>

          {/* Hashtags & Strategy Tip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#5A5A55]">
                  Search Hashtags
                </span>
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(
                      suggestedTags.map((t) => `#${t}`).join(' '),
                      'tags'
                    )
                  }
                  className="text-xs text-[#8C7355] hover:underline cursor-pointer font-mono"
                >
                  {copiedSection === 'tags' ? 'Copied!' : 'Copy all'}
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {suggestedTags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] font-mono bg-[#F8F7F4] border border-[#E5E5E1] text-[#5A5A55] px-1.5 py-0.5 rounded"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            {pricingStrategyTip && (
              <div className="p-2.5 bg-amber-50/60 border border-amber-200 rounded-lg text-xs">
                <span className="text-[10px] font-mono font-bold text-amber-900 uppercase block mb-0.5">
                  Resale Strategy Tip
                </span>
                <p className="text-[11px] text-amber-950 leading-relaxed">
                  {pricingStrategyTip}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#E5E5E1] bg-[#F8F7F4] flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              const fullText = `${generatedTitle}\n\n${generatedDescription}\n\n${suggestedTags
                .map((t) => `#${t}`)
                .join(' ')}`;
              handleCopy(fullText, 'all');
            }}
            className="text-xs font-mono text-[#5A5A55] hover:text-[#1A1A1A] flex items-center gap-1 cursor-pointer"
          >
            {copiedSection === 'all' ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>{copiedSection === 'all' ? 'Entire Pack Copied!' : 'Copy Entire Listing Pack'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-[#767670] hover:text-[#1A1A1A] cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleApplyToExistingListing}
              className="px-4 py-1.5 text-xs font-semibold bg-[#8C7355] hover:bg-[#786248] text-white rounded-md shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              Apply to Listing
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

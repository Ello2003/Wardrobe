import React, { useState } from 'react';
import {
  Sparkles,
  Plus,
  CheckCircle2,
  Layers,
  Palette,
  Lightbulb,
} from 'lucide-react';
import { useWardrobe } from '../context/WardrobeContext';
import { TREND_RESEARCH_DATA } from '../data/initialData';
import { TrendInspiration, Category } from '../types';

interface TrendResearchViewProps {
  onOpenAIStylist: () => void;
}

export const TrendResearchView: React.FC<TrendResearchViewProps> = ({ onOpenAIStylist }) => {
  const { addShoppingItem, items } = useWardrobe();
  const [addedIds, setAddedIds] = useState<string[]>([]);
  const [selectedTrend, setSelectedTrend] = useState<TrendInspiration>(TREND_RESEARCH_DATA[0]);

  const formatGbp = (val: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: val % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  const handleAddPieceToWishlist = (piece: any, trendTitle: string) => {
    const key = `${trendTitle}-${piece.name}`;
    if (addedIds.includes(key)) return;

    addShoppingItem({
      name: piece.name,
      brand: piece.brandExamples?.[0] || 'Curated Heritage Brand',
      category: piece.category as Category,
      estimatedPrice: piece.suggestedPrice || 150,
      priority: 'High',
      status: 'Researching',
      season: selectedTrend.season,
      matchingWardrobeItemIds: items.slice(0, 3).map((i) => i.id),
      imageUrl: piece.imageUrl,
      reasonOrGap: `Researched from "${trendTitle}" trend: ${piece.whyItWorks}`,
      estimatedWearsPerYear: 35,
      tags: ['Trend Research', selectedTrend.aesthetic],
    });

    setAddedIds((prev) => [...prev, key]);
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-[#E5E5E1] rounded-xl p-4 shadow-xs">
        <div>
          <h1 className="text-xl font-serif font-bold text-[#1A1A1A]">
            Lookbook Style &amp; Trend Research
          </h1>
          <p className="text-xs text-[#767670]">
            Explore curated editorial styling formulas, harmonious color stories, and essential staple blueprints.
          </p>
        </div>

        <button
          onClick={onOpenAIStylist}
          id="trend-ai-assistant-btn"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-[#8C7355] hover:bg-[#786248] text-white shadow-xs transition-all self-start sm:self-auto cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          AI Capsule Gap Advisor
        </button>
      </div>

      {/* Aesthetic Moodboard Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {TREND_RESEARCH_DATA.map((trend) => {
          const isSelected = selectedTrend.id === trend.id;
          return (
            <div
              key={trend.id}
              onClick={() => setSelectedTrend(trend)}
              className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between space-y-2.5 relative overflow-hidden group shadow-xs ${
                isSelected
                  ? 'bg-white border-[#8C7355] ring-1 ring-[#8C7355]/40 shadow-xs'
                  : 'bg-white border-[#E5E5E1] hover:border-[#8C7355]/50'
              }`}
            >
              <div className="aspect-[16/9] rounded-lg overflow-hidden bg-stone-100 mb-0.5 border border-[#E5E5E1]">
                <img
                  src={trend.coverImageUrl}
                  alt={trend.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#F8F7F4] text-[#8C7355] border border-[#E5E5E1] font-semibold">
                    {trend.season}
                  </span>
                  <span className="text-[10px] font-mono text-[#767670]">{trend.aesthetic}</span>
                </div>
                <h3 className="text-xs font-serif font-bold text-[#1A1A1A]">{trend.title}</h3>
                <p className="text-[11px] text-[#767670] line-clamp-2 leading-relaxed">
                  {trend.description}
                </p>
              </div>

              <div className="pt-2 border-t border-[#E5E5E1] flex items-center justify-between text-xs">
                <span className="text-[#8C7355] font-semibold text-[10px]">
                  {trend.keyPieces.length} Capsule Staples
                </span>
                <span className="text-[#767670] font-mono text-[10px] group-hover:text-[#1A1A1A] transition-colors">Explore Blueprint →</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Trend Deep-Dive Blueprint */}
      <div className="bg-white border border-[#E5E5E1] rounded-xl p-5 sm:p-6 space-y-5 shadow-xs">
        {/* Banner Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#E5E5E1]">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#8C7355] font-semibold">
                Editorial Blueprint
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F8F7F4] text-[#767670] border border-[#E5E5E1]">
                {selectedTrend.aesthetic}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#1A1A1A]">
              {selectedTrend.title}
            </h2>
            <p className="text-xs text-[#5A5A55] leading-relaxed">{selectedTrend.description}</p>
          </div>

          {/* Color Palette Swatches */}
          <div className="p-3 bg-[#F8F7F4] border border-[#E5E5E1] rounded-lg space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs text-[#1A1A1A] font-mono font-semibold">
              <Palette className="w-3.5 h-3.5 text-[#8C7355]" /> Harmonious Palette:
            </div>
            <div className="flex items-center gap-1.5">
              {selectedTrend.colorPalette.map((col, idx) => (
                <div key={idx} className="flex flex-col items-center gap-1" title={col.name}>
                  <div
                    className="w-7 h-7 rounded-md border border-[#E5E5E1] shadow-2xs"
                    style={{ backgroundColor: col.hex }}
                  />
                  <span className="text-[8px] text-[#767670] font-mono truncate max-w-[44px]">
                    {col.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Key Researched Pieces & 1-Click Wishlist Ingestion */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#8C7355]" />
              <h3 className="text-sm font-serif font-bold text-[#1A1A1A]">
                Researched Key Pieces for this Capsule
              </h3>
            </div>
            <span className="text-[11px] text-[#767670]">
              Click "+ Add to Shopping List" to ingest into your £ pipeline.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {selectedTrend.keyPieces.map((piece, idx) => {
              const pieceKey = `${selectedTrend.title}-${piece.name}`;
              const isAdded = addedIds.includes(pieceKey);

              return (
                <div
                  key={idx}
                  className="bg-[#F8F7F4] border border-[#E5E5E1] hover:border-[#8C7355]/50 rounded-xl p-3.5 flex flex-col justify-between space-y-3 transition-all"
                >
                  <div className="flex gap-3">
                    <img
                      src={piece.imageUrl}
                      alt={piece.name}
                      referrerPolicy="no-referrer"
                      className="w-20 h-24 rounded-md object-cover bg-stone-100 flex-shrink-0 border border-[#E5E5E1]"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-mono uppercase tracking-wider text-[#8C7355] font-semibold">
                          {piece.category}
                        </span>
                        <span className="text-xs font-mono font-bold text-[#1A1A1A]">
                          {formatGbp(piece.suggestedPrice)}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-[#1A1A1A]">{piece.name}</h4>
                      <p className="text-[11px] text-[#767670] leading-relaxed">{piece.whyItWorks}</p>
                      <div className="text-[10px] text-[#767670] font-mono pt-0.5">
                        Brands: <span className="text-[#1A1A1A]">{piece.brandExamples.join(', ')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#E5E5E1] flex items-center justify-between">
                    <span className="text-[10px] text-[#767670] font-mono">
                      Target Valuation: {formatGbp(piece.suggestedPrice)}
                    </span>
                    <button
                      onClick={() => handleAddPieceToWishlist(piece, selectedTrend.title)}
                      disabled={isAdded}
                      className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                        isAdded
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-default'
                          : 'bg-[#8C7355] hover:bg-[#786248] text-white shadow-xs'
                      }`}
                    >
                      {isAdded ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                          Added to Buy List
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          Add to Shopping List
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sartorial Styling Rules & Tips */}
        <div className="p-4 bg-[#F8F7F4] border border-[#E5E5E1] rounded-lg space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-mono text-[#8C7355] uppercase tracking-wider font-semibold">
            <Lightbulb className="w-3.5 h-3.5 text-[#8C7355]" /> Sartorial Styling Directives:
          </div>
          <ul className="space-y-1.5 text-xs text-[#5A5A55]">
            {selectedTrend.styleTips.map((tip, idx) => (
              <li key={idx} className="flex items-start gap-2 leading-relaxed">
                <span className="text-[#8C7355] font-mono font-bold">0{idx + 1}.</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};


import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Send,
  CheckCircle2,
  Bot,
  User,
  Plus,
} from 'lucide-react';
import { useWardrobe } from '../context/WardrobeContext';
import { Category } from '../types';

interface AIStylistModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AIStylistModal: React.FC<AIStylistModalProps> = ({ isOpen, onClose }) => {
  const { items, outfits, shoppingList, addShoppingItem } = useWardrobe();

  const [mode, setMode] = useState<'chat' | 'gap_analysis'>('chat');
  const [chatMessages, setChatMessages] = useState<
    { role: 'user' | 'assistant'; text: string; time: string }[]
  >([
    {
      role: 'assistant',
      text: "Hello! I'm your Gemini AI Sartorial Consultant. I have analyzed your active wardrobe inventory and styling rotation. Ask me styling advice for any occasion, recommendations for styling underutilized pieces, or what key British capsule piece to invest in next.",
      time: 'Just now',
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Gap analysis state
  const [gapAnalysisResult, setGapAnalysisResult] = useState<any>(null);
  const [isAnalyzingGaps, setIsAnalyzingGaps] = useState(false);
  const [addedGapIndex, setAddedGapIndex] = useState<number[]>([]);

  if (!isOpen) return null;

  const formatGbp = (val: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: val % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputPrompt;
    if (!textToSend.trim() || isGenerating) return;

    const userMsg = {
      role: 'user' as const,
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setInputPrompt('');
    setIsGenerating(true);

    try {
      const res = await fetch('/api/gemini/style-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToSend,
          wardrobeItems: items,
          lookbookOutfits: outfits,
          shoppingList: shoppingList,
        }),
      });

      if (!res.ok) {
        throw new Error('AI Assistant service unavailable.');
      }

      const data = await res.json();
      const replyMsg = {
        role: 'assistant' as const,
        text: data.reply || 'Styling analysis complete.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => [...prev, replyMsg]);
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'Notice: Could not contact Gemini AI service. Please ensure the Gemini API key is configured.',
          time: 'Error',
        },
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRunGapAnalysis = async () => {
    setIsAnalyzingGaps(true);
    setGapAnalysisResult(null);
    setAddedGapIndex([]);

    try {
      const res = await fetch('/api/gemini/gap-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wardrobeItems: items,
          targetStyle: 'Modern British Heritage & Quiet Luxury Capsule',
          budgetGbp: 500,
        }),
      });

      if (!res.ok) throw new Error('Gap analysis failed.');

      const data = await res.json();
      setGapAnalysisResult(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsAnalyzingGaps(false);
    }
  };

  const handleAddGapPieceToShopping = (rec: any, idx: number) => {
    addShoppingItem({
      name: rec.itemName,
      brand: rec.recommendedBrands?.[0] || 'Quality Heritage Brand',
      category: rec.category as Category,
      estimatedPrice: rec.estimatedPriceGbp || 150,
      priority: rec.priority === 'High' ? 'High' : 'Essential / Must-Have',
      status: 'Researching',
      reasonOrGap: rec.reasoning,
      estimatedWearsPerYear: 35,
      matchingWardrobeItemIds: items.slice(0, 3).map((i) => i.id),
      imageUrl: '',
      season: 'All-Season',
      tags: ['ai-gap-recommendation'],
    });

    setAddedGapIndex((prev) => [...prev, idx]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-[#E5E5E1] rounded-xl max-w-3xl w-full h-[85vh] shadow-lg flex flex-col justify-between overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[#E5E5E1] flex items-center justify-between bg-[#F8F7F4]/80">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-[#8C7355]/10 text-[#8C7355]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-serif font-bold text-[#1A1A1A]">
                  Gemini AI Sartorial Stylist
                </h2>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#8C7355]/10 text-[#8C7355] border border-[#8C7355]/20 font-semibold">
                  3.7 Flash
                </span>
              </div>
              <p className="text-xs text-[#767670]">
                Context-aware styling &amp; investment strategy over your active {items.length} pieces.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Toggle */}
            <div className="flex bg-[#F8F7F4] border border-[#E5E5E1] p-0.5 rounded-lg text-xs">
              <button
                onClick={() => setMode('chat')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  mode === 'chat' ? 'bg-white text-[#1A1A1A] shadow-2xs' : 'text-[#767670] hover:text-[#1A1A1A]'
                }`}
              >
                Style Chat
              </button>
              <button
                onClick={() => {
                  setMode('gap_analysis');
                  if (!gapAnalysisResult && !isAnalyzingGaps) handleRunGapAnalysis();
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  mode === 'gap_analysis'
                    ? 'bg-white text-[#1A1A1A] shadow-2xs'
                    : 'text-[#767670] hover:text-[#1A1A1A]'
                }`}
              >
                Capsule Gap Audit
              </button>
            </div>

            <button onClick={onClose} className="p-1 rounded-md text-[#767670] hover:text-[#1A1A1A] hover:bg-[#F8F7F4] cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* BODY: CHAT MODE */}
        {mode === 'chat' && (
          <div className="flex-1 flex flex-col justify-between overflow-hidden">
            {/* Messages Feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F8F7F4]/40">
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-2.5 text-xs leading-relaxed ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-md bg-[#8C7355]/10 border border-[#8C7355]/20 text-[#8C7355] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                  )}

                  <div
                    className={`p-3 rounded-xl max-w-[80%] whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-[#8C7355] text-white font-medium rounded-tr-none'
                        : 'bg-white border border-[#E5E5E1] text-[#1A1A1A] rounded-tl-none shadow-2xs'
                    }`}
                  >
                    <p>{msg.text}</p>
                    <div
                      className={`text-[9px] mt-1 font-mono ${
                        msg.role === 'user' ? 'text-amber-100' : 'text-[#767670]'
                      }`}
                    >
                      {msg.time}
                    </div>
                  </div>

                  {msg.role === 'user' && (
                    <div className="w-6 h-6 rounded-md bg-[#1A1A1A] text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                      <User className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              ))}

              {isGenerating && (
                <div className="flex items-center gap-2 text-xs text-[#8C7355] font-semibold animate-pulse pl-8">
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  Stylist analyzing wardrobe inventory &amp; wear patterns...
                </div>
              )}
            </div>

            {/* Quick Prompts Bar */}
            <div className="px-4 py-1.5 bg-[#F8F7F4] border-t border-[#E5E5E1] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <span className="text-[10px] text-[#767670] font-mono flex-shrink-0 font-semibold">Inquire:</span>
              {[
                'How to style neglected pieces?',
                'Rainy London business dinner outfit',
                'What £200 staple is missing?',
                'Best wardrobe investment advice',
              ].map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(prompt)}
                  className="px-2 py-0.5 rounded-full bg-white hover:bg-[#8C7355]/10 text-[#5A5A55] border border-[#E5E5E1] text-[10px] whitespace-nowrap transition-colors cursor-pointer"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <div className="p-3 border-t border-[#E5E5E1] bg-white">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  placeholder="Ask for outfit pairings, occasion styling, or capsule advice..."
                  className="flex-1 px-3 py-2 bg-white border border-[#E5E5E1] rounded-lg text-xs text-[#1A1A1A] placeholder:text-[#767670] focus:outline-none focus:border-[#8C7355]"
                />
                <button
                  type="submit"
                  disabled={!inputPrompt.trim() || isGenerating}
                  className="p-2 bg-[#8C7355] hover:bg-[#786248] text-white rounded-lg font-semibold disabled:opacity-50 transition-all shadow-xs cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* BODY: GAP ANALYSIS MODE */}
        {mode === 'gap_analysis' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F8F7F4]/40">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-serif font-bold text-[#1A1A1A]">
                  Capsule Wardrobe Gap &amp; ROI Analysis
                </h3>
                <p className="text-xs text-[#767670]">
                  Strategic suggestions to maximize outfit variety and garment utilization.
                </p>
              </div>
              <button
                onClick={handleRunGapAnalysis}
                disabled={isAnalyzingGaps}
                className="px-3 py-1.5 text-xs font-semibold rounded-md bg-white hover:bg-[#F8F7F4] text-[#8C7355] border border-[#8C7355]/30 cursor-pointer shadow-2xs"
              >
                {isAnalyzingGaps ? 'Auditing...' : 'Re-Run Audit'}
              </button>
            </div>

            {isAnalyzingGaps ? (
              <div className="py-16 text-center space-y-2">
                <Sparkles className="w-6 h-6 text-[#8C7355] animate-spin mx-auto" />
                <p className="text-xs text-[#767670]">
                  Cross-referencing your active wardrobe categories, color palette balance, and
                  outfit formulas...
                </p>
              </div>
            ) : gapAnalysisResult ? (
              <div className="space-y-4 animate-fadeIn">
                {/* Score & Verdict Card */}
                <div className="p-4 rounded-xl bg-white border border-[#E5E5E1] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-mono text-[#8C7355] uppercase tracking-wider font-semibold">
                      Capsule Completeness
                    </span>
                    <h4 className="text-sm font-serif font-bold text-[#1A1A1A]">
                      {gapAnalysisResult.overallAssessment || 'Strong Heritage Foundation'}
                    </h4>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <div className="p-2.5 bg-[#F8F7F4] rounded-lg border border-[#E5E5E1]">
                      <div className="text-[10px] text-[#767670] font-mono">Versatility Score</div>
                      <div className="text-lg font-mono font-bold text-emerald-700">
                        {gapAnalysisResult.versatilityScore || 84}/100
                      </div>
                    </div>
                  </div>
                </div>

                {/* Gaps List */}
                <div className="space-y-2">
                  <span className="text-[11px] font-mono text-[#5A5A55] uppercase tracking-wider font-semibold">
                    Identified Wardrobe Gaps &amp; Proposed Purchases (£):
                  </span>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {gapAnalysisResult.gaps?.map((gap: any, idx: number) => {
                      const isAdded = addedGapIndex.includes(idx);
                      return (
                        <div
                          key={idx}
                          className="bg-white border border-[#E5E5E1] rounded-lg p-3 space-y-2 flex flex-col justify-between shadow-2xs"
                        >
                          <div className="space-y-1 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-[#8C7355] text-[10px] uppercase font-semibold">
                                {gap.category}
                              </span>
                              <span className="font-mono font-bold text-[#1A1A1A]">
                                ~{formatGbp(gap.estimatedPriceGbp || 150)}
                              </span>
                            </div>
                            <h5 className="text-xs font-bold text-[#1A1A1A]">{gap.itemName}</h5>
                            <p className="text-[#5A5A55] leading-relaxed text-[11px]">
                              {gap.reasoning}
                            </p>
                            <div className="text-[10px] text-emerald-700 font-mono font-semibold pt-0.5">
                              ROI: Unlocks ~{gap.unlocksOutfitsCount || 4} new lookbook formulas
                            </div>
                          </div>

                          <button
                            onClick={() => handleAddGapPieceToShopping(gap, idx)}
                            disabled={isAdded}
                            className={`w-full py-1.5 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                              isAdded
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                                : 'bg-[#8C7355] hover:bg-[#786248] text-white shadow-2xs'
                            }`}
                          >
                            {isAdded ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" /> Added to Buy List
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5" /> Add to Shopping Wishlist
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};


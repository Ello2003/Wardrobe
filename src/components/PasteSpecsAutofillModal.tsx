import React, { useState } from 'react';
import { FileText, Loader2, Sparkles, X, Check, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { Category, Condition } from '../types';

export interface ExtractedSpecsResult {
  name: string;
  brand: string;
  category: Category;
  subcategory?: string;
  color: string;
  colorHex?: string;
  originalListingColor?: string;
  material: string;
  size?: string;
  purchasePrice?: number;
  rrp?: number;
  condition?: Condition;
  imageUrl?: string;
  allCandidateImages?: string[];
  retailerName?: string;
  notes?: string;
  careNotes?: string;
}

export interface PasteSpecsAutofillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (result: ExtractedSpecsResult) => void;
}

export const PasteSpecsAutofillModal: React.FC<PasteSpecsAutofillModalProps> = ({
  isOpen,
  onClose,
  onApply,
}) => {
  const [rawText, setRawText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExtract = async () => {
    const text = rawText.trim();
    if (!text) {
      setError('Please paste product details, description, or receipt text.');
      return;
    }

    setIsExtracting(true);
    setError(null);

    try {
      const res = await fetch('/api/scraper/extract-from-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.item) {
        throw new Error(data.error || 'Could not parse attributes from pasted text.');
      }

      const item = data.item;
      onApply(item);
      onClose();
    } catch (err: any) {
      console.warn('Text extraction error:', err);
      setError(err?.message || 'Could not extract product details.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSample = () => {
    setRawText(`Barbour Classic Bedale Wax Jacket - Olive Green
Size: 38 (Medium)
Price: £289.00
100% Waxed Cotton with pure cotton Tartan lining. Features two-way brass zip, corduroy collar, and studded storm fly front. Made in the UK.`);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-stone-50/70">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-stone-900 text-white rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-stone-900">Paste Text, Specs, or Receipt</h2>
              <p className="text-xs text-stone-500">Extracts brand, cut, fabric, price, and finds product photo</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-stone-700 uppercase tracking-wider">
              Product Description or Receipt Text
            </label>
            <button
              type="button"
              onClick={handleSample}
              className="text-xs text-stone-600 hover:text-stone-900 underline"
            >
              Insert example
            </button>
          </div>

          <textarea
            value={rawText}
            onChange={(e) => {
              setRawText(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Paste description from online store, Vinted listing, eBay item description, or order email... (e.g., brand, item title, composition, price, size, colour)"
            className="w-full h-44 p-3.5 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 focus:bg-white text-stone-900 transition-all font-mono leading-relaxed resize-none"
          />

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-100">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-600 space-y-1">
            <p className="font-medium text-stone-800">What will be extracted:</p>
            <p className="text-stone-500">
              Brand, garment cut & model, category, fabric composition, color, size, price, and matching product photograph from open visual catalogs.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-stone-100 bg-stone-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-stone-700 hover:bg-stone-200/60 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExtract}
            disabled={isExtracting || !rawText.trim()}
            className="px-5 py-2 text-xs font-medium text-white bg-stone-900 hover:bg-stone-800 disabled:opacity-50 rounded-xl transition-all flex items-center gap-2 shadow-sm"
          >
            {isExtracting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Extracting & Finding Photo...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Extract & Autofill
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

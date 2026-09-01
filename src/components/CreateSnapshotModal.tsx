import React, { useState } from 'react';
import { X, Camera } from 'lucide-react';
import { useWardrobe } from '../context/WardrobeContext';

interface CreateSnapshotModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateSnapshotModal: React.FC<CreateSnapshotModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { createSnapshot, stats, currentVersion } = useWardrobe();
  const [name, setName] = useState(`Snapshot Checkpoint v${currentVersion}`);
  const [description, setDescription] = useState(
    'Audit checkpoint recording active closet inventory, wardrobe valuation, and lookbook formulas.'
  );

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    createSnapshot(name, description);
    onClose();
  };

  const formatGbp = (val: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: val % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-[#E5E5E1] rounded-xl max-w-md w-full p-4 space-y-4 shadow-lg">
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E1]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-[#8C7355]/10 text-[#8C7355]">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-serif font-bold text-[#1A1A1A]">
                Create Version Snapshot
              </h2>
              <p className="text-xs text-[#767670]">Record an immutable rollback checkpoint</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-[#767670] hover:text-[#1A1A1A] hover:bg-[#F8F7F4] cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current State Preview */}
        <div className="grid grid-cols-3 gap-2 p-2.5 bg-[#F8F7F4] rounded-lg border border-[#E5E5E1] text-center text-xs">
          <div>
            <div className="font-mono font-semibold text-[#1A1A1A]">{stats.totalItems}</div>
            <div className="text-[10px] text-[#767670]">Wardrobe Pieces</div>
          </div>
          <div>
            <div className="font-mono font-bold text-[#8C7355]">
              {formatGbp(stats.totalValuationGbp)}
            </div>
            <div className="text-[10px] text-[#767670]">Valuation (£)</div>
          </div>
          <div>
            <div className="font-mono font-semibold text-[#1A1A1A]">{stats.totalOutfitsCount}</div>
            <div className="text-[10px] text-[#767670]">Lookbook Outfits</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">Snapshot Label *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-[#E5E5E1] rounded-md text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-mono text-[#5A5A55] block mb-1 font-semibold">
              Audit Notes &amp; Version Purpose
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-[#E5E5E1] rounded-md text-xs text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#E5E5E1]">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-[#767670] hover:text-[#1A1A1A] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3.5 py-1.5 text-xs font-semibold bg-[#8C7355] hover:bg-[#786248] text-white rounded-md shadow-xs transition-all cursor-pointer"
            >
              Save Snapshot Checkpoint
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


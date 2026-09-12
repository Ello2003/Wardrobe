import React from 'react';
import { LucideIcon, Search, Sparkles } from 'lucide-react';

interface ActionButton {
  label: string;
  onClick: () => void;
  primary?: boolean;
  icon?: LucideIcon;
}

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actions?: ActionButton[];
  onResetFilters?: () => void;
  resetFilterLabel?: string;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Search,
  title,
  description,
  actions = [],
  onResetFilters,
  resetFilterLabel = 'Reset all filters',
  className = '',
}) => {
  return (
    <div
      className={`text-center py-14 px-6 bg-white border border-[#E5E5E1] rounded-none max-w-xl mx-auto shadow-2xs ${className}`}
    >
      <div className="w-12 h-12 rounded-full bg-[#F8F7F4] border border-[#E5E5E1] flex items-center justify-center mx-auto mb-4 text-[#8C7355]">
        <Icon className="w-6 h-6" />
      </div>

      <h3 className="text-base font-serif font-bold text-[#1A1A1A] mb-1.5">{title}</h3>
      <p className="text-xs text-[#767670] max-w-md mx-auto leading-relaxed mb-5">{description}</p>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {onResetFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="px-3.5 py-1.5 bg-[#F2F1ED] hover:bg-[#E5E3DC] border border-[#D5D5D0] text-xs font-mono text-[#1A1A1A] transition-colors cursor-pointer"
          >
            {resetFilterLabel}
          </button>
        )}

        {actions.map((act, idx) => {
          const BtnIcon = act.icon;
          return (
            <button
              key={idx}
              type="button"
              onClick={act.onClick}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium uppercase tracking-wider transition-all cursor-pointer shadow-xs ${
                act.primary
                  ? 'bg-[#8C7355] hover:bg-[#735D43] text-white'
                  : 'bg-white hover:bg-[#F2F1ED] border border-[#D5D5D0] text-[#1A1A1A]'
              }`}
            >
              {BtnIcon && <BtnIcon className="w-3.5 h-3.5" />}
              <span>{act.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

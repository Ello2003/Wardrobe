import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { useWardrobe } from '../../context/WardrobeContext';
import {
  getGroupedCategories,
  getSafeCategories,
  isHomewareCategory,
} from '../../utils/categoryUtils';

export interface CategorySelectOption {
  value: string;
  label: string;
}

export interface CategorySelectProps {
  value: string;
  onChange: (category: string) => void;
  categories?: string[];
  garmentCategories?: string[];
  homewareCategories?: string[];
  preferHomewareFirst?: boolean;
  filterScope?: 'all' | 'garments' | 'homeware';
  includeAllOption?: boolean;
  allOptionLabel?: string;
  allowEmpty?: boolean;
  emptyOptionLabel?: string;
  allowAddNew?: boolean;
  onAddNewCategory?: (newCategoryName: string) => void;
  extraOptionsBefore?: CategorySelectOption[];
  extraOptionsAfter?: CategorySelectOption[];
  counts?: Map<string, number> | Record<string, number>;
  formatCategoryLabel?: (category: string, count?: number) => string;
  title?: string;
  flat?: boolean;
  className?: string;
  id?: string;
  name?: string;
  disabled?: boolean;
  required?: boolean;
}

export const CategorySelect: React.FC<CategorySelectProps> = ({
  value,
  onChange,
  categories,
  garmentCategories: customGarments,
  homewareCategories: customHomeware,
  preferHomewareFirst = false,
  filterScope = 'all',
  includeAllOption = false,
  allOptionLabel = 'All Categories',
  allowEmpty = true,
  emptyOptionLabel = 'Select Category...',
  allowAddNew = false,
  onAddNewCategory,
  extraOptionsBefore,
  extraOptionsAfter,
  counts,
  formatCategoryLabel,
  title,
  flat = false,
  className = '',
  id,
  name,
  disabled = false,
  required = false,
}) => {
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newCatInput, setNewCatInput] = useState('');

  let wardrobe: ReturnType<typeof useWardrobe> | null = null;
  try {
    wardrobe = useWardrobe();
  } catch {
    // Graceful fallback when rendered outside WardrobeProvider
  }

  const effectiveGarments =
    customGarments && customGarments.length > 0
      ? customGarments
      : wardrobe?.garmentCategories && wardrobe.garmentCategories.length > 0
      ? wardrobe.garmentCategories
      : undefined;

  const effectiveHomeware =
    customHomeware && customHomeware.length > 0
      ? customHomeware
      : wardrobe?.homewareCategories && wardrobe.homewareCategories.length > 0
      ? wardrobe.homewareCategories
      : undefined;

  const effectiveCategories =
    categories && categories.length > 0
      ? categories
      : wardrobe?.categories && wardrobe.categories.length > 0
      ? wardrobe.categories
      : undefined;

  const grouped = getGroupedCategories(
    effectiveCategories,
    value,
    preferHomewareFirst,
    effectiveGarments,
    effectiveHomeware
  );

  const displayGarments = grouped.garmentCategories;
  const displayHomeware = grouped.homewareCategories;

  // Helper to format category label with count if available
  const getLabel = (cat: string) => {
    let count: number | undefined;
    if (counts) {
      if (counts instanceof Map) {
        count = counts.get(cat) ?? counts.get(cat.toLowerCase());
      } else {
        count = counts[cat] ?? counts[cat.toLowerCase()];
      }
    }
    if (formatCategoryLabel) {
      return formatCategoryLabel(cat, count);
    }
    if (count !== undefined) {
      return `${cat} (${count})`;
    }
    return cat;
  };

  // Check if current value is present in either list or extra options (case-insensitive)
  const valLower = (value || '').trim().toLowerCase();
  const isValueInGarments = displayGarments.some((c) => c.toLowerCase() === valLower);
  const isValueInHomeware = displayHomeware.some((c) => c.toLowerCase() === valLower);
  const isValueInExtraBefore = extraOptionsBefore?.some((o) => o.value.toLowerCase() === valLower) ?? false;
  const isValueInExtraAfter = extraOptionsAfter?.some((o) => o.value.toLowerCase() === valLower) ?? false;
  const isValueUnknown =
    value &&
    value !== 'All' &&
    !isValueInGarments &&
    !isValueInHomeware &&
    !isValueInExtraBefore &&
    !isValueInExtraAfter;

  const handleSaveNew = () => {
    const clean = newCatInput.trim();
    if (!clean) return;
    if (onAddNewCategory) {
      onAddNewCategory(clean);
    } else if (wardrobe?.addCategory) {
      wardrobe.addCategory(clean);
    }
    onChange(clean);
    setNewCatInput('');
    setIsAddingNew(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveNew();
    } else if (e.key === 'Escape') {
      setIsAddingNew(false);
      setNewCatInput('');
    }
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedVal = e.target.value;
    if (allowAddNew && selectedVal === '__ADD_NEW__') {
      setIsAddingNew(true);
      return;
    }
    onChange(selectedVal);
  };

  if (allowAddNew && isAddingNew) {
    return (
      <div className="flex items-center gap-1.5 w-full">
        <input
          type="text"
          value={newCatInput}
          onChange={(e) => setNewCatInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="New category name..."
          autoFocus
          className="flex-1 px-2.5 py-1.5 bg-white border border-[#8C7355] text-xs font-mono text-[#1A1A1A] focus:outline-none"
        />
        <button
          type="button"
          onClick={handleSaveNew}
          disabled={!newCatInput.trim()}
          className="px-2.5 py-1.5 bg-[#8C7355] hover:bg-[#735D43] text-white text-xs font-mono font-bold disabled:opacity-50 cursor-pointer transition-colors shadow-2xs"
          title="Save category"
        >
          <Check className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => {
            setIsAddingNew(false);
            setNewCatInput('');
          }}
          className="px-2 py-1.5 bg-[#F2F1ED] hover:bg-[#E5E3DC] text-[#767670] hover:text-[#1A1A1A] text-xs font-mono cursor-pointer transition-colors"
          title="Cancel"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  const renderOptionsList = (list: readonly string[]) =>
    list.map((cat) => (
      <option key={cat} value={cat}>
        {getLabel(cat)}
      </option>
    ));

  return (
    <div className="relative w-full">
      <select
        id={id}
        name={name}
        value={value}
        onChange={handleSelectChange}
        disabled={disabled}
        required={required}
        title={title}
        className={`w-full px-2.5 py-1.5 bg-white border border-[#D5D5D0] text-xs font-mono text-[#1A1A1A] focus:border-[#8C7355] focus:outline-none transition-colors cursor-pointer rounded-xs ${className}`}
      >
        {/* Extra options before (e.g. No Change) */}
        {extraOptionsBefore?.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}

        {includeAllOption && (
          <option value="All">{allOptionLabel}</option>
        )}

        {/* Empty / Unspecified option so browsers don't auto-select the first option */}
        {!includeAllOption && (allowEmpty || !value) && (
          <option value="">{emptyOptionLabel}</option>
        )}

        {/* If value is outside recognized sets, render it so existing data is never masked */}
        {isValueUnknown && (
          <option value={value}>{value}</option>
        )}

        {filterScope === 'all' && (
          <>
            {flat ? (
              preferHomewareFirst
                ? renderOptionsList([...displayHomeware, ...displayGarments])
                : renderOptionsList([...displayGarments, ...displayHomeware])
            ) : preferHomewareFirst ? (
              <>
                <optgroup label="Homeware, Tech &amp; Lifestyle">
                  {renderOptionsList(displayHomeware)}
                </optgroup>
                <optgroup label="Apparel &amp; Garments">
                  {renderOptionsList(displayGarments)}
                </optgroup>
              </>
            ) : (
              <>
                <optgroup label="Apparel &amp; Garments">
                  {renderOptionsList(displayGarments)}
                </optgroup>
                <optgroup label="Homeware, Tech &amp; Lifestyle">
                  {renderOptionsList(displayHomeware)}
                </optgroup>
              </>
            )}
          </>
        )}

        {filterScope === 'garments' && renderOptionsList(displayGarments)}

        {filterScope === 'homeware' && renderOptionsList(displayHomeware)}

        {/* Extra options after */}
        {extraOptionsAfter?.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}

        {/* Optional inline + Add New Category option */}
        {allowAddNew && (
          <option value="__ADD_NEW__">+ Add Custom Category...</option>
        )}
      </select>
    </div>
  );
};

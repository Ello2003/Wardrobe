import React, { useState, useRef, useEffect } from 'react';
import { Pencil, Check, X } from 'lucide-react';
import { useWardrobe } from '../../context/WardrobeContext';

interface InlineEditableTitleProps {
  value: string;
  onSave: (newValue: string) => void;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'span' | 'p' | 'div';
  className?: string;
  inputClassName?: string;
  containerClassName?: string;
  tooltip?: string;
  placeholder?: string;
  showPencil?: boolean;
  disabled?: boolean;
}

export const InlineEditableTitle: React.FC<InlineEditableTitleProps> = ({
  value,
  onSave,
  as: Component = 'h1',
  className = '',
  inputClassName = '',
  containerClassName = '',
  tooltip = 'Click or pencil to edit title inline',
  placeholder = 'Enter title...',
  showPencil = true,
  disabled = false,
}) => {
  const { settings } = useWardrobe();
  const [isEditing, setIsEditing] = useState(false);
  const [currentText, setCurrentText] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentText(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = (e: React.MouseEvent) => {
    if (disabled || !settings.inlineEditingEnabled) return;
    e.stopPropagation();
    setCurrentText(value);
    setIsEditing(true);
  };

  const handleSave = () => {
    const trimmed = currentText.trim();
    if (trimmed && trimmed !== value) {
      onSave(trimmed);
    } else {
      setCurrentText(value);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setCurrentText(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 z-20 ${containerClassName}`}
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          type="text"
          value={currentText}
          placeholder={placeholder}
          onChange={(e) => setCurrentText(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className={`bg-white border-2 border-[#8C7355] text-[#1A1A1A] px-2 py-0.5 rounded-xs shadow-md focus:outline-none min-w-[200px] max-w-full ${inputClassName || className}`}
        />
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault(); // prevent blur before click
            handleSave();
          }}
          className="p-1 text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xs cursor-pointer shadow-xs transition-colors"
          title="Save (Enter)"
          aria-label="Save title"
        >
          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            handleCancel();
          }}
          className="p-1 text-[#767670] hover:text-rose-700 bg-[#F3F2EE] hover:bg-rose-50 border border-[#E5E5E1] hover:border-rose-300 rounded-xs cursor-pointer shadow-xs transition-colors"
          title="Cancel (Esc)"
          aria-label="Cancel editing"
        >
          <X className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>
      </div>
    );
  }

  const showPencilIcon =
    showPencil &&
    settings.inlineEditingEnabled &&
    (settings.showInlinePencils !== false);

  return (
    <div
      className={`group/title inline-flex items-center gap-1.5 max-w-full cursor-pointer select-text ${containerClassName}`}
      onClick={handleStartEdit}
      title={disabled ? undefined : tooltip}
    >
      <Component
        className={`transition-colors group-hover/title:text-[#8C7355] border-b border-transparent group-hover/title:border-[#8C7355]/40 truncate ${className}`}
      >
        {value}
      </Component>
      {showPencilIcon && !disabled && (
        <span
          className="opacity-0 group-hover/title:opacity-100 transition-opacity p-0.5 text-[#8C7355] hover:bg-[#8C7355]/10 rounded-xs shrink-0"
          title={tooltip}
        >
          <Pencil className="w-3.5 h-3.5" />
        </span>
      )}
    </div>
  );
};

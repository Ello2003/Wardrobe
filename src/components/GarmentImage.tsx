import React, { useState, useEffect } from 'react';
import {
  Shirt,
  ShoppingBag,
  Layers,
  Sparkles,
  Tag,
  Package,
  Scissors,
  ImageOff,
} from 'lucide-react';

interface GarmentImageProps {
  src?: string | null;
  alt?: string;
  category?: string;
  className?: string;
  containerClassName?: string;
  showPlaceholderLabel?: boolean;
  aspectRatio?: string;
  children?: React.ReactNode;
}

export const GarmentImage: React.FC<GarmentImageProps> = ({
  src,
  alt = 'Garment',
  category = 'Outerwear',
  className = 'w-full h-full object-contain',
  containerClassName = 'w-full h-full flex items-center justify-center bg-[#F8F7F4] relative overflow-hidden',
  showPlaceholderLabel = true,
  aspectRatio,
  children,
}) => {
  const [hasError, setHasError] = useState(false);

  // Reset error state if image source updates
  useEffect(() => {
    setHasError(false);
  }, [src]);

  // Clean empty or invalid src checks
  const trimmedSrc = src?.trim();
  const hasValidSrc = Boolean(trimmedSrc && trimmedSrc !== '' && !hasError);

  const getCategoryIcon = () => {
    const cat = (category || '').toLowerCase();
    if (cat.includes('outerwear') || cat.includes('jacket') || cat.includes('coat')) {
      return <Layers className="w-6 h-6 text-[#A5A59E]" />;
    }
    if (cat.includes('knit') || cat.includes('sweater') || cat.includes('cardigan')) {
      return <Layers className="w-6 h-6 text-[#A5A59E]" />;
    }
    if (cat.includes('top') || cat.includes('shirt') || cat.includes('tee')) {
      return <Shirt className="w-6 h-6 text-[#A5A59E]" />;
    }
    if (cat.includes('bottom') || cat.includes('trouser') || cat.includes('pant') || cat.includes('jean') || cat.includes('skirt')) {
      return <Scissors className="w-6 h-6 text-[#A5A59E]" />;
    }
    if (cat.includes('dress') || cat.includes('jumpsuit') || cat.includes('suit')) {
      return <Sparkles className="w-6 h-6 text-[#A5A59E]" />;
    }
    if (cat.includes('bag') || cat.includes('tote') || cat.includes('clutch')) {
      return <ShoppingBag className="w-6 h-6 text-[#A5A59E]" />;
    }
    if (cat.includes('shoe') || cat.includes('boot') || cat.includes('sneaker') || cat.includes('loafer')) {
      return <Package className="w-6 h-6 text-[#A5A59E]" />;
    }
    if (cat.includes('accessor') || cat.includes('belt') || cat.includes('scarf') || cat.includes('jewel')) {
      return <Tag className="w-6 h-6 text-[#A5A59E]" />;
    }
    return <Shirt className="w-6 h-6 text-[#A5A59E]" />;
  };

  return (
    <div
      className={`${containerClassName} ${aspectRatio || ''}`}
      style={aspectRatio ? { aspectRatio } : undefined}
    >
      {hasValidSrc ? (
        <img
          src={trimmedSrc}
          alt={alt}
          referrerPolicy="no-referrer"
          onError={() => setHasError(true)}
          className={className}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-[#F8F7F4] select-none">
          <div className="w-10 h-10 rounded-full bg-[#EFECE6] border border-[#E5E5E1] flex items-center justify-center mb-1.5 shadow-2xs">
            {getCategoryIcon()}
          </div>
          {showPlaceholderLabel && (
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#767670] font-semibold block truncate max-w-[140px]">
                {category || 'Garment'}
              </span>
              <span className="text-[9px] font-mono text-[#A5A59E] flex items-center justify-center gap-1">
                <ImageOff className="w-2.5 h-2.5" /> No Photo
              </span>
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  );
};

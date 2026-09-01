import React from 'react';

interface ResizableHeaderCellProps {
  columnId: string;
  width?: number;
  minWidth?: number;
  align?: 'left' | 'center' | 'right';
  className?: string;
  isResizing?: boolean;
  onResizeStart?: (columnId: string, e: React.MouseEvent) => void;
  onDoubleClickReset?: () => void;
  onClick?: () => void;
  children: React.ReactNode;
}

export const ResizableHeaderCell: React.FC<ResizableHeaderCellProps> = ({
  columnId,
  width,
  minWidth = 50,
  align = 'left',
  className = '',
  isResizing = false,
  onResizeStart,
  onDoubleClickReset,
  onClick,
  children,
}) => {
  return (
    <th
      style={{
        width: width ? `${width}px` : undefined,
        minWidth: `${minWidth}px`,
        maxWidth: width ? `${width}px` : undefined,
      }}
      className={`relative select-none group/th px-3 py-2.5 transition-colors ${
        align === 'right'
          ? 'text-right'
          : align === 'center'
          ? 'text-center'
          : 'text-left'
      } ${onClick ? 'cursor-pointer hover:text-[#8C7355]' : ''} ${className}`}
      onClick={onClick}
    >
      <div
        className={`flex items-center gap-1 overflow-hidden truncate ${
          align === 'right'
            ? 'justify-end'
            : align === 'center'
            ? 'justify-center'
            : 'justify-start'
        }`}
      >
        {children}
      </div>

      {/* Draggable Resize Handle on the right edge */}
      {onResizeStart && (
        <div
          onMouseDown={(e) => {
            e.stopPropagation();
            onResizeStart(columnId, e);
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            if (onDoubleClickReset) onDoubleClickReset();
          }}
          title="Drag to resize column width (double-click to reset)"
          className={`absolute right-0 top-0 bottom-0 w-2.5 z-20 cursor-col-resize flex items-center justify-center group-hover/th:bg-[#8C7355]/20 hover:bg-[#8C7355]/40 transition-colors ${
            isResizing ? 'bg-[#8C7355] w-3' : ''
          }`}
        >
          <div
            className={`w-[1.5px] h-4/5 rounded-full transition-colors ${
              isResizing
                ? 'bg-[#8C7355]'
                : 'bg-transparent group-hover/th:bg-[#8C7355]/60'
            }`}
          />
        </div>
      )}
    </th>
  );
};

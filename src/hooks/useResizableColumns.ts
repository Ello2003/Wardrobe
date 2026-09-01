import React, { useState, useEffect, useCallback, useRef } from 'react';

export interface ResizableColumnsOptions {
  storageKey: string;
  defaultWidths: Record<string, number>;
  minWidth?: number;
}

export function useResizableColumns({
  storageKey,
  defaultWidths,
  minWidth = 50,
}: ResizableColumnsOptions) {
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        return { ...defaultWidths, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error(`Failed to load column widths from ${storageKey}`, e);
    }
    return { ...defaultWidths };
  });

  const [isResizing, setIsResizing] = useState(false);
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);

  const columnWidthsRef = useRef(columnWidths);
  useEffect(() => {
    columnWidthsRef.current = columnWidths;
  }, [columnWidths]);

  // Save to localStorage
  const saveWidths = useCallback(
    (widths: Record<string, number>) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(widths));
      } catch (e) {
        console.error(`Failed to save column widths to ${storageKey}`, e);
      }
    },
    [storageKey]
  );

  const startResize = useCallback(
    (colKey: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const startX = e.clientX;
      const startWidth =
        columnWidthsRef.current[colKey] || defaultWidths[colKey] || 120;

      setIsResizing(true);
      setResizingColumn(colKey);

      let currentWidth = startWidth;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        moveEvent.preventDefault();
        const delta = moveEvent.clientX - startX;
        currentWidth = Math.max(minWidth, Math.round(startWidth + delta));

        setColumnWidths((prev) => {
          const next = { ...prev, [colKey]: currentWidth };
          return next;
        });
      };

      const handleMouseUp = () => {
        setIsResizing(false);
        setResizingColumn(null);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';

        setColumnWidths((prev) => {
          const next = { ...prev, [colKey]: currentWidth };
          saveWidths(next);
          return next;
        });
      };

      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [defaultWidths, minWidth, saveWidths]
  );

  const resetWidths = useCallback(() => {
    setColumnWidths({ ...defaultWidths });
    saveWidths({ ...defaultWidths });
  }, [defaultWidths, saveWidths]);

  const resetColumnWidth = useCallback(
    (colKey: string) => {
      const defaultW = defaultWidths[colKey] || 120;
      setColumnWidths((prev) => {
        const next = { ...prev, [colKey]: defaultW };
        saveWidths(next);
        return next;
      });
    },
    [defaultWidths, saveWidths]
  );

  const getWidth = useCallback(
    (colKey: string, fallback?: number) => {
      return columnWidths[colKey] || fallback || defaultWidths[colKey] || 120;
    },
    [columnWidths, defaultWidths]
  );

  return {
    columnWidths,
    isResizing,
    resizingColumn,
    startResize,
    resetWidths,
    resetColumnWidth,
    getWidth,
  };
}

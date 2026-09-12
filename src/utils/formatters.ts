/**
 * Shared, standardized currency and date formatting utilities for the Wardrobe Studio.
 * Eliminates ad-hoc formatGbp/formatCurrency duplicate implementations.
 */

/**
 * Formats a monetary value to British Pounds (GBP).
 * Standardized across Wardrobe, Shopping, Selling, Dashboard, Analytics, and Lookbook.
 */
export function formatGbp(val: number | null | undefined, options?: { compact?: boolean }): string {
  const num = typeof val === 'number' && !isNaN(val) ? val : 0;
  
  if (options?.compact && Math.abs(num) >= 1000) {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(num);
  }

  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: num % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Formats Cost Per Wear (CPW) into a clean, human-readable string.
 */
export function formatCpw(price: number, wears: number): string {
  if (wears <= 0) return 'Never worn';
  const cpw = price / wears;
  return `${formatGbp(cpw)} / wear`;
}

/**
 * Standard date formatting for consistent UK date presentation.
 */
export function formatDate(isoDateString?: string | null): string {
  if (!isoDateString) return '';
  try {
    const d = new Date(isoDateString);
    if (isNaN(d.getTime())) return isoDateString;
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return isoDateString;
  }
}

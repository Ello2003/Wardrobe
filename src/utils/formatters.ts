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

export interface RrpSavingsInfo {
  savingsAmount: number;
  discountPercent: number;
  isDiscounted: boolean;
  formattedSavings: string;
  formattedDiscount: string;
  hasRrp: boolean;
  rrp: number;
}

/**
 * Calculates retail savings, discount percentages, and formatted metrics
 * comparing actual/purchase price against the Recommended Retail Price (RRP).
 * Standardized across cards, tables, detail modals, and analytics.
 */
export function calculateRrpSavings(
  price: number | null | undefined,
  rrp: number | null | undefined
): RrpSavingsInfo {
  const safePrice = typeof price === 'number' && !isNaN(price) ? Math.max(0, price) : 0;
  const safeRrp = typeof rrp === 'number' && !isNaN(rrp) ? Math.max(0, rrp) : 0;

  if (safeRrp <= 0) {
    return {
      savingsAmount: 0,
      discountPercent: 0,
      isDiscounted: false,
      formattedSavings: '',
      formattedDiscount: '',
      hasRrp: false,
      rrp: 0,
    };
  }

  const savings = Math.max(0, safeRrp - safePrice);
  const discountPercent = safeRrp > 0 ? Math.round((savings / safeRrp) * 100) : 0;

  return {
    savingsAmount: savings,
    discountPercent,
    isDiscounted: savings > 0.01,
    formattedSavings: formatGbp(savings),
    formattedDiscount: `-${discountPercent}%`,
    hasRrp: true,
    rrp: safeRrp,
  };
}

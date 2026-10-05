/**
 * Utilities for inferring, formatting, and standardizing item lifecycle tags
 * (Bought, Sold, Listed, Cancelled) across Wardrobe, Wishlist, and Resale imports.
 */

import { SellingStatus, ShoppingStatus } from '../types';

export type LifecycleStatus = 'Bought' | 'Sold' | 'Listed' | 'Cancelled';

export const LIFECYCLE_TAGS: readonly LifecycleStatus[] = ['Bought', 'Sold', 'Listed', 'Cancelled'] as const;

/**
 * Canonical dictionary for known platform, lifecycle, and common system tags.
 * Ensures consistent TitleCase / standard capitalization across the entire app.
 */
export const CANONICAL_TAG_MAP: Record<string, string> = {
  sold: 'Sold',
  bought: 'Bought',
  purchased: 'Bought',
  purchase: 'Bought',
  listed: 'Listed',
  cancelled: 'Cancelled',
  canceled: 'Cancelled',
  sale: 'Sale',
  vinted: 'Vinted',
  ebay: 'eBay',
  'account-sync': 'Account-Sync',
  'second-hand': 'Second-Hand',
  'wardrobe resale': 'Wardrobe Resale',
  wardrobe: 'Wardrobe',
  wishlist: 'Wishlist',
  researching: 'Researching',
  closet: 'Closet',
};

/**
 * Returns a canonical, properly capitalized version of a tag.
 * E.g., 'sold' -> 'Sold', 'Sold' -> 'Sold', 'vinted' -> 'Vinted', 'vintage' -> 'Vintage'.
 */
export function canonicalizeTag(rawTag: string): string {
  if (!rawTag || typeof rawTag !== 'string') return '';
  const trimmed = rawTag.trim().replace(/^#/, '');
  if (!trimmed) return '';

  const lower = trimmed.toLowerCase();
  if (CANONICAL_TAG_MAP[lower]) {
    return CANONICAL_TAG_MAP[lower];
  }

  // If all lowercase, convert to Title Case words
  if (/^[a-z0-9-]+$/.test(trimmed)) {
    return trimmed
      .split(/([\s-_]+)/)
      .map((part) => {
        if (/[\s-_]+/.test(part)) return part;
        return part.charAt(0).toUpperCase() + part.slice(1);
      })
      .join('');
  }

  // Already has casing (e.g. "Smart Casual", "100% Wool"): capitalize first letter if needed
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/**
 * Normalizes an array of tags:
 * - Maps each tag to its canonical TitleCase equivalent
 * - Merges and deduplicates case-insensitive variants (e.g. 'sold' and 'Sold' -> ['Sold'])
 * - Strips empty or whitespace-only tags
 */
export function normalizeTags(tags?: (string | null | undefined)[]): string[] {
  if (!Array.isArray(tags)) return [];
  const seenLower = new Set<string>();
  const result: string[] = [];

  for (const t of tags) {
    if (!t || typeof t !== 'string') continue;
    const canonical = canonicalizeTag(t);
    if (!canonical) continue;
    const lower = canonical.toLowerCase();
    if (!seenLower.has(lower)) {
      seenLower.add(lower);
      result.push(canonical);
    }
  }

  return result;
}

export interface DetermineLifecycleTagsParams {
  destination?: 'wardrobe' | 'shopping' | 'selling';
  transactionType?: string; // 'Purchase' | 'Sale' | etc.
  orderStatus?: string; // e.g. 'Order completed!', 'Cancelled', 'Delivered', 'Refunded'
  sellingStatus?: SellingStatus; // 'Draft' | 'Listed' | 'Sold' | 'Reserved'
  shoppingStatus?: ShoppingStatus; // 'To Buy' | 'Purchased' | 'Cancelled' | 'Passed'
  isVinted?: boolean;
  existingTags?: string[];
  sourceType?: 'account-scrape' | 'sync' | 'url' | 'file' | 'photo' | 'text' | 'general';
}

/**
 * Checks if a status or note text indicates an order or transaction was cancelled, refunded, or returned.
 */
export function isCancelledStatus(status?: string, notes?: string): boolean {
  const combined = `${status || ''} ${notes || ''}`.toLowerCase();
  return (
    combined.includes('cancel') ||
    combined.includes('refund') ||
    combined.includes('void') ||
    combined.includes('returned') ||
    combined.includes('aborted') ||
    combined.includes('failed')
  );
}

/**
 * Determines appropriate lifecycle status tags.
 * STRICT USER SPECIFICATION: Stop injecting unsolicited default tags (e.g. 'Bought', 'Listed', 'Sold', 'Vinted')
 * when importing or pulling items. Strictly preserves the tags the user already has, or returns empty array.
 */
export function determineLifecycleTags(params: DetermineLifecycleTagsParams): string[] {
  const { existingTags = [] } = params;

  // If user already has tags, strictly keep the ones they have without adding unsolicited default tags
  if (existingTags && Array.isArray(existingTags) && existingTags.length > 0) {
    const cleaned = existingTags
      .filter((t) => typeof t === 'string' && t.trim().length > 0)
      .map((t) => canonicalizeTag(t))
      .filter(Boolean);
    return normalizeTags(Array.from(new Set(cleaned)));
  }

  // If no existing tags were present, do NOT inject any default tags
  return [];
}

/**
 * Returns a human-friendly visual color class for lifecycle status pills
 */
export function getLifecycleTagColor(tag: string): { bg: string; text: string; border: string; badge: string; dot: string } {
  const lower = (tag || '').toLowerCase();
  switch (lower) {
    case 'bought':
    case 'purchased':
      return {
        bg: 'bg-emerald-50',
        text: 'text-emerald-800',
        border: 'border-emerald-300',
        badge: 'bg-emerald-100 text-emerald-900 border-emerald-300',
        dot: 'bg-emerald-600',
      };
    case 'sold':
      return {
        bg: 'bg-indigo-50',
        text: 'text-indigo-800',
        border: 'border-indigo-300',
        badge: 'bg-indigo-100 text-indigo-900 border-indigo-300',
        dot: 'bg-indigo-600',
      };
    case 'listed':
    case 'active-listing':
      return {
        bg: 'bg-amber-50',
        text: 'text-amber-800',
        border: 'border-amber-300',
        badge: 'bg-amber-100 text-amber-900 border-amber-300',
        dot: 'bg-amber-600',
      };
    case 'cancelled':
    case 'refunded':
      return {
        bg: 'bg-rose-50',
        text: 'text-rose-800',
        border: 'border-rose-300',
        badge: 'bg-rose-100 text-rose-900 border-rose-300',
        dot: 'bg-rose-600',
      };
    case 'vinted':
      return {
        bg: 'bg-teal-50',
        text: 'text-teal-800',
        border: 'border-teal-300',
        badge: 'bg-teal-100 text-teal-900 border-teal-300',
        dot: 'bg-[#007782]',
      };
    default:
      return {
        bg: 'bg-[#F2F1ED]',
        text: 'text-[#4A4A45]',
        border: 'border-[#E5E5E1]',
        badge: 'bg-[#F2F1ED] text-[#4A4A45] border-[#D5D5D0]',
        dot: 'bg-[#767670]',
      };
  }
}

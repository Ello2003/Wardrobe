/**
 * Utilities for inferring, formatting, and standardizing item lifecycle tags
 * (Bought, Sold, Listed, Cancelled) across Wardrobe, Wishlist, and Resale imports.
 */

import { SellingStatus, ShoppingStatus } from '../types';

export type LifecycleStatus = 'Bought' | 'Sold' | 'Listed' | 'Cancelled';

export const LIFECYCLE_TAGS: readonly LifecycleStatus[] = ['Bought', 'Sold', 'Listed', 'Cancelled'] as const;

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
 * Determines appropriate lifecycle status tags (Bought, Sold, Listed, Cancelled)
 * alongside domain tags (e.g. vinted, second-hand, imported).
 */
export function determineLifecycleTags(params: DetermineLifecycleTagsParams): string[] {
  const {
    destination = 'wardrobe',
    transactionType = '',
    orderStatus = '',
    sellingStatus,
    shoppingStatus,
    isVinted = false,
    existingTags = [],
  } = params;

  const tagSet = new Set<string>();

  // Add existing tags, keeping user custom tags intact
  for (const t of existingTags) {
    if (t && typeof t === 'string') {
      tagSet.add(t.trim());
    }
  }

  // 1. CANCELLED CHECK (highest priority status exception)
  const isCancelled =
    isCancelledStatus(orderStatus) ||
    shoppingStatus === 'Cancelled';

  if (isCancelled) {
    tagSet.add('Cancelled');
    tagSet.add('cancelled');
  }

  // 2. SOLD CHECK
  const isSold =
    sellingStatus === 'Sold' ||
    (destination === 'selling' && orderStatus.toLowerCase().includes('sold')) ||
    (transactionType.toLowerCase() === 'sale' && !isCancelled) ||
    (shoppingStatus as string) === 'Sold';

  if (isSold) {
    tagSet.add('Sold');
    tagSet.add('sold');
  }

  // 3. LISTED CHECK
  const isListed =
    sellingStatus === 'Listed' ||
    (destination === 'selling' && sellingStatus !== 'Sold' && !isCancelled) ||
    params.sourceType === 'account-scrape' ||
    (isVinted && destination === 'selling');

  if (isListed && !isSold) {
    tagSet.add('Listed');
    tagSet.add('listed');
  }

  // 4. BOUGHT / PURCHASED CHECK
  const isBought =
    destination === 'wardrobe' ||
    shoppingStatus === 'Purchased' ||
    (transactionType.toLowerCase() === 'purchase' && !isCancelled);

  if (isBought) {
    tagSet.add('Bought');
    tagSet.add('bought');
    tagSet.add('purchased');
  }

  // 5. PLATFORM TAGS
  if (isVinted) {
    tagSet.add('vinted');
  }

  return Array.from(tagSet);
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

/**
 * Shared item-construction logic for marketplace order syncs (Vinted, eBay).
 *
 * Why this exists: syncVintedAccountOrders and syncEbayAccountOrders in
 * WardrobeContext.tsx were independently hand-written as near-identical
 * ~250-line functions, and their differences weren't just cosmetic —
 * eBay's version used flat hardcoded tags that don't distinguish cancelled/
 * refunded orders from genuinely sold/purchased ones, while Vinted's used
 * the shared determineLifecycleTags helper correctly. Extracting the common
 * per-order item construction here means both platforms get the same
 * correct behavior, and a future third marketplace only needs to supply
 * its own MarketplaceOrderConfig rather than a new hand-rolled ~250 lines.
 */

import { WardrobeItem, ShoppingItem, SaleItem, Condition } from '../types';
import { determineLifecycleTags, isCancelledStatus } from './tagUtils';

/** The minimal shape any marketplace order needs to provide. Both VintedOrder
 * and EbayOrder already satisfy this structurally. */
export interface MarketplaceOrderLike {
  orderId: string;
  title: string;
  price: string | number;
  rrp?: string | number;
  date?: string;
  image?: string;
  type?: 'sold' | 'purchased' | 'all' | 'active';
  status?: string;
  transactionStatus?: string;
  brand?: string;
  category?: string;
  color?: string;
  colour?: string;
  size?: string;
  condition?: string;
  itemUrl?: string;
  seller?: string;
  buyer?: string;
  notes?: string;
}

export interface MarketplacePlatformConfig {
  /** Display name stored on the item, e.g. 'Vinted' or 'eBay'. */
  platformLabel: string;
  /** Lowercase tag added alongside the lifecycle tags, e.g. 'vinted' or 'ebay'. */
  platformTag: string;
  /** True only for Vinted — determineLifecycleTags' isVinted flag also adds a 'Listed' tag for account-scrape sourced items; kept as a param rather than assumed so eBay isn't silently given Vinted-only tagging behavior. */
  isVinted?: boolean;
  buildItemUrl: (order: MarketplaceOrderLike) => string;
  inferBrand: (order: MarketplaceOrderLike, title: string) => string;
  inferCategory: (order: MarketplaceOrderLike, title: string, categories: string[]) => string;
  inferSize?: (order: MarketplaceOrderLike, title: string) => string | undefined;
  inferColor?: (order: MarketplaceOrderLike) => string | undefined;
  inferCondition?: (order: MarketplaceOrderLike) => Condition;
  /** Default shopping-list priority for purchased items from this platform. Defaults to 'Essential / Must-Have'. */
  defaultShoppingPriority?: ShoppingItem['priority'];
}

export function parseMarketplacePrice(raw: string | number | undefined): number {
  if (typeof raw === 'number') return raw;
  return parseFloat(String(raw || '0').replace(/[^0-9.]/g, '')) || 0;
}

interface CommonFields {
  orderId: string;
  orderTitle: string;
  orderPrice: number;
  orderRrp?: number;
  rawDate: string;
  isActiveListing: boolean;
  isCancelled: boolean;
  inferredBrand: string;
  inferredCategory: string;
  inferredSize?: string;
  inferredColor?: string;
  inferredCondition: Condition;
}

function deriveCommonFields(
  order: MarketplaceOrderLike,
  platform: MarketplacePlatformConfig,
  categories: string[],
  now: string
): CommonFields {
  const orderId = order.orderId ? String(order.orderId).trim() : '';
  const orderPrice = parseMarketplacePrice(order.price);
  const orderRrp = order.rrp !== undefined ? parseMarketplacePrice(order.rrp) : undefined;
  const rawDate = order.date ? String(order.date).slice(0, 10) : now.slice(0, 10);
  const orderTitle = (order.title || `${platform.platformLabel} Order`).trim();
  const rawStatus = (order.transactionStatus || order.status || '').toLowerCase();

  return {
    orderId,
    orderTitle,
    orderPrice,
    orderRrp: orderRrp && orderRrp > 0 ? orderRrp : undefined,
    rawDate,
    isActiveListing: order.type === 'active' || order.status === 'Listed',
    isCancelled: isCancelledStatus(rawStatus),
    inferredBrand: platform.inferBrand(order, orderTitle),
    inferredCategory: platform.inferCategory(order, orderTitle, categories),
    inferredSize: platform.inferSize ? platform.inferSize(order, orderTitle) : order.size || undefined,
    inferredColor: platform.inferColor ? platform.inferColor(order) : order.color || order.colour || undefined,
    inferredCondition: platform.inferCondition
      ? platform.inferCondition(order)
      : ('Good' as Condition),
  };
}

export function buildMarketplaceSaleItem(
  order: MarketplaceOrderLike,
  platform: MarketplacePlatformConfig,
  categories: string[],
  generateId: () => string,
  now: string,
  existingTags: string[]
): SaleItem {
  const f = deriveCommonFields(order, platform, categories, now);

  const tags = determineLifecycleTags({
    destination: 'selling',
    sellingStatus: f.isActiveListing ? 'Listed' : f.isCancelled ? 'Draft' : 'Sold',
    orderStatus: order.transactionStatus || order.status,
    transactionType: 'Sale',
    isVinted: platform.isVinted,
    existingTags,
  });

  return {
    id: generateId(),
    name: f.orderTitle,
    brand: f.inferredBrand,
    category: f.inferredCategory,
    size: f.inferredSize,
    color: f.inferredColor,
    condition: f.inferredCondition,
    originalPricePaid: 0,
    listingPrice: f.orderPrice,
    soldPrice: f.isActiveListing ? undefined : f.orderPrice,
    rrp: f.orderRrp,
    platform: platform.platformLabel as SaleItem['platform'],
    status: f.isActiveListing ? 'Listed' : f.isCancelled ? 'Draft' : 'Sold',
    shippingStatus: f.isActiveListing || f.isCancelled ? 'Not Required' : 'Delivered',
    imageUrl: order.image || '',
    description: order.notes || `${platform.platformLabel} order #${f.orderId}`,
    tags,
    listedDate: f.rawDate,
    soldDate: f.isActiveListing ? undefined : f.rawDate,
    buyerUsername: order.buyer,
    orderNumber: f.orderId,
    platformListingUrl: platform.buildItemUrl(order),
    notes: f.isActiveListing
      ? `${platform.platformLabel} active listing synced via connected session`
      : order.transactionStatus
      ? `${platform.platformLabel} order · ${order.transactionStatus}`
      : `${platform.platformLabel} order`,
    createdAt: now,
    updatedAt: now,
  };
}

export function buildMarketplaceShoppingItem(
  order: MarketplaceOrderLike,
  platform: MarketplacePlatformConfig,
  categories: string[],
  generateId: () => string,
  now: string,
  existingTags: string[]
): ShoppingItem {
  const f = deriveCommonFields(order, platform, categories, now);

  const tags = determineLifecycleTags({
    destination: 'shopping',
    shoppingStatus: f.isCancelled ? 'Cancelled' : 'Purchased',
    orderStatus: order.transactionStatus || order.status,
    transactionType: 'Purchase',
    isVinted: platform.isVinted,
    existingTags,
  });

  return {
    id: generateId(),
    name: f.orderTitle,
    brand: f.inferredBrand,
    category: f.inferredCategory,
    size: f.inferredSize,
    estimatedPrice: f.orderPrice,
    actualPricePaid: f.orderPrice,
    rrp: f.orderRrp,
    priority: platform.defaultShoppingPriority || 'Essential / Must-Have',
    status: f.isCancelled ? 'Cancelled' : 'Purchased',
    season: 'All-Season',
    matchingWardrobeItemIds: [],
    imageUrl: order.image || '',
    reasonOrGap: order.transactionStatus
      ? `${platform.platformLabel} purchase · ${order.transactionStatus}`
      : `${platform.platformLabel} purchase`,
    targetStoreUrl: platform.buildItemUrl(order),
    tags,
    addedDate: f.rawDate,
    createdAt: now,
    purchasedDate: f.rawDate,
    seller: order.seller,
    orderDate: f.rawDate,
    orderNumber: f.orderId,
    orderValue: f.orderPrice,
    retailerName: platform.platformLabel,
    notes: order.transactionStatus
      ? `${platform.platformLabel} order #${f.orderId} · ${order.transactionStatus}`
      : `${platform.platformLabel} order #${f.orderId}`,
  };
}

export function buildMarketplaceWardrobeItem(
  order: MarketplaceOrderLike,
  platform: MarketplacePlatformConfig,
  categories: string[],
  generateId: () => string,
  now: string,
  existingTags: string[]
): WardrobeItem {
  const f = deriveCommonFields(order, platform, categories, now);

  const tags = determineLifecycleTags({
    destination: 'wardrobe',
    orderStatus: order.transactionStatus || order.status,
    transactionType: 'Purchase',
    isVinted: platform.isVinted,
    existingTags,
  });

  return {
    id: generateId(),
    name: f.orderTitle,
    brand: f.inferredBrand,
    category: f.inferredCategory,
    size: f.inferredSize,
    color: f.inferredColor || 'Various',
    season: ['All-Season'],
    purchasePrice: f.orderPrice,
    rrp: f.orderRrp,
    purchaseDate: f.rawDate,
    wearCount: 0,
    imageUrl: order.image || '',
    retailerName: platform.platformLabel,
    orderNumber: f.orderId,
    targetStoreUrl: platform.buildItemUrl(order),
    condition: f.inferredCondition,
    isFavorite: false,
    isArchived: false,
    tags,
    notes: order.transactionStatus
      ? `${platform.platformLabel} order #${f.orderId} · ${order.transactionStatus}${order.seller ? ` · Seller: ${order.seller}` : ''}`
      : `${platform.platformLabel} order #${f.orderId}${order.seller ? ` · Seller: ${order.seller}` : ''}`,
    createdAt: now,
    updatedAt: now,
  };
}

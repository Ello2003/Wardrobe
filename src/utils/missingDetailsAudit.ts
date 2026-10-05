import { WardrobeItem } from '../types';

export type MissingCriteria =
  | 'all'
  | 'any_missing'
  | 'missing_size'
  | 'missing_brand'
  | 'missing_material'
  | 'missing_color'
  | 'missing_price'
  | 'missing_rrp'
  | 'missing_category'
  | 'missing_image'
  | 'missing_location'
  | 'complete';

export interface ItemMissingAudit {
  isMissingSize: boolean;
  isMissingBrand: boolean;
  isMissingMaterial: boolean;
  isMissingColor: boolean;
  isMissingPrice: boolean;
  isMissingRrp: boolean;
  isMissingCategory: boolean;
  isMissingImage: boolean;
  isMissingLocation: boolean;
  hasAnyMissing: boolean;
  missingCount: number;
  missingLabels: string[];
}

/**
 * Checks if a specific attribute is missing or placeholder for a wardrobe garment
 */
export function auditGarmentDetails(item: Partial<WardrobeItem> | Record<string, any>): ItemMissingAudit {
  const isMissingSize =
    !item.size ||
    item.size.trim() === '' ||
    item.size.trim().toLowerCase() === 'n/a' ||
    item.size.trim().toLowerCase() === 'unknown' ||
    item.size.trim().toLowerCase() === 'none';

  const isMissingBrand =
    !item.brand ||
    item.brand.trim() === '' ||
    item.brand.trim().toLowerCase() === 'unbranded' ||
    item.brand.trim().toLowerCase() === 'unknown' ||
    item.brand.trim().toLowerCase() === 'curated brand' ||
    item.brand.trim().toLowerCase() === 'curated label';

  const isMissingMaterial =
    !item.material ||
    item.material.trim() === '' ||
    item.material.trim().toLowerCase() === 'unknown' ||
    item.material.trim().toLowerCase() === 'fabric';

  const isMissingColor =
    !item.color ||
    item.color.trim() === '' ||
    item.color.trim().toLowerCase() === 'unknown';

  const anyItem = item as any;
  const priceVal =
    anyItem.purchasePrice !== undefined && anyItem.purchasePrice !== null
      ? anyItem.purchasePrice
      : anyItem.estimatedPrice !== undefined && anyItem.estimatedPrice !== null
      ? anyItem.estimatedPrice
      : anyItem.targetPrice !== undefined && anyItem.targetPrice !== null
      ? anyItem.targetPrice
      : anyItem.listingPrice;

  const isMissingPrice =
    priceVal === undefined ||
    priceVal === null ||
    priceVal === 0 ||
    isNaN(Number(priceVal));

  const isMissingRrp =
    item.rrp === undefined ||
    item.rrp === null ||
    item.rrp === 0 ||
    isNaN(Number(item.rrp));

  const isMissingCategory =
    !item.category ||
    item.category.trim() === '' ||
    item.category.trim().toLowerCase() === 'uncategorized';

  const isMissingImage =
    !item.imageUrl ||
    item.imageUrl.trim() === '' ||
    item.imageUrl.includes('placeholder');

  const isMissingLocation =
    !item.storageLocation ||
    item.storageLocation.trim() === '' ||
    item.storageLocation.trim().toLowerCase() === 'unassigned';

  const missingLabels: string[] = [];
  if (isMissingSize) missingLabels.push('Size');
  if (isMissingBrand) missingLabels.push('Brand');
  if (isMissingMaterial) missingLabels.push('Material');
  if (isMissingColor) missingLabels.push('Color');
  if (isMissingPrice) missingLabels.push('Price');
  if (isMissingRrp) missingLabels.push('RRP');
  if (isMissingCategory) missingLabels.push('Category');
  if (isMissingImage) missingLabels.push('Photo');
  if (isMissingLocation) missingLabels.push('Location');

  // Key missing items are size, brand, material, color, price
  const hasAnyMissing =
    isMissingSize ||
    isMissingBrand ||
    isMissingMaterial ||
    isMissingColor ||
    isMissingPrice ||
    isMissingImage;

  return {
    isMissingSize,
    isMissingBrand,
    isMissingMaterial,
    isMissingColor,
    isMissingPrice,
    isMissingRrp,
    isMissingCategory,
    isMissingImage,
    isMissingLocation,
    hasAnyMissing,
    missingCount: missingLabels.length,
    missingLabels,
  };
}

/**
 * Filter an array of wardrobe items by missing details criteria
 */
export function filterItemsByMissingCriteria(
  items: WardrobeItem[],
  criterion: MissingCriteria
): WardrobeItem[] {
  if (criterion === 'all') return items;

  return items.filter((item) => {
    const audit = auditGarmentDetails(item);
    switch (criterion) {
      case 'missing_size':
        return audit.isMissingSize;
      case 'missing_brand':
        return audit.isMissingBrand;
      case 'missing_material':
        return audit.isMissingMaterial;
      case 'missing_color':
        return audit.isMissingColor;
      case 'missing_price':
        return audit.isMissingPrice;
      case 'missing_rrp':
        return audit.isMissingRrp;
      case 'missing_category':
        return audit.isMissingCategory;
      case 'missing_image':
        return audit.isMissingImage;
      case 'missing_location':
        return audit.isMissingLocation;
      case 'any_missing':
        return audit.hasAnyMissing;
      case 'complete':
        return !audit.hasAnyMissing;
      default:
        return true;
    }
  });
}

/**
 * Calculates missing statistics for a set of items
 */
export function getMissingDetailsStats(items: WardrobeItem[]) {
  let missingSize = 0;
  let missingBrand = 0;
  let missingMaterial = 0;
  let missingColor = 0;
  let missingPrice = 0;
  let missingRrp = 0;
  let missingCategory = 0;
  let missingImage = 0;
  let missingLocation = 0;
  let anyMissing = 0;
  let complete = 0;

  for (const it of items) {
    if (it.isArchived) continue;
    const audit = auditGarmentDetails(it);
    if (audit.isMissingSize) missingSize++;
    if (audit.isMissingBrand) missingBrand++;
    if (audit.isMissingMaterial) missingMaterial++;
    if (audit.isMissingColor) missingColor++;
    if (audit.isMissingPrice) missingPrice++;
    if (audit.isMissingRrp) missingRrp++;
    if (audit.isMissingCategory) missingCategory++;
    if (audit.isMissingImage) missingImage++;
    if (audit.isMissingLocation) missingLocation++;
    if (audit.hasAnyMissing) anyMissing++;
    else complete++;
  }

  return {
    total: items.filter((i) => !i.isArchived).length,
    missingSize,
    missingBrand,
    missingMaterial,
    missingColor,
    missingPrice,
    missingRrp,
    missingCategory,
    missingImage,
    missingLocation,
    anyMissing,
    complete,
  };
}

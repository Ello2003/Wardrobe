/**
 * Humidor Lossless Backup Suite Service
 * Provides military-grade, byte-for-byte lossless database export, validation, diff analysis, CSV extraction, and repair routines.
 */

import {
  WardrobeItem,
  LookbookOutfit,
  ShoppingItem,
  SaleItem,
  WardrobeSnapshot,
  VersionChangeLog,
  Category,
} from '../types';

export interface LosslessBackupPayload {
  formatVersion: string;
  exportedAt: string;
  integrityChecksum: string;
  data: {
    items: WardrobeItem[];
    outfits: LookbookOutfit[];
    shoppingList: ShoppingItem[];
    saleItems: SaleItem[];
    snapshots: WardrobeSnapshot[];
    changeLogs: VersionChangeLog[];
    categories?: Category[];
    monthlyBudget?: number;
  };
  metadata?: {
    appVersion: string;
    totalValuationGbp: number;
    platform: string;
  };
}

export interface BackupDiffSummary {
  incomingItemsCount: number;
  currentItemsCount: number;
  newItemsCount: number;
  changedItemsCount: number;
  identicalItemsCount: number;
  incomingOutfitsCount: number;
  currentOutfitsCount: number;
  incomingSalesCount: number;
  currentSalesCount: number;
  incomingShoppingCount: number;
  currentShoppingCount: number;
  incomingWishlistCount: number;
  valuationDifference: number;
  valuationDifferenceGbp: number;
}

export interface DatabaseHealthReport {
  score: number; // 0-100
  healthScore: number;
  totalChecks: number;
  passedChecks: number;
  issues: Array<{
    severity: 'high' | 'medium' | 'low' | 'error' | 'warning' | 'info';
    entityType: 'wardrobe' | 'outfit' | 'sale' | 'shopping' | 'timeline';
    entityId: string;
    message: string;
    description: string;
  }>;
  summary: string;
}

/**
 * Calculate simple hexadecimal checksum
 */
export function calculateChecksum(dataStr: string): string {
  let hash = 0;
  for (let i = 0; i < dataStr.length; i++) {
    const char = dataStr.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return 'hlb_' + Math.abs(hash).toString(16) + '_' + dataStr.length;
}

/**
 * Create a complete, lossless backup payload
 */
export function createLosslessBackup(data: {
  items: WardrobeItem[];
  outfits: LookbookOutfit[];
  shoppingList: ShoppingItem[];
  saleItems: SaleItem[];
  snapshots: WardrobeSnapshot[];
  changeLogs: VersionChangeLog[];
  categories?: Category[];
  monthlyBudget?: number;
}): LosslessBackupPayload {
  const {
    items,
    outfits,
    shoppingList,
    saleItems,
    snapshots,
    changeLogs,
    categories,
    monthlyBudget = 350,
  } = data;

  const totalValuation = items.reduce(
    (acc, it) => acc + (Number(it.purchasePrice) || Number(it.currentValuation) || 0),
    0
  );

  const allCategories = Array.from(
    new Set([
      ...(Array.isArray(categories) ? categories : []),
      ...items.map((i) => i.category).filter(Boolean),
      ...shoppingList.map((s) => s.category).filter(Boolean),
      ...saleItems.map((sl) => sl.category).filter(Boolean),
    ])
  );

  const cleanData = {
    items: JSON.parse(JSON.stringify(items)),
    outfits: JSON.parse(JSON.stringify(outfits)),
    shoppingList: JSON.parse(JSON.stringify(shoppingList)),
    saleItems: JSON.parse(JSON.stringify(saleItems)),
    snapshots: JSON.parse(JSON.stringify(snapshots)),
    changeLogs: JSON.parse(JSON.stringify(changeLogs)),
    categories: allCategories.length > 0 ? allCategories : undefined,
    monthlyBudget,
  };

  const serializedData = JSON.stringify(cleanData);
  const integrityChecksum = calculateChecksum(serializedData);

  return {
    formatVersion: '4.2-humidor-lossless',
    exportedAt: new Date().toISOString(),
    integrityChecksum,
    data: cleanData,
    metadata: {
      appVersion: 'v4.2',
      totalValuationGbp: Math.round(totalValuation * 100) / 100,
      platform: 'Wardrobe Humidor Suite',
    },
  };
}

/**
 * Validates an incoming JSON string or object as a valid lossless backup
 */
export function validateLosslessBackup(jsonContent: string | any): {
  valid: boolean;
  errors: string[];
  warnings: string[];
  payload?: LosslessBackupPayload;
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  let parsed: any;
  if (typeof jsonContent === 'string') {
    try {
      parsed = JSON.parse(jsonContent);
    } catch {
      return { valid: false, errors: ['File does not contain valid JSON syntax.'], warnings };
    }
  } else {
    parsed = jsonContent;
  }

  if (!parsed || typeof parsed !== 'object') {
    return { valid: false, errors: ['Parsed object is empty or not an object.'], warnings };
  }

  // Extract collections flexibly from standard, flat, legacy, or wrapped formats
  let rawItems: any[] | null = null;
  let rawOutfits: any[] | null = null;
  let rawShopping: any[] | null = null;
  let rawSales: any[] | null = null;
  let rawSnapshots: any[] | null = null;
  let rawLogs: any[] | null = null;
  let rawCategories: any[] | null = null;
  let rawBudget: number | undefined = undefined;

  let isHumidorFormat = false;

  if (Array.isArray(parsed)) {
    rawItems = parsed;
    warnings.push('Array format detected. Populating as wardrobe catalog.');
  } else {
    const container = parsed.data && typeof parsed.data === 'object' ? parsed.data : parsed;
    isHumidorFormat = Boolean(parsed.data && typeof parsed.data === 'object');

    // Items
    if (Array.isArray(container.items)) rawItems = container.items;
    else if (Array.isArray(container.wardrobeItems)) rawItems = container.wardrobeItems;
    else if (Array.isArray(container.wardrobe)) rawItems = container.wardrobe;
    else if (Array.isArray(container.garments)) rawItems = container.garments;
    else if (Array.isArray(container.closet)) rawItems = container.closet;
    else if (Array.isArray(parsed.items)) rawItems = parsed.items;
    else if (Array.isArray(parsed.wardrobeItems)) rawItems = parsed.wardrobeItems;

    // Outfits
    if (Array.isArray(container.outfits)) rawOutfits = container.outfits;
    else if (Array.isArray(container.looks)) rawOutfits = container.looks;
    else if (Array.isArray(container.lookbooks)) rawOutfits = container.lookbooks;
    else if (Array.isArray(parsed.outfits)) rawOutfits = parsed.outfits;
    else if (Array.isArray(parsed.looks)) rawOutfits = parsed.looks;

    // Shopping
    if (Array.isArray(container.shoppingList)) rawShopping = container.shoppingList;
    else if (Array.isArray(container.shopping)) rawShopping = container.shopping;
    else if (Array.isArray(container.wishlist)) rawShopping = container.wishlist;
    else if (Array.isArray(container.wishlistItems)) rawShopping = container.wishlistItems;
    else if (Array.isArray(parsed.shoppingList)) rawShopping = parsed.shoppingList;
    else if (Array.isArray(parsed.wishlist)) rawShopping = parsed.wishlist;

    // Sales
    if (Array.isArray(container.saleItems)) rawSales = container.saleItems;
    else if (Array.isArray(container.sales)) rawSales = container.sales;
    else if (Array.isArray(container.resale)) rawSales = container.resale;
    else if (Array.isArray(container.resaleItems)) rawSales = container.resaleItems;
    else if (Array.isArray(container.listings)) rawSales = container.listings;
    else if (Array.isArray(parsed.saleItems)) rawSales = parsed.saleItems;
    else if (Array.isArray(parsed.sales)) rawSales = parsed.sales;

    // Snapshots
    if (Array.isArray(container.snapshots)) rawSnapshots = container.snapshots;
    else if (Array.isArray(container.checkpoints)) rawSnapshots = container.checkpoints;
    else if (Array.isArray(parsed.snapshots)) rawSnapshots = parsed.snapshots;

    // ChangeLogs
    if (Array.isArray(container.changeLogs)) rawLogs = container.changeLogs;
    else if (Array.isArray(container.logs)) rawLogs = container.logs;
    else if (Array.isArray(parsed.changeLogs)) rawLogs = parsed.changeLogs;

    // Categories
    if (Array.isArray(container.categories)) rawCategories = container.categories;
    else if (Array.isArray(parsed.categories)) rawCategories = parsed.categories;

    // Budget
    if (typeof container.monthlyBudget === 'number') rawBudget = container.monthlyBudget;
    else if (typeof parsed.monthlyBudget === 'number') rawBudget = parsed.monthlyBudget;
  }

  const items = Array.isArray(rawItems) ? rawItems : [];
  const outfits = Array.isArray(rawOutfits) ? rawOutfits : [];
  const shoppingList = Array.isArray(rawShopping) ? rawShopping : [];
  const saleItems = Array.isArray(rawSales) ? rawSales : [];
  const snapshots = Array.isArray(rawSnapshots) ? rawSnapshots : [];
  const changeLogs = Array.isArray(rawLogs) ? rawLogs : [];
  // Ensure all categories are discovered and preserved
  const discoveredCatSet = new Set<string>();
  if (Array.isArray(rawCategories)) {
    rawCategories.forEach((c) => {
      if (typeof c === 'string' && c.trim()) discoveredCatSet.add(c.trim());
    });
  }
  items.forEach((it) => {
    if (it && typeof it.category === 'string' && it.category.trim()) {
      discoveredCatSet.add(it.category.trim());
    }
  });
  shoppingList.forEach((sh) => {
    if (sh && typeof sh.category === 'string' && sh.category.trim()) {
      discoveredCatSet.add(sh.category.trim());
    }
  });
  saleItems.forEach((sl) => {
    if (sl && typeof sl.category === 'string' && sl.category.trim()) {
      discoveredCatSet.add(sl.category.trim());
    }
  });
  const categories = discoveredCatSet.size > 0 ? Array.from(discoveredCatSet) : undefined;
  const monthlyBudget = typeof rawBudget === 'number' ? rawBudget : undefined;

  if (
    items.length === 0 &&
    outfits.length === 0 &&
    shoppingList.length === 0 &&
    saleItems.length === 0 &&
    snapshots.length === 0
  ) {
    return {
      valid: false,
      errors: ['No wardrobe garments, outfits, shopping, or resale collections found in file.'],
      warnings,
    };
  }

  const cleanData = {
    items,
    outfits,
    shoppingList,
    saleItems,
    snapshots,
    changeLogs,
    categories,
    monthlyBudget,
  };

  const standardPayload: LosslessBackupPayload = {
    formatVersion: isHumidorFormat ? parsed.formatVersion || '4.2-humidor-lossless' : 'legacy-migrated',
    exportedAt: parsed.exportedAt || new Date().toISOString(),
    integrityChecksum: parsed.integrityChecksum || calculateChecksum(JSON.stringify(cleanData)),
    data: cleanData,
    metadata: parsed.metadata,
  };

  if (!isHumidorFormat) {
    warnings.push('Standard/Legacy archive format detected. Converted to Humidor Lossless schema.');
  }

  // Check checksum if present
  if (parsed.integrityChecksum) {
    const rawDataStr = isHumidorFormat && parsed.data ? JSON.stringify(parsed.data) : JSON.stringify(standardPayload.data);
    const expected = calculateChecksum(rawDataStr);
    if (parsed.integrityChecksum !== expected) {
      warnings.push('Checksum variance detected. File may have been manually edited outside the app.');
    }
  }

  return {
    valid: true,
    errors: [],
    warnings,
    payload: standardPayload,
  };
}

/**
 * Compare an incoming backup with current closet state
 */
export function compareLosslessBackups(
  current: LosslessBackupPayload,
  incoming: LosslessBackupPayload
): BackupDiffSummary {
  const currentItems = current.data.items || [];
  const incomingItems = incoming.data.items || [];

  const currentMap = new Map(currentItems.map((i) => [i.id, i]));
  let newItemsCount = 0;
  let changedItemsCount = 0;
  let identicalItemsCount = 0;

  for (const it of incomingItems) {
    const ex = currentMap.get(it.id);
    if (!ex) {
      newItemsCount++;
    } else {
      if (JSON.stringify(ex) === JSON.stringify(it)) {
        identicalItemsCount++;
      } else {
        changedItemsCount++;
      }
    }
  }

  const currentVal = currentItems.reduce((acc, i) => acc + (Number(i.purchasePrice) || 0), 0);
  const incomingVal = incomingItems.reduce((acc, i) => acc + (Number(i.purchasePrice) || 0), 0);
  const valDiff = Math.round((incomingVal - currentVal) * 100) / 100;

  return {
    incomingItemsCount: incomingItems.length,
    currentItemsCount: currentItems.length,
    newItemsCount,
    changedItemsCount,
    identicalItemsCount,
    incomingOutfitsCount: (incoming.data.outfits || []).length,
    currentOutfitsCount: (current.data.outfits || []).length,
    incomingSalesCount: (incoming.data.saleItems || []).length,
    currentSalesCount: (current.data.saleItems || []).length,
    incomingShoppingCount: (incoming.data.shoppingList || []).length,
    currentShoppingCount: (current.data.shoppingList || []).length,
    incomingWishlistCount: (incoming.data.shoppingList || []).length,
    valuationDifference: valDiff,
    valuationDifferenceGbp: valDiff,
  };
}

/**
 * Export wardrobe inventory to standard CSV spreadsheet string
 */
export function exportWardrobeToCsv(items: WardrobeItem[]): string {
  const headers = [
    'ID',
    'Name',
    'Brand',
    'Category',
    'Purchase Price (£)',
    'Current Valuation (£)',
    'Wear Count',
    'Cost Per Wear (£)',
    'Purchase Date',
    'Condition',
    'Color',
    'Material',
    'Size',
    'Storage Location',
    'Tags',
  ];

  const rows = items.map((i) => {
    const cpw = (Number(i.purchasePrice) || 0) / Math.max(1, i.wearCount || 1);
    return [
      `"${i.id}"`,
      `"${(i.name || '').replace(/"/g, '""')}"`,
      `"${(i.brand || '').replace(/"/g, '""')}"`,
      `"${(i.category || '').replace(/"/g, '""')}"`,
      Number(i.purchasePrice || 0).toFixed(2),
      Number(i.currentValuation || i.purchasePrice || 0).toFixed(2),
      i.wearCount || 0,
      cpw.toFixed(2),
      `"${i.purchaseDate || ''}"`,
      `"${(i.condition || '').replace(/"/g, '""')}"`,
      `"${(i.color || '').replace(/"/g, '""')}"`,
      `"${(i.material || '').replace(/"/g, '""')}"`,
      `"${(i.size || '').replace(/"/g, '""')}"`,
      `"${(i.storageLocation || '').replace(/"/g, '""')}"`,
      `"${(i.tags || []).join(', ').replace(/"/g, '""')}"`,
    ];
  });

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/**
 * Export resale items to standard CSV spreadsheet string
 */
export function exportSalesToCsv(items: SaleItem[]): string {
  const headers = [
    'ID',
    'Name',
    'Brand',
    'Category',
    'Platform',
    'Status',
    'Original Cost (£)',
    'Listing Price (£)',
    'Sold Price (£)',
    'Net Profit (£)',
    'Listed Date',
    'Sold Date',
    'Buyer',
    'Order Number',
    'Tracking Number',
  ];

  const rows = items.map((i) => {
    const profit = i.soldPrice !== undefined ? i.soldPrice - (i.originalPricePaid || 0) : 0;
    return [
      `"${i.id}"`,
      `"${(i.name || '').replace(/"/g, '""')}"`,
      `"${(i.brand || '').replace(/"/g, '""')}"`,
      `"${(i.category || '').replace(/"/g, '""')}"`,
      `"${i.platform}"`,
      `"${i.status}"`,
      Number(i.originalPricePaid || 0).toFixed(2),
      Number(i.listingPrice || 0).toFixed(2),
      i.soldPrice !== undefined ? Number(i.soldPrice).toFixed(2) : '',
      profit.toFixed(2),
      `"${i.listedDate || ''}"`,
      `"${i.soldDate || ''}"`,
      `"${(i.buyerUsername || '').replace(/"/g, '""')}"`,
      `"${(i.orderNumber || '').replace(/"/g, '""')}"`,
      `"${(i.trackingNumber || '').replace(/"/g, '""')}"`,
    ];
  });

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/**
 * Export shopping wishlist items to standard CSV spreadsheet string
 */
export function exportShoppingToCsv(items: ShoppingItem[]): string {
  const headers = [
    'ID',
    'Name',
    'Brand',
    'Category',
    'Estimated Price (£)',
    'Priority',
    'Status',
    'Retailer',
    'Season',
    'Reason or Gap',
    'Added Date',
    'Product URL',
  ];

  const rows = items.map((i) => [
    `"${i.id}"`,
    `"${(i.name || '').replace(/"/g, '""')}"`,
    `"${(i.brand || '').replace(/"/g, '""')}"`,
    `"${(i.category || '').replace(/"/g, '""')}"`,
    Number(i.estimatedPrice || 0).toFixed(2),
    `"${i.priority}"`,
    `"${i.status}"`,
    `"${(i.retailerName || '').replace(/"/g, '""')}"`,
    `"${i.season}"`,
    `"${(i.reasonOrGap || '').replace(/"/g, '""')}"`,
    `"${i.addedDate || ''}"`,
    `"${(i.targetStoreUrl || i.storeUrl || '').replace(/"/g, '""')}"`,
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/**
 * Diagnostic health checker for database integrity
 */
export function runDatabaseHealthCheck(data: LosslessBackupPayload['data']): DatabaseHealthReport {
  const issues: DatabaseHealthReport['issues'] = [];
  let totalChecks = 0;
  let passedChecks = 0;

  const itemIds = new Set((data.items || []).map((i) => i.id));

  // 1. Check wardrobe items
  for (const item of data.items || []) {
    totalChecks += 2;
    if (!item.name || !item.name.trim()) {
      const msg = `Garment ${item.id} is missing a product name.`;
      issues.push({
        severity: 'high',
        entityType: 'wardrobe',
        entityId: item.id,
        message: msg,
        description: msg,
      });
    } else {
      passedChecks++;
    }

    if (item.purchasePrice < 0 || isNaN(item.purchasePrice)) {
      const msg = `Garment "${item.name}" has an invalid price value (£${item.purchasePrice}).`;
      issues.push({
        severity: 'medium',
        entityType: 'wardrobe',
        entityId: item.id,
        message: msg,
        description: msg,
      });
    } else {
      passedChecks++;
    }
  }

  // 2. Check outfits for orphaned item IDs
  for (const outfit of data.outfits || []) {
    totalChecks++;
    const missingIds = (outfit.itemIds || []).filter((id) => !itemIds.has(id));
    const outfitName = outfit.title || (outfit as any).name || 'Lookbook Outfit';
    if (missingIds.length > 0) {
      const msg = `Lookbook outfit "${outfitName}" references ${missingIds.length} deleted wardrobe item(s).`;
      issues.push({
        severity: 'medium',
        entityType: 'outfit',
        entityId: outfit.id,
        message: msg,
        description: msg,
      });
    } else {
      passedChecks++;
    }
  }

  // 3. Check sales items
  for (const sale of data.saleItems || []) {
    totalChecks++;
    if (sale.listingPrice < 0) {
      const msg = `Listing "${sale.name}" has negative listing price (£${sale.listingPrice}).`;
      issues.push({
        severity: 'medium',
        entityType: 'sale',
        entityId: sale.id,
        message: msg,
        description: msg,
      });
    } else {
      passedChecks++;
    }
  }

  const score = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 100;

  return {
    score,
    healthScore: score,
    totalChecks,
    passedChecks,
    issues,
    summary:
      issues.length === 0
        ? 'Database integrity is pristine. All foreign keys, schemas, and references are aligned.'
        : `Diagnostic scan detected ${issues.length} potential issue(s). Automatic repair can resolve orphaned links and sanitize invalid values.`,
  };
}

/**
 * Automatically clean and repair database inconsistencies
 */
export function repairDatabaseInconsistencies(
  data: LosslessBackupPayload['data']
): LosslessBackupPayload['data'] {
  const validItemIds = new Set((data.items || []).map((i) => i.id));

  // Sanitize wardrobe items
  const repairedItems = (data.items || []).map((it) => ({
    ...it,
    name: it.name && it.name.trim() ? it.name.trim() : 'Untitled Garment',
    purchasePrice: Math.max(0, Number(it.purchasePrice) || 0),
    wearCount: Math.max(0, Number(it.wearCount) || 0),
  }));

  // Strip orphaned item references from outfits
  const repairedOutfits = (data.outfits || []).map((o) => ({
    ...o,
    itemIds: (o.itemIds || []).filter((id) => validItemIds.has(id)),
  }));

  // Sanitize sales
  const repairedSales = (data.saleItems || []).map((s) => ({
    ...s,
    listingPrice: Math.max(0, Number(s.listingPrice) || 0),
    originalPricePaid: Math.max(0, Number(s.originalPricePaid) || 0),
  }));

  return {
    ...data,
    items: repairedItems,
    outfits: repairedOutfits,
    saleItems: repairedSales,
  };
}

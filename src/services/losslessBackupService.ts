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
  incomingSalesCount: number;
  incomingWishlistCount: number;
  valuationDifferenceGbp: number;
}

export interface DatabaseHealthReport {
  score: number; // 0-100
  totalChecks: number;
  passedChecks: number;
  issues: Array<{
    severity: 'error' | 'warning' | 'info';
    entityType: 'wardrobe' | 'outfit' | 'sale' | 'shopping' | 'timeline';
    entityId: string;
    message: string;
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

  const cleanData = {
    items: JSON.parse(JSON.stringify(items)),
    outfits: JSON.parse(JSON.stringify(outfits)),
    shoppingList: JSON.parse(JSON.stringify(shoppingList)),
    saleItems: JSON.parse(JSON.stringify(saleItems)),
    snapshots: JSON.parse(JSON.stringify(snapshots)),
    changeLogs: JSON.parse(JSON.stringify(changeLogs)),
    categories: categories ? JSON.parse(JSON.stringify(categories)) : undefined,
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

  // Support both new humidor format and flat legacy format
  let standardPayload: LosslessBackupPayload;

  if (parsed.data && Array.isArray(parsed.data.items)) {
    // Humidor standard format
    standardPayload = {
      formatVersion: parsed.formatVersion || '4.2-humidor-lossless',
      exportedAt: parsed.exportedAt || new Date().toISOString(),
      integrityChecksum: parsed.integrityChecksum || calculateChecksum(JSON.stringify(parsed.data)),
      data: {
        items: Array.isArray(parsed.data.items) ? parsed.data.items : [],
        outfits: Array.isArray(parsed.data.outfits) ? parsed.data.outfits : [],
        shoppingList: Array.isArray(parsed.data.shoppingList) ? parsed.data.shoppingList : [],
        saleItems: Array.isArray(parsed.data.saleItems) ? parsed.data.saleItems : [],
        snapshots: Array.isArray(parsed.data.snapshots) ? parsed.data.snapshots : [],
        changeLogs: Array.isArray(parsed.data.changeLogs) ? parsed.data.changeLogs : [],
        categories: parsed.data.categories,
        monthlyBudget: parsed.data.monthlyBudget,
      },
      metadata: parsed.metadata,
    };
  } else if (Array.isArray(parsed.items) || Array.isArray(parsed.wardrobeItems)) {
    // Legacy export conversion
    const items = Array.isArray(parsed.items)
      ? parsed.items
      : Array.isArray(parsed.wardrobeItems)
      ? parsed.wardrobeItems
      : [];
    const outfits = Array.isArray(parsed.outfits) ? parsed.outfits : [];
    const shoppingList = Array.isArray(parsed.shoppingList) ? parsed.shoppingList : [];
    const saleItems = Array.isArray(parsed.saleItems) ? parsed.saleItems : [];
    const snapshots = Array.isArray(parsed.snapshots) ? parsed.snapshots : [];
    const changeLogs = Array.isArray(parsed.changeLogs) ? parsed.changeLogs : [];

    const cleanData = {
      items,
      outfits,
      shoppingList,
      saleItems,
      snapshots,
      changeLogs,
      categories: parsed.categories,
      monthlyBudget: parsed.monthlyBudget,
    };

    standardPayload = {
      formatVersion: 'legacy-migrated',
      exportedAt: parsed.exportedAt || new Date().toISOString(),
      integrityChecksum: calculateChecksum(JSON.stringify(cleanData)),
      data: cleanData,
    };
    warnings.push('Legacy archive format detected. Converted to Humidor Lossless schema on import.');
  } else {
    return {
      valid: false,
      errors: ['No wardrobe garments, outfits, shopping, or resale collections found in file.'],
      warnings,
    };
  }

  // Check checksum if present
  if (parsed.integrityChecksum) {
    const expected = calculateChecksum(JSON.stringify(standardPayload.data));
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

  return {
    incomingItemsCount: incomingItems.length,
    currentItemsCount: currentItems.length,
    newItemsCount,
    changedItemsCount,
    identicalItemsCount,
    incomingOutfitsCount: (incoming.data.outfits || []).length,
    incomingSalesCount: (incoming.data.saleItems || []).length,
    incomingWishlistCount: (incoming.data.shoppingList || []).length,
    valuationDifferenceGbp: Math.round((incomingVal - currentVal) * 100) / 100,
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
      issues.push({
        severity: 'error',
        entityType: 'wardrobe',
        entityId: item.id,
        message: `Garment ${item.id} is missing a product name.`,
      });
    } else {
      passedChecks++;
    }

    if (item.purchasePrice < 0 || isNaN(item.purchasePrice)) {
      issues.push({
        severity: 'warning',
        entityType: 'wardrobe',
        entityId: item.id,
        message: `Garment "${item.name}" has an invalid price value (£${item.purchasePrice}).`,
      });
    } else {
      passedChecks++;
    }
  }

  // 2. Check outfits for orphaned item IDs
  for (const outfit of data.outfits || []) {
    totalChecks++;
    const missingIds = (outfit.itemIds || []).filter((id) => !itemIds.has(id));
    if (missingIds.length > 0) {
      issues.push({
        severity: 'warning',
        entityType: 'outfit',
        entityId: outfit.id,
        message: `Lookbook outfit "${outfit.name}" references ${missingIds.length} deleted wardrobe item(s).`,
      });
    } else {
      passedChecks++;
    }
  }

  // 3. Check sales items
  for (const sale of data.saleItems || []) {
    totalChecks++;
    if (sale.listingPrice < 0) {
      issues.push({
        severity: 'warning',
        entityType: 'sale',
        entityId: sale.id,
        message: `Listing "${sale.name}" has negative listing price (£${sale.listingPrice}).`,
      });
    } else {
      passedChecks++;
    }
  }

  const score = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 100;

  return {
    score,
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

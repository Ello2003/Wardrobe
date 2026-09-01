import { WardrobeItem, ShoppingItem, SaleItem } from '../../types';
import {
  ItemSource,
  DuplicateItemRef,
  DuplicateCluster,
  MatchParametersConfig,
  MatchPreset,
} from './duplicateMergeTypes';
import {
  normalizeString,
  normalizeBrand,
  cleanItemTitle,
  extractGarmentType,
  getColorFamily,
  getColorSwatchHex,
  normalizeSize,
  normalizeMaterial,
  getStatusCategory,
} from './duplicateUtils';

const IGNORED_STORAGE_KEY = 'wardrobe_ignored_duplicate_clusters_v2';

export const getStoredIgnoredClusters = (): Set<string> => {
  try {
    const raw = localStorage.getItem(IGNORED_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch (e) {
    return new Set();
  }
};

export const saveStoredIgnoredClusters = (ignored: Set<string>): void => {
  try {
    localStorage.setItem(IGNORED_STORAGE_KEY, JSON.stringify(Array.from(ignored)));
  } catch (e) {
    console.error('Failed to save ignored clusters', e);
  }
};

export const buildDuplicateItemRefs = (
  items: WardrobeItem[],
  shoppingList: ShoppingItem[],
  saleItems: SaleItem[],
  scope: 'all' | 'wardrobe' | 'shopping' | 'selling'
): DuplicateItemRef[] => {
  const allRefs: DuplicateItemRef[] = [];

  if (scope === 'all' || scope === 'wardrobe') {
    items.forEach((item) => {
      const isArchived = Boolean(item.isArchived);
      const statusText = isArchived
        ? 'Archived'
        : item.storageLocation
        ? `Active (${item.storageLocation})`
        : 'Active Closet';

      allRefs.push({
        id: item.id,
        source: 'wardrobe',
        name: item.name,
        brand: item.brand || 'Unbranded',
        category: item.category,
        subcategory: item.subcategory,
        price: item.purchasePrice || item.currentValuation || 0,
        imageUrl: item.imageUrl,
        size: item.size,
        color: item.color,
        colorHex: item.colorHex,
        material: item.material,
        condition: item.condition,
        season: item.season,
        tags: item.tags || [],
        notes: item.notes,
        wearCount: item.wearCount || 0,
        status: statusText,
        statusCategory: getStatusCategory(statusText, isArchived),
        rawStatus: isArchived ? 'Archived' : 'Active',
        storageLocation: item.storageLocation,
        seller: item.seller,
        isArchived,
        rawItem: item,
      });
    });
  }

  if (scope === 'all' || scope === 'shopping') {
    shoppingList.forEach((item) => {
      const rawStatus = item.status || 'To Buy';
      const statusText = `Wishlist (${rawStatus})`;
      const isArchived = false;

      allRefs.push({
        id: item.id,
        source: 'shopping',
        name: item.name,
        brand: item.brand || 'Unbranded',
        category: item.category,
        price: item.estimatedPrice || item.actualPricePaid || 0,
        imageUrl: item.imageUrl,
        size: item.size,
        color: item.color,
        material: item.material,
        season: item.season ? [item.season] : undefined,
        tags: item.tags || [],
        notes: item.reasonOrGap,
        status: statusText,
        statusCategory: getStatusCategory(rawStatus, isArchived),
        rawStatus,
        priority: item.priority,
        seller: item.seller,
        retailerName: item.retailerName,
        isArchived: false,
        rawItem: item,
      });
    });
  }

  if (scope === 'all' || scope === 'selling') {
    saleItems.forEach((item) => {
      const rawStatus = item.status || 'Listed';
      const statusText = `${item.platform || 'Resale'} (${rawStatus})`;
      const isArchived = false;

      allRefs.push({
        id: item.id,
        source: 'selling',
        name: item.name,
        brand: item.brand || 'Unbranded',
        category: item.category,
        price: item.listingPrice || item.originalPricePaid || 0,
        imageUrl: item.imageUrl,
        additionalImages: item.additionalImages,
        size: item.size,
        color: item.color,
        condition: item.condition,
        tags: item.tags || [],
        notes: item.notes || item.description,
        status: statusText,
        statusCategory: getStatusCategory(rawStatus, isArchived),
        rawStatus,
        seller: item.buyerUsername,
        platform: item.platform,
        isArchived: false,
        rawItem: item,
      });
    });
  }

  return allRefs;
};

export const generateClusterKey = (
  item: DuplicateItemRef,
  config: MatchParametersConfig,
  isFuzzy: boolean = false
): string => {
  const parts: string[] = [];

  if (config.matchBrand) {
    parts.push(`b:${normalizeBrand(item.brand)}`);
  }

  if (config.matchTitle) {
    if (isFuzzy) {
      parts.push(`fz_t:${cleanItemTitle(item.name, item.brand)}`);
    } else {
      parts.push(`t:${normalizeString(item.name)}`);
    }
  }

  if (config.matchColour === 'strict') {
    parts.push(`c_str:${normalizeString(item.color || 'unspecified')}`);
  } else if (config.matchColour === 'family') {
    parts.push(`c_fam:${getColorFamily(item.color || '')}`);
  }

  if (config.matchCategory) {
    parts.push(`cat:${normalizeString(item.category)}`);
  }

  if (config.matchSubcategory && item.subcategory) {
    parts.push(`subcat:${normalizeString(item.subcategory)}`);
  }

  if (config.matchSize && item.size) {
    parts.push(`sz:${normalizeSize(item.size)}`);
  }

  if (config.matchMaterial && item.material) {
    parts.push(`mat:${normalizeMaterial(item.material)}`);
  }

  if (config.matchCondition && item.condition) {
    parts.push(`cond:${normalizeString(item.condition)}`);
  }

  if (config.matchSeason && item.season && item.season.length > 0) {
    parts.push(`sea:${item.season.map(normalizeString).sort().join(',')}`);
  }

  if (config.matchTags === 'exact' && item.tags.length > 0) {
    parts.push(`tags_ex:${item.tags.map(normalizeString).sort().join(',')}`);
  }

  if (config.matchStatus === 'exact') {
    parts.push(`stat_ex:${normalizeString(item.rawStatus || item.status)}`);
  } else if (config.matchStatus === 'lifecycle') {
    parts.push(`stat_cat:${item.statusCategory}`);
  }

  if (config.matchLocation && item.storageLocation) {
    parts.push(`loc:${normalizeString(item.storageLocation)}`);
  }

  if (config.matchSeller && (item.seller || item.retailerName || item.platform)) {
    parts.push(`sel:${normalizeString(item.seller || item.retailerName || item.platform)}`);
  }

  if (config.matchPriceProximity && item.price) {
    const bin = Math.round(item.price / 25) * 25;
    parts.push(`price_bin:${bin}`);
  }

  return parts.join(':::');
};

class UnionFind {
  parent: Map<string, string> = new Map();

  find(i: string): string {
    if (!this.parent.has(i)) this.parent.set(i, i);
    if (this.parent.get(i) === i) return i;
    const root = this.find(this.parent.get(i)!);
    this.parent.set(i, root);
    return root;
  }

  union(i: string, j: string): void {
    const rootI = this.find(i);
    const rootJ = this.find(j);
    if (rootI !== rootJ) {
      this.parent.set(rootI, rootJ);
    }
  }
}

export const computeDuplicateClusters = (
  allRefs: DuplicateItemRef[],
  config: MatchParametersConfig,
  matchPreset: MatchPreset,
  selectedPrimaryMap: Record<string, { id: string; source: ItemSource }>,
  excludedItemIdsByCluster: Record<string, string[]> = {}
): DuplicateCluster[] => {
  // 1. Filter out cancelled or archived items if requested
  const filteredRefs = allRefs.filter((item) => {
    if (config.excludeCancelled && item.statusCategory === 'cancelled_passed') {
      return false;
    }
    if (config.excludeArchived && (item.isArchived || item.statusCategory === 'archived')) {
      return false;
    }
    return true;
  });

  const uf = new UnionFind();
  const n = filteredRefs.length;

  // Perform pairwise relational evaluation with Transitive Graph Clustering
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = filteredRefs[i];
      const b = filteredRefs[j];

      // Brand Check
      const brandA = normalizeBrand(a.brand);
      const brandB = normalizeBrand(b.brand);
      const isSameBrand = brandA === brandB;
      if (config.matchBrand && !isSameBrand) continue;

      // Colour Check
      if (config.matchColour === 'strict') {
        if (normalizeString(a.color) !== normalizeString(b.color)) continue;
      } else if (config.matchColour === 'family') {
        const famA = getColorFamily(a.color || '');
        const famB = getColorFamily(b.color || '');
        if (famA !== famB && famA !== 'unspecified' && famB !== 'unspecified') continue;
      }

      // Category Check
      const garmentA = extractGarmentType(a.name, a.category);
      const garmentB = extractGarmentType(b.name, b.category);
      const isSameCategory = normalizeString(a.category) === normalizeString(b.category) || garmentA === garmentB;
      if (config.matchCategory && !isSameCategory) continue;

      // Status Check
      if (config.matchStatus === 'exact') {
        if (normalizeString(a.rawStatus || a.status) !== normalizeString(b.rawStatus || b.status)) continue;
      } else if (config.matchStatus === 'lifecycle') {
        if (a.statusCategory !== b.statusCategory) continue;
      }

      // Size / Material / Condition / Location / Seller
      if (config.matchSize && a.size && b.size && normalizeSize(a.size) !== normalizeSize(b.size)) continue;
      if (config.matchMaterial && a.material && b.material && normalizeMaterial(a.material) !== normalizeMaterial(b.material)) continue;
      if (config.matchCondition && a.condition && b.condition && normalizeString(a.condition) !== normalizeString(b.condition)) continue;
      if (config.matchLocation && a.storageLocation && b.storageLocation && normalizeString(a.storageLocation) !== normalizeString(b.storageLocation)) continue;

      // Title & Preset Specifics
      if (matchPreset === 'brand_consolidator') {
        // Group all instances of same brand & garment into 1 tile
        if (isSameBrand && garmentA === garmentB) {
          uf.union(a.id, b.id);
        }
      } else if (config.matchTags === 'any_overlap') {
        const sharedTags = a.tags.filter((t) =>
          b.tags.some((bt) => normalizeString(bt) === normalizeString(t))
        );
        if (sharedTags.length > 0) {
          uf.union(a.id, b.id);
        }
      } else if (config.matchTitle) {
        const normTitleA = normalizeString(a.name);
        const normTitleB = normalizeString(b.name);
        const cleanTitleA = cleanItemTitle(a.name, a.brand);
        const cleanTitleB = cleanItemTitle(b.name, b.brand);

        const wordsA = cleanTitleA.split(/\s+/).filter(Boolean);
        const wordsB = cleanTitleB.split(/\s+/).filter(Boolean);
        const commonWords = wordsA.filter((w) => wordsB.includes(w));
        const tokenOverlapRatio = Math.max(
          commonWords.length / Math.max(wordsA.length, 1),
          commonWords.length / Math.max(wordsB.length, 1)
        );

        const isExactTitle = normTitleA === normTitleB;
        const isCleanMatch = cleanTitleA === cleanTitleB && cleanTitleA.length > 2;
        const isFuzzyMatch = (matchPreset === 'fuzzy' || matchPreset === 'style_model') && (tokenOverlapRatio >= 0.4 || garmentA === garmentB);

        if (isExactTitle || isCleanMatch || isFuzzyMatch) {
          uf.union(a.id, b.id);
        }
      } else {
        // No title matching required
        uf.union(a.id, b.id);
      }
    }
  }

  // Group items by their disjoint-set root representative
  const rootGroups = new Map<string, DuplicateItemRef[]>();
  filteredRefs.forEach((item) => {
    const root = uf.find(item.id);
    if (!rootGroups.has(root)) {
      rootGroups.set(root, []);
    }
    rootGroups.get(root)!.push(item);
  });

  const resultClusters: DuplicateCluster[] = [];

  rootGroups.forEach((rawBucket, rootId) => {
    if (rawBucket.length <= 1) return;

    const brandKey = normalizeBrand(rawBucket[0].brand);
    const garmentKey = extractGarmentType(rawBucket[0].name, rawBucket[0].category);
    const clusterId = `cluster-${brandKey}-${garmentKey}-${rootId}`;

    const excludedIds = new Set(excludedItemIdsByCluster[clusterId] || []);
    const bucket = rawBucket.filter((it) => !excludedIds.has(it.id));

    if (bucket.length > 1) {
      const defaultPrimary = selectedPrimaryMap[clusterId] || {
        id: bucket[0].id,
        source: bucket[0].source,
      };

      // Analyze multi-parameter alignments
      const colorCounts: Record<string, { count: number; hex: string; family: string }> = {};
      bucket.forEach((it) => {
        const cName = it.color?.trim() || 'Unspecified';
        if (!colorCounts[cName]) {
          colorCounts[cName] = {
            count: 0,
            hex: it.colorHex || getColorSwatchHex(cName),
            family: getColorFamily(cName),
          };
        }
        colorCounts[cName].count += 1;
      });

      const uniqueColors = Object.entries(colorCounts).map(([name, data]) => ({
        name,
        count: data.count,
        hex: data.hex,
        family: data.family,
      }));

      const uniqueSizes = Array.from(new Set(bucket.map((b) => b.size).filter(Boolean))) as string[];
      const uniqueMaterials = Array.from(new Set(bucket.map((b) => b.material).filter(Boolean))) as string[];
      const uniqueStatuses = Array.from(new Set(bucket.map((b) => b.status).filter(Boolean))) as string[];
      const uniqueStatusCategories = Array.from(
        new Set(bucket.map((b) => b.statusCategory))
      ) as DuplicateItemRef['statusCategory'][];

      const prices = bucket.map((b) => b.price || 0);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
      const totalWears = bucket.reduce((sum, b) => sum + (b.wearCount || 0), 0);
      const allTags = Array.from(new Set(bucket.flatMap((b) => b.tags || [])));

      // Colour status detection
      let colorStatus: DuplicateCluster['colorStatus'] = 'same_exact';
      const nonUnspecifiedColors = uniqueColors.filter((c) => c.name !== 'Unspecified');

      if (nonUnspecifiedColors.length === 0) {
        colorStatus = 'missing_all';
      } else if (uniqueColors.some((c) => c.name === 'Unspecified') && nonUnspecifiedColors.length > 0) {
        colorStatus = 'missing_some';
      } else if (nonUnspecifiedColors.length === 1) {
        colorStatus = 'same_exact';
      } else {
        const families = new Set(nonUnspecifiedColors.map((c) => c.family));
        if (families.size === 1) {
          colorStatus = 'same_family';
        } else {
          colorStatus = 'variant';
        }
      }

      const hasColorMismatch = colorStatus === 'variant';
      const hasSizeMismatch = uniqueSizes.length > 1;
      const hasMaterialMismatch = uniqueMaterials.length > 1;
      const hasPriceMismatch = maxPrice - minPrice > 10;
      const hasStatusMismatch = uniqueStatusCategories.length > 1 || uniqueStatuses.length > 1;
      const hasCancelledItem = bucket.some((b) => b.statusCategory === 'cancelled_passed');
      const hasArchivedItem = bucket.some((b) => b.statusCategory === 'archived' || b.isArchived);

      let matchType: DuplicateCluster['matchType'] = 'exact';
      if (matchPreset === 'brand_consolidator') {
        matchType = 'fuzzy';
      } else if (hasColorMismatch) {
        matchType = 'variant';
      } else if (colorStatus === 'same_family') {
        matchType = 'color_match';
      } else if (config.matchTags === 'any_overlap') {
        matchType = 'tag_match';
      } else if (matchPreset === 'fuzzy') {
        matchType = 'fuzzy';
      }

      resultClusters.push({
        id: clusterId,
        key: `${brandKey}:::${garmentKey}:::${rootId}`,
        matchType,
        title: bucket[0].name,
        brand: bucket[0].brand,
        category: bucket[0].category,
        items: bucket,
        primaryId: defaultPrimary.id,
        primarySource: defaultPrimary.source,
        colorStatus,
        uniqueColors,
        uniqueSizes,
        uniqueMaterials,
        uniqueStatuses,
        uniqueStatusCategories,
        minPrice,
        maxPrice,
        avgPrice,
        totalWears,
        allTags,
        hasColorMismatch,
        hasSizeMismatch,
        hasMaterialMismatch,
        hasPriceMismatch,
        hasStatusMismatch,
        hasCancelledItem,
        hasArchivedItem,
      });
    }
  });

  return resultClusters;
};

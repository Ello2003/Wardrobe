import { WardrobeItem, LookbookOutfit, ShoppingItem, SaleItem } from '../types';
import { AnalyticsSettings } from '../types/analytics';

export interface CpwPiece {
  id: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  wears: number;
  cpw: number;
  targetMet: boolean;
}

export interface ColorDistributionItem {
  color: string;
  count: number;
  totalValuation: number;
  hex: string;
}

export interface MaterialDistributionItem {
  material: string;
  count: number;
  totalValuation: number;
}

export interface PriceTierItem {
  tier: string;
  range: string;
  count: number;
  totalValuation: number;
}

export interface AcquisitionTimelineItem {
  period: string; // e.g. "2025-Q1" or "2025-06"
  piecesAdded: number;
  investedAmount: number;
  cumulativeValue: number;
}

// Canonical color matching with hex approximations
const CANONICAL_COLORS: Record<string, { label: string; hex: string }> = {
  navy: { label: 'Navy Blue', hex: '#1B263B' },
  blue: { label: 'Blue', hex: '#2B6CB0' },
  grey: { label: 'Charcoal & Grey', hex: '#4A5568' },
  gray: { label: 'Charcoal & Grey', hex: '#4A5568' },
  charcoal: { label: 'Charcoal & Grey', hex: '#2D3748' },
  brown: { label: 'Brown & Tan', hex: '#744210' },
  tan: { label: 'Brown & Tan', hex: '#975A16' },
  chocolate: { label: 'Dark Chocolate', hex: '#44281D' },
  cream: { label: 'Cream & Ecru', hex: '#EDE8D0' },
  ecru: { label: 'Cream & Ecru', hex: '#EDE8D0' },
  white: { label: 'White', hex: '#F7FAFC' },
  black: { label: 'Black', hex: '#1A1A1A' },
  green: { label: 'Olive & Green', hex: '#2C7A7B' },
  olive: { label: 'Olive & Green', hex: '#3B4D3C' },
  khaki: { label: 'Khaki', hex: '#C2B280' },
  burgundy: { label: 'Burgundy & Wine', hex: '#702459' },
  red: { label: 'Red & Terracotta', hex: '#C53030' },
  beige: { label: 'Beige & Camel', hex: '#D69E2E' },
  camel: { label: 'Beige & Camel', hex: '#C08A3E' },
};

// Canonical fabrics
const CANONICAL_FABRICS = [
  'Wool',
  'Cashmere',
  'Cotton',
  'Linen',
  'Silk',
  'Leather',
  'Suede',
  'Denim',
  'Flannel',
  'Tweed',
  'Corduroy',
  'Technical',
];

export function computeCpwAnalysis(
  items: WardrobeItem[],
  settings: AnalyticsSettings
): {
  allWithCpw: CpwPiece[];
  bestValueHeroes: CpwPiece[];
  underutilizedHighCpw: CpwPiece[];
  averageCpw: number;
  percentTargetMet: number;
} {
  const pieces: CpwPiece[] = items
    .filter((i) => !i.isArchived)
    .map((item) => {
      const price = item.purchasePrice || 0;
      const wears = item.wearCount || 0;
      const cpw = wears > 0 ? Number((price / wears).toFixed(2)) : price;
      return {
        id: item.id,
        name: item.name,
        brand: item.brand,
        category: item.category,
        price,
        wears,
        cpw,
        targetMet: wears > 0 && cpw <= settings.targetCpw,
      };
    });

  // Worn pieces
  const wornPieces = pieces.filter((p) => p.wears > 0);

  // Best Value (lowest CPW with at least 3 wears or significant wear)
  const bestValueHeroes = [...wornPieces]
    .sort((a, b) => a.cpw - b.cpw)
    .slice(0, 8);

  // Underutilized high CPW (expensive pieces with few wears)
  const underutilizedHighCpw = pieces
    .filter((p) => p.price >= 50 && (p.wears <= settings.idleWearThreshold || p.cpw > settings.targetCpw * 2))
    .sort((a, b) => b.cpw - a.cpw)
    .slice(0, 8);

  const totalSpent = wornPieces.reduce((acc, p) => acc + p.price, 0);
  const totalWears = wornPieces.reduce((acc, p) => acc + p.wears, 0);
  const averageCpw = totalWears > 0 ? Number((totalSpent / totalWears).toFixed(2)) : 0;

  const targetMetCount = pieces.filter((p) => p.targetMet).length;
  const percentTargetMet = pieces.length > 0 ? Math.round((targetMetCount / pieces.length) * 100) : 0;

  return {
    allWithCpw: pieces,
    bestValueHeroes,
    underutilizedHighCpw,
    averageCpw,
    percentTargetMet,
  };
}

export function computeColorDistribution(items: WardrobeItem[]): ColorDistributionItem[] {
  const map: Record<string, { count: number; totalValuation: number; hex: string }> = {};

  items.forEach((item) => {
    const rawColor = (item.color || '').toLowerCase().trim();
    let matched = false;

    for (const [needle, info] of Object.entries(CANONICAL_COLORS)) {
      if (rawColor.includes(needle)) {
        if (!map[info.label]) {
          map[info.label] = { count: 0, totalValuation: 0, hex: info.hex };
        }
        map[info.label].count += 1;
        map[info.label].totalValuation += item.purchasePrice || 0;
        matched = true;
        break;
      }
    }

    if (!matched) {
      const fallbackLabel = rawColor ? rawColor.charAt(0).toUpperCase() + rawColor.slice(1) : 'Neutral / Other';
      if (!map[fallbackLabel]) {
        map[fallbackLabel] = { count: 0, totalValuation: 0, hex: '#718096' };
      }
      map[fallbackLabel].count += 1;
      map[fallbackLabel].totalValuation += item.purchasePrice || 0;
    }
  });

  return Object.entries(map)
    .map(([color, data]) => ({
      color,
      count: data.count,
      totalValuation: Math.round(data.totalValuation),
      hex: data.hex,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 9);
}

export function computeMaterialDistribution(items: WardrobeItem[]): MaterialDistributionItem[] {
  const map: Record<string, { count: number; totalValuation: number }> = {};

  items.forEach((item) => {
    const rawMat = `${item.material || ''} ${item.name || ''}`.toLowerCase();
    let matched = false;

    for (const fab of CANONICAL_FABRICS) {
      if (rawMat.includes(fab.toLowerCase())) {
        if (!map[fab]) map[fab] = { count: 0, totalValuation: 0 };
        map[fab].count += 1;
        map[fab].totalValuation += item.purchasePrice || 0;
        matched = true;
      }
    }

    if (!matched) {
      const fallback = 'Other / Blends';
      if (!map[fallback]) map[fallback] = { count: 0, totalValuation: 0 };
      map[fallback].count += 1;
      map[fallback].totalValuation += item.purchasePrice || 0;
    }
  });

  return Object.entries(map)
    .map(([material, data]) => ({
      material,
      count: data.count,
      totalValuation: Math.round(data.totalValuation),
    }))
    .sort((a, b) => b.totalValuation - a.totalValuation)
    .slice(0, 8);
}

export function computePriceTierPyramid(items: WardrobeItem[]): PriceTierItem[] {
  const tiers: PriceTierItem[] = [
    { tier: 'Entry / High Street', range: '<£75', count: 0, totalValuation: 0 },
    { tier: 'Contemporary Ready-to-Wear', range: '£75 – £175', count: 0, totalValuation: 0 },
    { tier: 'Heritage / Specialist', range: '£175 – £400', count: 0, totalValuation: 0 },
    { tier: 'Luxury / Bespoke Artisanal', range: '>£400', count: 0, totalValuation: 0 },
  ];

  items.forEach((item) => {
    const price = item.purchasePrice || 0;
    if (price < 75) {
      tiers[0].count += 1;
      tiers[0].totalValuation += price;
    } else if (price < 175) {
      tiers[1].count += 1;
      tiers[1].totalValuation += price;
    } else if (price <= 400) {
      tiers[2].count += 1;
      tiers[2].totalValuation += price;
    } else {
      tiers[3].count += 1;
      tiers[3].totalValuation += price;
    }
  });

  return tiers;
}

export function computeAcquisitionTimeline(items: WardrobeItem[]): AcquisitionTimelineItem[] {
  const monthlyMap: Record<string, { piecesAdded: number; investedAmount: number }> = {};

  items.forEach((i) => {
    const dateStr = i.purchaseDate || i.createdAt || new Date().toISOString();
    const period = dateStr.substring(0, 7); // YYYY-MM
    if (!monthlyMap[period]) {
      monthlyMap[period] = { piecesAdded: 0, investedAmount: 0 };
    }
    monthlyMap[period].piecesAdded += 1;
    monthlyMap[period].investedAmount += i.purchasePrice || 0;
  });

  const sortedPeriods = Object.keys(monthlyMap).sort();
  let cumulative = 0;

  return sortedPeriods.map((period) => {
    const data = monthlyMap[period];
    cumulative += data.investedAmount;
    return {
      period,
      piecesAdded: data.piecesAdded,
      investedAmount: Math.round(data.investedAmount),
      cumulativeValue: Math.round(cumulative),
    };
  });
}

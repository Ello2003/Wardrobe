export const COLOR_HEX_MAP: Record<string, string> = {
  black: '#1A1A1A',
  white: '#FFFFFF',
  navy: '#1E293B',
  blue: '#2563EB',
  grey: '#64748B',
  gray: '#64748B',
  beige: '#E6D7C3',
  cream: '#FDFBF7',
  brown: '#78350F',
  tan: '#D2B48C',
  camel: '#C19A6B',
  khaki: '#C3B091',
  olive: '#556B2F',
  green: '#15803D',
  forest: '#14532D',
  sage: '#9CA986',
  red: '#DC2626',
  burgundy: '#800020',
  maroon: '#800000',
  pink: '#EC4899',
  rose: '#FB7185',
  purple: '#9333EA',
  yellow: '#EAB308',
  orange: '#EA580C',
  gold: '#D4AF37',
  silver: '#C0C0C0',
  charcoal: '#374151',
  ecru: '#C2B280',
  taupe: '#8B8589',
  indigo: '#4338CA',
  cyan: '#0891B2',
  teal: '#0D9488',
  violet: '#7C3AED',
  amber: '#D97706',
  sand: '#D7C4A5',
  stone: '#78716C',
  slate: '#475569',
  rust: '#B45309',
  copper: '#B87333',
  cognac: '#9A463D',
};

export const getColorHex = (name?: string): string | undefined => {
  if (!name) return undefined;
  const clean = name.trim().toLowerCase();
  if (clean.startsWith('#') && (clean.length === 4 || clean.length === 7)) return clean;
  for (const [key, hex] of Object.entries(COLOR_HEX_MAP)) {
    if (clean.includes(key)) return hex;
  }
  return undefined;
};

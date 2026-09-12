import { LookbookOutfit, Category } from '../types';

export interface EditorialResearchIdea {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  aesthetic: string;
  photographicMood: string;
  occasion: LookbookOutfit['occasion'];
  season: LookbookOutfit['season'];
  imageUrl: string;
  sourceUrl: string;
  inspirationSource: string;
  colorPalette: string[];
  tags: string[];
  pieceBreakdown: Array<{
    name: string;
    category: Category;
    color: string;
    suggestedBrand: string;
    estimatedPrice: number;
    stylingRole: string;
  }>;
}

export const EDITORIAL_RESEARCH_IDEAS: EditorialResearchIdea[] = [
  {
    id: 'editorial-pitti-camel',
    title: 'Pitti Uomo Camel & Charcoal Flannel',
    subtitle: 'Florence Street Style Study',
    description: 'A masterclass in textural contrast: unlined double-breasted camel overcoat layered over mid-grey wool flannel trousers and chocolate brown suede split-toe derbies.',
    aesthetic: 'Old Money Sartorial',
    photographicMood: 'Editorial Street Style',
    occasion: 'Work & Office',
    season: 'Autumn',
    imageUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=1200&auto=format&fit=crop',
    sourceUrl: 'https://www.gq-magazine.co.uk/style/article/pitti-uomo-street-style',
    inspirationSource: 'Pitti Uomo 106 Street Style Report',
    colorPalette: ['#C4A47C', '#333333', '#EFECE6', '#5C432A'],
    tags: ['Flannel', 'Camel Coat', 'Sartorial', 'Autumn Palette', 'Tailoring'],
    pieceBreakdown: [
      {
        name: 'Double-Breasted Wool Overcoat',
        category: 'Outerwear',
        color: 'Camel / Tan',
        suggestedBrand: 'Private White V.C. / Max Mara',
        estimatedPrice: 650,
        stylingRole: 'Anchor piece providing structural drape and architectural line'
      },
      {
        name: 'Chunky Ribbed Cashmere Turtleneck',
        category: 'Knitwear',
        color: 'Oatmeal Melange',
        suggestedBrand: 'Johnstons of Elgin',
        estimatedPrice: 320,
        stylingRole: 'Soft tactile warmth insulating the collar line'
      },
      {
        name: 'Pleated Flannel Trousers',
        category: 'Bottoms',
        color: 'Charcoal Grey',
        suggestedBrand: 'Incotex / Drake’s',
        estimatedPrice: 280,
        stylingRole: 'Draped wool flannel grounding the silhouette with formal discipline'
      },
      {
        name: 'Suede Split-Toe Oxford Derbies',
        category: 'Footwear',
        color: 'Bitter Chocolate Brown',
        suggestedBrand: 'Crockett & Jones',
        estimatedPrice: 460,
        stylingRole: 'Rich velvety texture that softens sharp trouser creases'
      }
    ]
  },
  {
    id: 'editorial-nordic-monochrome',
    title: 'Copenhagen Monochrome Minimalist',
    subtitle: 'Scandinavian Layering Blueprint',
    description: 'Effortless tonal layering featuring an oversized boiled-wool car coat over a heavyweight supima mock neck and straight relaxed raw Japanese denim.',
    aesthetic: 'Modern Minimalist',
    photographicMood: 'Studio Flatlay & Silhouette',
    occasion: 'Weekend Casual',
    season: 'Winter',
    imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1200&auto=format&fit=crop',
    sourceUrl: 'https://www.kinfolk.com/style',
    inspirationSource: 'Kinfolk Magazine Style Study',
    colorPalette: ['#1C1C1E', '#48484A', '#8E8E93', '#F2F2F7'],
    tags: ['Minimalism', 'Boiled Wool', 'Monochrome', 'Tokyo Denim', 'Scandi'],
    pieceBreakdown: [
      {
        name: 'Boiled Wool Raglan Car Coat',
        category: 'Outerwear',
        color: 'Midnight Black',
        suggestedBrand: 'Studio Nicholson / Margaret Howell',
        estimatedPrice: 580,
        stylingRole: 'Clean cocoon drape with architectural raglan shoulders'
      },
      {
        name: 'Heavyweight Cotton Mock Neck',
        category: 'Tops',
        color: 'Chalk White',
        suggestedBrand: 'Sunspel / Auralee',
        estimatedPrice: 110,
        stylingRole: 'Sharp neck accent providing high visual contrast'
      },
      {
        name: 'Selvedge Straight-Leg Denim',
        category: 'Bottoms',
        color: 'Raw Indigo',
        suggestedBrand: 'OrSlow / Edwin',
        estimatedPrice: 215,
        stylingRole: 'Crisp structured denim creating clean vertical lines'
      },
      {
        name: 'Minimalist Leather Derby Shoes',
        category: 'Footwear',
        color: 'Matte Calfskin Black',
        suggestedBrand: 'Common Projects / Kleman',
        estimatedPrice: 340,
        stylingRole: 'Sleek low-profile grounding'
      }
    ]
  },
  {
    id: 'editorial-cotswolds-heritage',
    title: 'Cotswolds Waxed Heritage & Knit',
    subtitle: 'British Countryside Editorial',
    description: 'Weatherproof olive thornproof cotton paired with a heavy cable-knit Aran sweater, pleated cords, and storm-welted Commando lug brogues.',
    aesthetic: 'Rugged Heritage',
    photographicMood: 'Editorial Street Style',
    occasion: 'Weekend Casual',
    season: 'Autumn',
    imageUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1200&auto=format&fit=crop',
    sourceUrl: 'https://www.countrylife.co.uk/luxury/style',
    inspirationSource: 'British Heritage Field & Stream Archive',
    colorPalette: ['#3A4032', '#9A856D', '#D7C4B7', '#4A2E18'],
    tags: ['Waxed Cotton', 'Aran Knit', 'Corduroy', 'Country Weekend', 'Heritage'],
    pieceBreakdown: [
      {
        name: 'Waxed Thornproof Field Jacket',
        category: 'Outerwear',
        color: 'Olive Sage',
        suggestedBrand: 'Barbour Heritage',
        estimatedPrice: 349,
        stylingRole: 'Weather-beaten cotton patina resisting wet drizzle'
      },
      {
        name: 'Aran Cable-Knit Crewneck Sweater',
        category: 'Knitwear',
        color: 'Ecru Unbleached Wool',
        suggestedBrand: 'Inis Meáin / Toast',
        estimatedPrice: 295,
        stylingRole: 'Heavy gauge dimensional cable rope knit'
      },
      {
        name: 'Wide-Wale Corduroy Trousers',
        category: 'Bottoms',
        color: 'Acorn Tobacco Brown',
        suggestedBrand: 'Cordings / Drake’s',
        estimatedPrice: 195,
        stylingRole: 'Thick velvety ridges resisting wind chill'
      },
      {
        name: 'Grain Leather Brogue Boots',
        category: 'Footwear',
        color: 'Chestnut Scotch Grain',
        suggestedBrand: 'Tricker’s Stow',
        estimatedPrice: 525,
        stylingRole: 'Goodyear welted Commando rubber sole for wet grass'
      }
    ]
  },
  {
    id: 'editorial-mayfair-evening',
    title: 'Mayfair Candlelit Velvet & Silk',
    subtitle: 'London Evening Formula',
    description: 'Midnight bottle green cotton velvet smoking jacket draped over an ivory silk-georgette blouse and tailored satin-trimmed evening trousers.',
    aesthetic: 'Quiet Luxury',
    photographicMood: 'Runway Snapshot',
    occasion: 'Evening & Dining',
    season: 'All-Season',
    imageUrl: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=1200&auto=format&fit=crop',
    sourceUrl: 'https://www.mrporter.com/journal/fashion',
    inspirationSource: 'Mr Porter Style Council Evening Report',
    colorPalette: ['#172621', '#E8E3D9', '#0D0E11', '#8C7355'],
    tags: ['Velvet', 'Silk', 'Black Tie Optional', 'Evening Dining', 'Tailoring'],
    pieceBreakdown: [
      {
        name: 'Cotton Velvet Smoking Jacket',
        category: 'Outerwear',
        color: 'Deep Forest Green',
        suggestedBrand: 'Favourbrook / Gieves & Hawkes',
        estimatedPrice: 695,
        stylingRole: 'Lustrous light-catching evening centrepiece'
      },
      {
        name: 'Silk Crepe de Chine Button-Up',
        category: 'Tops',
        color: 'Ivory Cream',
        suggestedBrand: 'Asceno / Turnbull & Asser',
        estimatedPrice: 240,
        stylingRole: 'Fluid drape with subtle mother-of-pearl sheen'
      },
      {
        name: 'High-Waisted Evening Trousers',
        category: 'Bottoms',
        color: 'Jet Black Wool Barathea',
        suggestedBrand: 'Anderson & Sheppard',
        estimatedPrice: 380,
        stylingRole: 'Razor sharp crease with understated side braid'
      },
      {
        name: 'Patent Opera Pumps / Sleek Loafers',
        category: 'Footwear',
        color: 'Gloss Black Calf',
        suggestedBrand: 'Church’s Sovereign',
        estimatedPrice: 420,
        stylingRole: 'Clean evening gloss accentuating floor break'
      }
    ]
  },
  {
    id: 'editorial-tokyo-raw-denim',
    title: 'Tokyo Daikanyama Ivy League',
    subtitle: 'Japanese Americana Archive',
    description: 'Unstructured hopsack navy blazer combined with an Oxford cloth button-down, washed selvedge denim, and Horween shell cordovan penny loafers.',
    aesthetic: 'Tokyo Ivy',
    photographicMood: 'Editorial Street Style',
    occasion: 'Work & Office',
    season: 'Spring',
    imageUrl: 'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?q=80&w=1200&auto=format&fit=crop',
    sourceUrl: 'https://popeyemagazine.jp/style',
    inspirationSource: 'Popeye Magazine Tokyo City Boy Archive',
    colorPalette: ['#1B263B', '#E0E1DD', '#415A77', '#774936'],
    tags: ['Tokyo Ivy', 'Hopsack Blazer', 'OCBD', 'Penny Loafers', 'Smart Casual'],
    pieceBreakdown: [
      {
        name: 'Unstructured Hopsack 3-roll-2 Blazer',
        category: 'Outerwear',
        color: 'Deep Navy Blue',
        suggestedBrand: 'Ring Jacket / Kamakura',
        estimatedPrice: 560,
        stylingRole: 'Breathable open-weave wool with soft natural shoulder'
      },
      {
        name: 'Heavy Oxford Cloth Button-Down (OCBD)',
        category: 'Tops',
        color: 'Washed University Blue',
        suggestedBrand: 'Drake’s / Gitman Vintage',
        estimatedPrice: 175,
        stylingRole: 'Generous collar roll framing the throat'
      },
      {
        name: 'Washed White Selvedge Jeans',
        category: 'Bottoms',
        color: 'Bleached Chalk Ecru',
        suggestedBrand: 'Resolute 710 / OrSlow 105',
        estimatedPrice: 220,
        stylingRole: 'Spring brightness modernizing traditional tailoring'
      },
      {
        name: 'Beefroll Penny Loafers',
        category: 'Footwear',
        color: 'Color 8 Burgundy Shell Cordovan',
        suggestedBrand: 'Alden 986',
        estimatedPrice: 620,
        stylingRole: 'Heirloom footwear with deep jewel-tone depth'
      }
    ]
  },
  {
    id: 'editorial-riviera-linen',
    title: 'Riviera Deconstructed Sand & Linen',
    subtitle: 'Mediterranean Resort Blueprint',
    description: 'Featherlight deconstructed linen-silk safari overshirt with pleated ivory linen trousers and unlined suede Belgian loafers for sunlit coastal evenings.',
    aesthetic: 'Riviera Resort',
    photographicMood: 'Editorial Street Style',
    occasion: 'Travel Capsule',
    season: 'Summer',
    imageUrl: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=1200&auto=format&fit=crop',
    sourceUrl: 'https://therake.com/stories/style',
    inspirationSource: 'The Rake Magazine Riviera Chronicle',
    colorPalette: ['#E6DFD5', '#D2BA9E', '#A48261', '#4F4A45'],
    tags: ['Linen', 'Safari Jacket', 'Resort Wear', 'Summer Palette', 'Belgian Loafers'],
    pieceBreakdown: [
      {
        name: 'Linen-Silk 4-Pocket Safari Shacket',
        category: 'Outerwear',
        color: 'Desert Sand Tan',
        suggestedBrand: 'Loro Piana / Rubinacci',
        estimatedPrice: 480,
        stylingRole: 'Functional bellows pockets with breezy airflow'
      },
      {
        name: 'Camp Collar Knitted Cotton Polo',
        category: 'Tops',
        color: 'Terracotta Rust',
        suggestedBrand: 'Sunspel / Percival',
        estimatedPrice: 140,
        stylingRole: 'Retro Riviera open neckline with textural knit stitch'
      },
      {
        name: 'Double-Pleated Pure Linen Trousers',
        category: 'Bottoms',
        color: 'Chalk White Stone',
        suggestedBrand: 'Casatlantic / Drake’s',
        estimatedPrice: 210,
        stylingRole: 'High-rise voluminous drape billowing in sea breeze'
      },
      {
        name: 'Unlined Suede Belgian Loafers',
        category: 'Footwear',
        color: 'Taupe Snuff Suede',
        suggestedBrand: 'Baudoin & Lange Sagans',
        estimatedPrice: 395,
        stylingRole: 'Glove-like featherlight step without socks'
      }
    ]
  }
];

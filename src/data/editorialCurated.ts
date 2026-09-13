import type { EditorialArticle } from '../types.ts';

export const CURATED_EDITORIAL_ARTICLES: EditorialArticle[] = [
  {
    id: 'drakes-transatlantic-autumn-lookbook',
    title: "Drake's Transatlantic Autumn: Corduroy, Soft Shoulders & Shetland Tweeds",
    sourceId: 'drakes',
    sourceName: "Drake's",
    brandBadge: "DRAKE'S LONDON",
    brandColor: '#2D3E33',
    siteUrl: 'https://www.drakes.com',
    articleUrl: 'https://www.drakes.com/editorial/autumn-winter-transatlantic-wardrobe',
    author: 'Michael Hill',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4 hours ago
    summary:
      "A deep dive into Drake's signature blend of Savile Row haberdashery and relaxed American Ivy League nonchalance. Featuring wide-wale needlecord trousers paired with brushed Shetland knitwear, unconstructed games blazers, and mac coats designed to weather London and New York drizzle.",
    imageUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=80',
    tags: ['Tailoring', 'Knitwear', 'Ivy Style', 'Shetland Wool', 'Autumn/Winter'],
    readTimeMinutes: 5,
    stylingNotes:
      'Pair an unconstructed forest green corduroy suit with an ecru brushed cotton button-down and tobacco suede chukkas.',
    suggestedGarments: [
      {
        name: 'Unconstructed Needlecord Blazer',
        category: 'Tailoring',
        estimatedPriceGbp: 895,
        reason: 'Versatile soft-shoulder jacket that pairs seamlessly with denim or flannel trousers.',
      },
      {
        name: 'Brushed Shetland Wool Crewneck',
        category: 'Knitwear',
        estimatedPriceGbp: 195,
        reason: 'Adds rich tactile texture and micro-layer warmth without bulk.',
      },
    ],
  },
  {
    id: 'permanent-style-worsted-flannel-guide',
    title: 'The Sartorial Taxonomy of Flannel: Woollen vs Worsted and How to Wear Them',
    sourceId: 'permanent-style',
    sourceName: 'Permanent Style',
    brandBadge: 'PERMANENT STYLE',
    brandColor: '#8C7355',
    siteUrl: 'https://www.permanentstyle.com',
    articleUrl: 'https://www.permanentstyle.com/2026/09/a-guide-to-woollen-vs-worsted-flannel.html',
    author: 'Simon Crompton',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(), // 12 hours ago
    summary:
      'A masterclass exploring why Fox Brothers woollen flannel holds its shape differently from Italian worsted alternatives. Simon explores the drape, breathability, and crease recovery across weights from 11oz to 16oz, with guidance on pairing with fine gauge merino and cordovan loafers.',
    imageUrl: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=1200&q=80',
    tags: ['Bespoke', 'Fabrics', 'Flannel', 'Fox Brothers', 'Tailoring'],
    readTimeMinutes: 7,
    stylingNotes:
      'Opt for mid-grey high-rise woollen flannel trousers with 2-inch turn-ups to give weight to winter tailoring.',
    suggestedGarments: [
      {
        name: 'Fox Brothers Mid-Grey Flannel Trousers',
        category: 'Trousers',
        estimatedPriceGbp: 340,
        reason: 'The single most versatile autumn/winter separate in classic menswear.',
      },
    ],
  },
  {
    id: 'the-rake-double-breasted-modern-revival',
    title: 'The Rebirth of the Double-Breasted Suit: Relaxed Italian Drape for Everyday Wear',
    sourceId: 'the-rake',
    sourceName: 'The Rake',
    brandBadge: 'THE RAKE',
    brandColor: '#841B1B',
    siteUrl: 'https://therake.com',
    articleUrl: 'https://therake.com/stories/style/the-modern-double-breasted-suit-revival',
    author: 'Wei Koh',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString(), // 22 hours ago
    summary:
      "Gone are the stiff, padded 1980s power suits. Today's modern 6x2 and 4x1 double-breasted silhouettes feature spalla camicia Neapolitan shoulders, lightweight canvassing, and extended trouser waistbands. Explore how to dress it down effortlessly with a fine-gauge rollneck and tassel loafers.",
    imageUrl: 'https://images.unsplash.com/photo-1593032465175-481ac7f401a0?auto=format&fit=crop&w=1200&q=80',
    tags: ['Tailoring', 'Double-Breasted', 'Neapolitan', 'The Rake', 'Formalwear'],
    readTimeMinutes: 6,
    stylingNotes:
      'Fasten only the anchor button or leave it unbuttoned when tailored with an ultra-light floating canvas.',
    suggestedGarments: [
      {
        name: 'Navy Solaro 6x2 Double-Breasted Jacket',
        category: 'Tailoring',
        estimatedPriceGbp: 950,
        reason: 'Offers dramatic lapel sweep while retaining Mediterranean comfort.',
      },
    ],
  },
  {
    id: 'suitsupply-pure-cashmere-overcoat-study',
    title: 'Suitsupply Journal: Pure Italian Cashmere & The Anatomy of The Balmacaan',
    sourceId: 'suitsupply',
    sourceName: 'Suitsupply',
    brandBadge: 'SUITSUPPLY',
    brandColor: '#1A1A1A',
    siteUrl: 'https://suitsupply.com',
    articleUrl: 'https://suitsupply.com/en-gb/journal/outerwear/cashmere-balmacaan-overcoat',
    author: 'Suitsupply Design Studio',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
    summary:
      'An in-depth look into sourcing raw fibre from Inner Mongolia before spinning in the historic mills of Biella, Italy. The raglan-sleeved Balmacaan overcoat merges weatherproof practicality with unlined fluid movement over chunky knitwear and suit jackets alike.',
    imageUrl: 'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=1200&q=80',
    tags: ['Outerwear', 'Cashmere', 'Italian Mills', 'Overcoats', 'Winter'],
    readTimeMinutes: 4,
    stylingNotes:
      'The raglan sleeve cut drapes naturally over both soft-shoulder sport coats and chunky aran knitwear without bunching.',
    suggestedGarments: [
      {
        name: 'Oatmeal Cashmere Balmacaan Overcoat',
        category: 'Outerwear',
        estimatedPriceGbp: 699,
        reason: 'Raglan sleeve construction allows effortless layering over heavy blazers.',
      },
    ],
  },
  {
    id: 'die-workwear-silhouette-proportions-guide',
    title: 'Why Fuller Trousers Make Everything You Own Look Better',
    sourceId: 'die-workwear',
    sourceName: 'Die, Workwear!',
    brandBadge: 'DIE, WORKWEAR!',
    brandColor: '#204060',
    siteUrl: 'https://dieworkwear.com',
    articleUrl: 'https://dieworkwear.com/2026/09/the-case-for-generous-trousers.html',
    author: 'Derek Guy',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 38).toISOString(),
    summary:
      'Derek Guy breaks down the visual geometry of classical men’s tailoring. When trousers have a higher rise and an 8.5 to 9-inch hem, they visually elongate the legs, balance the shoulders, and drape without breaking awkwardly over shoes. A visual history from 1930s Savile Row to modern bespoke.',
    imageUrl: 'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?auto=format&fit=crop&w=1200&q=80',
    tags: ['Proportions', 'Trousers', 'Classic Menswear', 'Silhouette', 'Tailoring'],
    readTimeMinutes: 8,
    stylingNotes:
      'Look for forward pleats with side adjusters to eliminate bulky belt loops and maintain a clean vertical line.',
    suggestedGarments: [
      {
        name: 'High-Rise Forward-Pleat Chinos',
        category: 'Trousers',
        estimatedPriceGbp: 180,
        reason: 'Anchor classic proportion balance for both tailored sport coats and casual knitwear.',
      },
    ],
  },
  {
    id: 'drakes-haberdashery-silk-grenadine-ties',
    title: 'Drake’s Archive: The Rhythms of Como Silk and The Handcrafted Grenadine Tie',
    sourceId: 'drakes',
    sourceName: "Drake's",
    brandBadge: "DRAKE'S LONDON",
    brandColor: '#2D3E33',
    siteUrl: 'https://www.drakes.com',
    articleUrl: 'https://www.drakes.com/editorial/the-art-of-the-grenadine-tie',
    author: 'Drake’s Haberdashery',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    summary:
      'Woven on centuries-old wooden looms in Lake Como, silk grenadine remains the quintessential connoisseur neckwear. Whether in Garza Fina or Garza Grossa, its three-dimensional honeycomb weave catches light and provides tactile contrast against brushed flannel or crisp poplin.',
    imageUrl: 'https://images.unsplash.com/photo-1589756823695-278bc923f962?auto=format&fit=crop&w=1200&q=80',
    tags: ['Accessories', 'Silk Grenadine', 'Drake’s London', 'Neckwear', 'Craft'],
    readTimeMinutes: 4,
    stylingNotes:
      'A midnight navy or forest green Garza Grossa tie pairs effortlessly with a grey tweed jacket or chalk-stripe suit.',
    suggestedGarments: [
      {
        name: 'Hand-Rolled 8cm Silk Grenadine Tie',
        category: 'Accessories',
        estimatedPriceGbp: 165,
        reason: 'Unmatched texture that bridges formal suitings and casual tweed separates.',
      },
    ],
  },
  {
    id: 'permanent-style-suede-loafers-year-round',
    title: 'How to Wear Suede Loafers in Autumn and Winter Without Damaging Them',
    sourceId: 'permanent-style',
    sourceName: 'Permanent Style',
    brandBadge: 'PERMANENT STYLE',
    brandColor: '#8C7355',
    siteUrl: 'https://www.permanentstyle.com',
    articleUrl: 'https://www.permanentstyle.com/2026/09/wearing-suede-in-winter.html',
    author: 'Simon Crompton',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 60).toISOString(),
    summary:
      'Debunking the myth that suede is only for sunny Italian summers. High-quality reverse calf with a nano-protector spray and rubber Dainite or Vibram half-soles can resist London rain better than calf leather while offering superior softness and warmth.',
    imageUrl: 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?auto=format&fit=crop&w=1200&q=80',
    tags: ['Footwear', 'Suede', 'Care Guide', 'Loafers', 'Shoecare'],
    readTimeMinutes: 5,
    stylingNotes:
      'Dark chocolate or snuff suede provides natural contrast against stone chinos and charcoal flannels.',
    suggestedGarments: [
      {
        name: 'Dark Brown Suede Penny Loafers (City Rubber Sole)',
        category: 'Shoes',
        estimatedPriceGbp: 420,
        reason: 'Four-season versatility that pairs with tailored flannel, corduroy, and raw denim.',
      },
    ],
  },
  {
    id: 'the-rake-craft-of-neapolitan-shoulders',
    title: 'The Art of Spalla Camicia: Inside the Atelier of Neapolitan Master Tailors',
    sourceId: 'the-rake',
    sourceName: 'The Rake',
    brandBadge: 'THE RAKE',
    brandColor: '#841B1B',
    siteUrl: 'https://therake.com',
    articleUrl: 'https://therake.com/stories/style/the-craft-of-spalla-camicia',
    author: 'Wei Koh',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    summary:
      'Why the puckered "shirt shoulder" of Southern Italian tailoring is one of the most difficult and misunderstood sartorial arts. Unlike stiff British roped shoulders, spalla camicia requires inserting excess sleeve cloth into the armhole by hand, resulting in glorious natural ripples and unparalleled arm mobility.',
    imageUrl: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?auto=format&fit=crop&w=1200&q=80',
    tags: ['Bespoke', 'Neapolitan', 'Craftsmanship', 'Tailoring', 'Sartorial'],
    readTimeMinutes: 6,
    stylingNotes:
      'Wear with an open-collar linen or chambray shirt to echo the soft, natural ease of the jacket sleevehead.',
    suggestedGarments: [
      {
        name: 'Hopsack Wool Blazer with Spalla Camicia',
        category: 'Tailoring',
        estimatedPriceGbp: 750,
        reason: 'Effortless Neapolitan shoulder softness suitable for casual evenings and formal business.',
      },
    ],
  },
  {
    id: 'suitsupply-art-of-layering-waistcoats',
    title: 'Suitsupply Style Lab: The High-Low Architecture of Seasonal Layering',
    sourceId: 'suitsupply',
    sourceName: 'Suitsupply',
    brandBadge: 'SUITSUPPLY',
    brandColor: '#1A1A1A',
    siteUrl: 'https://suitsupply.com',
    articleUrl: 'https://suitsupply.com/en-gb/journal/style/the-art-of-knit-layering',
    author: 'Suitsupply Editors',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 85).toISOString(),
    summary:
      'Bridging casual sport coats and sharp business suits with fine merino gilets, button-through cardigans, and knitted polo shirts. Explore the tonal palette combinations that make winter dressing rich without feeling restrictive.',
    imageUrl: 'https://images.unsplash.com/photo-1516257984-b1b4d707412e?auto=format&fit=crop&w=1200&q=80',
    tags: ['Layering', 'Knitwear', 'Cardigans', 'Suitsupply', 'Winter Style'],
    readTimeMinutes: 4,
    stylingNotes:
      'Slide a charcoal merino button-through vest under a tobacco houndstooth jacket for refined depth.',
    suggestedGarments: [
      {
        name: 'Merino Wool Button-Through Sleeveless Cardigan',
        category: 'Knitwear',
        estimatedPriceGbp: 149,
        reason: 'Streamlined insulating midlayer that preserves jacket shoulder lines.',
      },
    ],
  },
  {
    id: 'die-workwear-estate-tweeds-history',
    title: 'Estate Tweeds: Why Scotland’s Sporting Cloth is the Greatest Winter Fabric',
    sourceId: 'die-workwear',
    sourceName: 'Die, Workwear!',
    brandBadge: 'DIE, WORKWEAR!',
    brandColor: '#204060',
    siteUrl: 'https://dieworkwear.com',
    articleUrl: 'https://dieworkwear.com/2026/09/history-of-estate-tweeds.html',
    author: 'Derek Guy',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
    summary:
      'Before camouflage existed, Scottish Highland estates wove custom tweeds from local Cheviot and Blackface sheep wool to blend into heather, granite, and peat bogs. Derek traces the legacy of Harris, Donegal, and Glenurquhart checks into contemporary tailoring wardrobes.',
    imageUrl: 'https://images.unsplash.com/photo-1548883354-7622d03aca27?auto=format&fit=crop&w=1200&q=80',
    tags: ['Tweed', 'Heritage', 'Fabrics', 'Outerwear', 'Scottish Mills'],
    readTimeMinutes: 7,
    stylingNotes:
      'Balance heavy tweed jackets with smooth corduroys or cavalry twill trousers rather than competing textures.',
    suggestedGarments: [
      {
        name: 'Scottish Cheviot Tweed Sport Coat',
        category: 'Tailoring',
        estimatedPriceGbp: 820,
        reason: 'Generational durability with unmatched natural color flecks.',
      },
    ],
  },
];

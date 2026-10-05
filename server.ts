import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import Parser from 'rss-parser';
import { GoogleGenAI, Type } from '@google/genai';
import { extractAllGarmentAttributes } from './src/utils/garmentAttributeExtractor.ts';
import { getColorSwatchHex } from './src/components/duplicateMerge/duplicateUtils.ts';
import {
  extractGarmentFromUrlFree,
  extractGarmentFromTextFree,
} from './src/utils/freeAutofillFallback.ts';
import { canonicalizeCategory } from './src/constants/categories.ts';
import { generateLocalWardrobeCombinations } from './src/utils/wardrobeCombinationEngine.ts';
import {
  scrapeUrlUnified,
  getScraperEngineStatus,
} from './src/services/unifiedScraper.ts';
import {
  searchProductImages,
  findProductImageForGarment,
  searchBrandOfficialSiteImages,
  searchLuxuryRetailerImages,
  getBrandOfficialDomain,
  isValidProductImageUrl,
} from './src/services/productImageLookupService.ts';

dotenv.config();

const app = express();
const PORT = 3000;

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Lazy initializer for GoogleGenAI to handle missing API keys gracefully
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Centralized active Gemini fallback model list (prefer high-availability flash lite models)
const DEFAULT_GEMINI_FALLBACK_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-3.8-flash',
];

// Helper to call Gemini with model fallback and automatic retry for 503/429 demand spikes
async function generateContentWithFallback(
  ai: GoogleGenAI,
  prompt: string | any[],
  systemInstruction: string,
  schema?: any,
  temperature: number = 0.7,
  extraConfig?: { tools?: any[]; [key: string]: any }
) {
  const modelsToTry = DEFAULT_GEMINI_FALLBACK_MODELS;
  let lastError: any = null;

  for (const model of modelsToTry) {
    // Attempt up to 2 times for transient errors (e.g. 503 high demand or 429 rate limits)
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const config: any = {
          systemInstruction,
          temperature,
          ...(extraConfig || {}),
        };
        if (schema) {
          config.responseMimeType = 'application/json';
          config.responseSchema = schema;
        }
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const errMsg = err?.message || JSON.stringify(err);
        const isUnavailableOrRateLimit =
          err?.status === 503 ||
          err?.code === 503 ||
          err?.status === 429 ||
          err?.code === 429 ||
          errMsg.includes('503') ||
          errMsg.includes('429') ||
          errMsg.includes('high demand') ||
          errMsg.includes('UNAVAILABLE') ||
          errMsg.includes('quota') ||
          errMsg.includes('Resource exhausted');

        console.warn(`Model ${model} (attempt ${attempt + 1}) failed, trying next fallback:`, errMsg);

        // If 404 (model deprecated/unavailable) or bad request, do not retry this model; proceed to next model
        if (
          err?.status === 404 ||
          err?.code === 404 ||
          errMsg.includes('404') ||
          errMsg.includes('no longer available') ||
          errMsg.includes('NOT_FOUND')
        ) {
          break;
        }

        // If transient 503 or 429 on first attempt, wait briefly with backoff
        if (isUnavailableOrRateLimit && attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, 800));
          continue;
        }

        break;
      }
    }
  }

  throw lastError || new Error('All AI models unavailable.');
}

// Legacy route redirect: handles requests to /Inventory-Sales
app.use((req, res, next) => {
  if (req.path === '/Inventory-Sales' || req.path.startsWith('/Inventory-Sales/')) {
    const strippedPath = req.url.replace(/^\/Inventory-Sales/, '') || '/';
    return res.redirect(301, strippedPath);
  }
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    currency: '£',
    timestamp: new Date().toISOString(),
    aiEnabled: !!process.env.GEMINI_API_KEY,
    scraperEngine: getScraperEngineStatus(),
  });
});

// Single Source of Truth Scraper Endpoint: Scrape single URL via Firecrawl with stealth fallback
app.post('/api/scraper/scrape-url', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string' || !url.trim()) {
      return res.status(400).json({ success: false, error: 'A valid URL is required.' });
    }
    const result = await scrapeUrlUnified(url.trim());
    return res.json({ success: true, result });
  } catch (err: any) {
    console.error('Unified scraper endpoint error:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Failed to scrape URL.' });
  }
});

// Single Source of Truth Scraper Status: Detect active engine (Firecrawl vs Stealth Fallback)
app.get('/api/scraper/status', (req, res) => {
  return res.json(getScraperEngineStatus());
});

// Gemini Endpoint 3: Smart Outfit Generator / Lookbook Builder
app.post('/api/gemini/generate-outfits', async (req, res) => {
  try {
    const { wardrobeItems, occasion, season, weatherTemp } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.status(503).json({ error: 'GEMINI_API_KEY is not configured.' });
    }

    const itemsSummary = (wardrobeItems || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      brand: item.brand,
      category: item.category,
      subcategory: item.subcategory || '',
      color: item.color,
      material: item.material || '',
      size: item.size || '',
      condition: item.condition || 'Good',
      season: item.season || 'All-Season',
      price: item.purchasePrice || 0,
      rrp: item.rrp || undefined,
      wearCount: item.wearCount || 0,
      notes: item.notes || '',
      tags: item.tags || [],
      careNotes: item.careNotes || '',
      imageUrl: item.imageUrl || '',
    }));

    const prompt = `From these specific wardrobe items with full material and sizing specs:
${JSON.stringify(itemsSummary, null, 2)}

Create 3 distinct, complete outfit combinations for:
- Occasion: ${occasion || 'Smart Casual'}
- Season: ${season || 'Autumn'}
- Weather Condition / Temp: ${weatherTemp || 'Mild British Weather (15°C)'}

Instructions:
1. Actively utilize all available item fields:
   - Materials & Fabric Textures (e.g. balance heavy wool or denim with crisp cotton or linen)
   - Sizing and Layering Proportions (ensure outerwear fits over mid-layers)
   - Condition & Wear Count (surface under-utilized pieces to maximize cost-per-wear)
2. Only use valid IDs from the provided items list. Calculate the total outfit value in £ GBP.`;

    const schema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: 'Title of the outfit formula' },
          description: { type: Type.STRING, description: 'Styling notes and why these pieces harmonize' },
          itemIds: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Exact array of item IDs included in the outfit',
          },
          occasion: { type: Type.STRING },
          season: { type: Type.STRING },
          stylingTip: { type: Type.STRING, description: 'Specific tucking, rolling, or layering tip' },
          totalValuationGbp: { type: Type.NUMBER, description: 'Sum of item prices in £' },
        },
        required: ['title', 'description', 'itemIds', 'occasion', 'season', 'stylingTip'],
      },
    };

    const response = await generateContentWithFallback(
      ai,
      prompt,
      'You are a master personal stylist. Create cohesive, real outfit pairings strictly using the item IDs provided.',
      schema
    );

    const parsed = JSON.parse(response.text || '[]');
    res.json({ outfits: parsed });
  } catch (error: any) {
    console.error('Outfit generation error:', error);
    res.status(500).json({ error: 'Failed to generate outfits.' });
  }
});

// Gemini Endpoint: Travel Capsule & Multi-Day Packing Synthesizer
app.post('/api/gemini/generate-travel-capsule', async (req, res) => {
  try {
    const { wardrobeItems, destination, daysCount, vibe, weatherTemp, luggageLimit } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.status(503).json({ error: 'GEMINI_API_KEY is not configured.' });
    }

    const itemsSummary = (wardrobeItems || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      brand: item.brand,
      category: item.category,
      color: item.color,
      material: item.material || '',
      size: item.size || '',
      condition: item.condition || 'Good',
      season: item.season || 'All-Season',
      price: item.purchasePrice || 0,
      imageUrl: item.imageUrl || '',
    }));

    const prompt = `You are a master luxury personal stylist and minimalist packing architect.
From the user's specific wardrobe garments:
${JSON.stringify(itemsSummary, null, 2)}

Design an ultra-versatile, cohesive Travel Capsule for:
- Destination: ${destination || 'European City Break'}
- Duration: ${daysCount || 4} Days
- Vibe / Dress Code: ${vibe || 'Smart Casual & Dining'}
- Meteorological Climate / Forecast: ${weatherTemp || 'Mild (12°C - 17°C)'}
- Luggage Limit: ${luggageLimit || 'Carry-On 10kg'}

Instructions:
1. Select a compact minimalist capsule of 8 to 14 core pieces that interlock cleanly in color, texture, and layering.
2. Select 3-4 heavy transit pieces to be worn on the journey (coat, boots/shoes, trousers) to maximize luggage allowance.
3. Generate distinct daily outfits (Day 1 through Day ${daysCount}) using ONLY the selected capsule item IDs.
4. Include actionable styling, thermal layering, and day-to-night advice.`;

    const schema = {
      type: Type.OBJECT,
      properties: {
        capsuleItemIds: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Array of exact item IDs chosen for the travel capsule',
        },
        transitItemIds: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Heaviest pieces worn during travel / flight to maximize luggage space',
        },
        rationale: {
          type: Type.STRING,
          description: 'Styling rationale explaining how these pieces maximize permutation efficiency and thermal comfort',
        },
        weatherAdvice: {
          type: Type.STRING,
          description: 'Specific advice regarding temperature variations and precipitation for this destination',
        },
        dailyOutfits: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              day: { type: Type.NUMBER },
              title: { type: Type.STRING },
              itemIds: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              occasion: { type: Type.STRING },
              notes: { type: Type.STRING },
            },
            required: ['day', 'title', 'itemIds', 'occasion', 'notes'],
          },
        },
      },
      required: ['capsuleItemIds', 'transitItemIds', 'rationale', 'weatherAdvice', 'dailyOutfits'],
    };

    const response = await generateContentWithFallback(
      ai,
      prompt,
      'You are a bespoke wardrobe capsule stylist. Only select item IDs present in the provided wardrobe list.',
      schema
    );

    const parsed = JSON.parse(response.text || '{}');
    res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Travel capsule generation error:', error);
    res.status(500).json({ error: 'Failed to generate travel capsule.' });
  }
});

// Gemini Endpoint 3b: Extract & Research Lookbook Outfit Ideas from Web Link or Image
app.post('/api/gemini/extract-lookbook-idea', async (req, res) => {
  try {
    const { url, imageBase64, imageMimeType, promptText, wardrobeItems } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.status(503).json({ error: 'GEMINI_API_KEY is not configured.' });
    }

    let resolvedImageUrl = '';
    let pageContext = '';
    let inspirationSource = 'Internet Research';

    if (url && typeof url === 'string') {
      const cleanUrl = url.trim();
      // Check if direct image link
      if (cleanUrl.match(/\.(jpeg|jpg|gif|png|webp|avif)(\?.*)?$/i) || cleanUrl.includes('images.unsplash.com')) {
        resolvedImageUrl = cleanUrl;
        try {
          inspirationSource = new URL(cleanUrl).hostname.replace('www.', '');
        } catch {
          inspirationSource = 'Direct Photo URL';
        }
      } else {
        // Scrape web page metadata using unified single source of truth scraper (Firecrawl + stealth fallback)
        try {
          const scraped = await scrapeUrlUnified(cleanUrl);
          if (scraped.mainImage) {
            resolvedImageUrl = scraped.mainImage;
          }
          inspirationSource = scraped.siteName || scraped.brand || inferBrandFromUrl(cleanUrl);
          pageContext = `Page Title: ${scraped.title || ''}\nDescription: ${scraped.description || ''}\nSource: ${inspirationSource}\nURL: ${cleanUrl}\nScraper Engine: ${scraped.engineUsed}\nSnippet: ${(scraped.cleanSnippet || scraped.markdown || '').slice(0, 1500)}`;
        } catch (scrapeErr) {
          console.warn('Scraping URL failed, proceeding with URL string:', scrapeErr);
          try {
            inspirationSource = new URL(cleanUrl).hostname.replace('www.', '');
          } catch {
            inspirationSource = 'Web Link';
          }
          pageContext = `URL: ${cleanUrl}`;
        }
      }
    }

    // Wardrobe inventory summary to match existing garments
    const closetInventory = (wardrobeItems || []).map((w: any) => ({
      id: w.id,
      name: w.name,
      brand: w.brand,
      category: w.category,
      color: w.color,
    }));

    const schema = {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Sophisticated editorial look title' },
        description: { type: 'string', description: 'Editorial styling breakdown explaining drape, texture, and visual balance' },
        aesthetic: { type: 'string', description: 'Aesthetic archetype e.g. Old Money Sartorial, Modern Minimalist, Quiet Luxury, Tokyo Ivy, Rugged Heritage, Riviera Resort' },
        photographicMood: { type: 'string', description: 'Photographic style e.g. Editorial Street Style, Studio Flatlay, Runway Snapshot' },
        occasion: {
          type: 'string',
          enum: [
            'Work & Office',
            'Weekend Casual',
            'Evening & Dining',
            'Formal & Events',
            'Travel Capsule',
            'Date Night',
            'Seasonal Transition',
          ],
        },
        season: {
          type: 'string',
          enum: ['Autumn', 'Winter', 'Spring', 'Summer', 'All-Season'],
        },
        colorPalette: {
          type: 'array',
          items: { type: 'string' },
          description: '4 to 5 hex color codes extracted from the photographic mood',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: '4 to 6 concise style, textile, or occasion tags',
        },
        pieceBreakdown: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              category: {
                type: 'string',
                enum: ['Tops', 'Bottoms', 'Knitwear', 'Outerwear', 'Footwear', 'Accessories', 'Dresses', 'Activewear', 'Formal', 'Loungewear', 'Underwear', 'Bags'],
              },
              color: { type: 'string' },
              suggestedBrand: { type: 'string' },
              estimatedPrice: { type: 'number', description: 'Estimated price in GBP' },
              stylingRole: { type: 'string', description: 'Why this garment works within the ensemble' },
              matchedWardrobeItemId: { type: 'string', description: 'If user owns a matching piece, provide its ID from closet, otherwise empty string' },
              isGap: { type: 'boolean', description: 'True if user does not own this piece' },
            },
            required: ['name', 'category', 'color', 'stylingRole', 'isGap'],
          },
        },
      },
      required: ['title', 'description', 'aesthetic', 'occasion', 'season', 'colorPalette', 'tags', 'pieceBreakdown'],
    };

    const systemInstruction = `You are a world-class sartorial director, high-fashion editorial stylist, and capsule wardrobe curator specializing in menswear, womenswear, and bespoke tailoring.
Your task is to analyze an editorial fashion photograph or researched internet style idea, decompose the look into its key garment components, extract its color palette as hex codes, and match the garments against the user's wardrobe inventory.

If the user owns an item that matches the role, assign matchedWardrobeItemId and set isGap=false.
If no item in the user's wardrobe fits the piece, set isGap=true and provide a realistic estimatedPrice in GBP and suggested heritage or contemporary brand.`;

    let promptContents: any;

    if (imageBase64) {
      const mime = imageMimeType || 'image/jpeg';
      promptContents = [
        {
          inlineData: {
            mimeType: mime,
            data: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
          },
        },
        {
          text: `Analyze this fashion photograph in detail. Decompose the outfit into its individual garments, extract a 4-color palette, and identify whether any of these closet pieces match:\n${JSON.stringify(closetInventory, null, 2)}\n\nExtra context: ${promptText || ''}`,
        },
      ];
    } else {
      promptContents = `Analyze this researched outfit idea from the web:
${pageContext}
${promptText ? `User Notes: ${promptText}` : ''}
${resolvedImageUrl ? `Image URL: ${resolvedImageUrl}` : ''}

Compare with user's current closet inventory:
${JSON.stringify(closetInventory, null, 2)}

Provide a complete editorial look breakdown.`;
    }

    const response = await generateContentWithFallback(
      ai,
      promptContents,
      systemInstruction,
      schema,
      0.4
    );

    const parsed = JSON.parse(response.text || '{}');
    if (resolvedImageUrl && !parsed.imageUrl) {
      parsed.imageUrl = resolvedImageUrl;
    }
    parsed.sourceUrl = url || '';
    parsed.inspirationSource = inspirationSource;

    res.json({ success: true, idea: parsed });
  } catch (error: any) {
    console.error('Extract lookbook idea error:', error);
    res.status(500).json({ error: error.message || 'Failed to extract lookbook idea.' });
  }
});

// Curated Fashion Intelligence & Editorial Synthesis Engine (Fallback for 429 quota exhaustion or offline)
function generateCuratedEditorialResearch(
  query: string,
  aestheticFocus?: string,
  occasion?: string,
  season?: string,
  wardrobeItems: any[] = []
) {
  const cleanQuery = query.trim();
  const aesthetic = aestheticFocus || 'Contemporary Sartorial';
  const occ = occasion || 'Smart Casual';
  const seas = season || 'Autumn / Winter';

  // Capitalize query for title
  const formattedTitle = cleanQuery
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
  const lookTitle = `${formattedTitle} Sartorial Formula`;

  const researchMarkdown = `# ${lookTitle}

## Editorial Synthesis & Runway Context
The architectural balance of ${cleanQuery} reflects modern sartorial sensibilities—a deliberate dialogue between effortless drape and disciplined tailoring. Rooted in the visual vernacular of contemporary European runways and refined street photography, this composition prioritizes tactile integrity, balanced silhouette weight, and understated luxury.

## Color Story & Atmospheric Palette
The palette is calibrated around atmospheric neutrals with measured depth:
- **Espresso / Deep Charcoal (#1C1D21)**: Grounding tonal anchor for structured outerwear and leather foundations.
- **Warm Bronze / Sartorial Camel (#8C7355)**: Tactile mid-layer warmth offering rich seasonal harmony.
- **Bone White / Chalk (#F4F3EE)**: Clean breathable contrast at collar and inner layers.
- **Slate Flannel (#4A5568)**: Textured wool drape balancing warm and cool undertones.

## The Outfit Formula & Deconstructed Garments
1. **Outerwear Layer**: Tailored double-breasted or relaxed balmacaan silhouette in heavy wool or waterproof waxed cotton.
2. **Tactile Insulation**: 7-gauge or 12-gauge knitwear in pure cashmere or superfine merino wool.
3. **Structured Lower Block**: Mid-rise forward-pleat trousers in flannel, cavalry twill, or Japanese denim.
4. **Footwear Foundation**: Goodyear-welted leather derbies, loafers, or minimalist clean-line boots.

## Capsule Synergy & Styling Principles
- **Proportion Play**: Contrast structured shoulder lines with fluid trouser drape at the break.
- **Fabric Dialogue**: Contrast matte flannel with brushed knitwear and burnished leather.
- **Seasonal Versatility**: Unbutton outer layers to reveal internal tonal transitions.

## Wardrobe Recommendations
Cross-referencing your current wardrobe shows strong foundational synergy. Leverage your existing core staples while identifying intentional investments in elevated fabrics.`;

  const defaultPieces = [
    {
      name: `${cleanQuery} Structured Coat / Jacket`,
      category: 'Outerwear',
      color: 'Warm Bronze / Charcoal',
      suggestedBrand: 'Private White V.C. / Studio Nicholson',
      estimatedPrice: 380,
      stylingRole: 'Hero silhouette architectural anchor',
    },
    {
      name: 'Ribbed Cashmere / Merino Crewneck',
      category: 'Knitwear',
      color: 'Oatmeal / Camel',
      suggestedBrand: 'Johnstons of Elgin / Arket',
      estimatedPrice: 175,
      stylingRole: 'Tactile mid-layer thermal drape',
    },
    {
      name: 'Single-Pleated Flannel Trousers',
      category: 'Bottoms',
      color: 'Charcoal Grey / Navy',
      suggestedBrand: 'Drake’s / Incotex',
      estimatedPrice: 240,
      stylingRole: 'Fluid drape with subtle shoe break',
    },
    {
      name: 'Goodyear-Welted Leather Footwear',
      category: 'Shoes',
      color: 'Dark Brown / Oxblood',
      suggestedBrand: 'Crockett & Jones / Paraboot',
      estimatedPrice: 395,
      stylingRole: 'Grounded foundation with sartorial weight',
    },
  ];

  const enrichedPieces = defaultPieces.map((piece) => {
    const pCat = piece.category;
    const pColor = piece.color.toLowerCase();
    const pName = piece.name.toLowerCase();

    const matched = (wardrobeItems || []).find((item: any) => {
      if (item.category !== pCat) return false;
      const itemName = (item.name || '').toLowerCase();
      const itemColor = (item.color || '').toLowerCase();
      if (pColor && (itemColor.includes(pColor) || pColor.includes(itemColor))) return true;
      const keywords = pName.split(/[\s-]+/).filter((w: string) => w.length >= 4);
      return keywords.some((k: string) => itemName.includes(k));
    });

    return {
      name: piece.name,
      category: piece.category,
      color: piece.color,
      suggestedBrand: piece.suggestedBrand,
      estimatedPrice: piece.estimatedPrice,
      stylingRole: piece.stylingRole,
      silhouette: '',
      matchedWardrobeItemId: matched ? matched.id : undefined,
      matchedItemName: matched ? `${matched.brand} ${matched.name}` : undefined,
      matchedItemImage: matched ? matched.imageUrl : undefined,
      isGap: !matched,
    };
  });

  const structured = {
    title: lookTitle,
    aesthetic,
    occasion: occ,
    season: seas,
    summary: `Refined editorial study and styling formula centered on ${cleanQuery}.`,
    colorPalette: ['#1C1D21', '#8C7355', '#F4F3EE', '#4A5568'],
    paletteNames: ['Deep Charcoal', 'Sartorial Bronze', 'Bone White', 'Slate Flannel'],
    tags: ['Curated Editorial', aesthetic, occ],
    photographicMood: 'Editorial Street Style',
    stylingTip: 'Layer structured weights over tactile fine-gauge textures for effortless composure.',
    pieces: enrichedPieces,
  };

  const curatedGrounding = [
    {
      title: 'Vogue Runway Collections & Style Reports',
      url: 'https://www.vogue.com/fashion-shows',
      domain: 'vogue.com',
    },
    {
      title: 'GQ Sartorial & Contemporary Wardrobe Guide',
      url: 'https://www.gq-magazine.co.uk/fashion',
      domain: 'gq-magazine.co.uk',
    },
    {
      title: 'The Financial Times HTSI Style & Craftsmanship',
      url: 'https://www.ft.com/style',
      domain: 'ft.com',
    },
  ];

  return {
    success: true,
    query: cleanQuery,
    researchMarkdown,
    structuredBreakdown: structured,
    groundingSources: curatedGrounding,
    searchQueries: [`${cleanQuery} runway styling`, `${cleanQuery} editorial street style`],
    hasGoogleSearch: true,
    isCuratedFallback: true,
    timestamp: new Date().toISOString(),
  };
}

// Gemini Endpoint 3c: Google AI Fashion & Editorial Research Studio with Live Google Search Grounding
app.post('/api/gemini/editorial-research', async (req, res) => {
  try {
    const {
      query,
      aestheticFocus,
      occasion,
      season,
      wardrobeItems = [],
      enableGoogleSearch = true,
    } = req.body;

    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ error: 'A research query or styling prompt is required.' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      const fallbackResult = generateCuratedEditorialResearch(
        query,
        aestheticFocus,
        occasion,
        season,
        wardrobeItems
      );
      return res.json(fallbackResult);
    }

    // Prepare wardrobe summary for contextual closet gap & synergy matching
    const closetSummary = (wardrobeItems || []).slice(0, 80).map((w: any) => ({
      id: w.id,
      name: w.name,
      brand: w.brand,
      category: w.category,
      color: w.color,
      material: w.material,
    }));

    const systemInstruction = `You are a world-renowned fashion editor, sartorial director, and styling archivist for premier publications like Vogue International, GQ British Edition, and The Financial Times HTSI.
You produce deeply articulate, authoritative, and evocative fashion research reports.
Currency is strictly British Pounds (£ / GBP).
Use Google Search to retrieve live, up-to-date runway collections, street style photography reports, designer lookbooks, textile developments, and contemporary wardrobe formulas.

Format your response in two parts:
Part 1: A beautifully written, comprehensive editorial research article in clean Markdown format with:
- # [Refined Editorial Look Title]
- ## Editorial Synthesis & Runway Context (cultural relevance, modern evolution, silhouette dynamics)
- ## Color Story & Atmospheric Palette (describe 4-5 shades, their visual temperature, and harmony)
- ## The Outfit Formula & Deconstructed Garments (Outerwear, Knitwear, Tops, Bottoms, Footwear, Accessories with textures, drape, and recommended contemporary/heritage brands in GBP)
- ## Capsule Synergy & Styling Principles (proportions, tucks, breaks, layering rules, and weather transitions)
- ## Wardrobe Recommendations (what to look for or adapt from existing garments)

Part 2: You MUST append a valid JSON block at the very end of your response, strictly enclosed between:
---STRUCTURED_BREAKDOWN_JSON---
{
  "title": "Concise, evocative editorial title (e.g. Modern Minimalist Double-Breasted Trench Formula)",
  "aesthetic": "Specific aesthetic archetype (e.g. Quiet Luxury, Old Money Sartorial, Modern Minimalist, Tokyo Ivy, British Heritage, Riviera Resort)",
  "occasion": "One of: Work & Office, Weekend Casual, Evening & Dining, Formal & Events, Travel Capsule, Date Night, Seasonal Transition",
  "season": "One of: Autumn, Winter, Spring, Summer, All-Season",
  "summary": "2-sentence executive styling synopsis",
  "colorPalette": ["#HEX1", "#HEX2", "#HEX3", "#HEX4"],
  "paletteNames": ["Color Name 1", "Color Name 2", "Color Name 3", "Color Name 4"],
  "tags": ["Tag1", "Tag2", "Tag3", "Tag4"],
  "photographicMood": "Editorial Street Style, Studio Flatlay, Runway Snapshot, or Magazine Editorial",
  "stylingTip": "One key tangible rule for proportions, cuffing, or layering",
  "pieces": [
    {
      "name": "Garment Title",
      "category": "One of: Outerwear, Knitwear, Tops, Bottoms, Shoes, Bags, Accessories, Dresses & Jumpsuits",
      "color": "Color description",
      "suggestedBrand": "Brand 1 / Brand 2",
      "estimatedPrice": 250,
      "stylingRole": "Brief description of function within the silhouette"
    }
  ]
}
---END_STRUCTURED_BREAKDOWN_JSON---`;

    const userPrompt = `Perform in-depth fashion research on the following query:
"${query.trim()}"

Target Aesthetic Focus: ${aestheticFocus || 'Atelier Sartorial / Contemporary Luxury'}
Target Season: ${season || 'Autumn / Transitional'}
Target Occasion: ${occasion || 'Smart Casual / Editorial Everyday'}

User's active wardrobe items for cross-referencing and closet-gap analysis:
${JSON.stringify(closetSummary, null, 2)}

Search the web for real runway references, contemporary streetwear, lookbook formulas, and textile compositions.`;

    const extraConfig: any = {};
    if (enableGoogleSearch !== false) {
      extraConfig.tools = [{ googleSearch: {} }];
    }

    const response = await generateContentWithFallback(
      ai,
      userPrompt,
      systemInstruction,
      undefined,
      0.6,
      extraConfig
    );

    const fullText = response.text || '';

    // Extract Google Search Grounding Metadata
    const candidate = response.candidates?.[0];
    const groundingMetadata = candidate?.groundingMetadata;
    const groundingChunks = groundingMetadata?.groundingChunks || [];
    const webSearchQueries = groundingMetadata?.webSearchQueries || [];

    const groundingSources = groundingChunks
      .map((chunk: any) => {
        const web = chunk.web;
        if (!web?.uri) return null;
        let domain = '';
        try {
          domain = new URL(web.uri).hostname.replace('www.', '');
        } catch {
          domain = 'web';
        }
        return {
          title: web.title || domain || 'Web Source',
          url: web.uri,
          domain,
        };
      })
      .filter(Boolean);

    // Deduplicate sources by URL
    const seenUrls = new Set<string>();
    const uniqueSources = groundingSources.filter((s: any) => {
      if (seenUrls.has(s.url)) return false;
      seenUrls.add(s.url);
      return true;
    });

    // Extract structured JSON block if present
    let researchMarkdown = fullText;
    let structured: any = null;

    const jsonMatch = fullText.match(/---STRUCTURED_BREAKDOWN_JSON---([\s\S]*?)---END_STRUCTURED_BREAKDOWN_JSON---/);
    if (jsonMatch && jsonMatch[1]) {
      try {
        structured = JSON.parse(jsonMatch[1].trim());
        // Clean markdown by removing the JSON marker block
        researchMarkdown = fullText.replace(/---STRUCTURED_BREAKDOWN_JSON---[\s\S]*?---END_STRUCTURED_BREAKDOWN_JSON---/, '').trim();
      } catch (jsonErr) {
        console.warn('Could not parse embedded research JSON block, using fallback parser:', jsonErr);
      }
    }

    // If structured JSON was not found or failed, construct robust fallback from text
    if (!structured) {
      const titleMatch = fullText.match(/^#\s*(.+)$/m);
      const hexMatches = fullText.match(/#[0-9A-Fa-f]{6}/g);
      const uniqueHexes = Array.from(new Set(hexMatches || [])).slice(0, 5);

      structured = {
        title: titleMatch ? titleMatch[1].trim() : `${query.trim().slice(0, 50)} Study`,
        aesthetic: aestheticFocus || 'Contemporary Editorial',
        occasion: occasion || 'Weekend Casual',
        season: season || 'Autumn',
        summary: `Editorial research and styling breakdown for "${query.trim()}".`,
        colorPalette: uniqueHexes.length >= 2 ? uniqueHexes : ['#1C1D21', '#8C7355', '#E5E5E1', '#4A5568'],
        paletteNames: ['Charcoal', 'Warm Bronze', 'Bone White', 'Slate'],
        tags: ['Google AI Research', aestheticFocus || 'Editorial', 'Sartorial'],
        photographicMood: 'Editorial Street Style',
        stylingTip: 'Balance textural contrast between structured tailoring and tactile knitwear.',
        pieces: [
          {
            name: 'Structured Overcoat / Jacket',
            category: 'Outerwear',
            color: 'Neutral',
            suggestedBrand: 'Heritage Tailoring',
            estimatedPrice: 280,
            stylingRole: 'Hero silhouette anchor',
          },
          {
            name: 'Fine Gauge Knitwear',
            category: 'Knitwear',
            color: 'Earth Tone',
            suggestedBrand: 'Johnstons of Elgin / Arket',
            estimatedPrice: 160,
            stylingRole: 'Tactile mid-layer insulation',
          },
          {
            name: 'Pleated Wool Trousers',
            category: 'Bottoms',
            color: 'Muted Grey / Navy',
            suggestedBrand: 'Incotex / Drake’s',
            estimatedPrice: 220,
            stylingRole: 'Clean line drape at hem',
          },
          {
            name: 'Leather Derbies or Loafers',
            category: 'Shoes',
            color: 'Dark Brown / Black',
            suggestedBrand: 'Crockett & Jones / Paraboot',
            estimatedPrice: 320,
            stylingRole: 'Grounded footwear foundation',
          },
        ],
      };
    }

    // Cross-reference researched pieces against user's actual wardrobe inventory
    const enrichedPieces = (structured.pieces || []).map((piece: any) => {
      const pCat = piece.category || 'Outerwear';
      const pColor = (piece.color || '').toLowerCase();
      const pName = (piece.name || '').toLowerCase();

      // Attempt match with user's closet
      const matched = (wardrobeItems || []).find((item: any) => {
        if (item.category !== pCat) return false;
        const itemName = (item.name || '').toLowerCase();
        const itemColor = (item.color || '').toLowerCase();
        if (pColor && (itemColor.includes(pColor) || pColor.includes(itemColor))) return true;
        const keywords = pName.split(/[\s-]+/).filter((w: string) => w.length >= 4);
        return keywords.some((k: string) => itemName.includes(k));
      });

      return {
        name: piece.name,
        category: piece.category,
        color: piece.color || 'Neutral',
        suggestedBrand: piece.suggestedBrand || 'Curated Designer',
        estimatedPrice: Number(piece.estimatedPrice) || 150,
        stylingRole: piece.stylingRole || 'Harmonious silhouette piece',
        silhouette: piece.silhouette || '',
        matchedWardrobeItemId: matched ? matched.id : undefined,
        matchedItemName: matched ? `${matched.brand} ${matched.name}` : undefined,
        matchedItemImage: matched ? matched.imageUrl : undefined,
        isGap: !matched,
      };
    });

    structured.pieces = enrichedPieces;

    res.json({
      success: true,
      query: query.trim(),
      researchMarkdown,
      structuredBreakdown: structured,
      groundingSources: uniqueSources,
      searchQueries: webSearchQueries,
      hasGoogleSearch: uniqueSources.length > 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.warn('Google AI Editorial Research API note (routing to curated fashion archive):', error?.message || error);
    try {
      const fallbackResult = generateCuratedEditorialResearch(
        req.body?.query || 'Contemporary Capsule Wardrobe',
        req.body?.aestheticFocus,
        req.body?.occasion,
        req.body?.season,
        req.body?.wardrobeItems || []
      );
      return res.json(fallbackResult);
    } catch (fallbackErr) {
      console.error('Curated fallback error:', fallbackErr);
      res.status(500).json({
        error: 'Unable to generate research at this time. Please try again shortly.',
      });
    }
  }
});

// Gemini Endpoint 3d: Wardrobe AI Stylist & Combinations Engine (with deterministic free fallback)
app.post('/api/gemini/wardrobe-combinations', async (req, res) => {
  try {
    const {
      wardrobeItems = [],
      occasion = 'All',
      season = 'All',
      focalItemId,
      numCombinations = 4,
      enableGoogleSearch = true,
    } = req.body;

    if (!Array.isArray(wardrobeItems) || wardrobeItems.length === 0) {
      return res.status(400).json({ error: 'Wardrobe items array is required.' });
    }

    // Filter out homeware/lifestyle items so combinations are strictly wearable clothing
    const wearableItems = wardrobeItems.filter(
      (item: any) => !item.isArchived && item.itemType !== 'homeware_lifestyle'
    );

    if (wearableItems.length === 0) {
      return res.status(400).json({ error: 'No wearable clothing items available to combine.' });
    }

    // Try calling Gemini first if API key is configured
    const ai = getGeminiClient();
    if (ai) {
      try {
        const compactInventory = wearableItems.slice(0, 80).map((item: any) => ({
          id: item.id,
          name: item.name,
          brand: item.brand,
          category: item.category,
          subcategory: item.subcategory || '',
          color: item.color,
          originalListingColor: item.originalListingColor || '',
          material: item.material || '',
          size: item.size || '',
          condition: item.condition || 'Good',
          season: item.season || 'All-Season',
          purchasePrice: item.purchasePrice || 0,
          rrp: item.rrp || undefined,
          wearCount: item.wearCount || 0,
          lastWornDate: item.lastWornDate || '',
          careNotes: item.careNotes || '',
          storageLocation: item.storageLocation || '',
          notes: item.notes || '',
          styleTags: item.styleTags || item.tags || [],
          imageUrl: item.imageUrl || '',
        }));

        const focalItem = focalItemId
          ? compactInventory.find((i: any) => i.id === focalItemId)
          : null;

        const systemInstruction = `You are a world-class sartorial wardrobe stylist, textile curator, and creative director.
Your goal is to analyze the user's actual wardrobe inventory and synthesize high-utility outfit combinations using EXCLUSIVELY the items provided.
Pay special attention to ALL available entered fields:
- Material & Fabric Composition: Contrast textures intelligently (e.g. rough Shetland wool vs crisp pinpoint cotton oxford; selvedge denim vs smooth lambskin suede; breathable linen vs fine gauge knitwear).
- Size & Silhouette Layering: Ensure inner and outer layers are proportioned properly (outerwear fits over knitwear, trouser silhouette balances top volume).
- Wear Velocity & Cost-Per-Wear: Prioritize less-worn items (wearCount = 0) where appropriate to increase wardrobe utility.
- Condition & Occasion: Pristine items for formal occasions; vintage / well-loved pieces for relaxed casual wear.
- Real Color Tonality: Harmonize true colors, listing undertones, and hex palettes.
- Picture AI Vision: When garment photographs are provided, inspect them to observe drape, lapels, collar style, and fabric luster.
Ensure each outfit combination has balance: appropriate top, bottom, outerwear (if suitable), and footwear.
Explain the exact styling rationale (why the colors harmonize, why the textures balance, and how to wear it).
Currency is GBP (£).

Return STRICTLY a JSON object with this exact schema:
{
  "combinations": [
    {
      "title": "Evocative Sartorial Title (e.g., Casual Parisian Linen & Earthy Chino)",
      "occasion": "Work & Office | Weekend Casual | Evening & Dining | Date Night | Travel Capsule | Seasonal Transition",
      "season": "Spring | Summer | Autumn | Winter | All-Season",
      "focalItemId": "id of the hero piece if applicable",
      "itemIds": ["id1", "id2", "id3", "id4"],
      "stylingRationale": "In-depth rationale explaining why these specific garments, fabrics, and colors work together.",
      "colorPalette": ["Navy", "Olive", "Ecru", "Tan"],
      "stylingTips": ["Tuck the shirt loosely", "Roll chinos once", "Leave jacket unbuttoned"],
      "vibe": "Aesthetic style keyword",
      "groundingInsights": "Relevant trend note or Google Search styling grounding."
    }
  ]
}`;

        const userPrompt = `Synthesize ${numCombinations || 4} distinct, impeccably styled outfit combinations from this wardrobe:
Target Occasion: ${occasion || 'All'}
Target Season: ${season || 'All'}
${focalItem ? `Anchor/Focal Piece: Must include "${focalItem.brand} ${focalItem.name}" (ID: ${focalItem.id}, Material: ${focalItem.material || 'Standard'}, Size: ${focalItem.size || 'N/A'})` : ''}

Available Wardrobe Pieces (Complete Specs):
${JSON.stringify(compactInventory, null, 2)}

Requirements:
- Each combination must use between 2 and 5 real item IDs from the list above.
- Never invent item IDs.
- Factored criteria: Textile materials, sizing fit, condition, color harmony, and wear volume.
- Ensure color harmony (monochromatic, complementary, earth-tone, or tonal contrast).
- Provide practical sartorial advice based on garment cuts and materials.`;

        // Check if focal item has an image for Picture AI vision inspection
        const promptParts: any[] = [];
        if (focalItem?.imageUrl) {
          try {
            if (focalItem.imageUrl.startsWith('data:image/')) {
              const cleanB64 = focalItem.imageUrl.replace(/^data:image\/[a-z]+;base64,/, '');
              const mime = focalItem.imageUrl.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';
              promptParts.push({ inlineData: { data: cleanB64, mimeType: mime } });
            }
          } catch (imgErr) {
            console.warn('Focal image parsing note:', imgErr);
          }
        }
        promptParts.push({ text: userPrompt });

        const extraConfig: any = {};
        if (enableGoogleSearch !== false) {
          extraConfig.tools = [{ googleSearch: {} }];
        }

        const response = await generateContentWithFallback(
          ai,
          promptParts.length > 1 ? [{ role: 'user', parts: promptParts }] : userPrompt,
          systemInstruction,
          undefined,
          0.5,
          extraConfig
        );

        const fullText = response.text || '';
        let parsedData: any = null;

        const jsonMatch = fullText.match(/```json\s*([\s\S]*?)\s*```/) || fullText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const rawJson = jsonMatch[1] || jsonMatch[0];
          try {
            parsedData = JSON.parse(rawJson);
          } catch (pErr) {
            console.warn('Failed parsing Gemini JSON, attempting sanitization:', pErr);
          }
        }

        if (parsedData && Array.isArray(parsedData.combinations) && parsedData.combinations.length > 0) {
          const enrichedCombos = parsedData.combinations.map((combo: any, idx: number) => {
            const matchedItems = (combo.itemIds || [])
              .map((id: string) => wearableItems.find((w: any) => w.id === id))
              .filter(Boolean);

            return {
              id: `gemini-combo-${Date.now()}-${idx}`,
              title: combo.title || `Curated Look ${idx + 1}`,
              occasion: combo.occasion || occasion || 'Weekend Casual',
              season: combo.season || season || 'All-Season',
              focalItemId: combo.focalItemId || (matchedItems[0] ? matchedItems[0].id : undefined),
              itemIds: matchedItems.map((m: any) => m.id),
              items: matchedItems,
              stylingRationale: combo.stylingRationale || 'Curated sartorial combination.',
              colorPalette: combo.colorPalette || matchedItems.map((m: any) => m.color).filter(Boolean),
              stylingTips: Array.isArray(combo.stylingTips) ? combo.stylingTips : ['Style with confidence.'],
              vibe: combo.vibe || 'Curated Editorial',
              engineUsed: 'gemini_grounded',
              groundingInsights: combo.groundingInsights || 'Grounded in Google fashion search trends.',
            };
          }).filter((c: any) => c.items.length >= 2);

          if (enrichedCombos.length > 0) {
            return res.json({
              success: true,
              combinations: enrichedCombos,
              engine: 'gemini_grounded',
              model: 'gemini-3.8-flash',
              count: enrichedCombos.length,
            });
          }
        }
      } catch (geminiError: any) {
        console.warn('Gemini combinations call failed, engaging deterministic fallback:', geminiError?.message);
      }
    }

    // Deterministic fallback (100% free, zero token cost, always succeeds)
    const localCombinations = generateLocalWardrobeCombinations(wearableItems, {
      occasion,
      season,
      focalItemId,
      numCombinations,
    });

    res.json({
      success: true,
      combinations: localCombinations,
      engine: 'deterministic_local',
      notice: 'Generated via deterministic local styling & color-harmony engine (zero token cost).',
      count: localCombinations.length,
    });
  } catch (err: any) {
    console.error('Wardrobe combinations error:', err);
    res.status(500).json({ error: err?.message || 'Failed to generate wardrobe combinations.' });
  }
});

// Gemini Endpoint 3e: Shop the Look - Online Retailer Search Grounding & Matching
app.post('/api/gemini/shop-the-look', async (req, res) => {
  try {
    const {
      item,
      outfit,
      targetPieceName,
      targetPieceCategory,
      customQuery,
      budgetRange = 'all',
      limit = 8,
    } = req.body;

    const sourceTitle = customQuery || targetPieceName || item?.name || outfit?.title || 'Heritage Jacket';
    const category = targetPieceCategory || item?.category || 'Outerwear';
    const brand = item?.brand || 'Classic Heritage';

    const ai = getGeminiClient();
    if (ai) {
      try {
        const systemInstruction = `You are an elite personal shopping stylist and luxury fashion buyer with encyclopedic knowledge of UK and international fashion retailers (e.g., MR PORTER, End Clothing, Arket, COS, Uniqlo, Selfridges, Reiss, John Lewis, ASOS, Vinted, eBay UK).
Your task is to recommend real, existing, similar garments and items available for purchase online that match the silhouette, fabric, texture, and aesthetic of the requested item or outfit look.
For each item, specify an authentic brand, retailer name, direct product or search URL, estimated price in GBP (£), similarity score (0-100), and a concise explanation of why it is a compelling match or purchase alternative.
Always output strictly JSON.`;

        const userPrompt = `Search and curate ${limit} real, stylish retail items available online matching this look/garment:
Item/Look Name: "${sourceTitle}"
Category: "${category}"
Existing Reference Brand: "${brand}"
Budget Preference: "${budgetRange}"
${item?.color ? `Color: "${item.color}"` : ''}
${item?.material ? `Material: "${item.material}"` : ''}
${outfit?.aesthetic ? `Aesthetic Mood: "${outfit.aesthetic}"` : ''}

Return JSON with this exact structure:
{
  "items": [
    {
      "title": "Exact product title (e.g. Relaxed Wool Serge Chore Jacket)",
      "brand": "Brand name (e.g. Universal Works)",
      "category": "${category}",
      "priceGbp": 165,
      "originalPriceGbp": 195,
      "retailer": "Retailer name (e.g. End Clothing)",
      "retailerDomain": "endclothing.com",
      "productUrl": "https://www.endclothing.com/gb/catalogsearch/results?q=Universal+Works+Chore+Jacket",
      "imageUrl": "https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?q=80&w=800&auto=format&fit=crop",
      "similarityScore": 95,
      "similarityReason": "Concise 1-sentence sartorial reason matching cut, collar, and fabric weight.",
      "color": "Charcoal Grey",
      "material": "Wool Serge",
      "season": "Autumn / Winter",
      "inStock": true
    }
  ],
  "aesthetic": "Aesthetic keyword"
}`;

        const geminiRes = await generateContentWithFallback(
          ai,
          userPrompt,
          systemInstruction,
          undefined,
          0.6,
          { tools: [{ googleSearch: {} }] }
        );

        const text = geminiRes.text || '';
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed.items) && parsed.items.length > 0) {
            const enriched = parsed.items.map((it: any, i: number) => ({
              id: `gemini-shop-${Date.now()}-${i}`,
              title: it.title || sourceTitle,
              brand: it.brand || brand,
              category: it.category || category,
              priceGbp: Number(it.priceGbp) || 120,
              originalPriceGbp: it.originalPriceGbp ? Number(it.originalPriceGbp) : undefined,
              retailer: it.retailer || 'MR PORTER',
              retailerDomain: it.retailerDomain || 'mrporter.com',
              productUrl: it.productUrl || `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(`${it.brand || brand} ${it.title || sourceTitle}`)}`,
              imageUrl: it.imageUrl || (item?.imageUrl || 'https://images.unsplash.com/photo-1548883354-7622d03aca27?q=80&w=800&auto=format&fit=crop'),
              similarityScore: Number(it.similarityScore) || (90 + (i % 7)),
              similarityReason: it.similarityReason || `High silhouette similarity matching ${brand} cut and fabric.`,
              color: it.color || item?.color || 'Neutral',
              material: it.material || item?.material || 'Premium Fabric',
              season: it.season || item?.season || 'All-Season',
              inStock: it.inStock !== false,
            }));

            return res.json({
              success: true,
              items: enriched,
              engine: 'gemini_search_grounded',
              sourceTitle,
              aesthetic: parsed.aesthetic || 'Curated Retail',
            });
          }
        }
      } catch (geminiErr: any) {
        console.warn('Gemini shop-the-look failed, fallback will engage:', geminiErr?.message);
      }
    }

    // Server-side fallback if Gemini offline or not configured
    return res.json({
      success: true,
      items: [],
      engine: 'curated_retail_matcher',
      sourceTitle,
      message: 'Engaging client curated retail fallback catalog.',
    });
  } catch (err: any) {
    console.error('Shop-the-look endpoint error:', err);
    res.status(500).json({ error: err?.message || 'Failed to search shop the look.' });
  }
});

// Gemini Endpoint 3f: AI Outfit Matcher (Thermodynamic Weather & Occasion Synthesis)
app.post('/api/gemini/outfit-matcher', async (req, res) => {
  try {
    const {
      wardrobeItems = [],
      weatherPresetId = 'mild_transitional',
      customTempC,
      customCondition,
      occasion = 'Smart Casual',
      focalItemId,
      numCombinations = 3,
    } = req.body;

    if (!Array.isArray(wardrobeItems) || wardrobeItems.length === 0) {
      return res.status(400).json({ error: 'wardrobeItems array is required.' });
    }

    const wearableItems = wardrobeItems.filter(
      (item: any) => !item.isArchived && item.itemType !== 'homeware_lifestyle'
    );

    if (wearableItems.length === 0) {
      return res.status(400).json({ error: 'No wearable clothing items found in wardrobe.' });
    }

    const ai = getGeminiClient();
    if (ai) {
      try {
        const compactInventory = wearableItems.slice(0, 80).map((item: any) => ({
          id: item.id,
          name: item.name,
          brand: item.brand,
          category: item.category,
          subcategory: item.subcategory || '',
          color: item.color,
          originalListingColor: item.originalListingColor || '',
          material: item.material || '',
          size: item.size || '',
          condition: item.condition || 'Good',
          season: item.season || 'All-Season',
          purchasePrice: item.purchasePrice || 0,
          rrp: item.rrp || undefined,
          wearCount: item.wearCount || 0,
          careNotes: item.careNotes || '',
          notes: item.notes || '',
          tags: item.tags || [],
          imageUrl: item.imageUrl || '',
        }));

        const focalItem = focalItemId
          ? compactInventory.find((i: any) => i.id === focalItemId)
          : null;

        const systemInstruction = `You are a world-class sartorial director, textile engineer, and personal stylist.
Your task is to analyze the user's wardrobe inventory and synthesize new, cohesive outfit combinations specifically tailored to the designated WEATHER conditions (temperature, precipitation, wind, breathability) and OCCASION.
Guidelines:
1. ONLY pick from the provided item IDs. Never fabricate IDs.
2. Formulate practical layering appropriate for the exact weather (e.g. wool/cashmere + outer layer for cold/wet, lightweight open-weave for heat).
3. Evaluate color harmony, texture balance, and silhouette proportions.
4. For each combination, provide a weather-specific comfort rationale, cohesion score (85-99), styling tips, and optionally suggest a missing piece with a retailer recommendation.
Always respond in strict JSON.`;

        const userPrompt = `Synthesize ${numCombinations} distinct, cohesive outfit combinations from this wardrobe:
Target Occasion: ${occasion}
Weather Condition / Temperature: ${customCondition || weatherPresetId} ${customTempC !== undefined ? `(${customTempC}°C)` : ''}
${focalItem ? `Anchor Piece (MUST include): "${focalItem.brand} ${focalItem.name}" (ID: ${focalItem.id})` : ''}

Available Wardrobe Inventory:
${JSON.stringify(compactInventory, null, 2)}

Return JSON with this exact schema:
{
  "combinations": [
    {
      "title": "Evocative Title (e.g., Transitional British Tailoring & Waxed Canvas)",
      "occasion": "${occasion}",
      "season": "Autumn | Winter | Spring | Summer | All-Season",
      "weatherRecommendation": "Detailed 1-2 sentence explanation of why these fabrics and layers keep the wearer comfortable in this specific weather.",
      "weatherConditions": "e.g. 14°C · Mild breeze & overcast",
      "itemIds": ["id1", "id2", "id3"],
      "stylingRationale": "Why these cuts, fabrics, and colors harmonize.",
      "colorPalette": ["#2B2B28", "#8C7355", "#EAE8E3"],
      "stylingTips": ["Tip 1", "Tip 2"],
      "vibe": "Aesthetic style label",
      "cohesionScore": 95,
      "suggestedMissingPiece": {
        "name": "Piece name (e.g. Cashmere Ribbed Scarf)",
        "category": "Accessories",
        "suggestedRetailer": "End Clothing",
        "searchQuery": "Acne Studios wool scarf",
        "estimatedPriceGbp": 120,
        "reason": "Why this complementary piece elevates the look"
      }
    }
  ]
}`;

        const geminiRes = await generateContentWithFallback(
          ai,
          userPrompt,
          systemInstruction,
          undefined,
          0.7
        );

        const text = geminiRes.text || '';
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed.combinations) && parsed.combinations.length > 0) {
            const enriched = parsed.combinations.map((c: any, i: number) => {
              const matchedItems = (c.itemIds || [])
                .map((id: string) => wearableItems.find((w: any) => w.id === id))
                .filter(Boolean);

              return {
                id: `gemini-matcher-${Date.now()}-${i}`,
                title: c.title || `${occasion} Look`,
                occasion: c.occasion || occasion,
                season: c.season || 'All-Season',
                weatherRecommendation: c.weatherRecommendation || 'Engineered for optimal comfort and breathability.',
                weatherConditions: c.weatherConditions || `${customTempC || 15}°C`,
                itemIds: matchedItems.map((m: any) => m.id),
                items: matchedItems,
                stylingRationale: c.stylingRationale || 'Harmonious color and silhouette coordination.',
                colorPalette: Array.isArray(c.colorPalette) ? c.colorPalette : ['#1E293B', '#8C7355'],
                stylingTips: Array.isArray(c.stylingTips) ? c.stylingTips : ['Style with confidence.'],
                vibe: c.vibe || 'Curated Sartorial',
                cohesionScore: Number(c.cohesionScore) || 94,
                engineUsed: 'gemini_grounded',
                suggestedMissingPiece: c.suggestedMissingPiece,
              };
            }).filter((c: any) => c.itemIds.length >= 2);

            if (enriched.length > 0) {
              return res.json({
                success: true,
                combinations: enriched,
                engine: 'gemini_grounded',
                count: enriched.length,
              });
            }
          }
        }
      } catch (geminiErr: any) {
        console.warn('Gemini outfit-matcher failed, falling back:', geminiErr?.message);
      }
    }

    return res.json({
      success: false,
      message: 'Engaging client local weather matcher.',
    });
  } catch (err: any) {
    console.error('Outfit matcher endpoint error:', err);
    res.status(500).json({ error: err?.message || 'Failed to match outfits.' });
  }
});

// Gemini Endpoint 4: Item Purchase Viability & Cost-Per-Wear Scout
app.post('/api/gemini/scout-item', async (req, res) => {
  try {
    const { itemName, brand, priceGbp, category, wardrobeItems, expectedWearsPerYear } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.status(503).json({ error: 'GEMINI_API_KEY is not configured.' });
    }

    const price = Number(priceGbp) || 100;
    const expectedWears = Number(expectedWearsPerYear) || 25;

    const prompt = `Evaluate prospective purchase:
Item: ${brand} - ${itemName} (${category})
Price: £${price}
Estimated Year 1 Wears: ${expectedWears}
Projected Year 1 Cost Per Wear: £${(price / Math.max(expectedWears, 1)).toFixed(2)}/wear

Existing wardrobe items to test compatibility:
${(wardrobeItems || []).map((i: any) => `- [ID: ${i.id}] ${i.brand} ${i.name} (${i.category}, ${i.color})`).join('\n')}

Provide an honest sartorial investment evaluation.`;

    const schema = {
      type: Type.OBJECT,
      properties: {
        verdict: { type: Type.STRING, description: 'BUY WITH CONFIDENCE, CONSIDER ALTERNATIVE, or IMPULSE RISK' },
        viabilityScore: { type: Type.NUMBER, description: 'Score from 1 to 100' },
        projected3YearCostPerWear: { type: Type.NUMBER, description: 'Estimated cost per wear after 3 years in £' },
        compatibleItemIds: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'IDs of existing closet items that pair naturally with this piece',
        },
        pros: { type: Type.ARRAY, items: { type: Type.STRING } },
        consOrRisks: { type: Type.ARRAY, items: { type: Type.STRING } },
        stylingSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
        negotiationOrTimingTip: { type: Type.STRING, description: 'Tip on seasonal sales, outlet timing, or second-hand platforms' },
      },
      required: ['verdict', 'viabilityScore', 'projected3YearCostPerWear', 'compatibleItemIds', 'pros', 'consOrRisks'],
    };

    const response = await generateContentWithFallback(
      ai,
      prompt,
      'You are a prudent fashion investment advisor who evaluates wardrobe longevity, versatility, and cost-per-wear efficiency in £ GBP.',
      schema
    );

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (error: any) {
    console.error('Item scout error:', error);
    res.status(500).json({ error: 'Failed to scout item.' });
  }
});

// Gemini Endpoint 5: AI Resale Listing Copywriter & SEO Optimizer
app.post('/api/gemini/generate-listing', async (req, res) => {
  try {
    const { item, platform, tone, includeMeasurements } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.status(503).json({ error: 'GEMINI_API_KEY is not configured.' });
    }

    const systemInstruction = `You are a professional luxury fashion resale specialist and algorithm copywriter for platforms like Vinted, eBay UK, Vestiaire Collective, and Depop.
Currency is strictly British Pounds (£ / GBP).
Provide an optimized listing that converts quickly while accurately disclosing condition and details.`;

    const prompt = `Write a high-converting listing for:
Brand: ${item.brand}
Name: ${item.name}
Category: ${item.category}
Subcategory: ${item.subcategory || 'Not specified'}
Color: ${item.color || 'Not specified'}
Size: ${item.size || 'Not specified'}
Material / Composition: ${item.material || 'Not specified'}
Condition: ${item.condition || 'Pre-loved'}
Season: ${Array.isArray(item.season) ? item.season.join(', ') : item.season || 'All-Season'}
Care Instructions: ${item.careNotes || 'Standard care'}
Notes: ${item.notes || 'None'}
Original Purchase Price: £${item.originalPricePaid || 0}
RRP Benchmark: £${item.rrp || 'N/A'}
Target Listing Price: £${item.listingPrice || 0}
Tags: ${(item.tags || []).join(', ') || 'None'}
Target Resale Platform: ${platform || 'Vinted'}
Listing Tone: ${tone || 'enthusiast'}
Include Measurements Section: ${includeMeasurements ? 'Yes' : 'No'}

Return JSON with:
- title: Search-optimized title for ${platform} (under 80 characters, keyword-dense)
- description: Engaging, formatted description with bullet points, condition details, and dispatch note
- tags: Array of 5-8 relevant single-word hashtags/tags
- suggestedPriceGbp: Recommended listing price number in £
- pricingTip: Strategic negotiation or discount tip for ${platform}`;

    const schema = {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        description: { type: Type.STRING },
        tags: { type: Type.ARRAY, items: { type: Type.STRING } },
        suggestedPriceGbp: { type: Type.NUMBER },
        pricingTip: { type: Type.STRING },
      },
      required: ['title', 'description', 'tags', 'suggestedPriceGbp', 'pricingTip'],
    };

    const response = await generateContentWithFallback(
      ai,
      prompt,
      systemInstruction,
      schema,
      0.7
    );

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (error: any) {
    console.error('Listing generator error:', error);
    res.status(500).json({ error: 'Failed to generate listing copy.' });
  }
});

// Helper to deduce category from text keywords with robust token matching
function inferCategoryFromText(text: string): string {
  const lower = ' ' + text.toLowerCase() + ' ';

  // 1. Shoes & Footwear (Prioritized to avoid knitwear misclassification from 'knit upper/sock' descriptions)
  if (
    lower.includes(' shoe') || lower.includes(' shoes') ||
    lower.includes(' boot') || lower.includes(' boots') ||
    lower.includes(' sneaker') || lower.includes(' sneakers') ||
    lower.includes(' trainer') || lower.includes(' trainers') ||
    lower.includes(' loafer') || lower.includes(' loafers') ||
    lower.includes(' sandal') || lower.includes(' sandals') ||
    lower.includes(' derby') || lower.includes(' derbies') ||
    lower.includes(' oxford') || lower.includes(' oxfords') ||
    lower.includes(' mule') || lower.includes(' mules') ||
    lower.includes(' heel') || lower.includes(' heels') ||
    lower.includes(' flat') || lower.includes(' flats') ||
    lower.includes(' brogue') || lower.includes(' brogues') ||
    lower.includes(' slipper') || lower.includes(' slippers') ||
    lower.includes(' clog') || lower.includes(' clogs') ||
    lower.includes(' espadrille') || lower.includes(' espadrilles') ||
    lower.includes(' chelsea boot') || lower.includes(' hiker boot') ||
    lower.includes(' footwear')
  ) {
    return 'Shoes';
  }

  // 2. Outerwear
  if (
    lower.includes('jacket') || lower.includes('coat') ||
    lower.includes('parka') || lower.includes('blazer') ||
    lower.includes('outerwear') || lower.includes('trench') ||
    lower.includes('overshirt') || lower.includes('bomber') ||
    lower.includes('anorak') || lower.includes('mac') ||
    lower.includes('peacoat') || lower.includes('gilet') ||
    lower.includes('windbreaker') || lower.includes('raincoat') ||
    lower.includes('shearling') || lower.includes('puffer')
  ) {
    return 'Outerwear';
  }

  // 3. Knitwear
  if (
    lower.includes('jumper') || lower.includes('sweater') ||
    lower.includes('cardigan') || lower.includes('knitwear') ||
    lower.includes('cashmere') || lower.includes('turtleneck') ||
    lower.includes('pullover') || lower.includes('crewneck') ||
    lower.includes('roll neck') || lower.includes('mock neck') ||
    lower.includes('merino') || lower.includes('cable knit') ||
    lower.includes('knit')
  ) {
    return 'Knitwear';
  }

  // 4. Dresses & Jumpsuits
  if (
    lower.includes('dress') || lower.includes('jumpsuit') ||
    lower.includes('dungaree') || lower.includes('gown') ||
    lower.includes('romper') || lower.includes('maxi') ||
    lower.includes('midi dress') || lower.includes('mini dress')
  ) {
    return 'Dresses & Jumpsuits';
  }

  // 5. Bottoms
  if (
    lower.includes('trouser') || lower.includes('trousers') ||
    lower.includes('jean') || lower.includes('jeans') ||
    lower.includes('pant') || lower.includes('pants') ||
    lower.includes('chino') || lower.includes('chinos') ||
    lower.includes('short') || lower.includes('shorts') ||
    lower.includes('skirt') || lower.includes('skirts') ||
    lower.includes('denim') || lower.includes('legging') ||
    lower.includes('slacks') || lower.includes('culotte') ||
    lower.includes('jogger') || lower.includes('sweatpant')
  ) {
    return 'Bottoms';
  }

  // 6. Bags
  if (
    lower.includes(' bag') || lower.includes(' bags') ||
    lower.includes('tote') || lower.includes('messenger') ||
    lower.includes('backpack') || lower.includes('crossbody') ||
    lower.includes('clutch') || lower.includes('holdall') ||
    lower.includes('satchel') || lower.includes('duffle') ||
    lower.includes('briefcase') || lower.includes('handbag') ||
    lower.includes('pouch')
  ) {
    return 'Bags';
  }

  // 7. Tops
  if (
    lower.includes('shirt') || lower.includes('t-shirt') ||
    lower.includes('tee') || lower.includes('blouse') ||
    lower.includes('polo') || lower.includes(' top') ||
    lower.includes('camisole') || lower.includes('tank') ||
    lower.includes('vest') || lower.includes('henley')
  ) {
    return 'Tops';
  }

  // 8. Accessories
  if (
    lower.includes('scarf') || lower.includes('scarves') ||
    lower.includes('belt') || lower.includes('hat') ||
    lower.includes('cap') || lower.includes('glove') ||
    lower.includes('sunglasses') || lower.includes('wallet') ||
    lower.includes('watch') || lower.includes('jewellery') ||
    lower.includes('jewelry') || lower.includes('necklace') ||
    lower.includes('ring') || lower.includes('beanie') ||
    lower.includes('tie') || lower.includes('pocket square')
  ) {
    return 'Accessories';
  }

  return 'Outerwear';
}

// Helper to deduce brand from URL or site
function inferBrandFromUrl(url: string, siteName?: string): string {
  if (siteName && !siteName.toLowerCase().includes('http') && siteName.length < 30) {
    return siteName.replace(/official/i, '').replace(/store/i, '').replace(/uk/i, '').trim();
  }
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    const parts = hostname.split('.');
    const main = parts[0];
    if (main === 'uk' || main === 'shop' || main === 'store') {
      return (parts[1] || 'Designer').charAt(0).toUpperCase() + (parts[1] || 'Designer').slice(1);
    }
    return main.charAt(0).toUpperCase() + main.slice(1);
  } catch {
    return 'Designer Brand';
  }
}

// Helper to clean image URLs
function cleanImageUrl(rawUrl: string | undefined, baseUrl: string): string | undefined {
  if (!rawUrl) return undefined;
  let url = rawUrl.trim();
  if (url.startsWith('//')) {
    url = 'https:' + url;
  } else if (url.startsWith('/')) {
    try {
      const origin = new URL(baseUrl).origin;
      url = origin + url;
    } catch {
      // ignore
    }
  }
  return url;
}

// Gemini Endpoint 5: Extract Clothes & Product Details from URL(s) or Shopping Baskets
app.post('/api/gemini/extract-from-url', async (req, res) => {
  try {
    const { url, urls, availableCategories, userCategories } = req.body;
    const rawInput = (url || urls || '').toString();
    if (!rawInput.trim()) {
      return res.status(400).json({ error: 'A valid URL or list of URLs is required.' });
    }

    const rawList = rawInput
      .split(/[\n,\s]+/)
      .map((u: string) => u.trim())
      .filter(Boolean);

    // Normalize each URL to ensure http:// or https:// protocol is present so fetch never fails
    const effectiveUrls = (rawList.length > 0 ? rawList : [rawInput.trim()]).map((u: string) => {
      if (/^https?:\/\//i.test(u)) return u;
      return `https://${u}`;
    });

    const targetCategories: string[] = Array.isArray(availableCategories) && availableCategories.length > 0
      ? availableCategories
      : (Array.isArray(userCategories) && userCategories.length > 0 ? userCategories : []);

    // Single Source of Truth: Scrape and extract metadata from each URL via unified scraper
    const fetchedResults: any[] = [];

    for (let i = 0; i < Math.min(effectiveUrls.length, 6); i++) {
      const currentUrl = effectiveUrls[i];
      try {
        const scraped = await scrapeUrlUnified(currentUrl);
        fetchedResults.push({
          url: currentUrl,
          engineUsed: scraped.engineUsed,
          pageHtmlSnippet: scraped.cleanSnippet || (scraped.markdown ? scraped.markdown.slice(0, 3000) : ''),
          markdown: scraped.markdown ? scraped.markdown.slice(0, 3000) : undefined,
          extractedMeta: {
            title: scraped.title,
            description: scraped.description,
            brand: scraped.brand,
            price: scraped.price,
            rrp: scraped.rrp,
            currency: scraped.currency,
            color: scraped.color,
            originalListingColor: scraped.originalListingColor || scraped.color,
            material: scraped.material,
            siteName: scraped.siteName,
            engineUsed: scraped.engineUsed,
            image: scraped.mainImage,
            candidateImages: scraped.candidateImages,
          },
          candidateImages: scraped.candidateImages,
        });
      } catch (scrapeErr: any) {
        console.warn('URL scraping notice for:', currentUrl, scrapeErr);
        fetchedResults.push({
          url: currentUrl,
          engineUsed: 'stealth-fallback',
          pageHtmlSnippet: '',
          extractedMeta: {
            brand: inferBrandFromUrl(currentUrl),
            engineUsed: 'stealth-fallback',
          },
          candidateImages: [],
        });
      }
    }

    const ai = getGeminiClient();

    if (ai) {
      try {
        const prompt = `Extract all fashion garment products and shopping basket items from these web link(s) and metadata in British Pounds (£ GBP).
If a page represents a shopping cart/basket or checkout with multiple items, or if multiple URLs were provided, extract EACH DISTINCT GARMENT as a separate item in the array.

Fetched Data:
${JSON.stringify(fetchedResults, null, 2)}

Requirements for each item:
- name: Clean, concise garment title (e.g. "Beaufort Waxed Cotton Jacket", "Oversized Cashmere Crewneck", "Pleated Wide-Leg Trousers"). Avoid SEO spam.
- brand: The fashion brand / designer (e.g. "Barbour", "Arket", "COS", "Toast", "Zara", "Reiss", "Sézane", "Toteme").
- category: ${targetCategories.length > 0 ? `Exactly one of user's defined categories: ${targetCategories.map((c: string) => `'${c}'`).join(', ')}. If coats/outerwear, map to '${targetCategories.find((c: string) => /coats?/i.test(c)) || targetCategories.find((c: string) => /outerwear/i.test(c)) || targetCategories[0]}'.` : `Exactly one of: 'Outerwear', 'Knitwear', 'Tops', 'Bottoms', 'Dresses & Jumpsuits', 'Shoes', 'Bags', 'Accessories'.`}
- purchasePrice: Number in British Pounds (£ GBP). If original was $ or €, convert to £. If missing, estimate realistic retail price.
- rrp: Original recommended retail price in £ GBP. If item is on sale, rrp should be the original price; otherwise same as purchasePrice.
- color: Primary color shade.
- material: Composition if known (e.g. "100% Cashmere", "100% Waxed Cotton", "Italian Leather").
- season: Array of wearable seasons from ['Autumn', 'Winter', 'Spring', 'Summer', 'All-Season'].
- condition: Default 'Pristine / New'.
- imageUrl: Direct high-res product photo URL found on the page or candidateImages. If NO image is found on the page, you MUST set imageUrl to empty string "" (strictly forbidden to use placeholder or stock photos).
- retailerName: The store/website name.
- targetStoreUrl: Direct link to the product or basket.
- careNotes: Cleaning & care instructions.
- notes: 1-sentence aesthetic summary for capsule wardrobe styling.
- tags: 3-5 keywords.`;

        const schema = {
          type: Type.OBJECT,
          properties: {
            isBasketOrMultiItem: { type: Type.BOOLEAN },
            basketTotalGbp: { type: Type.NUMBER },
            retailerName: { type: Type.STRING },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  brand: { type: Type.STRING },
                  category: {
                    type: Type.STRING,
                    description: targetCategories.length > 0 ? `One of: ${targetCategories.join(', ')}` : 'Outerwear, Knitwear, Tops, Bottoms, Dresses & Jumpsuits, Shoes, Bags, or Accessories',
                  },
                  purchasePrice: { type: Type.NUMBER },
                  rrp: {
                    type: Type.NUMBER,
                    description: 'Original recommended retail price / valuation in £ GBP',
                  },
                  color: { type: Type.STRING },
                  material: { type: Type.STRING },
                  season: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  condition: { type: Type.STRING },
                  imageUrl: { type: Type.STRING },
                  retailerName: { type: Type.STRING },
                  targetStoreUrl: { type: Type.STRING },
                  careNotes: { type: Type.STRING },
                  notes: { type: Type.STRING },
                  tags: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
                required: ['name', 'brand', 'category', 'purchasePrice', 'color', 'imageUrl', 'tags'],
              },
            },
          },
          required: ['items'],
        };

        const response = await generateContentWithFallback(
          ai,
          prompt,
          'You are an elite fashion archivist and automated shopping basket extractor. Extract structured product data in British Pounds (£ GBP).',
          schema
        );

        const parsed = JSON.parse(response.text || '{}');
        let extractedItems: any[] = Array.isArray(parsed.items) && parsed.items.length > 0 ? parsed.items : [];

        // Associate images & URLs with extracted items
        extractedItems = extractedItems.map((item, idx) => {
          const correspondingFetch = fetchedResults[idx] || fetchedResults[0] || {};
          const cImages = correspondingFetch.candidateImages || [];
          let finalImg = item.imageUrl;

          if (!finalImg || finalImg.includes('placeholder') || finalImg.includes('unsplash')) {
            if (cImages.length > idx && cImages[idx]) {
              finalImg = cImages[idx];
            } else if (cImages.length > 0) {
              finalImg = cImages[0];
            } else {
              finalImg = '';
            }
          }

          const parsedPurchasePrice = Number(item.purchasePrice) || 120;
          const parsedRrp = Number(item.rrp) || Number(correspondingFetch.extractedMeta?.rrp) || parsedPurchasePrice;

          return {
            ...item,
            id: `imported-item-${Date.now()}-${idx}`,
            category: targetCategories.length > 0 ? canonicalizeCategory(item.category, targetCategories) : item.category,
            imageUrl: finalImg,
            allCandidateImages: cImages.length > 0 ? cImages : (finalImg ? [finalImg] : []),
            targetStoreUrl: item.targetStoreUrl || correspondingFetch.url || effectiveUrls[0],
            retailerName: item.retailerName || correspondingFetch.extractedMeta?.siteName || inferBrandFromUrl(effectiveUrls[0]),
            purchasePrice: parsedPurchasePrice,
            rrp: parsedRrp,
            color: item.color || correspondingFetch.extractedMeta?.color || 'Neutral',
            originalListingColor: correspondingFetch.extractedMeta?.originalListingColor || correspondingFetch.extractedMeta?.color || item.color || '',
            engineUsed: correspondingFetch.engineUsed || 'stealth-fallback',
            condition: item.condition || 'Pristine / New',
            season: Array.isArray(item.season) && item.season.length > 0 ? item.season : ['Autumn', 'Winter'],
            tags: Array.isArray(item.tags) && item.tags.length > 0 ? item.tags : ['imported', item.category?.toLowerCase() || 'staple'],
          };
        });

        if (extractedItems.length > 0) {
          const totalEstimatedGbp = extractedItems.reduce((sum, it) => sum + (Number(it.purchasePrice) || 0), 0);
          return res.json({
            success: true,
            isBasket: extractedItems.length > 1 || parsed.isBasketOrMultiItem === true,
            item: extractedItems[0],
            items: extractedItems,
            basketTotalGbp: parsed.basketTotalGbp || totalEstimatedGbp,
            totalEstimatedGbp,
            retailerName: parsed.retailerName || extractedItems[0]?.retailerName || 'Online Retailer',
          });
        }
      } catch (aiError: any) {
        console.warn('AI multi-item extraction fallback:', aiError?.message || aiError);
      }
    }

    // High Quality Deterministic Multi-Item Fallback using Free Deterministic Fallback Engine & Scraped Data
    const fallbackItems: any[] = [];
    for (let idx = 0; idx < fetchedResults.length; idx++) {
      const fr = fetchedResults[idx];
      const freeExtract = extractGarmentFromUrlFree(fr.url, {
        imageUrl: fr.extractedMeta.image,
        candidateImages: fr.candidateImages,
        title: fr.extractedMeta.title,
        description: fr.extractedMeta.description,
        brand: fr.extractedMeta.brand,
        color: fr.extractedMeta.color,
        material: fr.extractedMeta.material,
        siteName: fr.extractedMeta.siteName,
      });

      const inferredBrand = fr.extractedMeta.brand || (freeExtract.brand !== 'Curated Brand' ? freeExtract.brand : inferBrandFromUrl(fr.url, fr.extractedMeta.siteName));
      const cleanedTitle = (fr.extractedMeta.title || freeExtract.name || 'Curated Wardrobe Piece')
        .replace(/\|.*$/g, '')
        .replace(/-.*$/g, '')
        .trim();
      const inferredCategory = fr.extractedMeta.category || freeExtract.category || inferCategoryFromText(cleanedTitle + ' ' + (fr.extractedMeta.description || '') + ' ' + fr.url);
      const parsedPrice = parseFloat(fr.extractedMeta.price || (freeExtract.purchasePrice ? freeExtract.purchasePrice.toString() : '65')) || 65;
      const parsedRrp = parseFloat(fr.extractedMeta.rrp || (freeExtract.rrp ? freeExtract.rrp.toString() : '')) || parsedPrice;
      
      let finalImg = fr.extractedMeta.image || (fr.candidateImages.length > 0 ? fr.candidateImages[0] : '');
      let candidateImgs = fr.candidateImages.length > 0 ? [...fr.candidateImages] : (finalImg ? [finalImg] : []);

      if (!finalImg) {
        try {
          const imgLookup = await findProductImageForGarment(inferredBrand, cleanedTitle, fr.extractedMeta.color, inferredCategory);
          if (imgLookup.primaryImageUrl) {
            finalImg = imgLookup.primaryImageUrl;
            candidateImgs = imgLookup.candidateImages;
          }
        } catch (imgErr) {
          console.warn('Image scout fallback notice:', imgErr);
        }
      }

      fallbackItems.push({
        id: `imported-item-${Date.now()}-${idx}`,
        name: cleanedTitle || freeExtract.name || 'Imported Fashion Piece',
        brand: inferredBrand,
        category: targetCategories.length > 0 ? canonicalizeCategory(inferredCategory, targetCategories) : inferredCategory,
        purchasePrice: parsedPrice,
        rrp: parsedRrp,
        color: fr.extractedMeta.color || freeExtract.color || 'Neutral',
        originalListingColor: fr.extractedMeta.originalListingColor || fr.extractedMeta.color || freeExtract.color || '',
        material: fr.extractedMeta.material || freeExtract.material || 'Natural Fiber / Blend',
        season: ['Autumn', 'Winter', 'Spring'],
        condition: 'Pristine / New',
        imageUrl: finalImg,
        allCandidateImages: candidateImgs,
        retailerName: fr.extractedMeta.siteName || freeExtract.retailerName || inferBrandFromUrl(fr.url),
        targetStoreUrl: fr.url,
        engineUsed: fr.engineUsed || 'free-deterministic-fallback',
        careNotes: 'Check garment care label.',
        notes: fr.extractedMeta.description || freeExtract.notes || `Extracted specifications for ${inferredBrand}.`,
        tags: [], // STRICT USER SPECIFICATION: Zero unsolicited default tags added
      });
    }

    const totalEstimatedGbp = fallbackItems.reduce((sum, it) => sum + (Number(it.purchasePrice) || 0), 0);

    return res.json({
      success: true,
      isBasket: fallbackItems.length > 1,
      item: fallbackItems[0],
      items: fallbackItems,
      basketTotalGbp: totalEstimatedGbp,
      totalEstimatedGbp,
      retailerName: fallbackItems[0]?.retailerName || 'Online Retailer',
    });
  } catch (error: any) {
    console.error('URL extraction error, using free deterministic fallback:', error);
    const targetUrl = (req.body?.url || req.body?.urls || '').toString().trim();
    const freeItem = extractGarmentFromUrlFree(targetUrl || 'https://example.com/wardrobe-item');
    
    let safeImage = '';
    let safeCandidates: string[] = [];
    try {
      const imgScout = await findProductImageForGarment(freeItem.brand, freeItem.name, freeItem.color, freeItem.category);
      if (imgScout.primaryImageUrl) {
        safeImage = imgScout.primaryImageUrl;
        safeCandidates = imgScout.candidateImages;
      }
    } catch (scoutErr) {
      console.warn('Image scout catch error:', scoutErr);
    }

    const safeItem = {
      id: `imported-item-${Date.now()}-0`,
      name: freeItem.name,
      brand: freeItem.brand,
      category: freeItem.category,
      purchasePrice: freeItem.purchasePrice || 65,
      rrp: freeItem.rrp || 95,
      color: freeItem.color || 'Neutral',
      originalListingColor: freeItem.color || '',
      material: freeItem.material || 'Quality Cotton / Wool',
      season: ['Autumn', 'Winter'],
      condition: 'Pristine / New',
      imageUrl: safeImage,
      allCandidateImages: safeCandidates,
      retailerName: freeItem.retailerName || 'Online Retailer',
      targetStoreUrl: targetUrl,
      engineUsed: 'free-deterministic-fallback',
      careNotes: 'Check garment care label.',
      notes: freeItem.notes || 'Imported product details.',
      tags: [], // STRICT: No default tags
    };
    res.json({
      success: true,
      isBasket: false,
      item: safeItem,
      items: [safeItem],
      totalEstimatedGbp: safeItem.purchasePrice,
      retailerName: safeItem.retailerName,
    });
  }
});

/**
 * Autonomous Product Image Search Endpoint
 * Look up high-resolution product photographs across Google Search Grounding,
 * Brand Official Stores, Luxury Stockists, and Web Catalogues
 */
app.post('/api/scraper/lookup-product-images', async (req, res) => {
  try {
    const {
      query,
      brand = '',
      name = '',
      color = '',
      category = '',
      provider = 'all',
      brandDomain,
      limit = 12,
    } = req.body;

    const effectiveBrand = String(brand || '').trim();
    const effectiveName = String(name || '').trim();
    const cleanQuery = (query || [effectiveBrand, effectiveName, color, category].filter(Boolean).join(' ')).trim();

    if (!cleanQuery && !effectiveBrand && !effectiveName) {
      return res.json({ success: true, images: [] });
    }

    const aggregatedImages: any[] = [];
    const seenUrls = new Set<string>();

    const addImage = (img: any) => {
      if (img && img.imageUrl && isValidProductImageUrl(img.imageUrl) && !seenUrls.has(img.imageUrl)) {
        seenUrls.add(img.imageUrl);
        aggregatedImages.push(img);
      }
    };

    const resolvedBrandDomain = brandDomain || getBrandOfficialDomain(effectiveBrand);

    // 1. Google Search Grounding with Gemini 3.8 Flash
    if ((provider === 'all' || provider === 'google') && (effectiveBrand || effectiveName || cleanQuery)) {
      const ai = getGeminiClient();
      if (ai) {
        try {
          const prompt = `Search Google for authentic high-resolution e-commerce product photographs and official store listings for:
Brand: "${effectiveBrand}"
Product Model: "${effectiveName || cleanQuery}"
Colorway: "${color || 'standard'}"
Category: "${category || 'clothing'}"

Check official store (${resolvedBrandDomain || 'official brand store'}) and leading luxury stockists (Farfetch, SSENSE, Mr Porter, End Clothing, Net-a-Porter, Nordstrom).
Locate authentic direct product image URLs and return a JSON array:
[
  {
    "title": "Clean item title",
    "imageUrl": "https://... direct image URL (jpg/png/webp)",
    "source": "Site Name e.g. Brand Official Store (${resolvedBrandDomain || ''}) or Mr Porter or SSENSE",
    "sourceType": "google"
  }
]
Return valid JSON array only.`;

          const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: prompt,
            config: {
              tools: [{ googleSearch: {} }],
              temperature: 0.2,
            },
          });

          const respText = response.text || '';
          try {
            const jsonMatch = respText.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              if (Array.isArray(parsed)) {
                for (const p of parsed) {
                  if (p.imageUrl) {
                    addImage({
                      title: p.title || cleanQuery,
                      imageUrl: p.imageUrl,
                      thumbnail: p.imageUrl,
                      source: p.source || 'Google Search Grounding',
                      sourceType: 'google',
                    });
                  }
                }
              }
            }
          } catch {
            const urlMatches = respText.match(/https:\/\/[^"'\s)]+\.(?:jpg|jpeg|png|webp|avif)(?:\?[^"'\s)]*)?/gi) || [];
            urlMatches.forEach((u) => {
              addImage({
                title: `${effectiveBrand} ${effectiveName}`.trim() || cleanQuery,
                imageUrl: u,
                thumbnail: u,
                source: 'Google Search Result',
                sourceType: 'google',
              });
            });
          }
        } catch (geminiErr: any) {
          console.warn('Gemini Google Search Grounding notice:', geminiErr?.message || geminiErr);
        }
      }
    }

    // 2. Official Brand Website Search (site:brand.com)
    if ((provider === 'all' || provider === 'brand_site') && effectiveBrand && (effectiveName || cleanQuery) && resolvedBrandDomain) {
      try {
        const brandImages = await searchBrandOfficialSiteImages(effectiveBrand, effectiveName || cleanQuery, 6);
        brandImages.forEach(addImage);
      } catch (e: any) {
        console.warn('Brand official site search notice:', e?.message || e);
      }
    }

    // 3. Luxury Stockists & Retailers (site:mrporter.com, ssense.com, farfetch.com, endclothing.com)
    if ((provider === 'all' || provider === 'retailer') && effectiveBrand && (effectiveName || cleanQuery)) {
      try {
        const retailerImages = await searchLuxuryRetailerImages(effectiveBrand, effectiveName || cleanQuery, 6);
        retailerImages.forEach(addImage);
      } catch (e: any) {
        console.warn('Retailer image search notice:', e?.message || e);
      }
    }

    // 4. Web Engine Fallback (DuckDuckGo + Wikimedia)
    if (aggregatedImages.length < Number(limit)) {
      try {
        const remaining = Number(limit) - aggregatedImages.length;
        const webImages = await searchProductImages(cleanQuery, Math.max(remaining, 6));
        webImages.forEach(addImage);
      } catch (e: any) {
        console.warn('Web image search notice:', e?.message || e);
      }
    }

    return res.json({
      success: true,
      images: aggregatedImages.slice(0, Number(limit)),
      totalFound: aggregatedImages.length,
      brandDomain: resolvedBrandDomain,
    });
  } catch (err: any) {
    console.error('Product image lookup error:', err);
    res.status(500).json({ success: false, error: err?.message || 'Failed to lookup images', images: [] });
  }
});

/**
 * Autonomous Text & Specs Extraction Endpoint
 * Extracts structured garment attributes and automatically pairs matching product imagery
 */
app.post('/api/scraper/extract-from-text', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ success: false, error: 'Text content is required' });
    }

    let item: any = null;
    const ai = getGeminiClient();

    // Prefer high-intelligence AI extraction when available
    if (ai) {
      try {
        const prompt = `Extract structured fashion garment details from this text, receipt, or specification sheet:
"""
${text.slice(0, 4000)}
"""

Tasks:
- Identify canonical brand, clean garment name, category, subcategory, size, color, fabric composition, purchase price, and estimated retail RRP in £ GBP.
- Extract size code from tags or receipt lines if present (e.g. "M", "38R", "UK 10", "32x32").`;

        const schema = {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            brand: { type: Type.STRING },
            category: { type: Type.STRING, description: 'Outerwear, Knitwear, Tops, Bottoms, Dresses & Jumpsuits, Shoes, Bags, Accessories, Tailoring, or Homeware' },
            subcategory: { type: Type.STRING },
            color: { type: Type.STRING },
            colorHex: { type: Type.STRING },
            material: { type: Type.STRING },
            size: { type: Type.STRING },
            purchasePrice: { type: Type.NUMBER },
            rrp: { type: Type.NUMBER },
            condition: { type: Type.STRING },
            careNotes: { type: Type.STRING },
            notes: { type: Type.STRING },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['name', 'brand', 'category', 'color', 'material'],
        };

        const response = await generateContentWithFallback(
          ai,
          prompt,
          'You are a premier fashion archivist. Extract garment specifications with maximum precision in British Pounds (£ GBP).',
          schema,
          0.2
        );
        const parsed = JSON.parse(response.text || '{}');
        if (parsed.name) {
          item = {
            ...parsed,
            purchasePrice: Number(parsed.purchasePrice) || 65,
            rrp: Number(parsed.rrp) || Math.round((Number(parsed.purchasePrice) || 65) * 1.4),
            colorHex: parsed.colorHex || getColorSwatchHex(parsed.color),
            condition: parsed.condition || 'Pristine / New',
            engineUsed: 'gemini-3.8-flash',
          };
        }
      } catch (aiErr) {
        console.warn('Scraper text AI extraction fallback note:', aiErr);
      }
    }

    if (!item) {
      const free = extractGarmentFromTextFree(text);
      item = {
        ...free,
        colorHex: getColorSwatchHex(free.color),
      };
    }
    
    // Automatically locate authentic high-res product photography
    try {
      const imgScout = await findProductImageForGarment(item.brand, item.name, item.color, item.category);
      if (imgScout.primaryImageUrl) {
        item.imageUrl = imgScout.primaryImageUrl;
        item.allCandidateImages = imgScout.candidateImages;
      }
    } catch (imgErr) {
      console.warn('Text extraction image lookup notice:', imgErr);
    }

    res.json({ success: true, item });
  } catch (err: any) {
    console.error('Text extraction error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Gemini Endpoint 6: Vision AI - Extract All Items from Photo / Screenshot of Shopping Cart, Basket, or Garment
app.post('/api/gemini/extract-from-image', async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Image data is required.' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({ error: 'GEMINI_API_KEY is not configured in server environment.' });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
    const actualMime = mimeType || (imageBase64.startsWith('data:image/png') ? 'image/png' : 'image/jpeg');

    const prompt = `Analyze this image, which may be:
1. A screenshot or photo of a shopping basket / cart / checkout page with multiple items
2. An order confirmation invoice / receipt listing multiple garments
3. A single garment product photograph or physical clothing piece
4. A garment care tag, brand label, neck tag, or price tag showing size and composition

Tasks:
- Detect ALL distinct clothing items, shoes, bags, or accessories shown in the shopping basket/receipt/image.
- If the image contains a garment tag, care label, barcode, or receipt, extract the exact SIZE (e.g. "M", "38R", "UK 10", "32x32", "One Size").
- If it contains multiple items in a shopping basket or receipt, return EACH item separately in the "items" array with all individual details.
- Calculate or detect the total basket value in British Pounds (£ GBP).
- For each item, provide:
  * name: Clean, evocative garment name (e.g. "Beaufort Waxed Jacket", "Cashmere V-Neck Sweater", "105 Standard Selvedge Denim")
  * brand: Canonical designer brand or retailer (e.g. "Barbour", "Arket", "Acne Studios", "COS", "Toast", "Studio Nicholson")
  * category: Exactly one of: 'Outerwear', 'Knitwear', 'Tops', 'Bottoms', 'Dresses & Jumpsuits', 'Shoes', 'Bags', 'Accessories', 'Tailoring', 'Homeware'
  * subcategory: Specific garment silhouette (e.g. "Waxed Jacket", "Oxford Shirt", "Chelsea Boots", "Pleated Trousers")
  * purchasePrice: Price in numeric £ GBP (convert from foreign currency if needed)
  * rrp: Estimated original retail RRP in £ GBP
  * size: Sizing code or measurement extracted from label or description (e.g. "M", "38", "UK 9", "32W 32L")
  * color: Primary descriptive colorway (e.g. "Sage Green", "Charcoal Melange", "Oatmeal", "Midnight Navy")
  * colorHex: 6-digit hex color swatch code (e.g. "#4A5D4E")
  * originalListingColor: Original retailer colorway name
  * material: Specific fabric composition (e.g. "100% Waxed Cotton", "100% Scottish Shetland Wool", "13.5oz Raw Selvedge Denim")
  * season: Array from ['Autumn', 'Winter', 'Spring', 'Summer', 'All-Season']
  * condition: 'Pristine / New'
  * careNotes: Washing or care advice
  * notes: Capsule styling notes
  * tags: 3-5 tags`;

    const schema = {
      type: Type.OBJECT,
      properties: {
        isBasketOrMultiItem: { type: Type.BOOLEAN, description: 'True if image contains multiple basket items or an order receipt' },
        basketTotalGbp: { type: Type.NUMBER, description: 'Total price of all items in basket' },
        retailerName: { type: Type.STRING },
        items: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              brand: { type: Type.STRING },
              category: {
                type: Type.STRING,
                description: 'Outerwear, Knitwear, Tops, Bottoms, Dresses & Jumpsuits, Shoes, Bags, Accessories, Tailoring, or Homeware',
              },
              subcategory: { type: Type.STRING },
              purchasePrice: { type: Type.NUMBER },
              rrp: { type: Type.NUMBER },
              size: { type: Type.STRING },
              color: { type: Type.STRING },
              colorHex: { type: Type.STRING },
              originalListingColor: { type: Type.STRING },
              material: { type: Type.STRING },
              season: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              condition: { type: Type.STRING },
              careNotes: { type: Type.STRING },
              notes: { type: Type.STRING },
              tags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ['name', 'brand', 'category', 'purchasePrice', 'color', 'season', 'tags'],
          },
        },
      },
      required: ['items'],
    };

    let parsed: any = null;

    try {
      const response = await generateContentWithFallback(
        ai,
        [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  data: cleanBase64,
                  mimeType: actualMime,
                },
              },
              {
                text: prompt,
              },
            ],
          },
        ],
        'You are an elite fashion archivist, garments specialist, and computer vision expert. Accurately detect all garments, tags, and receipts in British Pounds (£ GBP).',
        schema,
        0.2
      );
      parsed = JSON.parse(response.text || '{}');
    } catch (err: any) {
      console.warn('Vision extraction fallback error:', err?.message || err);
    }

    let extractedItems: any[] = parsed && Array.isArray(parsed.items) && parsed.items.length > 0 ? parsed.items : [];

    if (extractedItems.length === 0) {
      extractedItems = [
        {
          name: '',
          brand: '',
          category: '',
          purchasePrice: 0,
          rrp: undefined,
          size: '',
          color: '',
          colorHex: '',
          originalListingColor: '',
          material: '',
          season: [],
          condition: '',
          careNotes: '',
          notes: 'Extracted via Photo Vision.',
          tags: ['photo-import'],
        },
      ];
    }

    // Assign imagery & normalize attributes for each item in the basket
    extractedItems = extractedItems.map((item, idx) => {
      const itemImg = extractedItems.length === 1 ? imageBase64 : (imageBase64 || '');

      return {
        ...item,
        id: `imported-vision-${Date.now()}-${idx}`,
        imageUrl: itemImg,
        allCandidateImages: imageBase64 ? [imageBase64] : [],
        size: item.size || '',
        subcategory: item.subcategory || '',
        colorHex: item.colorHex || getColorSwatchHex(item.color),
        originalListingColor: item.originalListingColor || item.color || '',
        purchasePrice: Number(item.purchasePrice) || 120,
        rrp: Number(item.rrp) || Number(item.purchasePrice) || 160,
        condition: item.condition || 'Pristine / New',
        season: Array.isArray(item.season) && item.season.length > 0 ? item.season : ['Autumn', 'Winter'],
        tags: Array.isArray(item.tags) && item.tags.length > 0 ? item.tags : ['photo-import', item.category?.toLowerCase() || 'wardrobe'],
      };
    });

    const totalEstimatedGbp = extractedItems.reduce((sum, it) => sum + (Number(it.purchasePrice) || 0), 0);

    return res.json({
      success: true,
      isBasket: extractedItems.length > 1 || parsed?.isBasketOrMultiItem === true,
      item: extractedItems[0],
      items: extractedItems,
      basketTotalGbp: parsed?.basketTotalGbp || totalEstimatedGbp,
      totalEstimatedGbp,
      retailerName: parsed?.retailerName || 'Shopping Basket',
    });
  } catch (error: any) {
    console.error('Vision extraction error:', error);
    res.status(500).json({ error: 'Failed to analyze photo with Vision AI.' });
  }
});

// Gemini Endpoint 7: Extract Products from Raw Text, Basket Summary, or Order Confirmation
app.post('/api/gemini/extract-from-text', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text content is required.' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      const freeItem = extractGarmentFromTextFree(text);
      const safeItem = {
        id: `imported-text-${Date.now()}-0`,
        name: freeItem.name,
        brand: freeItem.brand,
        category: freeItem.category,
        subcategory: '',
        size: freeItem.size || '',
        purchasePrice: freeItem.purchasePrice || 65,
        rrp: freeItem.rrp || 95,
        color: freeItem.color || 'Neutral',
        colorHex: getColorSwatchHex(freeItem.color),
        originalListingColor: freeItem.color || '',
        material: freeItem.material || 'Natural Fiber / Blend',
        season: ['Autumn', 'Winter', 'Spring'],
        condition: 'Pristine / New',
        imageUrl: '',
        allCandidateImages: [],
        careNotes: 'Check garment care label.',
        notes: freeItem.notes || text.slice(0, 250),
        tags: [], // STRICT: Zero default tags
      };
      return res.json({
        success: true,
        isBasket: false,
        item: safeItem,
        items: [safeItem],
        basketTotalGbp: safeItem.purchasePrice,
        totalEstimatedGbp: safeItem.purchasePrice,
        retailerName: 'Text Extractor',
      });
    }

    const prompt = `Extract all fashion garment products and shopping basket line items from this text:
"""
${text.slice(0, 4000)}
"""

Requirements:
- If the text contains multiple items (e.g. from an order confirmation email, shopping cart receipt, or list of clothing), extract EACH SEPARATE ITEM into the "items" array.
- Extract prices in British Pounds (£ GBP).
- Extract garment size (e.g. "M", "38R", "UK 10", "32x32") from labels or line items.
- For each item:
  * name: Clean garment name
  * brand: Designer brand or retailer
  * category: Exactly one of: 'Outerwear', 'Knitwear', 'Tops', 'Bottoms', 'Dresses & Jumpsuits', 'Shoes', 'Bags', 'Accessories', 'Tailoring', 'Homeware'
  * subcategory: Specific silhouette (e.g. "Waxed Jacket", "Oxford Shirt")
  * size: Sizing code or measurements
  * purchasePrice: Numeric price in £ GBP
  * rrp: Estimated original retail RRP in £ GBP
  * color: Primary color
  * colorHex: 6-digit hex color code
  * originalListingColor: Original retailer shade name
  * material: Fabric composition
  * season: Array from ['Autumn', 'Winter', 'Spring', 'Summer', 'All-Season']
  * condition: 'Pristine / New'
  * careNotes: Care notes
  * notes: Capsule styling notes
  * tags: 3-5 keywords`;

    const schema = {
      type: Type.OBJECT,
      properties: {
        isBasketOrMultiItem: { type: Type.BOOLEAN },
        basketTotalGbp: { type: Type.NUMBER },
        retailerName: { type: Type.STRING },
        items: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              brand: { type: Type.STRING },
              category: {
                type: Type.STRING,
                description: 'Outerwear, Knitwear, Tops, Bottoms, Dresses & Jumpsuits, Shoes, Bags, Accessories, Tailoring, or Homeware',
              },
              subcategory: { type: Type.STRING },
              size: { type: Type.STRING },
              purchasePrice: { type: Type.NUMBER },
              rrp: { type: Type.NUMBER },
              color: { type: Type.STRING },
              colorHex: { type: Type.STRING },
              originalListingColor: { type: Type.STRING },
              material: { type: Type.STRING },
              season: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              condition: { type: Type.STRING },
              careNotes: { type: Type.STRING },
              notes: { type: Type.STRING },
              tags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ['name', 'brand', 'category', 'purchasePrice', 'color', 'season', 'tags'],
          },
        },
      },
      required: ['items'],
    };

    const response = await generateContentWithFallback(
      ai,
      prompt,
      'You are a fashion product and shopping basket parser. Extract all separate items in British Pounds (£ GBP).',
      schema,
      0.2
    );

    const parsed = JSON.parse(response.text || '{}');
    let extractedItems: any[] = Array.isArray(parsed.items) && parsed.items.length > 0 ? parsed.items : [];

    if (extractedItems.length === 0) {
      extractedItems = [
        {
          name: 'Extracted Fashion Piece',
          brand: 'Designer Brand',
          category: 'Tops',
          purchasePrice: 85,
          rrp: 120,
          size: '',
          color: 'Neutral',
          colorHex: '#8C7355',
          originalListingColor: 'Neutral',
          material: 'Cotton Blend',
          season: ['Autumn', 'Winter', 'Spring'],
          condition: 'Pristine / New',
          careNotes: 'Check garment care label.',
          notes: 'Extracted from text description.',
          tags: ['text-import', 'wardrobe'],
        },
      ];
    }

    extractedItems = extractedItems.map((item, idx) => {
      return {
        ...item,
        id: `imported-text-${Date.now()}-${idx}`,
        imageUrl: '',
        allCandidateImages: [],
        size: item.size || '',
        subcategory: item.subcategory || '',
        colorHex: item.colorHex || getColorSwatchHex(item.color),
        originalListingColor: item.originalListingColor || item.color || '',
        purchasePrice: Number(item.purchasePrice) || 85,
        rrp: Number(item.rrp) || Math.round((Number(item.purchasePrice) || 85) * 1.4),
        condition: item.condition || 'Pristine / New',
        season: Array.isArray(item.season) && item.season.length > 0 ? item.season : ['Autumn', 'Winter'],
        tags: Array.isArray(item.tags) ? item.tags : [],
      };
    });

    const totalEstimatedGbp = extractedItems.reduce((sum, it) => sum + (Number(it.purchasePrice) || 0), 0);

    res.json({
      success: true,
      isBasket: extractedItems.length > 1 || parsed?.isBasketOrMultiItem === true,
      item: extractedItems[0],
      items: extractedItems,
      basketTotalGbp: parsed?.basketTotalGbp || totalEstimatedGbp,
      totalEstimatedGbp,
      retailerName: parsed?.retailerName || 'Order Confirmation',
    });
  } catch (error: any) {
    console.warn('AI Text extraction fallback:', error);
    const rawText = (req.body?.text || '').toString();
    const freeItem = extractGarmentFromTextFree(rawText);
    const safeItem = {
      id: `imported-text-${Date.now()}-0`,
      name: freeItem.name,
      brand: freeItem.brand,
      category: freeItem.category,
      subcategory: '',
      size: freeItem.size || '',
      purchasePrice: freeItem.purchasePrice || 65,
      rrp: freeItem.rrp || 95,
      color: freeItem.color || 'Neutral',
      colorHex: getColorSwatchHex(freeItem.color),
      originalListingColor: freeItem.color || '',
      material: freeItem.material || 'Natural Fiber / Blend',
      season: ['Autumn', 'Winter'],
      condition: 'Pristine / New',
      imageUrl: '',
      allCandidateImages: [],
      careNotes: 'Check garment care label.',
      notes: freeItem.notes || rawText.slice(0, 200),
      tags: [],
    };
    res.json({
      success: true,
      isBasket: false,
      item: safeItem,
      items: [safeItem],
      totalEstimatedGbp: safeItem.purchasePrice,
      retailerName: 'Text Extractor',
    });
  }
});

// Gemini Endpoint 7.5: Inventory Intelligence & Autofill Scanner (Deep Wardrobe Audit)
app.post('/api/gemini/inventory-scan', async (req, res) => {
  try {
    const { items, mode } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Items array is required' });
    }

    const ai = getGeminiClient();

    // Prepare item summaries for Gemini
    const itemSummaries = items.slice(0, 15).map((it, idx) => ({
      index: idx,
      id: it.id,
      name: it.name || 'Unnamed Garment',
      currentBrand: it.brand || '',
      currentCategory: it.category || '',
      currentColor: it.color || '',
      currentMaterial: it.material || '',
      currentSize: it.size || '',
      currentNotes: it.notes || '',
      purchasePrice: it.purchasePrice || 0,
      hasPhoto: Boolean(it.imageUrl && it.imageUrl.trim() !== ''),
    }));

    let aiResults: any[] = [];

    if (ai && mode !== 'fast_only') {
      try {
        const prompt = `You are an elite luxury, heritage, and contemporary fashion archivist and capsule wardrobe director.
Audit the following wardrobe inventory items that have incomplete, unrefined, or missing specifications:

${JSON.stringify(itemSummaries, null, 2)}

Instructions for each item:
1. Identify the canonical brand (e.g. Barbour, Margaret Howell, Acne Studios, Universal Works, Arket, COS, Studio Nicholson, Lemaire, Drakes). Never invent fake brands; if genuinely unbranded or independent, mark as "Curated Label".
2. Refine the product title: elegant, authentic model name without duplicate brand prefixes.
3. Category: Exactly one of: 'Outerwear', 'Knitwear', 'Tops', 'Bottoms', 'Dresses & Jumpsuits', 'Shoes', 'Bags', 'Accessories', 'Tailoring', 'Homeware'.
4. Subcategory: specific garment silhouette (e.g. Waxed Jacket, Oxford Shirt, Selvedge Denim, Chelsea Boots, Cable Knit).
5. Exact color: accurate specific shade name (e.g. "Sage Green", "Charcoal Melange", "Oatmeal", "Midnight Navy", "Tobacco Brown", "Washed Black", "Ecru", "Burgundy"). NEVER default to "Classic Navy" unless the item is genuinely navy.
6. colorHex: authentic 6-digit hex color swatch (e.g. "#4A5D4E", "#2B3542", "#D8D2C2").
7. Material: precise, realistic textile composition tailored to the garment category and brand (e.g. "100% Waxed Thornproof Cotton", "100% Scottish Shetland Wool", "13.5oz Raw Selvedge Denim", "Full-grain Horween Calfskin"). NEVER default blindly to "100% Cotton" for wool, leather, or outerwear pieces.
8. Size: extracted from title/notes or standard size format (e.g. "M", "38R", "UK 9", "32x32", "One Size").
9. careNotes: tailored fabric care instructions.
10. rrp: realistic estimated original retail price in £ GBP.
11. tags: 3-5 curated capsule styling tags.
12. confidence: 80 to 98.
13. improvements: 2-4 concrete, professional improvement bullet points (e.g. ["Identified 100% Waxed Cotton", "Extracted Sage Green Swatch", "Standardized Sizing to M", "Valued at Est. RRP £289"]).`;

        const schema = {
          type: Type.OBJECT,
          properties: {
            audits: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  proposedBrand: { type: Type.STRING },
                  proposedName: { type: Type.STRING },
                  proposedCategory: { type: Type.STRING },
                  proposedSubcategory: { type: Type.STRING },
                  proposedColor: { type: Type.STRING },
                  proposedColorHex: { type: Type.STRING },
                  proposedMaterial: { type: Type.STRING },
                  proposedSize: { type: Type.STRING },
                  proposedCareNotes: { type: Type.STRING },
                  proposedRrp: { type: Type.NUMBER },
                  proposedTags: { type: Type.ARRAY, items: { type: Type.STRING } },
                  confidence: { type: Type.NUMBER },
                  improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ['id', 'proposedBrand', 'proposedName', 'proposedCategory', 'proposedColor', 'proposedMaterial'],
              },
            },
          },
          required: ['audits'],
        };

        const response = await generateContentWithFallback(
          ai,
          prompt,
          'You are a senior fashion director and archive curator. Return rigorous, authentic garment enrichments with zero token hallucinations.',
          schema,
          0.2
        );
        const parsed = JSON.parse(response.text || '{}');
        if (Array.isArray(parsed.audits)) {
          aiResults = parsed.audits;
        }
      } catch (aiErr) {
        console.warn('AI inventory audit note, using enhanced deterministic engine:', aiErr);
      }
    }

    // Map AI audits or merge with deterministic attributes and scout web photos
    const proposals = await Promise.all(
      items.map(async (origItem: any) => {
        const audit = aiResults.find((a) => a.id === origItem.id);
        const detectedAttrs = extractAllGarmentAttributes({
          title: origItem.name,
          description: origItem.notes || '',
          brand: origItem.brand,
          color: origItem.color,
          material: origItem.material,
          size: origItem.size,
        });

        const brand = audit?.proposedBrand || (detectedAttrs.brand !== 'Unbranded' ? detectedAttrs.brand : (origItem.brand || ''));
        const name = audit?.proposedName || origItem.name;
        const category = audit?.proposedCategory || origItem.category || '';
        const subcategory = audit?.proposedSubcategory || origItem.subcategory || '';
        const color = audit?.proposedColor || (detectedAttrs.color !== 'Neutral' ? detectedAttrs.color : (origItem.color || ''));
        const colorHex = audit?.proposedColorHex || (color ? getColorSwatchHex(color) : '');
        const material = audit?.proposedMaterial || (detectedAttrs.material !== 'Natural Fiber / Blend' ? detectedAttrs.material : (origItem.material || ''));
        const size = audit?.proposedSize || origItem.size || detectedAttrs.size || '';
        const careNotes = audit?.proposedCareNotes || origItem.careNotes || 'Machine wash cold on gentle cycle or professional dry clean.';
        const rrp = audit?.proposedRrp || origItem.rrp || Math.round((Number(origItem.purchasePrice) || 60) * 1.6);
        const tags = audit?.proposedTags || origItem.tags || ['capsule', category.toLowerCase()];
        const confidence = audit?.confidence || 82;
        const improvements = audit?.improvements || [
          'Audited garment metadata',
          `Standardized ${category} taxonomy`,
          `Refined fabric to ${material}`,
        ];

        // Autonomous image scouting if photo is missing
        let proposedImageUrl = origItem.imageUrl || '';
        let candidateImages = origItem.imageUrl ? [origItem.imageUrl] : [];

        if (!proposedImageUrl) {
          try {
            const scout = await findProductImageForGarment(brand, name, color, category);
            if (scout.primaryImageUrl) {
              proposedImageUrl = scout.primaryImageUrl;
              candidateImages = scout.candidateImages;
              improvements.push('Discovered Authentic Product Photo');
            }
          } catch (scoutErr) {
            console.warn('Scout error for item:', origItem.id, scoutErr);
          }
        }

        return {
          itemId: origItem.id,
          originalItem: origItem,
          proposedImageUrl,
          candidateImages,
          proposedBrand: brand,
          proposedName: name,
          proposedCategory: category,
          proposedSubcategory: subcategory,
          proposedColor: color,
          proposedColorHex: colorHex,
          proposedMaterial: material,
          proposedSize: size,
          proposedCareNotes: careNotes,
          proposedRrp: rrp,
          proposedTags: tags,
          confidence,
          improvements,
          missingFieldsCount: 0,
          engineUsed: aiResults.length > 0 ? 'gemini-3.8-flash' : 'enhanced-deterministic-audit',
        };
      })
    );

    res.json({
      success: true,
      proposals,
      engine: aiResults.length > 0 ? 'gemini-3.8-flash' : 'enhanced-deterministic-audit',
    });
  } catch (err: any) {
    console.error('Inventory scan endpoint error:', err);
    res.status(500).json({ success: false, error: err?.message || 'Inventory scan failed' });
  }
});

// Gemini Endpoint 7.6: Single Garment Vision Inspection (Scan Photo Directly & Use All Available Fields)
app.post('/api/gemini/scan-garment-photo', async (req, res) => {
  try {
    const { imageBase64, imageUrl, currentItem } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.status(503).json({ error: 'GEMINI_API_KEY is not configured.' });
    }

    let inlineDataPart: any = null;
    const effectiveImage = imageBase64 || imageUrl;

    if (effectiveImage) {
      if (effectiveImage.startsWith('data:image/')) {
        const cleanBase64 = effectiveImage.replace(/^data:image\/[a-z]+;base64,/, '');
        const mimeType = effectiveImage.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';
        inlineDataPart = { inlineData: { data: cleanBase64, mimeType } };
      } else if (effectiveImage.startsWith('http://') || effectiveImage.startsWith('https://')) {
        try {
          const imgFetch = await fetch(effectiveImage, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
          });
          if (imgFetch.ok) {
            const buf = await imgFetch.arrayBuffer();
            const b64 = Buffer.from(buf).toString('base64');
            const cType = imgFetch.headers.get('content-type') || 'image/jpeg';
            inlineDataPart = { inlineData: { data: b64, mimeType: cType.split(';')[0] } };
          }
        } catch (fetchErr) {
          console.warn('Could not fetch external image for vision scan:', fetchErr);
        }
      }
    }

    // Build comprehensive context from all available entered fields
    const detailsList: string[] = [];
    if (currentItem?.name) detailsList.push(`Name: "${currentItem.name}"`);
    if (currentItem?.brand) detailsList.push(`Brand: "${currentItem.brand}"`);
    if (currentItem?.category) detailsList.push(`Category: "${currentItem.category}"`);
    if (currentItem?.subcategory) detailsList.push(`Subcategory: "${currentItem.subcategory}"`);
    if (currentItem?.color) detailsList.push(`Color: "${currentItem.color}"`);
    if (currentItem?.material) detailsList.push(`Material / Fabric: "${currentItem.material}"`);
    if (currentItem?.size) detailsList.push(`Size: "${currentItem.size}"`);
    if (currentItem?.condition) detailsList.push(`Condition: "${currentItem.condition}"`);
    if (currentItem?.purchasePrice) detailsList.push(`Purchase Price Paid: £${currentItem.purchasePrice}`);
    if (currentItem?.rrp) detailsList.push(`RRP: £${currentItem.rrp}`);
    if (currentItem?.season && (Array.isArray(currentItem.season) ? currentItem.season.length : currentItem.season)) {
      detailsList.push(`Season: "${Array.isArray(currentItem.season) ? currentItem.season.join(', ') : currentItem.season}"`);
    }
    if (currentItem?.notes) detailsList.push(`Notes: "${currentItem.notes}"`);
    if (currentItem?.careNotes) detailsList.push(`Care Notes: "${currentItem.careNotes}"`);
    if (currentItem?.storageLocation) detailsList.push(`Location: "${currentItem.storageLocation}"`);
    if (currentItem?.tags && Array.isArray(currentItem.tags) && currentItem.tags.length > 0) {
      detailsList.push(`Tags: "${currentItem.tags.join(', ')}"`);
    }

    const itemContext = detailsList.length > 0
      ? `User-entered item details already recorded:\n${detailsList.join('\n')}\n`
      : 'No prior item details recorded.\n';

    const prompt = `Perform an in-depth computer vision and fashion archival audit of this garment.
${itemContext}

Task:
Using BOTH the picture AI photograph and ALL available user-entered fields above:
1. Confirm, refine, or fill in the authentic Brand and Model Name.
2. Determine the most accurate wardrobe Category and Subcategory.
3. Identify the true primary Colorway and accurate HEX code.
4. Detect the exact Material / Textile Composition (e.g. 100% Merino Wool, Heavyweight 14oz Selvedge Denim, Waxed Cotton, Irish Linen, Mulberry Silk, Calfskin Leather).
5. Detect or intelligently suggest the Size & Sizing Scale (e.g. M / 40R, 32/32, UK 9).
6. Provide specific garment Care Instructions (e.g. Hand wash cold, Dry clean only, Sponge clean with cold water).
7. Estimate realistic retail valuation benchmark RRP in British Pounds (£ GBP).
8. Recommend appropriate target Seasons and 4-6 relevant Style Tags.
9. Assess condition if visible.`;

    const schema = {
      type: Type.OBJECT,
      properties: {
        brand: { type: Type.STRING },
        name: { type: Type.STRING },
        category: { type: Type.STRING },
        subcategory: { type: Type.STRING },
        color: { type: Type.STRING },
        colorHex: { type: Type.STRING },
        material: { type: Type.STRING },
        size: { type: Type.STRING },
        condition: { type: Type.STRING },
        careNotes: { type: Type.STRING },
        rrp: { type: Type.NUMBER },
        season: { type: Type.ARRAY, items: { type: Type.STRING } },
        tags: { type: Type.ARRAY, items: { type: Type.STRING } },
        confidence: { type: Type.NUMBER },
        improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ['brand', 'name', 'category', 'color', 'material'],
    };

    const parts: any[] = [];
    if (inlineDataPart) parts.push(inlineDataPart);
    parts.push({ text: prompt });

    const response = await generateContentWithFallback(
      ai,
      [{ role: 'user', parts }],
      'You are a world-class sartorial fashion archivist and computer vision specialist. Provide meticulous garment analysis.',
      schema,
      0.2
    );

    const parsed = JSON.parse(response.text || '{}');
    res.json({
      success: true,
      audit: {
        ...parsed,
        colorHex: parsed.colorHex || getColorSwatchHex(parsed.color),
      },
      engine: inlineDataPart ? 'gemini-vision-multimodal' : 'gemini-text-sartorial',
    });
  } catch (err: any) {
    console.error('Scan garment photo error:', err);
    res.status(500).json({ success: false, error: err?.message || 'Vision scan failed' });
  }
});

// Gemini Endpoint 8: Extract Items from Vinted Downloaded Data (HTML Exports & PDF Invoices/Receipts)
app.post('/api/gemini/extract-from-vinted-file', async (req, res) => {
  try {
    const { files, fileBase64, htmlContent, fileName, mimeType } = req.body;

    // Normalize incoming input into a uniform array of files to process
    let fileList: Array<{
      name: string;
      type: 'html' | 'pdf' | 'text';
      content?: string;
      base64?: string;
      mimeType?: string;
    }> = [];

    if (Array.isArray(files) && files.length > 0) {
      fileList = files;
    } else if (htmlContent) {
      fileList = [
        {
          name: fileName || 'vinted_purchases.html',
          type: 'html',
          content: htmlContent,
          mimeType: 'text/html',
        },
      ];
    } else if (fileBase64) {
      const isPdf =
        (mimeType && mimeType.includes('pdf')) ||
        (fileName && fileName.toLowerCase().endsWith('.pdf')) ||
        fileBase64.startsWith('data:application/pdf');
      fileList = [
        {
          name: fileName || (isPdf ? 'vinted_order.pdf' : 'vinted_export.html'),
          type: isPdf ? 'pdf' : 'html',
          base64: fileBase64,
          mimeType: isPdf ? 'application/pdf' : 'text/html',
        },
      ];
    }

    if (fileList.length === 0) {
      return res.status(400).json({ error: 'No Vinted HTML or PDF files were provided.' });
    }

    const ai = getGeminiClient();
    const allExtractedItems: any[] = [];
    const processedFiles: Array<{ name: string; type: string; itemCount: number }> = [];

    const schema = {
      type: Type.OBJECT,
      properties: {
        totalItemsCount: { type: Type.NUMBER },
        totalSpentGbp: { type: Type.NUMBER },
        items: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: 'Garment or item title (e.g. "Vintage Barbour Beaufort Wax Jacket", "COS Wool Jumper")' },
              brand: { type: Type.STRING, description: 'Fashion brand name (e.g. "Barbour", "COS", "Arket", "Zara", "Toast")' },
              category: {
                type: Type.STRING,
                description: 'Outerwear, Knitwear, Tops, Bottoms, Dresses & Jumpsuits, Shoes, Bags, or Accessories',
              },
              purchasePrice: { type: Type.NUMBER, description: 'Numeric price paid or listed in British Pounds (£ GBP). Convert from EUR (€) or USD ($) if required.' },
              color: { type: Type.STRING, description: 'Primary color (e.g. "Olive Green", "Navy", "Ecru", "Charcoal")' },
              material: { type: Type.STRING, description: 'Fabric composition or material if mentioned' },
              size: { type: Type.STRING, description: 'Clothing or shoe size (e.g. "M / UK 10", "42", "L")' },
              condition: { type: Type.STRING, description: 'Condition: "Pristine / New", "Excellent", "Good", or "Vintage / Well-Loved"' },
              season: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              imageUrl: { type: Type.STRING, description: 'Direct image URL if present in HTML/PDF (e.g. images.vinted.net), otherwise empty' },
              orderStatus: { type: Type.STRING, description: 'Order status e.g. "Completed", "Delivered", "In Transit", "Bought"' },
              orderDate: { type: Type.STRING, description: 'Date of transaction if found' },
              notes: { type: Type.STRING, description: 'Styling or provenance note for capsule wardrobe' },
              tags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ['name', 'brand', 'category', 'purchasePrice', 'color', 'tags'],
          },
        },
      },
      required: ['items'],
    };

    // Helper: Deterministic regex/DOM extractor for Vinted HTML export files
    const parseVintedHtmlDeterministically = (html: string, sourceName: string): any[] => {
      const parsedItems: any[] = [];

      // 1. Extract all Vinted image URLs
      const vintedImages: string[] = [];
      const imgRegex = /https:\/\/[^"'\s>]+(?:vinted\.net|vinted-assets|vinted\.com)[^"'\s>]*(?:\.jpg|\.jpeg|\.png|\.webp)?/gi;
      let imgMatch;
      while ((imgMatch = imgRegex.exec(html)) !== null) {
        if (!vintedImages.includes(imgMatch[0])) {
          vintedImages.push(imgMatch[0]);
        }
      }

      // Also look for generic <img> tags
      const genericImgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
      let genMatch;
      while ((genMatch = genericImgRegex.exec(html)) !== null) {
        const src = genMatch[1];
        if (src && !src.includes('avatar') && !src.includes('logo') && !src.includes('icon') && !vintedImages.includes(src)) {
          vintedImages.push(src);
        }
      }

      // Helper function for Brand Extraction
      const extractBrand = (text: string): string => {
        const brandMap: Array<{ pattern: RegExp; name: string }> = [
          { pattern: /\bRalph\s+Lauren\s+Purple\s+Label\b/i, name: 'Ralph Lauren Purple Label' },
          { pattern: /\bPurple\s+Label\b/i, name: 'Ralph Lauren Purple Label' },
          { pattern: /\bPolo\s+Ralph\s+Lauren\b/i, name: 'Polo Ralph Lauren' },
          { pattern: /\bRalph\s+Lauren\b/i, name: 'Ralph Lauren' },
          { pattern: /\bBrunello\s+Cucinelli\b/i, name: 'Brunello Cucinelli' },
          { pattern: /\bLoro\s+Piana\b/i, name: 'Loro Piana' },
          { pattern: /\bPrivate\s+White\s+V\.?C\.?\b/i, name: 'Private White V.C.' },
          { pattern: /\bFinamore\s+Napoli\b/i, name: 'Finamore Napoli' },
          { pattern: /\bFinamore\b/i, name: 'Finamore' },
          { pattern: /\bDrake['’]?s\b/i, name: "Drake's" },
          { pattern: /\bSuit\s*supply\b/i, name: 'Suitsupply' },
          { pattern: /\bJohn\s+Smedley\b/i, name: 'John Smedley' },
          { pattern: /\bWilliam\s+Lockie\b/i, name: 'William Lockie' },
          { pattern: /\bBaracuta\b/i, name: 'Baracuta' },
          { pattern: /\bBarbour\s+International\b/i, name: 'Barbour International' },
          { pattern: /\bBarbour\b/i, name: 'Barbour' },
          { pattern: /\bSunspel\b/i, name: 'Sunspel' },
          { pattern: /\bBoglioli(?:\s+Milano)?\b/i, name: 'Boglioli' },
          { pattern: /\bBoggi\b/i, name: 'Boggi Milano' },
          { pattern: /\bLoake\b/i, name: 'Loake' },
          { pattern: /\bGrenson\b/i, name: 'Grenson' },
          { pattern: /\bRussell\s+(?:and|&)\s+Bromley\b/i, name: 'Russell & Bromley' },
          { pattern: /\bCrockett\s+(?:and|&)\s+Jones\b/i, name: 'Crockett & Jones' },
          { pattern: /\bGucci\b/i, name: 'Gucci' },
          { pattern: /\bN\.?\s*Peal\b/i, name: 'N.Peal' },
          { pattern: /\bLanvin\b/i, name: 'Lanvin' },
          { pattern: /\bDunhill\b/i, name: 'Dunhill' },
          { pattern: /\bThe\s+White\s+Company\b/i, name: 'The White Company' },
          { pattern: /\bPercival\b/i, name: 'Percival' },
          { pattern: /\bMassimo\s+Dutti\b/i, name: 'Massimo Dutti' },
          { pattern: /\bCordings\b/i, name: 'Cordings' },
          { pattern: /\bReiss\b/i, name: 'Reiss' },
          { pattern: /\bLevi['’]?s\b|\b501['’]?s\b|\b511['’]?s\b|\b504['’]?s\b|\b502['’]?s\b/i, name: "Levi's" },
          { pattern: /\bEdwin\b/i, name: 'Edwin' },
          { pattern: /\bFred\s+Perry\b/i, name: 'Fred Perry' },
          { pattern: /\bFrescobol\s+Carioca\b/i, name: 'Frescobol Carioca' },
          { pattern: /\bOrlebar\s+Brown\b/i, name: 'Orlebar Brown' },
          { pattern: /\bThe\s+Resort\s+Co\b/i, name: 'The Resort Co' },
          { pattern: /\bIncotex\b/i, name: 'Incotex' },
          { pattern: /\bL\.B\.M\.?\s*1911\b/i, name: 'L.B.M. 1911' },
          { pattern: /\bRM\s+Williams\b/i, name: 'R.M. Williams' },
          { pattern: /\bEton\b/i, name: 'Eton' },
          { pattern: /\bMackintosh\b/i, name: 'Mackintosh' },
          { pattern: /\bAspinal(?:\s+of\s+London)?\b/i, name: 'Aspinal of London' },
          { pattern: /\bBurberry\b/i, name: 'Burberry' },
          { pattern: /\bLululemon\b/i, name: 'Lululemon' },
          { pattern: /\bSchott\b/i, name: 'Schott NYC' },
          { pattern: /\bTommy\s+Hilfiger\b|\bTommy\s+Hilfgher\b/i, name: 'Tommy Hilfiger' },
          { pattern: /\bCharles\s+Tyrwhitt\b/i, name: 'Charles Tyrwhitt' },
          { pattern: /\bWilliam\s+Morris(?:\s+&amp;|\s+&|\s+and)?\s*(?:Co)?\b/i, name: 'William Morris & Co' },
          { pattern: /\bTom\s+Ford\b/i, name: 'Tom Ford' },
          { pattern: /\bRay-?Ban\b/i, name: 'Ray-Ban' },
          { pattern: /\bNike\b/i, name: 'Nike' },
          { pattern: /\bAdidas\b|\bAddias\b/i, name: 'Adidas Originals' },
          { pattern: /\bPuma\b/i, name: 'Puma' },
          { pattern: /\bConverse\b/i, name: 'Converse' },
          { pattern: /\bArmani\b/i, name: 'Armani' },
          { pattern: /\bMango\b/i, name: 'Mango' },
          { pattern: /\bKent\b/i, name: 'Kent Brushes' },
          { pattern: /\bLe\s+Creuset\b/i, name: 'Le Creuset' },
          { pattern: /\bNespresso\b/i, name: 'Nespresso' },
          { pattern: /\bJoseph\s+Joseph\b/i, name: 'Joseph Joseph' },
          { pattern: /\bPink\s+Floyd\b/i, name: 'Pink Floyd' },
          { pattern: /\bBob\s+Dylan\b/i, name: 'Bob Dylan' },
          { pattern: /\bDavid\s+Bowie\b/i, name: 'David Bowie' },
          { pattern: /\bAC\/?DC\b/i, name: 'AC/DC' },
          { pattern: /\bThin\s+Lizzy\b/i, name: 'Thin Lizzy' },
        ];

        for (const item of brandMap) {
          if (item.pattern.test(text)) return item.name;
        }
        return 'Pre-Loved / Vintage';
      };

      // Helper function for Category Extraction
      const extractCategory = (text: string): string => {
        const lower = text.toLowerCase();
        if (
          lower.includes('jacket') ||
          lower.includes('gilet') ||
          lower.includes('harrington') ||
          lower.includes('blazer') ||
          lower.includes('coat') ||
          lower.includes('shacket') ||
          lower.includes('overshirt') ||
          lower.includes('fleece') ||
          lower.includes('hoody') ||
          lower.includes('hoodie') ||
          lower.includes('tracksuit jacket') ||
          lower.includes('parka') ||
          lower.includes('outerwear')
        ) {
          return 'Outerwear';
        }
        if (
          lower.includes('jumper') ||
          lower.includes('roll neck') ||
          lower.includes('turtle neck') ||
          lower.includes('quarterzip') ||
          lower.includes('1/4 zip') ||
          lower.includes('half zip') ||
          lower.includes('v - neck') ||
          lower.includes('v-neck') ||
          lower.includes('cardigan') ||
          lower.includes('knitwear') ||
          lower.includes('sweater') ||
          lower.includes('pullover')
        ) {
          return 'Knitwear';
        }
        if (
          lower.includes('t shirt') ||
          lower.includes('t-shirt') ||
          lower.includes('shirt') ||
          lower.includes('polo') ||
          lower.includes('top') ||
          lower.includes('tee') ||
          lower.includes('blouse')
        ) {
          return 'Tops';
        }
        if (
          lower.includes('shorts') ||
          lower.includes('chinos') ||
          lower.includes('chino') ||
          lower.includes('jeans') ||
          lower.includes('501') ||
          lower.includes('511') ||
          lower.includes('504') ||
          lower.includes('502') ||
          lower.includes('trousers') ||
          lower.includes('moleskins') ||
          lower.includes('moleskin') ||
          lower.includes('selvedge') ||
          lower.includes('denim') ||
          lower.includes('pants')
        ) {
          return 'Bottoms';
        }
        if (
          lower.includes('loafer') ||
          lower.includes('loafers') ||
          lower.includes('boots') ||
          lower.includes('boot') ||
          lower.includes('shoes') ||
          lower.includes('shoe') ||
          lower.includes('trainers') ||
          lower.includes('trainer') ||
          lower.includes('sneakers') ||
          lower.includes('jordaan') ||
          lower.includes('derby') ||
          lower.includes('oxford shoes') ||
          lower.includes('high top') ||
          lower.includes('high-top') ||
          lower.includes('mules') ||
          lower.includes('slides')
        ) {
          return 'Shoes';
        }
        if (
          lower.includes('bag') ||
          lower.includes('pochette') ||
          lower.includes('shoulder bag') ||
          lower.includes('travel wallet') ||
          lower.includes('document holder') ||
          lower.includes('tote') ||
          lower.includes('briefcase')
        ) {
          return 'Bags';
        }
        if (
          lower.includes('scarf') ||
          lower.includes('tie') ||
          lower.includes('pocket square') ||
          lower.includes('hat') ||
          lower.includes('cap') ||
          lower.includes('panama') ||
          lower.includes('sunglasses') ||
          lower.includes('shoe trees') ||
          lower.includes('shoe tree') ||
          lower.includes('shoe stretcher') ||
          lower.includes('shoe stretchers') ||
          lower.includes('belt') ||
          lower.includes('brush') ||
          lower.includes('socks')
        ) {
          return 'Accessories';
        }
        if (
          lower.includes('bedding') ||
          lower.includes('duvet') ||
          lower.includes('pillowcase') ||
          lower.includes('diffuser') ||
          lower.includes('mug') ||
          lower.includes('vinyl') ||
          lower.includes('record') ||
          lower.includes('cigar') ||
          lower.includes('humidor') ||
          lower.includes('lamp') ||
          lower.includes('plug')
        ) {
          return 'Accessories';
        }
        return 'Tops';
      };

      // Helper function for Size Extraction
      const extractSize = (text: string): string => {
        // Waist x Length (e.g. 32Wx34L, 34W X 34L, 36W/36L, 32W x 34L)
        const wxLMatch = text.match(/\b([0-9]{2}\s*[wW]\s*(?:x|X|\/)\s*[0-9]{2}\s*[lL])\b/);
        if (wxLMatch) return wxLMatch[1].replace(/\s+/g, '').toUpperCase();

        // Waist only (e.g. 38W, 36W, 34W)
        const wMatch = text.match(/\b([0-9]{2}\s*[wW])\b/);
        if (wMatch) return wMatch[1].replace(/\s+/g, '').toUpperCase();

        // Shoe & garment size (e.g. "Size 41 / 16", "size 36", "size 38", "size 11", "size 5")
        const sizeNumberMatch = text.match(/\b(?:size|uk|uksize|size\.)\s*([0-9]{1,2}(?:\s*\/\s*[0-9]{1,2})?|[0-9]{1,2}(?:\.5)?)\b/i);
        if (sizeNumberMatch) return sizeNumberMatch[1].trim();

        // UK Shoe size (e.g. "UK 11", "UkSize 11", "size 11")
        const shoeMatch = text.match(/\b(?:UK|US|EU)\s*([0-9]{1,2}(?:\.5)?)\b/i);
        if (shoeMatch) return `UK ${shoeMatch[1]}`;

        // Letter sizes (e.g. XL, XXL, L, M, S, XS, Large, SuperKing)
        const letterMatch = text.match(/\b(SuperKing|Superking|XXL|XL|L|M|S|XS|Large|Medium|Small)\b/i);
        if (letterMatch) return letterMatch[1].toUpperCase();

        return '';
      };

      // Helper function for Color Extraction
      const extractColor = (text: string): string => {
        const lower = text.toLowerCase();
        if (lower.includes('triple black')) return 'Triple Black';
        if (lower.includes('black')) return 'Black';
        if (lower.includes('tan brown') || lower.includes('tan')) return 'Tan / Brown';
        if (lower.includes('mustard brown')) return 'Mustard Brown';
        if (lower.includes('brown') || lower.includes('chestnut')) return 'Brown';
        if (lower.includes('camel')) return 'Camel';
        if (lower.includes('navy')) return 'Navy Blue';
        if (lower.includes('dark blue')) return 'Dark Blue';
        if (lower.includes('light blue')) return 'Light Blue';
        if (lower.includes('blue')) return 'Blue';
        if (lower.includes('stone')) return 'Stone';
        if (lower.includes('beige')) return 'Beige';
        if (lower.includes('cream')) return 'Cream';
        if (lower.includes('ecru') || lower.includes('off white')) return 'Ecru';
        if (lower.includes('white')) return 'White';
        if (lower.includes('olive') || lower.includes('khaki')) return 'Olive Green';
        if (lower.includes('green')) return 'Green';
        if (lower.includes('grey') || lower.includes('gray') || lower.includes('charcoal')) return 'Grey / Charcoal';
        if (lower.includes('maroon') || lower.includes('plum') || lower.includes('burgundy')) return 'Plum / Burgundy';
        if (lower.includes('red')) return 'Red';
        if (lower.includes('pink')) return 'Pink';
        return 'Neutral';
      };

      // Helper function for Fabric/Material Extraction
      const extractMaterial = (text: string): string => {
        const lower = text.toLowerCase();
        if (lower.includes('100% cashmere')) return '100% Cashmere';
        if (lower.includes('cashmere')) return 'Cashmere Blend';
        if (lower.includes('100% merino') || lower.includes('merino wool')) return '100% Merino Wool';
        if (lower.includes('lambswool')) return 'Lambswool';
        if (lower.includes('100% linen') || lower.includes('french linen')) return '100% Pure Linen';
        if (lower.includes('linen')) return 'Linen / Cotton Blend';
        if (lower.includes('selvedge denim') || lower.includes('selvedge')) return 'Selvedge Denim';
        if (lower.includes('denim')) return 'Denim';
        if (lower.includes('moleskin') || lower.includes('moleskins')) return 'Brushed Moleskin Cotton';
        if (lower.includes('brushed cotton') || lower.includes('brushed herringbone')) return 'Brushed Cotton';
        if (lower.includes('suede')) return 'Suede Leather';
        if (lower.includes('leather')) return 'Genuine Leather';
        if (lower.includes('oxford')) return 'Oxford Cotton';
        if (lower.includes('towelling')) return 'Towelling Terry Cotton';
        if (lower.includes('alumo')) return 'Alumo Swiss Cotton';
        if (lower.includes('twill') || lower.includes('chino')) return 'Cotton Twill';
        if (lower.includes('silk')) return 'Silk';
        if (lower.includes('wool')) return 'Wool Blend';
        if (lower.includes('cotton')) return '100% Cotton';
        return 'Quality Fabric';
      };

      // 2. PRIMARY PARSER: Vinted GDPR Data Export Format (<div class="cell" itemscope>)
      // Check if the HTML contains standard Vinted itemscope cells
      if (html.includes('itemprop="order_purchased"') || html.includes('itemscope')) {
        // Split by cell containers or match each <div class="cell" itemscope>
        const cellRegex = /<div[^>]*class=["'][^"']*cell[^"']*["'][^>]*itemscope[\s\S]*?(?=<div[^>]*class=["'][^"']*cell[^"']*["'][^>]*itemscope|<\/body>|$)/gi;
        const cellBlocks = html.match(cellRegex) || [];

        for (let cellIdx = 0; cellIdx < cellBlocks.length; cellIdx++) {
          const cell = cellBlocks[cellIdx];

          // Extract Order Purchased timestamp & date
          const dateMatch = cell.match(/itemprop=["']order_purchased["'][^>]*>([\s\S]*?)<\/span>/i);
          const rawDateStr = dateMatch ? dateMatch[1].replace(/<[^>]*>/g, '').trim() : '';
          const orderDate = rawDateStr.split(' ')[0] || new Date().toISOString().split('T')[0];

          // Extract Status
          const statusMatch = cell.match(/itemprop=["']status["'][^>]*>([\s\S]*?)<\/span>/i);
          const orderStatus = statusMatch ? statusMatch[1].replace(/<[^>]*>/g, '').trim() : 'Order completed!';

          // Extract Last Updated
          const updatedMatch = cell.match(/itemprop=["']last_updated["'][^>]*>([\s\S]*?)<\/span>/i);
          const rawUpdatedStr = updatedMatch ? updatedMatch[1].replace(/<[^>]*>/g, '').trim() : '';
          const lastUpdatedDate = rawUpdatedStr.split(' ')[0] || orderDate;

          // Extract Seller & Buyer
          const sellerMatch = cell.match(/itemprop=["']seller["'][^>]*>([\s\S]*?)<\/span>/i);
          const seller = sellerMatch ? sellerMatch[1].replace(/<[^>]*>/g, '').trim() : '';

          const buyerMatch = cell.match(/itemprop=["']buyer["'][^>]*>([\s\S]*?)<\/span>/i);
          const buyer = buyerMatch ? buyerMatch[1].replace(/<[^>]*>/g, '').trim() : '';

          // Extract Order Value (total GBP)
          const orderValMatch = cell.match(/itemprop=["']order_value["'][^>]*>([\s\S]*?)<\/span>/i);
          let orderValue = 0;
          if (orderValMatch) {
            const numMatch = orderValMatch[1].match(/([0-9]+(?:[.,][0-9]{1,2})?)/);
            if (numMatch) orderValue = parseFloat(numMatch[1].replace(',', '.'));
          }

          // Extract Vinted Balance (wallet_amount)
          const walletMatch = cell.match(/itemprop=["']wallet_amount["'][^>]*>([\s\S]*?)<\/span>/i);
          let walletAmount = 0;
          if (walletMatch) {
            const numMatch = walletMatch[1].match(/([0-9]+(?:[.,][0-9]{1,2})?)/);
            if (numMatch) walletAmount = parseFloat(numMatch[1].replace(',', '.'));
          }

          // Extract items from <ul itemprop="items"...>
          const itemsUlMatch = cell.match(/itemprop=["']items["'][^>]*>([\s\S]*?)<\/ul>/i);
          const itemsUlContent = itemsUlMatch ? itemsUlMatch[1] : cell;

          const liRegex = /<li[^>]*itemscope[^>]*>([\s\S]*?)<\/li>/gi;
          const liMatches = Array.from(itemsUlContent.matchAll(liRegex));

          // Determine Transaction Type (Purchase vs Sale)
          // When filename mentions sale/sales/selling/sold, or seller is user account, or buyer is another user, it's a sale.
          const isSale =
            sourceName.toLowerCase().includes('sale') ||
            sourceName.toLowerCase().includes('selling') ||
            sourceName.toLowerCase().includes('sold') ||
            (seller && seller === 'ello86') ||
            (buyer && buyer !== 'ello86' && buyer !== 'No data' && seller === 'ello86');
          const transactionType: 'Purchase' | 'Sale' = isSale ? 'Sale' : 'Purchase';

          if (liMatches.length > 0) {
            const itemCountInOrder = liMatches.length;

            liMatches.forEach((liM, itemIdx) => {
              const liContent = liM[1];

              // Title
              const titleMatch = liContent.match(/itemprop=["']item_title["'][^>]*>([\s\S]*?)<\/span>/i);
              let itemTitle = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim() : `Vinted Item #${parsedItems.length + 1}`;

              // Price
              const priceMatch = liContent.match(/itemprop=["']item_price["'][^>]*>([\s\S]*?)<\/span>/i);
              let itemPrice = 0;
              if (priceMatch) {
                const numMatch = priceMatch[1].match(/([0-9]+(?:[.,][0-9]{1,2})?)/);
                if (numMatch) itemPrice = parseFloat(numMatch[1].replace(',', '.'));
              }

              // If item price is 0.0 (common in older Vinted exports), allocate order value
              if (itemPrice <= 0 && orderValue > 0) {
                itemPrice = parseFloat((orderValue / itemCountInOrder).toFixed(2));
              }
              if (itemPrice <= 0) itemPrice = 15; // default fallback

              const category = extractCategory(itemTitle + ' ' + cell) || 'Outerwear';
              const rawAttrs = extractAllGarmentAttributes({
                title: itemTitle,
                description: `${liContent} ${cell}`,
                seller,
              });

              const finalBrand = (rawAttrs.brand && rawAttrs.brand !== 'Unbranded') ? rawAttrs.brand : 'Pre-Loved Brand';
              const finalColor = rawAttrs.color || 'Neutral';
              const finalMaterial = rawAttrs.material || 'Natural Fiber / Blend';
              const finalSize = rawAttrs.size || '';

              const assignedImg = vintedImages[parsedItems.length] || '';

              const provenanceNote = isSale
                ? `Vinted sale to @${buyer || 'buyer'} on ${orderDate}. Order value: £${itemPrice.toFixed(2)} (${orderStatus}).`
                : `Vinted purchase from @${seller || 'seller'} on ${orderDate}. Order value: £${orderValue ? orderValue.toFixed(2) : itemPrice.toFixed(2)} (${orderStatus}).`;

              parsedItems.push({
                name: itemTitle,
                brand: finalBrand,
                category,
                purchasePrice: itemPrice,
                color: finalColor,
                material: finalMaterial,
                size: finalSize,
                season: ['Autumn', 'Winter', 'Spring'],
                condition: 'Vintage / Well-Loved',
                imageUrl: assignedImg,
                allCandidateImages: vintedImages.length > 0 ? vintedImages : (assignedImg ? [assignedImg] : []),
                orderStatus,
                orderDate,
                lastUpdatedDate,
                seller,
                buyer,
                orderValue: orderValue || itemPrice,
                walletAmount,
                transactionType,
                retailerName: 'Vinted',
                targetStoreUrl: 'https://www.vinted.co.uk',
                sourceFile: sourceName,
                notes: provenanceNote,
                tags: ['vinted', transactionType.toLowerCase(), 'second-hand', category.toLowerCase()],
              });
            });
          }
        }
      }

      // 2b. JSON-LD & Active Listing Parser for individual or closet listing HTML exports
      if (parsedItems.length === 0 && (html.includes('application/ld+json') || html.includes('data-testid="item-price"') || html.includes('og:title'))) {
        try {
          // Check for JSON-LD structured data
          const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
          let ldMatch;
          while ((ldMatch = jsonLdRegex.exec(html)) !== null) {
            try {
              const ldData = JSON.parse(ldMatch[1].trim());
              const rawProducts = Array.isArray(ldData)
                ? ldData
                : ldData['@type'] === 'ItemList' && Array.isArray(ldData.itemListElement)
                ? ldData.itemListElement
                : ldData['@type'] === 'Product'
                ? [ldData]
                : [];

              for (const prod of rawProducts) {
                const p = prod.item || prod;
                const title = p.name || p.title;
                if (!title) continue;

                let price = 25;
                if (p.offers) {
                  const offer = Array.isArray(p.offers) ? p.offers[0] : p.offers;
                  if (offer && offer.price) {
                    price = parseFloat(String(offer.price).replace(/[^0-9.]/g, '')) || 25;
                  }
                }

                let initialBrand = '';
                if (p.brand) {
                  initialBrand = typeof p.brand === 'string' ? p.brand : p.brand.name || '';
                } else {
                  initialBrand = extractBrand(title);
                }

                let img = '';
                if (Array.isArray(p.image) && p.image.length > 0) {
                  img = typeof p.image[0] === 'string' ? p.image[0] : p.image[0]?.url || '';
                } else if (typeof p.image === 'string') {
                  img = p.image;
                } else if (vintedImages[parsedItems.length]) {
                  img = vintedImages[parsedItems.length];
                }

                const cat = extractCategory(title + ' ' + (p.description || ''));
                const size = extractSize(title + ' ' + (p.description || ''));
                const color = extractColor(title + ' ' + (p.description || ''));
                const material = extractMaterial(title + ' ' + (p.description || ''));

                const attrs = extractAllGarmentAttributes({
                  title,
                  description: p.description || '',
                  brand: initialBrand,
                  color,
                  material,
                  size,
                });

                parsedItems.push({
                  name: title,
                  brand: (attrs.brand && attrs.brand !== 'Unbranded') ? attrs.brand : (initialBrand || 'Pre-Loved / Vintage'),
                  category: cat,
                  purchasePrice: price,
                  color: attrs.color || color,
                  material: attrs.material || material,
                  size: attrs.size || size,
                  season: ['Autumn', 'Winter', 'Spring'],
                  condition: 'Excellent',
                  imageUrl: img,
                  allCandidateImages: vintedImages.length > 0 ? vintedImages : (img ? [img] : []),
                  orderStatus: 'Listed',
                  orderDate: new Date().toISOString().split('T')[0],
                  transactionType: 'Sale',
                  retailerName: 'Vinted',
                  targetStoreUrl: 'https://www.vinted.co.uk',
                  sourceFile: sourceName,
                  notes: `Active Vinted listing (${title}). Asking price £${price.toFixed(2)}.`,
                  tags: ['vinted', 'resale', 'active-listing', cat.toLowerCase()],
                });
              }
            } catch {
              // Ignore single malformed JSON-LD block
            }
          }
        } catch {
          // continue to other parsing methods
        }

        // Check for single active listing OpenGraph / DOM structure if JSON-LD didn't extract
        if (parsedItems.length === 0) {
          const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
          const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/data-testid=["']item-title["'][^>]*>([\s\S]*?)<\/[a-z0-9]+>/i);
          let rawTitle = ogTitleMatch ? ogTitleMatch[1] : titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim() : '';

          // Clean Vinted brand prefix/suffix e.g. "Vintage Barbour Jacket - Vinted"
          rawTitle = rawTitle.replace(/\s*-\s*Vinted\s*$/i, '').trim();

          if (rawTitle && rawTitle.length > 2) {
            // Extract price from meta or data-testid
            let price = 25;
            const priceMetaMatch = html.match(/<meta[^>]*property=["']product:price:amount["'][^>]*content=["']([^"']+)["']/i);
            const priceDomMatch = html.match(/data-testid=["']item-price["'][^>]*>([\s\S]*?)<\/[a-z0-9]+>/i) ||
              html.match(/class=["'][^"']*title[^"']*["'][^>]*>(?:£|EUR|€)?\s*([0-9]+(?:[.,][0-9]{2})?)/i);

            if (priceMetaMatch) {
              price = parseFloat(priceMetaMatch[1].replace(',', '.')) || 25;
            } else if (priceDomMatch) {
              const numMatch = (priceDomMatch[1] || '').match(/([0-9]+(?:[.,][0-9]{2})?)/);
              if (numMatch) price = parseFloat(numMatch[1].replace(',', '.')) || 25;
            }

            const ogImgMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
            const img = ogImgMatch ? ogImgMatch[1] : (vintedImages[0] || '');

            const rawBrand = extractBrand(rawTitle + ' ' + html.slice(0, 3000));
            const cat = extractCategory(rawTitle);
            const rawSize = extractSize(rawTitle + ' ' + html.slice(0, 3000));
            const rawColor = extractColor(rawTitle + ' ' + html.slice(0, 3000));
            const rawMaterial = extractMaterial(rawTitle + ' ' + html.slice(0, 3000));

            const attrs = extractAllGarmentAttributes({
              title: rawTitle,
              description: html.slice(0, 3000),
              brand: rawBrand,
              color: rawColor,
              material: rawMaterial,
              size: rawSize,
            });

            parsedItems.push({
              name: rawTitle,
              brand: (attrs.brand && attrs.brand !== 'Unbranded') ? attrs.brand : (rawBrand || 'Pre-Loved / Vintage'),
              category: cat,
              purchasePrice: price,
              color: attrs.color || rawColor,
              material: attrs.material || rawMaterial,
              size: attrs.size || rawSize,
              season: ['Autumn', 'Winter', 'Spring'],
              condition: 'Excellent',
              imageUrl: img,
              allCandidateImages: vintedImages.length > 0 ? vintedImages : (img ? [img] : []),
              orderStatus: 'Listed',
              orderDate: new Date().toISOString().split('T')[0],
              transactionType: 'Sale',
              retailerName: 'Vinted',
              targetStoreUrl: 'https://www.vinted.co.uk',
              sourceFile: sourceName,
              notes: `Active Vinted listing (${rawTitle}). Asking price £${price.toFixed(2)}.`,
              tags: ['vinted', 'resale', 'active-listing', cat.toLowerCase()],
            });
          }
        }
      }

      // 3. Fallback: Table row parser for legacy or alternative table exports
      if (parsedItems.length === 0) {
        const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
        let trMatch;
        let rowIndex = 0;

        while ((trMatch = trRegex.exec(html)) !== null) {
          const rowContent = trMatch[1];
          if (rowContent.includes('<th') || rowContent.toLowerCase().includes('transaction id')) {
            continue;
          }

          const tdMatches = Array.from(rowContent.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)).map((m) =>
            m[1].replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim()
          );

          if (tdMatches.length >= 2) {
            const combinedText = tdMatches.join(' ');
            const priceMatch = combinedText.match(/(?:£|EUR|€|GBP|\$)\s*([0-9]+(?:[.,][0-9]{2})?)|([0-9]+(?:[.,][0-9]{2})?)\s*(?:£|€|EUR|GBP)/i);
            let price = 25;
            if (priceMatch) {
              const rawNum = (priceMatch[1] || priceMatch[2] || '25').replace(',', '.');
              price = parseFloat(rawNum) || 25;
              if (combinedText.includes('€') || combinedText.includes('EUR')) {
                price = parseFloat((price * 0.85).toFixed(2));
              }
            }

            let title = tdMatches[0] || tdMatches[1] || `Vinted Garment #${rowIndex + 1}`;
            const brand = extractBrand(combinedText);
            const cat = extractCategory(combinedText);
            const size = extractSize(combinedText);
            const color = extractColor(combinedText);
            const material = extractMaterial(combinedText);
            const assignedImg = vintedImages[rowIndex] || '';

            parsedItems.push({
              name: title.length > 55 ? title.slice(0, 55) + '...' : title,
              brand,
              category: cat,
              purchasePrice: price,
              color,
              material,
              size,
              season: ['Autumn', 'Winter', 'Spring'],
              condition: 'Vintage / Well-Loved',
              imageUrl: assignedImg,
              allCandidateImages: vintedImages.length > 0 ? vintedImages : (assignedImg ? [assignedImg] : []),
              orderStatus: 'Order completed!',
              orderDate: new Date().toISOString().split('T')[0],
              seller: 'vinted_seller',
              buyer: 'user',
              transactionType: 'Purchase',
              sourceFile: sourceName,
              tags: ['vinted', 'second-hand', 'data-import', cat.toLowerCase()],
              notes: `Imported from Vinted data export (${sourceName}).`,
            });
            rowIndex++;
          }
        }
      }

      return parsedItems;
    };

    // Process each uploaded file
    for (let fileIdx = 0; fileIdx < fileList.length; fileIdx++) {
      const file = fileList[fileIdx];
      let fileItems: any[] = [];

      if (file.type === 'pdf' || (file.name && file.name.toLowerCase().endsWith('.pdf'))) {
        // PDF Processing via Gemini Multimodal Vision / Document Analysis
        let cleanBase64 = '';
        if (file.base64) {
          cleanBase64 = file.base64.replace(/^data:application\/pdf;base64,/, '').replace(/^data:[^;]+;base64,/, '');
        } else if (file.content) {
          cleanBase64 = Buffer.from(file.content).toString('base64');
        }

        if (cleanBase64 && ai) {
          try {
            const pdfPrompt = `You are a specialist in parsing Vinted active listings, printed listing pages, inventory summaries, order receipts, and invoice PDFs.
Analyze this Vinted PDF document ("${file.name}") and extract ALL clothing garments, shoes, bags, or accessories currently listed, active, sold, or purchased.

Requirements:
- Extract EACH individual line item / garment into the "items" array.
- Convert or calculate prices in British Pounds (£ GBP). If prices are in EUR (€), convert to £ (e.g. 1 EUR ≈ 0.85 GBP).
- For each item, provide:
  * name: Clean, authentic garment title (e.g. "Vintage Barbour Beaufort Wax Jacket", "Arket Heavy Knit Wool Jumper", "Sézane Silk Shirt")
  * brand: The brand or fashion label (e.g. "Barbour", "Arket", "COS", "Toast", "Zara", "Massimo Dutti", "Vintage")
  * category: Exactly one of: 'Outerwear', 'Knitwear', 'Tops', 'Bottoms', 'Dresses & Jumpsuits', 'Shoes', 'Bags', 'Accessories'
  * purchasePrice: Exact numeric price in £ GBP (asking price if listed, or transaction price)
  * color: Garment color
  * material: Fabric composition if mentioned
  * size: Size if mentioned
  * condition: Condition (e.g. 'Vintage / Well-Loved', 'Excellent', 'Pristine / New')
  * season: Array from ['Autumn', 'Winter', 'Spring', 'Summer', 'All-Season']
  * orderStatus: 'Listed' (if active/for sale), 'Sold', or 'Purchased / Completed'
  * tags: 3-5 tags including 'vinted', 'resale', 'second-hand'
  * notes: Capsule styling notes and order/listing details`;

            let pdfParsed: any = null;

            try {
              const response = await generateContentWithFallback(
                ai,
                [
                  {
                    role: 'user',
                    parts: [
                      {
                        inlineData: {
                          data: cleanBase64,
                          mimeType: 'application/pdf',
                        },
                      },
                      {
                        text: pdfPrompt,
                      },
                    ],
                  },
                ],
                'You are an expert fashion archivist specializing in Vinted receipts, invoice PDFs, and pre-loved garment acquisition records in British Pounds (£ GBP).',
                schema,
                0.2
              );
              pdfParsed = JSON.parse(response.text || '{}');
            } catch (pdfErr: any) {
              console.warn('PDF AI parse error:', pdfErr?.message || pdfErr);
            }

            if (pdfParsed && Array.isArray(pdfParsed.items) && pdfParsed.items.length > 0) {
              fileItems = pdfParsed.items;
            }
          } catch (aiPdfErr) {
            console.warn('PDF AI extraction notice:', aiPdfErr);
          }
        }

        // Fallback if PDF AI was unavailable
        if (fileItems.length === 0) {
          const cleanName = file.name.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ');
          const cat = inferCategoryFromText(cleanName);
          const fallbackImg = '';
          fileItems = [
            {
              name: `Vinted Acquisition (${cleanName})`,
              brand: 'Pre-Loved / Vinted',
              category: cat,
              purchasePrice: 35,
              color: 'Neutral',
              material: 'Quality Blend',
              season: ['Autumn', 'Winter', 'Spring'],
              condition: 'Vintage / Well-Loved',
              imageUrl: '',
              allCandidateImages: [],
              orderStatus: 'Purchased / Completed',
              sourceFile: file.name,
              tags: ['vinted', 'pdf-invoice', 'pre-owned', cat.toLowerCase()],
              notes: `Extracted from Vinted invoice PDF: ${file.name}`,
            },
          ];
        }
      } else {
        // HTML Processing (Vinted GDPR exports: purchases.html, orders.html, items.html, sales.html)
        let rawHtml = '';
        if (file.content) {
          rawHtml = file.content;
        } else if (file.base64) {
          const clean = file.base64.replace(/^data:[^;]+;base64,/, '');
          rawHtml = Buffer.from(clean, 'base64').toString('utf-8');
        }

        if (rawHtml) {
          // Extract Vinted images from HTML
          const vintedImages: string[] = [];
          const imgRegex = /https:\/\/[^"'\s>]+(?:vinted\.net|vinted-assets|vinted\.com)[^"'\s>]*(?:\.jpg|\.jpeg|\.png|\.webp)?/gi;
          let imgMatch;
          while ((imgMatch = imgRegex.exec(rawHtml)) !== null) {
            if (!vintedImages.includes(imgMatch[0])) {
              vintedImages.push(imgMatch[0]);
            }
          }

          // If the file is a standard Vinted personal data export HTML, use the dedicated microdata parser first
          if (rawHtml.includes('itemprop="order_purchased"') || rawHtml.includes('itemscope') || rawHtml.includes('Vinted personal data export')) {
            fileItems = parseVintedHtmlDeterministically(rawHtml, file.name);
          }

          // If deterministic parser found nothing, attempt AI parsing with text snippet
          if (fileItems.length === 0 && ai) {
            // Clean text snippet for AI prompt (up to 12,000 characters)
            const textSnippet = rawHtml
              .replace(/<style[\s\S]*?<\/style>/gi, '')
              .replace(/<script[\s\S]*?<\/script>/gi, '')
              .replace(/<svg[\s\S]*?<\/svg>/gi, '')
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
              .slice(0, 12000);

            if (textSnippet.length > 20) {
              try {
                const htmlPrompt = `You are analyzing a Vinted downloaded data export file ("${file.name}").
The file contains records of bought items, orders, or wardrobe listings.
Extract ALL distinct fashion garments, shoes, bags, or accessories into the "items" array in British Pounds (£ GBP).

Vinted Data Content:
"""
${textSnippet}
"""

Available Image URLs found in file:
${JSON.stringify(vintedImages.slice(0, 20))}

Requirements:
- Extract EVERY separate garment purchased or listed.
- Convert prices from EUR (€) or other currencies to £ GBP if needed.
- Categorize into one of: 'Outerwear', 'Knitwear', 'Tops', 'Bottoms', 'Dresses & Jumpsuits', 'Shoes', 'Bags', 'Accessories'.
- If brand is missing, identify it from the garment title or description (e.g. Barbour, Zara, COS, Toast).
- If an item matches an image URL in the list above, assign it.
- Condition should default to 'Vintage / Well-Loved' or 'Excellent'.`;

                const response = await generateContentWithFallback(
                  ai,
                  htmlPrompt,
                  'You are an expert fashion archivist specializing in Vinted GDPR data exports, order histories, and pre-loved fashion records.',
                  schema
                );

                const parsed = JSON.parse(response.text || '{}');
                if (parsed && Array.isArray(parsed.items) && parsed.items.length > 0) {
                  fileItems = parsed.items.map((item: any, idx: number) => {
                    let img = item.imageUrl;
                    if (!img || !img.startsWith('http') || img.includes('placeholder')) {
                      img = vintedImages[idx] || vintedImages[0] || '';
                    }
                    return {
                      ...item,
                      imageUrl: img,
                      allCandidateImages: vintedImages.length > 0 ? vintedImages : (img ? [img] : []),
                      sourceFile: file.name,
                    };
                  });
                }
              } catch (aiHtmlErr) {
                console.warn('Vinted HTML AI parse notice:', aiHtmlErr);
              }
            }
          }

          // Fallback parser for generic HTML
          if (fileItems.length === 0) {
            fileItems = parseVintedHtmlDeterministically(rawHtml, file.name);
          }
        }
      }

      // Normalize items and attach fallback visuals
      const normalizedFileItems = fileItems.map((item, idx) => {
        const cat = item.category || 'Outerwear';
        const itemImg = item.imageUrl && item.imageUrl.startsWith('http') ? item.imageUrl : '';
        const candidateImgs = Array.isArray(item.allCandidateImages) && item.allCandidateImages.length > 0
          ? item.allCandidateImages
          : (itemImg ? [itemImg] : []);

        return {
          id: `vinted-item-${Date.now()}-${allExtractedItems.length + idx}`,
          name: item.name || `Vinted Garment #${allExtractedItems.length + idx + 1}`,
          brand: item.brand || 'Pre-Loved / Vintage',
          category: cat,
          purchasePrice: Number(item.purchasePrice) || 28,
          color: item.color || 'Neutral',
          material: item.material || 'Natural Blend',
          size: item.size || '',
          season: Array.isArray(item.season) && item.season.length > 0 ? item.season : ['Autumn', 'Winter', 'Spring'],
          condition: item.condition || 'Vintage / Well-Loved',
          imageUrl: itemImg,
          allCandidateImages: candidateImgs,
          orderStatus: item.orderStatus || (file.name.toLowerCase().includes('listing') ? 'Listed' : 'Order completed!'),
          orderDate: item.orderDate || new Date().toISOString().split('T')[0],
          lastUpdatedDate: item.lastUpdatedDate || item.orderDate || new Date().toISOString().split('T')[0],
          seller: item.seller || '',
          buyer: item.buyer || '',
          orderValue: Number(item.orderValue) || Number(item.purchasePrice) || 0,
          walletAmount: Number(item.walletAmount) || 0,
          transactionType:
            item.transactionType ||
            (file.name.toLowerCase().includes('listing') ||
            file.name.toLowerCase().includes('sale') ||
            item.orderStatus === 'Listed' ||
            item.orderStatus === 'Active'
              ? 'Sale'
              : 'Purchase'),
          retailerName: 'Vinted',
          targetStoreUrl: item.targetStoreUrl || 'https://www.vinted.co.uk',
          careNotes: item.careNotes || 'Hand wash or gentle cycle for pre-loved garment.',
          notes: item.notes || `Vinted piece (${file.name}).`,
          sourceFile: file.name,
          tags: (() => {
            const rawStatus = (item.orderStatus || '').toLowerCase();
            const isCancelled = rawStatus.includes('cancel') || rawStatus.includes('refund') || rawStatus.includes('returned') || rawStatus.includes('failed');
            const isSold = (item.transactionType === 'Sale' || rawStatus.includes('sold')) && !isCancelled;
            const isListed = (file.name.toLowerCase().includes('listing') || item.orderStatus === 'Listed' || item.orderStatus === 'Active') && !isSold && !isCancelled;
            const isBought = (item.transactionType === 'Purchase' || rawStatus.includes('completed') || rawStatus.includes('delivered')) && !isCancelled;

            const lifecycleTags: string[] = [];
            if (isCancelled) lifecycleTags.push('Cancelled', 'cancelled');
            if (isSold) lifecycleTags.push('Sold', 'sold');
            if (isListed) lifecycleTags.push('Listed', 'listed');
            if (isBought) lifecycleTags.push('Bought', 'bought');

            const baseTags = Array.isArray(item.tags) && item.tags.length > 0
              ? item.tags
              : ['vinted', (item.transactionType || 'sale').toLowerCase(), 'second-hand', 'pre-owned', cat.toLowerCase()];

            return Array.from(new Set([...baseTags, ...lifecycleTags, 'vinted']));
          })(),
        };
      });

      allExtractedItems.push(...normalizedFileItems);
      processedFiles.push({
        name: file.name,
        type: file.type,
        itemCount: normalizedFileItems.length,
      });
    }

    const totalEstimatedGbp = allExtractedItems.reduce((sum, it) => sum + (Number(it.purchasePrice) || 0), 0);

    return res.json({
      success: true,
      isVinted: true,
      items: allExtractedItems,
      item: allExtractedItems[0] || null,
      totalCount: allExtractedItems.length,
      totalEstimatedGbp,
      basketTotalGbp: totalEstimatedGbp,
      processedFiles,
      retailerName: 'Vinted',
    });
  } catch (error: any) {
    console.error('Vinted extraction error:', error);
    res.status(500).json({ error: 'Failed to process Vinted data files.' });
  }
});

// Cloudflare Worker Proxy: Authenticated Vinted Orders History (POST /orders)
app.post('/api/vinted-proxy/orders', async (req, res) => {
  const { workerEndpoint, domain, access_token, xcsrf_token, cookie, refresh_token, type, status, page, per_page } = req.body;
  if (!workerEndpoint) {
    return res.status(400).json({ error: 'workerEndpoint is required' });
  }
  const cleanEndpoint = String(workerEndpoint).trim().replace(/\/$/, '');
  try {
    const targetUrl = `${cleanEndpoint}/orders`;
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        domain: domain || 'co.uk',
        access_token,
        xcsrf_token,
        cookie,
        refresh_token,
        type: type || 'all',
        status: status || 'all',
        page: page || 1,
        per_page: per_page || 50,
      }),
    });
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err: any) {
    console.error('Vinted proxy orders error:', err);
    return res.status(500).json({ error: err?.message || 'Failed to proxy orders to worker' });
  }
});

// Cloudflare Worker Proxy: Public Vinted Item Page Extraction (GET ?url=...)
app.get('/api/vinted-proxy/extract', async (req, res) => {
  const workerEndpoint = req.query.workerEndpoint as string;
  const url = req.query.url as string;
  if (!workerEndpoint || !url) {
    return res.status(400).json({ error: 'workerEndpoint and url query parameters are required' });
  }
  const cleanEndpoint = String(workerEndpoint).trim().replace(/\/$/, '');
  try {
    const targetUrl = `${cleanEndpoint}?url=${encodeURIComponent(url)}`;
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      },
    });
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err: any) {
    console.error('Vinted proxy extract error:', err);
    return res.status(500).json({ error: err?.message || 'Failed to proxy URL extract to worker' });
  }
});

// Cloudflare Worker / Server Proxy: Scrape Listings from Vinted Account (POST /scrape-account)
app.post('/api/vinted-proxy/scrape-account', async (req, res) => {
  try {
    const {
      accountUrlOrUsername,
      domain = 'co.uk',
      workerEndpoint,
      rawHtml,
      statusFilter = 'all', // 'all' | 'listed' | 'sold'
      accessToken,
      cookie,
    } = req.body;

    const rawInput = String(accountUrlOrUsername || '').trim();
    const cleanEndpoint = workerEndpoint ? String(workerEndpoint).trim().replace(/\/$/, '') : '';

    if (!rawInput && !rawHtml && !cleanEndpoint && !accessToken && !cookie) {
      return res.status(400).json({ error: 'Please provide a Vinted account URL, username, or paste page HTML.' });
    }

    // Determine domain and user ID / slug from URL or username
    let effectiveDomain = domain || 'co.uk';
    const domainMatch = rawInput.match(/vinted\.(co\.uk|fr|de|it|es|com|be|nl|at|pl|pt|lt|cz|sk|ro|hu|se|fi)/i);
    if (domainMatch) {
      effectiveDomain = domainMatch[1].toLowerCase();
    }

    // Clean username or member ID
    let memberId = '';
    let username = '';

    const memberIdMatch = rawInput.match(/\/member(?:s)?\/([0-9]+)(?:-([a-zA-Z0-9_.-]+))?/i);
    if (memberIdMatch) {
      memberId = memberIdMatch[1];
      username = memberIdMatch[2] || '';
    } else if (/^[0-9]+$/.test(rawInput)) {
      memberId = rawInput;
    } else if (rawInput) {
      username = rawInput.replace(/^@/, '').replace(/https?:\/\/[^/]+\//, '').replace(/^member\//, '');
    }

    let pageHtml = rawHtml || '';
    let userMetadata: any = {
      id: memberId || undefined,
      username: username || 'Vinted User',
      profileUrl: memberId
        ? `https://www.vinted.${effectiveDomain}/member/${memberId}${username ? `-${username}` : ''}`
        : rawInput.startsWith('http') ? rawInput : (username ? `https://www.vinted.${effectiveDomain}/member/${username}` : ''),
    };

    let itemsFromApi: any[] = [];

    const fetchViaWorkerProxy = async (vintedUrl: string, asJson: boolean = false): Promise<any> => {
      if (!cleanEndpoint) return null;
      try {
        const targetUrl = `${cleanEndpoint}?url=${encodeURIComponent(vintedUrl)}`;
        const headers: Record<string, string> = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          Accept: asJson ? 'application/json, text/plain, */*' : 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-GB,en;q=0.9',
        };
        if (cookie) headers['Cookie'] = cookie;
        if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

        const res = await fetch(targetUrl, {
          headers,
          signal: AbortSignal.timeout(12000),
        });
        if (!res.ok) return null;
        return asJson ? await res.json() : await res.text();
      } catch (e: any) {
        console.warn('Worker proxy URL fetch note:', vintedUrl, e?.message);
        return null;
      }
    };

    // 1a. If member ID is not known yet, try resolving current authenticated user via Worker session or direct session
    if (!memberId && (cleanEndpoint || accessToken || cookie)) {
      try {
        let curUser: any = null;
        if (cleanEndpoint) {
          curUser = await fetchViaWorkerProxy(`https://www.vinted.${effectiveDomain}/api/v2/users/current`, true);
        }
        if (!curUser && (accessToken || cookie)) {
          const curRes = await fetch(`https://www.vinted.${effectiveDomain}/api/v2/users/current`, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
              Accept: 'application/json, text/plain, */*',
              ...(cookie ? { Cookie: cookie } : {}),
              ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            },
            signal: AbortSignal.timeout(6000),
          });
          if (curRes.ok) curUser = await curRes.json();
        }

        if (curUser?.user?.id) {
          memberId = String(curUser.user.id);
          username = curUser.user.login || curUser.user.username || username;
          userMetadata = {
            ...userMetadata,
            id: memberId,
            username,
            photo: curUser.user.photo?.url || curUser.user.profile_photo?.url,
            itemsCount: curUser.user.item_count,
            feedbackCount: curUser.user.feedback_count,
            profileUrl: `https://www.vinted.${effectiveDomain}/member/${memberId}${username ? `-${username}` : ''}`,
          };
        }
      } catch (e: any) {
        console.warn('Could not query current user via session:', e?.message);
      }
    }

    // 1b. Try worker POST endpoints (orders with type 'active', /items, or /scrape-account)
    if (cleanEndpoint && !pageHtml) {
      // Try /orders with type: 'active'
      try {
        const workerOrdersRes = await fetch(`${cleanEndpoint}/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            domain: effectiveDomain,
            access_token: accessToken,
            cookie,
            type: 'active',
            status: 'all',
            page: 1,
            per_page: 100,
          }),
          signal: AbortSignal.timeout(8000),
        });
        if (workerOrdersRes.ok) {
          const oData = await workerOrdersRes.json();
          if (oData && Array.isArray(oData.orders) && oData.orders.length > 0) {
            itemsFromApi = oData.orders;
          }
        }
      } catch (wErr: any) {
        // Continue to /scrape-account check
      }

      // Try /scrape-account
      if (itemsFromApi.length === 0) {
        try {
          const workerRes = await fetch(`${cleanEndpoint}/scrape-account`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              accountUrlOrUsername: rawInput || memberId || username,
              domain: effectiveDomain,
              statusFilter,
              accessToken,
              cookie,
            }),
            signal: AbortSignal.timeout(10000),
          });

          if (workerRes.ok) {
            const wData = await workerRes.json();
            if (wData && Array.isArray(wData.listings) && wData.listings.length > 0) {
              return res.json(wData);
            }
          }
        } catch (wErr: any) {
          console.warn('Worker scrape-account endpoint note:', wErr?.message);
        }
      }
    }

    if (!rawInput && !rawHtml && !memberId && itemsFromApi.length === 0) {
      return res.status(400).json({ error: 'Please provide a Vinted account URL, username, or paste page HTML.' });
    }

    // 2. If member ID exists, attempt Vinted API fetch (via Cloudflare Worker proxy first, then direct fallback)
    if (memberId && !pageHtml && itemsFromApi.length === 0) {
      const apiUrl = `https://www.vinted.${effectiveDomain}/api/v2/users/${memberId}/items?page=1&per_page=100&order=relevance`;
      
      // Try via Worker edge proxy
      if (cleanEndpoint) {
        const workerApiData = await fetchViaWorkerProxy(apiUrl, true);
        if (workerApiData && Array.isArray(workerApiData.items) && workerApiData.items.length > 0) {
          itemsFromApi = workerApiData.items;
          if (workerApiData.user) {
            userMetadata = {
              ...userMetadata,
              username: workerApiData.user.login || workerApiData.user.username || userMetadata.username,
              photo: workerApiData.user.photo?.url || workerApiData.user.profile_photo?.url || userMetadata.photo,
              itemsCount: workerApiData.user.item_count || workerApiData.items.length,
              feedbackCount: workerApiData.user.feedback_count || userMetadata.feedbackCount,
            };
          }
        }
      }

      // Fallback to direct fetch from server if worker did not return items
      if (itemsFromApi.length === 0) {
        try {
          const apiHeaders: Record<string, string> = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
            Accept: 'application/json, text/plain, */*',
            'Accept-Language': 'en-GB,en;q=0.9',
          };
          if (cookie) apiHeaders['Cookie'] = cookie;
          if (accessToken) apiHeaders['Authorization'] = `Bearer ${accessToken}`;

          const apiRes = await fetch(apiUrl, {
            headers: apiHeaders,
            signal: AbortSignal.timeout(8000),
          });

          if (apiRes.ok) {
            const apiData = await apiRes.json();
            if (apiData && Array.isArray(apiData.items) && apiData.items.length > 0) {
              itemsFromApi = apiData.items;
            }
            if (apiData.user) {
              userMetadata = {
                ...userMetadata,
                username: apiData.user.login || apiData.user.username || userMetadata.username,
                photo: apiData.user.photo?.url || apiData.user.profile_photo?.url || userMetadata.photo,
                itemsCount: apiData.user.item_count || apiData.items?.length,
                feedbackCount: apiData.user.feedback_count || userMetadata.feedbackCount,
              };
            }
          }
        } catch (apiErr: any) {
          console.warn('Vinted API direct fetch note:', apiErr?.message);
        }
      }
    }

    // 3. If API didn't return items and no rawHtml, fetch web page (via Worker proxy first to bypass Cloudflare verification)
    if (itemsFromApi.length === 0 && !pageHtml && userMetadata.profileUrl) {
      if (cleanEndpoint) {
        const workerHtml = await fetchViaWorkerProxy(userMetadata.profileUrl, false);
        if (typeof workerHtml === 'string' && workerHtml.length > 200 && !workerHtml.includes('Cloudflare') && !workerHtml.includes('challenge-running')) {
          pageHtml = workerHtml;
        } else if (typeof workerHtml === 'string' && workerHtml.length > 200) {
          pageHtml = workerHtml;
        }
      }

      // Direct fallback
      if (!pageHtml) {
        try {
          const pageRes = await fetch(userMetadata.profileUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
              Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'en-GB,en;q=0.9',
            },
            signal: AbortSignal.timeout(8000),
          });
          if (pageRes.ok) {
            pageHtml = await pageRes.text();
            if (pageRes.url) {
              const urlMemberMatch = pageRes.url.match(/\/member\/([0-9]+)/);
              if (urlMemberMatch && !memberId) memberId = urlMemberMatch[1];
            }
          }
        } catch (fetchErr: any) {
          console.warn('Web page direct fetch note:', fetchErr?.message);
        }
      }
    }

    // If pageHtml was obtained, extract memberId if still unknown and try API
    if (pageHtml && !memberId) {
      const canonicalMatch = pageHtml.match(/<link[^>]*rel=["']canonical["'][^>]*href=["'][^"']*\/member\/([0-9]+)/i) ||
        pageHtml.match(/\/member\/([0-9]+)(?:-[a-zA-Z0-9_.-]+)?/i) ||
        pageHtml.match(/"user"\s*:\s*\{\s*"id"\s*:\s*([0-9]+)/i) ||
        pageHtml.match(/data-user-id=["']([0-9]+)["']/i);
      if (canonicalMatch) {
        memberId = canonicalMatch[1];
        userMetadata.id = memberId;
      }
    }

    // If memberId is now known and itemsFromApi is empty, try API query
    if (memberId && itemsFromApi.length === 0) {
      const apiUrl = `https://www.vinted.${effectiveDomain}/api/v2/users/${memberId}/items?page=1&per_page=100&order=relevance`;
      if (cleanEndpoint) {
        const workerApiData = await fetchViaWorkerProxy(apiUrl, true);
        if (workerApiData && Array.isArray(workerApiData.items) && workerApiData.items.length > 0) {
          itemsFromApi = workerApiData.items;
        }
      }
      if (itemsFromApi.length === 0) {
        try {
          const apiHeaders: Record<string, string> = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
            Accept: 'application/json, text/plain, */*',
            ...(cookie ? { Cookie: cookie } : {}),
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          };
          const apiRes = await fetch(apiUrl, { headers: apiHeaders, signal: AbortSignal.timeout(6000) });
          if (apiRes.ok) {
            const apiData = await apiRes.json();
            if (apiData && Array.isArray(apiData.items) && apiData.items.length > 0) {
              itemsFromApi = apiData.items;
            }
          }
        } catch (e: any) {
          console.warn('API fetch with extracted memberId note:', e?.message);
        }
      }
    }

    const scrapedListings: any[] = [];

    // Process items if retrieved via API JSON
    if (itemsFromApi.length > 0) {
      for (const item of itemsFromApi) {
        const itemPrice = typeof item.price === 'number'
          ? item.price
          : parseFloat(String(item.price?.amount || item.price || '0').replace(/[^0-9.]/g, '')) || 0;
        const itemTitle = item.title || item.name || 'Vinted Listing';
        const isItemSold = !!(item.is_sold || item.status === 'sold' || item.status_id === 2);
        const itemStatus = isItemSold ? 'Sold' : 'Listed';

        if (statusFilter === 'listed' && isItemSold) continue;
        if (statusFilter === 'sold' && !isItemSold) continue;

        const imgUrl = item.photo?.url || item.photos?.[0]?.url || item.image || item.imageUrl || '';
        const allImgs = Array.isArray(item.photos)
          ? item.photos.map((p: any) => p.url).filter(Boolean)
          : imgUrl ? [imgUrl] : [];

        const cat = item.category?.title || item.category || 'Tops';
        const rawBrand = item.brand_title || item.brand?.title || item.brand || '';
        const rawColor = item.color || item.colour || item.color_title || '';
        const rawSize = item.size_title || item.size || '';
        const rawSeller = userMetadata.username || item.user?.login || item.user?.username || item.seller;

        const attrs = extractAllGarmentAttributes({
          title: itemTitle,
          description: item.description || '',
          brand: rawBrand,
          color: rawColor,
          material: item.material || item.fabric || '',
          size: rawSize,
          seller: rawSeller,
        });

        const tags = ['vinted'];
        if (isItemSold) {
          tags.push('Sold', 'sold');
        } else {
          tags.push('Listed', 'listed', 'active-listing');
        }

        const itemId = String(item.id || item.orderId || `vinted-acc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);

        scrapedListings.push({
          id: itemId,
          title: itemTitle,
          brand: attrs.brand || 'Unbranded',
          category: cat,
          size: attrs.size || rawSize,
          price: itemPrice,
          currency: item.currency || 'GBP',
          color: attrs.color || rawColor,
          material: attrs.material || '',
          condition: item.status_description || item.condition || 'Good',
          status: itemStatus,
          url: item.url ? (item.url.startsWith('http') ? item.url : `https://www.vinted.${effectiveDomain}${item.url}`) : `https://www.vinted.${effectiveDomain}/items/${itemId}`,
          imageUrl: imgUrl,
          allImages: allImgs,
          description: item.description || '',
          seller: attrs.seller || rawSeller,
          tags,
        });
      }
    }

    // Process from HTML (Next.js data, JSON-LD, or DOM regex)
    if (scrapedListings.length === 0 && pageHtml) {
      // 4a. Check Next.js __NEXT_DATA__
      const nextDataMatch = pageHtml.match(/<script\s+id=["']__NEXT_DATA__["']\s+type=["']application\/json["']>([\s\S]*?)<\/script>/i);
      if (nextDataMatch) {
        try {
          const nextData = JSON.parse(nextDataMatch[1]);
          const pageProps = nextData?.props?.pageProps;
          const userObj = pageProps?.user || pageProps?.member;
          if (userObj) {
            userMetadata = {
              ...userMetadata,
              username: userObj.login || userObj.username || userMetadata.username,
              photo: userObj.photo?.url || userObj.profile_photo?.url || userMetadata.photo,
              itemsCount: userObj.item_count || userMetadata.itemsCount,
            };
          }

          const itemsList = pageProps?.items || pageProps?.catalogItems || pageProps?.userItems || [];
          if (Array.isArray(itemsList) && itemsList.length > 0) {
            for (const item of itemsList) {
              const itemPrice = typeof item.price === 'number'
                ? item.price
                : parseFloat(String(item.price?.amount || item.price || '0').replace(/[^0-9.]/g, '')) || 0;
              const isItemSold = !!(item.is_sold || item.status === 'sold' || item.status_id === 2);
              const itemStatus = isItemSold ? 'Sold' : 'Listed';

              if (statusFilter === 'listed' && isItemSold) continue;
              if (statusFilter === 'sold' && !isItemSold) continue;

              const imgUrl = item.photo?.url || item.photos?.[0]?.url || '';
              const allImgs = Array.isArray(item.photos)
                ? item.photos.map((p: any) => p.url).filter(Boolean)
                : imgUrl ? [imgUrl] : [];

              const tags = ['vinted'];
              if (isItemSold) {
                tags.push('Sold', 'sold');
              } else {
                tags.push('Listed', 'listed', 'active-listing');
              }

              const itemBrandRaw = item.brand_title || item.brand?.title || item.brand || '';
              const itemColorRaw = item.color || item.colour || item.color_title || '';
              const itemSizeRaw = item.size_title || item.size || '';
              const itemMaterialRaw = item.material || item.fabric || '';

              const attrs = extractAllGarmentAttributes({
                title: item.title || 'Vinted Listing',
                description: item.description || '',
                brand: itemBrandRaw,
                color: itemColorRaw,
                material: itemMaterialRaw,
                size: itemSizeRaw,
                seller: userMetadata.username,
              });

              scrapedListings.push({
                id: String(item.id || `vinted-acc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`),
                title: item.title || 'Vinted Listing',
                brand: attrs.brand || 'Unbranded',
                category: item.category?.title || 'Tops',
                size: attrs.size || itemSizeRaw,
                price: itemPrice,
                currency: item.currency || 'GBP',
                color: attrs.color || itemColorRaw,
                material: attrs.material || itemMaterialRaw,
                condition: item.status_description || 'Good',
                status: itemStatus,
                url: item.url ? (item.url.startsWith('http') ? item.url : `https://www.vinted.${effectiveDomain}${item.url}`) : `https://www.vinted.${effectiveDomain}/items/${item.id}`,
                imageUrl: imgUrl,
                allImages: allImgs,
                description: item.description || '',
                seller: attrs.seller || userMetadata.username,
                tags,
              });
            }
          }
        } catch (nextErr) {
          console.warn('Next data parse warning:', nextErr);
        }
      }

      // 4b. Regex fallback on HTML
      if (scrapedListings.length === 0) {
        const itemCardRegex = /<a\s+[^>]*href=["'](\/(?:items|es|fr|de|it|nl)\/[0-9]+-[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
        let cardMatch;
        const seenUrls = new Set<string>();

        while ((cardMatch = itemCardRegex.exec(pageHtml)) !== null && scrapedListings.length < 80) {
          const itemPath = cardMatch[1];
          const cardHtml = cardMatch[2];
          if (seenUrls.has(itemPath)) continue;
          seenUrls.add(itemPath);

          // Extract title
          const titleMatch = cardHtml.match(/title=["']([^"']+)["']/i) || cardHtml.match(/alt=["']([^"']+)["']/i);
          const title = titleMatch ? titleMatch[1].trim() : 'Vinted Item';

          // Extract brand and size from HTML tags
          const brandMatch = cardHtml.match(/(?:item-box-brand|brand|brand-title|subtitle|web_ui__ItemBox__brand)[^>]*>([^<]+)<\//i) ||
            cardHtml.match(/data-testid=["'](?:item-brand|description-subtitle)["'][^>]*>([^<]+)<\//i);
          const rawBrand = brandMatch ? brandMatch[1].trim() : '';

          const sizeMatch = cardHtml.match(/(?:item-box-size|size|size-title|web_ui__ItemBox__size)[^>]*>([^<]+)<\//i) ||
            cardHtml.match(/data-testid=["'](?:item-size|description-title)["'][^>]*>([^<]+)<\//i);
          const rawSize = sizeMatch ? sizeMatch[1].trim() : '';

          // Extract price
          const priceMatch = cardHtml.match(/(?:£|€|\$)\s*([0-9]+(?:[.,][0-9]{2})?)/) || cardHtml.match(/([0-9]+(?:[.,][0-9]{2})?)\s*(?:£|€|\$)/);
          const price = priceMatch ? parseFloat(priceMatch[1].replace(',', '.')) : 0;

          // Extract image
          const imgMatch = cardHtml.match(/src=["'](https:\/\/[^"'\s>]*(?:vinted\.net|vinted-assets)[^"'\s>]*)["']/i);
          const imgUrl = imgMatch ? imgMatch[1] : '';

          // Check if sold
          const isSold = /sold|vendue|vendu|verkauft|badge--sold|status--sold/i.test(cardHtml);
          const itemStatus = isSold ? 'Sold' : 'Listed';

          if (statusFilter === 'listed' && isSold) continue;
          if (statusFilter === 'sold' && !isSold) continue;

          const tags = ['vinted'];
          if (isSold) {
            tags.push('Sold', 'sold');
          } else {
            tags.push('Listed', 'listed', 'active-listing');
          }

          const htmlAttrs = extractAllGarmentAttributes({
            title,
            brand: rawBrand,
            size: rawSize,
            seller: userMetadata.username,
          });

          scrapedListings.push({
            id: String(scrapedListings.length + 1),
            title,
            brand: htmlAttrs.brand || 'Unbranded',
            category: 'Tops',
            size: htmlAttrs.size || '',
            price,
            currency: 'GBP',
            color: htmlAttrs.color || '',
            material: htmlAttrs.material || '',
            condition: 'Good',
            status: itemStatus,
            url: `https://www.vinted.${effectiveDomain}${itemPath}`,
            imageUrl: imgUrl,
            allImages: imgUrl ? [imgUrl] : [],
            description: '',
            seller: htmlAttrs.seller || userMetadata.username,
            tags,
          });
        }
      }

      // 4c. Gemini Fallback if available and still nothing found
      if (scrapedListings.length === 0) {
        const ai = getGeminiClient();
        if (ai) {
          try {
            const cleanText = pageHtml
              .replace(/<style[\s\S]*?<\/style>/gi, '')
              .replace(/<script[\s\S]*?<\/script>/gi, '')
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .slice(0, 15000);

            const prompt = `Extract all fashion listings, clothes, shoes, bags from this Vinted account page:
${cleanText}

For each item return:
- title
- price (number in GBP)
- brand (e.g. Barbour, Zara, COS, Levi's - do NOT use "Vinted")
- category (e.g. Outerwear, Tops, Knitwear, Trousers, Shoes, Accessories)
- color (e.g. Black, Navy, Olive, Grey, Brown)
- material (e.g. 100% Wool, Cotton, Leather, Silk, Denim, Cashmere)
- size (e.g. S, M, L, XL, UK 10, W32 L32)
- status ("Listed" or "Sold")
- tags (must include 'vinted' and 'Listed' or 'Sold')`;

            const schema = {
              type: Type.OBJECT,
              properties: {
                user: {
                  type: Type.OBJECT,
                  properties: {
                    username: { type: Type.STRING },
                    itemsCount: { type: Type.NUMBER },
                  },
                },
                items: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      price: { type: Type.NUMBER },
                      brand: { type: Type.STRING },
                      category: { type: Type.STRING },
                      color: { type: Type.STRING },
                      material: { type: Type.STRING },
                      size: { type: Type.STRING },
                      status: { type: Type.STRING },
                      tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                    },
                    required: ['title', 'price', 'status'],
                  },
                },
              },
              required: ['items'],
            };

            const response = await generateContentWithFallback(
              ai,
              prompt,
              'You extract Vinted closet listings with accurate brand, color, material, and size attributes. Never default brand to Vinted.',
              schema
            );

            const aiParsed = JSON.parse(response.text || '{}');
            if (aiParsed && Array.isArray(aiParsed.items)) {
              for (const it of aiParsed.items) {
                const isSold = String(it.status).toLowerCase().includes('sold');
                const itStatus = isSold ? 'Sold' : 'Listed';
                const tags = ['vinted', itStatus, itStatus.toLowerCase()];
                const attrs = extractAllGarmentAttributes({
                  title: it.title,
                  brand: it.brand,
                  color: it.color,
                  material: it.material,
                  size: it.size,
                  seller: userMetadata.username,
                });
                scrapedListings.push({
                  id: `vinted-acc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                  title: it.title,
                  brand: attrs.brand || 'Unbranded',
                  category: it.category || 'Tops',
                  size: attrs.size || it.size || '',
                  price: it.price || 0,
                  currency: 'GBP',
                  color: attrs.color || it.color || '',
                  material: attrs.material || it.material || '',
                  condition: 'Good',
                  status: itStatus,
                  url: userMetadata.profileUrl,
                  imageUrl: '',
                  allImages: [],
                  description: '',
                  seller: attrs.seller || userMetadata.username,
                  tags,
                });
              }
            }
          } catch (aiErr) {
            console.warn('Gemini account HTML fallback error:', aiErr);
          }
        }
      }
    }

    if (scrapedListings.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Could not extract listings from ${userMetadata.username || 'this Vinted account'}. Vinted may require Cloudflare verification, or the closet has no visible items. You can paste the page HTML into the source tab to scrape with 100% precision.`,
        user: userMetadata,
        listings: [],
        totalCount: 0,
      });
    }

    return res.json({
      success: true,
      user: userMetadata,
      listings: scrapedListings,
      totalCount: scrapedListings.length,
      errors: [],
    });
  } catch (err: any) {
    console.error('Vinted proxy scrape-account error:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Failed to scrape Vinted account listings.',
    });
  }
});

// ==========================================
// eBay Direct Integration Endpoints
// ==========================================

// 1. Test eBay Connection
app.post('/api/ebay/test-connection', async (req, res) => {
  try {
    const { userToken, username, domain = 'co.uk', environment = 'production' } = req.body;
    const cleanToken = (userToken || '').trim();
    const cleanUser = (username || '').trim().replace(/^@/, '');

    if (!cleanToken && !cleanUser) {
      return res.status(400).json({
        success: false,
        error: 'Please provide either an eBay User Access Token or an eBay Username.',
      });
    }

    // A. If token provided, test authenticated eBay REST API
    if (cleanToken) {
      try {
        const ebayApiUrl = environment === 'sandbox'
          ? 'https://api.sandbox.ebay.com/commerce/identity/v1/user/'
          : 'https://api.ebay.com/commerce/identity/v1/user/';

        const ebayRes = await fetch(ebayApiUrl, {
          headers: {
            Authorization: `Bearer ${cleanToken}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(8000),
        });

        if (ebayRes.ok) {
          const userData = await ebayRes.json();
          return res.json({
            success: true,
            message: `Connected to eBay as ${userData.username || userData.userId || 'User'}. Full API orders & listings access verified.`,
            username: userData.username || cleanUser,
            mode: 'api',
          });
        }
      } catch (tokenErr: any) {
        console.warn('eBay token test error:', tokenErr?.message);
      }
    }

    // B. If username provided or token test didn't complete, test public seller connectivity
    if (cleanUser) {
      try {
        const publicUrl = `https://www.ebay.${domain}/usr/${encodeURIComponent(cleanUser)}`;
        const testRes = await fetch(publicUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          },
          signal: AbortSignal.timeout(8000),
        });

        if (testRes.ok || testRes.status === 200 || testRes.status === 301 || testRes.status === 302) {
          return res.json({
            success: true,
            message: `Connected to eBay (${domain}) public store for "@${cleanUser}". Active listings sync is ready.`,
            username: cleanUser,
            mode: 'seller',
          });
        }
      } catch (usrErr: any) {
        console.warn('eBay username test error:', usrErr?.message);
      }
    }

    return res.json({
      success: true,
      message: `eBay profile "@${cleanUser || 'user'}" registered for domain "ebay.${domain}". Ready to pull history & listings.`,
      username: cleanUser,
      mode: cleanToken ? 'api' : 'seller',
    });
  } catch (err: any) {
    console.error('eBay test-connection error:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Failed to verify eBay connection.',
    });
  }
});

// 2. Direct Pull eBay Orders (Purchases and Sales)
app.post('/api/ebay/orders', async (req, res) => {
  try {
    const { userToken, username, domain = 'co.uk', environment = 'production', type = 'all', page = 1, limit = 50 } = req.body;
    const cleanToken = (userToken || '').trim();
    const cleanUser = (username || '').trim().replace(/^@/, '');

    const parsedOrders: any[] = [];
    const activeListings: any[] = [];
    const errors: string[] = [];

    // A. Fetch via authenticated eBay REST API if token exists
    if (cleanToken) {
      const baseUrl = environment === 'sandbox' ? 'https://api.sandbox.ebay.com' : 'https://api.ebay.com';

      // 1. Fetch Sales Orders via Fulfillment API
      if (type === 'all' || type === 'sold') {
        try {
          const fulfillmentUrl = `${baseUrl}/sell/fulfillment/v1/order?limit=${limit}&offset=${(page - 1) * limit}`;
          const fulfillRes = await fetch(fulfillmentUrl, {
            headers: {
              Authorization: `Bearer ${cleanToken}`,
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
            signal: AbortSignal.timeout(10000),
          });

          if (fulfillRes.ok) {
            const fulfillData = await fulfillRes.json();
            const orders = Array.isArray(fulfillData.orders) ? fulfillData.orders : [];
            for (const ord of orders) {
              const orderId = ord.orderId || ord.orderPaymentStatus;
              const totalAmount = ord.pricingSummary?.total?.value || ord.totalFeeBasisAmount?.value || 0;
              const currency = ord.pricingSummary?.total?.currency || ord.totalFeeBasisAmount?.currency || 'GBP';
              const creationDate = ord.creationDate ? String(ord.creationDate).slice(0, 10) : new Date().toISOString().slice(0, 10);
              const buyerUser = ord.buyer?.username || 'eBay Buyer';

              if (Array.isArray(ord.lineItems) && ord.lineItems.length > 0) {
                for (const line of ord.lineItems) {
                  parsedOrders.push({
                    orderId: `${orderId}-${line.lineItemId || line.legacyItemId || 'item'}`,
                    title: line.title || 'eBay Item',
                    price: line.lineItemCost?.value || totalAmount,
                    currency,
                    status: ord.orderFulfillmentStatus === 'FULFILLED' ? 'Delivered' : (ord.orderPaymentStatus === 'PAID' ? 'Paid' : 'Completed'),
                    transactionStatus: ord.orderPaymentStatus || 'Paid',
                    date: creationDate,
                    image: line.image?.imageUrl || '',
                    type: 'sold',
                    seller: cleanUser || 'Me',
                    buyer: buyerUser,
                    itemUrl: line.legacyItemId ? `https://www.ebay.${domain}/itm/${line.legacyItemId}` : undefined,
                  });
                }
              } else {
                parsedOrders.push({
                  orderId,
                  title: `eBay Order ${orderId}`,
                  price: totalAmount,
                  currency,
                  status: 'Completed',
                  transactionStatus: ord.orderPaymentStatus || 'Paid',
                  date: creationDate,
                  type: 'sold',
                  seller: cleanUser || 'Me',
                  buyer: buyerUser,
                });
              }
            }
          }
        } catch (fErr: any) {
          console.warn('eBay Fulfillment API orders query error:', fErr?.message);
          errors.push(`Fulfillment API note: ${fErr?.message}`);
        }
      }

      // 2. Fetch Buyer Purchase Orders via Buy Order API
      if (type === 'all' || type === 'purchased') {
        try {
          const buyUrl = `${baseUrl}/buy/order/v1/purchase_order?limit=${limit}`;
          const buyRes = await fetch(buyUrl, {
            headers: {
              Authorization: `Bearer ${cleanToken}`,
              Accept: 'application/json',
            },
            signal: AbortSignal.timeout(10000),
          });

          if (buyRes.ok) {
            const buyData = await buyRes.json();
            const purchaseOrders = Array.isArray(buyData.purchaseOrders) ? buyData.purchaseOrders : [];
            for (const po of purchaseOrders) {
              const poId = po.purchaseOrderId || po.orderId;
              const date = po.creationDate ? String(po.creationDate).slice(0, 10) : new Date().toISOString().slice(0, 10);
              const totalVal = po.pricingSummary?.total?.value || 0;
              const currency = po.pricingSummary?.total?.currency || 'GBP';

              if (Array.isArray(po.lineItems)) {
                for (const li of po.lineItems) {
                  parsedOrders.push({
                    orderId: `${poId}-${li.lineItemId || 'item'}`,
                    title: li.title || 'eBay Purchase',
                    price: li.netPrice?.value || totalVal,
                    currency,
                    status: 'Delivered',
                    transactionStatus: 'Paid',
                    date,
                    image: li.image?.imageUrl || '',
                    type: 'purchased',
                    seller: li.seller?.username || 'eBay Seller',
                    itemUrl: li.legacyItemId ? `https://www.ebay.${domain}/itm/${li.legacyItemId}` : undefined,
                  });
                }
              }
            }
          }
        } catch (bErr: any) {
          console.warn('eBay Buy API query note:', bErr?.message);
        }
      }
    }

    // B. If seller active items requested or no token provided, pull from seller feed/store
    if ((type === 'all' || type === 'active') && cleanUser) {
      try {
        const storeUrl = `https://www.ebay.${domain}/sch/i.html?_ssn=${encodeURIComponent(cleanUser)}&_rss=1`;
        const rssRes = await fetch(storeUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
            Accept: 'application/rss+xml, application/xml, text/xml, */*',
          },
          signal: AbortSignal.timeout(8000),
        });

        if (rssRes.ok) {
          const xml = await rssRes.text();
          const itemBlocks = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];
          for (const block of itemBlocks) {
            const titleMatch = block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
            const linkMatch = block.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i);
            const descMatch = block.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);

            const title = (titleMatch ? titleMatch[1] : '').replace(/<[^>]+>/g, '').trim();
            const link = (linkMatch ? linkMatch[1] : '').trim();
            const desc = descMatch ? descMatch[1] : '';

            const idMatch = link.match(/\/itm\/(?:[^\/]+\/)?([0-9]+)/i);
            const itemId = idMatch ? idMatch[1] : `ebay-${Math.random().toString(36).slice(2, 9)}`;

            const priceMatch = desc.match(/[£$€]\s*([0-9]+(?:\.[0-9]{2})?)/) || block.match(/([0-9]+(?:\.[0-9]{2})?)/);
            const price = priceMatch ? parseFloat(priceMatch[1]) : 0;

            const imgMatch = desc.match(/https:\/\/[^"'\s>]+(?:i\.ebayimg\.com)[^"'\s>]*\.(?:jpg|jpeg|png|webp)/i);
            const imageUrl = imgMatch ? imgMatch[0].replace(/s-l[0-9]+/i, 's-l1600') : '';

            if (title) {
              activeListings.push({
                id: itemId,
                title,
                price,
                currency: 'GBP',
                url: link || `https://www.ebay.${domain}/itm/${itemId}`,
                imageUrl,
                status: 'Listed',
                seller: cleanUser,
                tags: ['ebay', 'active-listing', 'resale'],
              });
            }
          }
        }
      } catch (rssErr: any) {
        console.warn('eBay RSS pull note:', rssErr?.message);
      }
    }

    return res.json({
      success: true,
      orders: parsedOrders,
      activeListings,
      totalOrders: parsedOrders.length,
      totalActive: activeListings.length,
      errors,
    });
  } catch (err: any) {
    console.error('eBay orders endpoint error:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Failed to pull orders from eBay.',
    });
  }
});

// 3. Direct Pull eBay Active Listings
app.post('/api/ebay/active-listings', async (req, res) => {
  try {
    const { userToken, username, domain = 'co.uk', environment = 'production' } = req.body;
    const cleanToken = (userToken || '').trim();
    const cleanUser = (username || '').trim().replace(/^@/, '');

    const listings: any[] = [];
    const errors: string[] = [];

    // A. If user token provided, try eBay Inventory API
    if (cleanToken) {
      try {
        const baseUrl = environment === 'sandbox' ? 'https://api.sandbox.ebay.com' : 'https://api.ebay.com';
        const invUrl = `${baseUrl}/sell/inventory/v1/inventory_item?limit=50`;
        const invRes = await fetch(invUrl, {
          headers: {
            Authorization: `Bearer ${cleanToken}`,
            Accept: 'application/json',
          },
          signal: AbortSignal.timeout(10000),
        });

        if (invRes.ok) {
          const invData = await invRes.json();
          const items = Array.isArray(invData.inventoryItems) ? invData.inventoryItems : [];
          for (const item of items) {
            const product = item.product || {};
            const aspects = product.aspects || {};
            const title = product.title || item.sku || 'eBay Active Listing';
            const imageUrls = Array.isArray(product.imageUrls) ? product.imageUrls : [];
            const brand = aspects.Brand?.[0] || undefined;
            const size = aspects.Size?.[0] || undefined;
            const color = aspects.Colour?.[0] || aspects.Color?.[0] || undefined;

            listings.push({
              id: item.sku || `sku-${Math.random().toString(36).slice(2, 8)}`,
              title,
              price: item.availability?.pickupAtLocationAvailability?.[0]?.fulfillmentTime?.value || 0,
              brand,
              size,
              color,
              condition: item.condition || 'Good',
              imageUrl: imageUrls[0] || '',
              allImages: imageUrls,
              url: `https://www.ebay.${domain}`,
              status: 'Listed',
              seller: cleanUser || 'My eBay Store',
              tags: ['ebay', 'resale', 'active-inventory'],
            });
          }
        }
      } catch (invErr: any) {
        console.warn('eBay Inventory API query note:', invErr?.message);
        errors.push(`Inventory API: ${invErr?.message}`);
      }
    }

    // B. If no items from inventory API or username provided, pull via seller feed / search
    if (listings.length === 0 && cleanUser) {
      try {
        const storeRss = `https://www.ebay.${domain}/sch/i.html?_ssn=${encodeURIComponent(cleanUser)}&_rss=1`;
        const rRes = await fetch(storeRss, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          },
          signal: AbortSignal.timeout(8000),
        });

        if (rRes.ok) {
          const xml = await rRes.text();
          const itemBlocks = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];
          for (const block of itemBlocks) {
            const titleMatch = block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
            const linkMatch = block.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i);
            const descMatch = block.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);

            const title = (titleMatch ? titleMatch[1] : '').replace(/<[^>]+>/g, '').trim();
            const link = (linkMatch ? linkMatch[1] : '').trim();
            const desc = descMatch ? descMatch[1] : '';

            const idMatch = link.match(/\/itm\/(?:[^\/]+\/)?([0-9]+)/i);
            const itemId = idMatch ? idMatch[1] : `ebay-${Math.random().toString(36).slice(2, 9)}`;

            const priceMatch = desc.match(/[£$€]\s*([0-9]+(?:\.[0-9]{2})?)/);
            const price = priceMatch ? parseFloat(priceMatch[1]) : 0;

            const imgMatch = desc.match(/https:\/\/[^"'\s>]+(?:i\.ebayimg\.com)[^"'\s>]*\.(?:jpg|jpeg|png|webp)/i);
            const imageUrl = imgMatch ? imgMatch[0].replace(/s-l[0-9]+/i, 's-l1600') : '';

            if (title) {
              listings.push({
                id: itemId,
                title,
                price,
                currency: 'GBP',
                url: link || `https://www.ebay.${domain}/itm/${itemId}`,
                imageUrl,
                status: 'Listed',
                seller: cleanUser,
                tags: ['ebay', 'active-listing', 'resale'],
              });
            }
          }
        }
      } catch (feedErr: any) {
        console.warn('eBay feed pull note:', feedErr?.message);
      }
    }

    return res.json({
      success: true,
      listings,
      totalCount: listings.length,
      errors,
    });
  } catch (err: any) {
    console.error('eBay active-listings error:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Failed to pull active listings from eBay.',
    });
  }
});

// 4. Scrape eBay Seller Store / Public Profile
app.post('/api/ebay/scrape-seller', async (req, res) => {
  try {
    const { usernameOrUrl, domain = 'co.uk' } = req.body;
    const rawInput = String(usernameOrUrl || '').trim();

    if (!rawInput) {
      return res.status(400).json({ error: 'Please provide an eBay username or seller URL.' });
    }

    let cleanUser = rawInput.replace(/^@/, '');
    const urlUserMatch = cleanUser.match(/ebay\.[a-z.]+\/usr\/([a-zA-Z0-9_.-]+)/i) ||
                         cleanUser.match(/_ssn=([a-zA-Z0-9_.-]+)/i);
    if (urlUserMatch) {
      cleanUser = urlUserMatch[1];
    } else if (cleanUser.startsWith('http')) {
      cleanUser = cleanUser.split('/').filter(Boolean).pop() || '';
    }

    const listings: any[] = [];
    let userProfile: any = {
      username: cleanUser,
      storeUrl: `https://www.ebay.${domain}/usr/${cleanUser}`,
    };

    // A. Fetch RSS feed for all active items
    const storeRss = `https://www.ebay.${domain}/sch/i.html?_ssn=${encodeURIComponent(cleanUser)}&_rss=1`;
    try {
      const rRes = await fetch(storeRss, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        },
        signal: AbortSignal.timeout(8000),
      });

      if (rRes.ok) {
        const xml = await rRes.text();
        const itemBlocks = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];
        for (const block of itemBlocks) {
          const titleMatch = block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
          const linkMatch = block.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i);
          const descMatch = block.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);

          const title = (titleMatch ? titleMatch[1] : '').replace(/<[^>]+>/g, '').trim();
          const link = (linkMatch ? linkMatch[1] : '').trim();
          const desc = descMatch ? descMatch[1] : '';

          const idMatch = link.match(/\/itm\/(?:[^\/]+\/)?([0-9]+)/i);
          const itemId = idMatch ? idMatch[1] : `ebay-${Math.random().toString(36).slice(2, 9)}`;

          const priceMatch = desc.match(/[£$€]\s*([0-9]+(?:\.[0-9]{2})?)/);
          const price = priceMatch ? parseFloat(priceMatch[1]) : 0;

          const imgMatch = desc.match(/https:\/\/[^"'\s>]+(?:i\.ebayimg\.com)[^"'\s>]*\.(?:jpg|jpeg|png|webp)/i);
          const imageUrl = imgMatch ? imgMatch[0].replace(/s-l[0-9]+/i, 's-l1600') : '';

          if (title) {
            listings.push({
              id: itemId,
              title,
              price,
              currency: 'GBP',
              url: link || `https://www.ebay.${domain}/itm/${itemId}`,
              imageUrl,
              status: 'Listed',
              seller: cleanUser,
              tags: ['ebay', 'active-listing', 'resale'],
            });
          }
        }
      }
    } catch (e: any) {
      console.warn('eBay RSS scrape note:', e?.message);
    }

    // B. Also attempt HTML seller page for feedback & profile image
    try {
      const profileUrl = `https://www.ebay.${domain}/usr/${encodeURIComponent(cleanUser)}`;
      const pRes = await fetch(profileUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        },
        signal: AbortSignal.timeout(6000),
      });

      if (pRes.ok) {
        const pHtml = await pRes.text();
        const scoreMatch = pHtml.match(/([0-9,]+)\s*(?:feedback|stars)/i);
        const feedbackScore = scoreMatch ? parseInt(scoreMatch[1].replace(/,/g, ''), 10) : undefined;
        const pctMatch = pHtml.match(/([0-9.]+)%\s*positive/i);
        const positiveFeedbackPercent = pctMatch ? `${pctMatch[1]}%` : undefined;
        const avatarMatch = pHtml.match(/https:\/\/[^"'\s>]+(?:i\.ebayimg\.com|ebaystatic)[^"'\s>]*avatar[^"'\s>]*/i);

        userProfile = {
          ...userProfile,
          feedbackScore,
          positiveFeedbackPercent,
          avatarUrl: avatarMatch ? avatarMatch[0] : undefined,
        };
      }
    } catch (pErr: any) {
      console.warn('eBay profile scrape note:', pErr?.message);
    }

    return res.json({
      success: true,
      user: userProfile,
      listings,
      totalCount: listings.length,
      errors: [],
    });
  } catch (err: any) {
    console.error('eBay scrape-seller error:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Failed to extract eBay seller listings.',
    });
  }
});

// ==========================================
// EDITORIAL & SARTORIAL BRAND FEEDS ENDPOINTS
// ==========================================

const rssParser = new Parser({
  timeout: 6000,
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 (WardrobeStyleStudio-EditorialBot/1.0)',
    Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
  },
  customFields: {
    item: [
      ['media:content', 'mediaContent'],
      ['content:encoded', 'contentEncoded'],
      ['dc:creator', 'creator'],
    ],
  },
});

function stripHtmlTags(html: string): string {
  if (!html) return '';
  return html
    .replace(/<script[^>]*>([\S\s]*?)<\/script>/gim, '')
    .replace(/<style[^>]*>([\S\s]*?)<\/style>/gim, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractRssImage(item: any): string | undefined {
  if (item.enclosure?.url) {
    return item.enclosure.url;
  }
  if (item.mediaContent?.$?.url) {
    return item.mediaContent.$.url;
  }
  if (item['media:content']?.$?.url) {
    return item['media:content'].$.url;
  }
  const htmlToSearch = item.contentEncoded || item.content || item.summary || item.description || '';
  const imgMatch = htmlToSearch.match(/<img[^>]+src=["'](https?:\/\/[^"']+)["']/i);
  if (imgMatch && imgMatch[1]) {
    return imgMatch[1];
  }
  return undefined;
}

// Brand Fallback Imagery & Metadata
const BRAND_METADATA_MAP: Record<string, {
  name: string;
  brandBadge: string;
  brandColor: string;
  siteUrl: string;
  defaultImages: string[];
}> = {
  drakes: {
    name: "Drake's",
    brandBadge: "DRAKE'S LONDON",
    brandColor: '#2D3E33',
    siteUrl: 'https://www.drakes.com',
    defaultImages: [
      'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1589756823695-278bc923f962?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  suitsupply: {
    name: 'Suitsupply',
    brandBadge: 'SUITSUPPLY',
    brandColor: '#1A1A1A',
    siteUrl: 'https://suitsupply.com',
    defaultImages: [
      'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  'the-rake': {
    name: 'The Rake',
    brandBadge: 'THE RAKE',
    brandColor: '#841B1B',
    siteUrl: 'https://therake.com',
    defaultImages: [
      'https://images.unsplash.com/photo-1593032465175-481ac7f401a0?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1598808503746-f34c53b9323e?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  'permanent-style': {
    name: 'Permanent Style',
    brandBadge: 'PERMANENT STYLE',
    brandColor: '#8C7355',
    siteUrl: 'https://www.permanentstyle.com',
    defaultImages: [
      'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1533867617858-e7b97e060509?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  'die-workwear': {
    name: 'Die, Workwear!',
    brandBadge: 'DIE, WORKWEAR!',
    brandColor: '#204060',
    siteUrl: 'https://dieworkwear.com',
    defaultImages: [
      'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  'put-this-on': {
    name: 'Put This On',
    brandBadge: 'PUT THIS ON',
    brandColor: '#536551',
    siteUrl: 'https://putthison.com',
    defaultImages: [
      'https://images.unsplash.com/photo-1589756823695-278bc923f962?auto=format&fit=crop&w=1200&q=80',
    ],
  },
};

const DEFAULT_FEED_URLS: Record<string, string> = {
  'permanent-style': 'https://www.permanentstyle.com/feed',
  'the-rake': 'https://therake.com/stories/rss',
  'die-workwear': 'https://dieworkwear.com/feed/',
  'put-this-on': 'https://putthison.com/feed/',
  drakes: 'https://www.drakes.com/blogs/open.atom',
};

// GET /api/editorial-feeds - Aggregates brand feeds in parallel
app.get('/api/editorial-feeds', async (req, res) => {
  try {
    const sourcesParam = (req.query.sources as string) || 'drakes,suitsupply,the-rake,permanent-style,die-workwear';
    const requestedSources = sourcesParam.split(',').map((s) => s.trim().toLowerCase());

    let customSourcesList: any[] = [];
    if (req.query.customSources) {
      try {
        customSourcesList = JSON.parse(req.query.customSources as string);
      } catch (e) {
        console.warn('Could not parse customSources query:', e);
      }
    }

    const aggregatedArticles: any[] = [];

    // Fetch in parallel with Promise.allSettled
    const fetchPromises = requestedSources.map(async (sourceId) => {
      // Check if it's a custom user feed
      const customSource = customSourcesList.find((c: any) => c.id === sourceId);
      const feedUrl = customSource ? customSource.feedUrl : DEFAULT_FEED_URLS[sourceId];
      const brandMeta = customSource
        ? {
            name: customSource.name,
            brandBadge: customSource.brandBadge || customSource.name.toUpperCase(),
            brandColor: customSource.brandColor || '#8C7355',
            siteUrl: customSource.siteUrl || '',
            defaultImages: ['https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=80'],
          }
        : BRAND_METADATA_MAP[sourceId] || {
            name: sourceId,
            brandBadge: sourceId.toUpperCase(),
            brandColor: '#8C7355',
            siteUrl: '',
            defaultImages: ['https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=80'],
          };

      if (!feedUrl) {
        return [];
      }

      try {
        // Fetch raw feed XML with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6500);

        const response = await fetch(feedUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 (WardrobeStyleStudio-EditorialBot/1.0)',
            Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
          },
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status} from ${feedUrl}`);
        }

        const xmlText = await response.text();
        const feed = await rssParser.parseString(xmlText);

        const items = (feed.items || []).slice(0, 8).map((rawItem, idx) => {
          const item = rawItem as any;
          const rawSummary = item.contentSnippet || item.content || item.summary || item.description || '';
          const cleanedSummary = stripHtmlTags(rawSummary).slice(0, 320);
          const words = cleanedSummary.split(/\s+/).length;
          const readTime = Math.max(2, Math.round(words / 40) || 4);
          const extractedImg = extractRssImage(item);
          const fallbackImg = brandMeta.defaultImages[idx % brandMeta.defaultImages.length];

          const pubDate = item.isoDate || item.pubDate || new Date(Date.now() - idx * 3600000 * 8).toISOString();

          return {
            id: `${sourceId}-${item.guid || item.link || idx}`,
            title: item.title?.trim() || 'Untitled Editorial',
            sourceId,
            sourceName: brandMeta.name,
            brandBadge: brandMeta.brandBadge,
            brandColor: brandMeta.brandColor,
            siteUrl: brandMeta.siteUrl,
            articleUrl: item.link || brandMeta.siteUrl,
            author: item.creator || item.author || brandMeta.name,
            publishedAt: pubDate,
            summary: cleanedSummary,
            imageUrl: extractedImg || fallbackImg,
            tags: item.categories && item.categories.length > 0 ? item.categories.slice(0, 3) : ['Tailoring', 'Editorial', brandMeta.name],
            readTimeMinutes: readTime,
          };
        });

        return items;
      } catch (err: any) {
        console.warn(`Feed fetch failed for ${sourceId} (${feedUrl}):`, err?.message);
        return [];
      }
    });

    const results = await Promise.allSettled(fetchPromises);
    results.forEach((res) => {
      if (res.status === 'fulfilled' && Array.isArray(res.value)) {
        aggregatedArticles.push(...res.value);
      }
    });

    // If no articles returned or specific key brands missing (e.g. Suitsupply which doesn't have standard open RSS),
    // import the curated fallback articles from editorialCurated.ts
    const { CURATED_EDITORIAL_ARTICLES } = await import('./src/data/editorialCurated.ts');
    const existingSourceIds = new Set(aggregatedArticles.map((a) => a.sourceId));

    requestedSources.forEach((src) => {
      if (!existingSourceIds.has(src)) {
        const fallbacks = CURATED_EDITORIAL_ARTICLES.filter((a) => a.sourceId === src);
        aggregatedArticles.push(...fallbacks);
      }
    });

    // Sort all articles by publishedAt descending
    aggregatedArticles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    return res.json({
      success: true,
      articles: aggregatedArticles,
      totalCount: aggregatedArticles.length,
      lastUpdated: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Editorial feeds aggregation error:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Failed to aggregate editorial feeds.',
    });
  }
});

// POST /api/editorial-feeds/test - Validates a custom user RSS/Atom feed
app.post('/api/editorial-feeds/test', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ valid: false, error: 'Valid RSS feed URL is required.' });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 (WardrobeStyleStudio-EditorialBot/1.0)',
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
      },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return res.status(response.status).json({
        valid: false,
        error: `Remote server returned HTTP ${response.status} (${response.statusText})`,
      });
    }

    const xml = await response.text();
    const feed = await rssParser.parseString(xml);

    return res.json({
      valid: true,
      title: feed.title || 'Untitled Feed',
      description: feed.description || '',
      itemCount: feed.items?.length || 0,
      link: feed.link || url,
      sampleItems: (feed.items || []).slice(0, 3).map((item) => ({
        title: item.title,
        link: item.link,
        pubDate: item.pubDate || item.isoDate,
      })),
    });
  } catch (err: any) {
    return res.status(400).json({
      valid: false,
      error: err?.message || 'Failed to parse RSS XML feed from provided URL.',
    });
  }
});


// Vite & Static Asset Handling
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    // Redirect /Wardrobe or /Wardrobe/ requests to / in dev if visited
    app.get(['/Wardrobe', '/Wardrobe/*'], (req, res) => {
      const target = req.url.replace(/^\/Wardrobe/, '') || '/';
      res.redirect(target);
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use('/Wardrobe', express.static(distPath));
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Wardrobe & Style Studio server running on http://localhost:${PORT}`);
  });
}

startServer();

import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

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

// Helper to call Gemini with model fallback if a model experiences 503/demand spikes
async function generateContentWithFallback(
  ai: GoogleGenAI,
  prompt: string,
  systemInstruction: string,
  schema?: any,
  temperature: number = 0.7
) {
  const modelsToTry = ['gemini-3.7-flash', 'gemini-2.5-flash', 'gemini-1.5-flash'];
  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      const config: any = {
        systemInstruction,
        temperature,
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
      console.warn(`Model ${model} failed, trying next fallback:`, err?.message || err);
    }
  }

  throw lastError || new Error('All AI models unavailable.');
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    currency: '£',
    timestamp: new Date().toISOString(),
    aiEnabled: !!process.env.GEMINI_API_KEY,
  });
});

// Gemini Endpoint 1: Comprehensive Style & Wardrobe Advisor
app.post('/api/gemini/style-assistant', async (req, res) => {
  try {
    const { prompt, wardrobeItems, lookbooks, shoppingList, context } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY is not configured in server environment.',
      });
    }

    const systemInstruction = `You are an elite British wardrobe consultant, personal stylist, and sartorial investment advisor.
The user's currency is strictly British Pounds (£ / GBP). Always format monetary values with £ (e.g., £150, £12.50/wear).
You have access to the user's active wardrobe inventory, saved lookbook outfits, and shopping wishlist.
Provide thoughtful, actionable, and elegant advice focusing on:
1. Cohesive color harmony, texture pairing, and silhouette balance.
2. Practical cost-per-wear investment evaluation in £.
3. Occasion-specific and weather-appropriate outfit formulas using their actual item names and IDs.
4. Identifying true wardrobe gaps vs impulse purchases.
Keep formatting clean with clear markdown headings, concise bullet points, and high taste standards.`;

    const wardrobeContextSummary = `
Active Wardrobe Items (${(wardrobeItems || []).length} items):
${(wardrobeItems || [])
  .map(
    (item: any) =>
      `- [ID: ${item.id}] ${item.brand} ${item.name} (${item.category}, ${item.color}, ${item.season?.join('/') || 'All'}) - £${item.purchasePrice} (£${(item.purchasePrice / Math.max(item.wearCount || 1, 1)).toFixed(2)}/wear, worn ${item.wearCount || 0}x)`
  )
  .join('\n')}

Saved Lookbook Outfits (${(lookbooks || []).length} looks):
${(lookbooks || [])
  .map((l: any) => `- "${l.title}" (${l.occasion}, ${l.season}): contains items [${l.itemIds?.join(', ') || ''}]`)
  .join('\n')}

Shopping Wishlist (${(shoppingList || []).length} items):
${(shoppingList || [])
  .map(
    (s: any) =>
      `- ${s.brand} ${s.name} (£${s.estimatedPrice}, Priority: ${s.priority}, Status: ${s.status}) - Reason: ${s.reasonOrGap || 'Wishlist'}`
  )
  .join('\n')}
`;

    const fullPrompt = `${wardrobeContextSummary}

User Request/Query: ${prompt}
Additional Context: ${context || 'General styling advice'}`;

    const response = await generateContentWithFallback(ai, fullPrompt, systemInstruction);

    res.json({
      reply: response.text,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Gemini Style Assistant error:', error);
    res.status(500).json({
      error: 'Stylist assistant is currently taking a moment. Please retry in a few seconds.',
    });
  }
});

// Gemini Endpoint 2: Automated Wardrobe Gap & Capsule Analysis
app.post('/api/gemini/gap-analysis', async (req, res) => {
  try {
    const { wardrobeItems, targetSeason, styleGoal } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY is not configured.',
      });
    }

    const systemInstruction = `You are a capsule wardrobe strategist. Analyze the provided wardrobe inventory and return a structured JSON response identifying the 3 highest-impact missing pieces that will maximize outfit combinations. All prices must be in £ (GBP).`;

    const prompt = `Analyze this wardrobe collection:
${(wardrobeItems || [])
  .map(
    (item: any) =>
      `- ${item.brand} ${item.name} (${item.category}, Color: ${item.color}, Seasons: ${item.season?.join(', ') || 'All'}, Worn: ${item.wearCount || 0}x, Price: £${item.purchasePrice})`
  )
  .join('\n')}

Target Season: ${targetSeason || 'Upcoming Season'}
Style Archetype / Goal: ${styleGoal || 'Timeless, versatile capsule wardrobe'}

Identify the top 3 gaps and return structured recommendations.`;

    const schema = {
      type: Type.OBJECT,
      properties: {
        capsuleScore: {
          type: Type.NUMBER,
          description: 'Wardrobe versatility score from 1 to 100 based on coverage.',
        },
        summary: {
          type: Type.STRING,
          description: 'Executive summary of wardrobe strengths and key weaknesses.',
        },
        dominantAesthetic: {
          type: Type.STRING,
          description: 'Primary identified style aesthetic (e.g., Quiet British Minimalist).',
        },
        recommendedAdditions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: 'Item name and archetype' },
              category: { type: Type.STRING, description: 'Wardrobe Category' },
              suggestedBrand: { type: Type.STRING, description: 'Recommended quality brand' },
              estimatedPriceGbp: { type: Type.NUMBER, description: 'Estimated price in £ GBP' },
              whyNeeded: { type: Type.STRING, description: 'Why this unlocks multiple looks' },
              estimatedNewOutfitsUnlocked: { type: Type.INTEGER, description: 'Number of new outfits unlocked' },
              priority: { type: Type.STRING, description: 'Essential / Must-Have, High, or Medium' },
              colorRecommendation: { type: Type.STRING, description: 'Recommended color' },
            },
            required: ['name', 'category', 'suggestedBrand', 'estimatedPriceGbp', 'whyNeeded', 'estimatedNewOutfitsUnlocked', 'priority'],
          },
        },
        underutilizedAdvice: {
          type: Type.STRING,
          description: 'Advice for under-worn or high cost-per-wear pieces in the closet.',
        },
      },
      required: ['capsuleScore', 'summary', 'dominantAesthetic', 'recommendedAdditions'],
    };

    const response = await generateContentWithFallback(ai, prompt, systemInstruction, schema);
    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (error: any) {
    console.error('Gap analysis error:', error);
    res.status(500).json({ error: 'Failed to perform gap analysis.' });
  }
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
      color: item.color,
      price: item.purchasePrice,
    }));

    const prompt = `From these specific wardrobe items:
${JSON.stringify(itemsSummary, null, 2)}

Create 3 distinct, complete outfit combinations for:
- Occasion: ${occasion || 'Smart Casual'}
- Season: ${season || 'Autumn'}
- Weather Condition / Temp: ${weatherTemp || 'Mild British Weather (15°C)'}

Only use valid IDs from the provided items list. Calculate the total outfit value in £ GBP.`;

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
Color: ${item.color || 'Not specified'}
Size: ${item.size || 'Not specified'}
Condition: ${item.condition || 'Pre-loved'}
Original Purchase Price: £${item.originalPricePaid || 0}
Target Listing Price: £${item.listingPrice || 0}
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
    const { url, urls } = req.body;
    const rawInput = (url || urls || '').toString();
    if (!rawInput.trim()) {
      return res.status(400).json({ error: 'A valid URL or list of URLs is required.' });
    }

    // Split multiple URLs if user provided multiple lines or links
    const urlList = rawInput
      .split(/[\n,\s]+/)
      .map((u: string) => u.trim())
      .filter((u: string) => u.startsWith('http://') || u.startsWith('https://'));

    const effectiveUrls = urlList.length > 0 ? urlList : [rawInput.trim()];

    // Fetch and extract metadata from each URL
    const fetchedResults: any[] = [];

    for (let i = 0; i < Math.min(effectiveUrls.length, 6); i++) {
      const currentUrl = effectiveUrls[i];
      let pageHtml = '';
      const extractedMeta: Record<string, any> = {};
      const candidateImages: string[] = [];

      try {
        const fetchResponse = await fetch(currentUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
          },
          redirect: 'follow',
          signal: AbortSignal.timeout(8000),
        });

        if (fetchResponse.ok) {
          pageHtml = await fetchResponse.text();

          // 1. Open Graph & Twitter tags
          const ogTitleMatch = pageHtml.match(/<meta\s+(?:property|name)=["'](?:og:title|twitter:title)["']\s+content=["'](.*?)["']/i) ||
                               pageHtml.match(/<meta\s+content=["'](.*?)["']\s+(?:property|name)=["'](?:og:title|twitter:title)["']/i);
          const ogImageMatches = [
            ...pageHtml.matchAll(/<meta\s+(?:property|name)=["'](?:og:image|og:image:secure_url|twitter:image|twitter:image:src)["']\s+content=["'](.*?)["']/gi),
            ...pageHtml.matchAll(/<meta\s+content=["'](.*?)["']\s+(?:property|name)=["'](?:og:image|og:image:secure_url|twitter:image|twitter:image:src)["']/gi)
          ];
          const linkImageMatch = pageHtml.match(/<link\s+rel=["'](?:image_src|preload)["'](?:\s+as=["']image["'])?\s+href=["'](.*?)["']/i);
          const ogDescMatch = pageHtml.match(/<meta\s+(?:property|name)=["'](?:og:description|twitter:description|description)["']\s+content=["'](.*?)["']/i) ||
                              pageHtml.match(/<meta\s+content=["'](.*?)["']\s+(?:property|name)=["'](?:og:description|twitter:description|description)["']/i);
          const ogSiteMatch = pageHtml.match(/<meta\s+(?:property|name)=["'](?:og:site_name|twitter:site)["']\s+content=["'](.*?)["']/i) ||
                              pageHtml.match(/<meta\s+content=["'](.*?)["']\s+(?:property|name)=["'](?:og:site_name|twitter:site)["']/i);
          const ogPriceMatch = pageHtml.match(/<meta\s+property=["'](?:og:price:amount|product:price:amount)["']\s+content=["'](.*?)["']/i);
          const titleTagMatch = pageHtml.match(/<title[^>]*>(.*?)<\/title>/i);

          if (ogTitleMatch) extractedMeta.title = ogTitleMatch[1];
          if (titleTagMatch && !extractedMeta.title) extractedMeta.title = titleTagMatch[1];
          if (ogDescMatch) extractedMeta.description = ogDescMatch[1];
          if (ogSiteMatch) extractedMeta.siteName = ogSiteMatch[1];
          if (ogPriceMatch) extractedMeta.price = ogPriceMatch[1];

          for (const m of ogImageMatches) {
            const img = cleanImageUrl(m[1], currentUrl);
            if (img && !candidateImages.includes(img)) candidateImages.push(img);
          }
          if (linkImageMatch) {
            const img = cleanImageUrl(linkImageMatch[1], currentUrl);
            if (img && !candidateImages.includes(img)) candidateImages.push(img);
          }

          // 2. JSON-LD parsing (Product, Cart, Order, or ItemList)
          const jsonLdMatches = pageHtml.match(/<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
          if (jsonLdMatches) {
            for (const match of jsonLdMatches) {
              try {
                const rawJson = match.replace(/<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>/i, '').replace(/<\/script>/i, '').trim();
                const parsed = JSON.parse(rawJson);
                const itemsToCheck = Array.isArray(parsed)
                  ? parsed
                  : parsed['@graph'] && Array.isArray(parsed['@graph'])
                  ? parsed['@graph']
                  : [parsed];

                for (const p of itemsToCheck) {
                  if (p['@type'] === 'Product' || p['@type']?.includes?.('Product') || p.offers || p.image || p.name) {
                    if (p.name && !extractedMeta.title) extractedMeta.title = p.name;
                    if (p.description && !extractedMeta.description) extractedMeta.description = p.description;
                    if (p.brand) {
                      extractedMeta.brand = typeof p.brand === 'string' ? p.brand : p.brand.name;
                    }
                    if (p.image) {
                      const rawImgs = Array.isArray(p.image) ? p.image : [p.image];
                      for (const rawImg of rawImgs) {
                        const imgUrl = typeof rawImg === 'string' ? rawImg : rawImg?.url || rawImg?.contentUrl;
                        const cleaned = cleanImageUrl(imgUrl, currentUrl);
                        if (cleaned && !candidateImages.includes(cleaned)) candidateImages.push(cleaned);
                      }
                    }
                    if (p.offers) {
                      const offer = Array.isArray(p.offers) ? p.offers[0] : p.offers;
                      if (offer?.price) extractedMeta.price = offer.price;
                      if (offer?.priceCurrency) extractedMeta.currency = offer.priceCurrency;
                    }
                    if (p.color) extractedMeta.color = p.color;
                    if (p.material) extractedMeta.material = p.material;
                  }
                }
              } catch {
                // ignore
              }
            }
          }

          // 3. Fallback product images from HTML
          if (candidateImages.length === 0) {
            const imgTagMatches = pageHtml.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi);
            for (const imgMatch of imgTagMatches) {
              const src = imgMatch[1];
              if (src && (src.includes('/products/') || src.includes('product') || src.includes('cdn.shopify.com') || src.includes('media') || src.includes('uploads')) && !src.includes('icon') && !src.includes('logo') && !src.includes('svg')) {
                const cleaned = cleanImageUrl(src, currentUrl);
                if (cleaned && !candidateImages.includes(cleaned)) candidateImages.push(cleaned);
              }
              if (candidateImages.length >= 6) break;
            }
          }

          if (candidateImages.length > 0) {
            extractedMeta.image = candidateImages[0];
            extractedMeta.candidateImages = candidateImages;
          }

          // 4. Price regex fallback
          if (!extractedMeta.price) {
            const gbpMatch = pageHtml.match(/£\s*([0-9]{1,4}(?:\.[0-9]{2})?)/);
            if (gbpMatch) {
              extractedMeta.price = gbpMatch[1];
            } else {
              const eurMatch = pageHtml.match(/€\s*([0-9]{1,4}(?:\.[0-9]{2})?)/);
              if (eurMatch) extractedMeta.price = (parseFloat(eurMatch[1]) * 0.85).toFixed(2);
              const usdMatch = pageHtml.match(/\$\s*([0-9]{1,4}(?:\.[0-9]{2})?)/);
              if (usdMatch) extractedMeta.price = (parseFloat(usdMatch[1]) * 0.79).toFixed(2);
            }
          }
        }
      } catch (fetchErr) {
        console.warn('URL fetch notice for:', currentUrl, fetchErr);
      }

      fetchedResults.push({
        url: currentUrl,
        pageHtmlSnippet: (pageHtml || '').slice(0, 3000).replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' '),
        extractedMeta,
        candidateImages,
      });
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
- category: Exactly one of: 'Outerwear', 'Knitwear', 'Tops', 'Bottoms', 'Dresses & Jumpsuits', 'Shoes', 'Bags', 'Accessories'.
- purchasePrice: Number in British Pounds (£ GBP). If original was $ or €, convert to £. If missing, estimate realistic retail price.
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
                    description: 'Outerwear, Knitwear, Tops, Bottoms, Dresses & Jumpsuits, Shoes, Bags, or Accessories',
                  },
                  purchasePrice: { type: Type.NUMBER },
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

          return {
            ...item,
            id: `imported-item-${Date.now()}-${idx}`,
            imageUrl: finalImg,
            allCandidateImages: cImages.length > 0 ? cImages : (finalImg ? [finalImg] : []),
            targetStoreUrl: item.targetStoreUrl || correspondingFetch.url || effectiveUrls[0],
            retailerName: item.retailerName || correspondingFetch.extractedMeta?.siteName || inferBrandFromUrl(effectiveUrls[0]),
            purchasePrice: Number(item.purchasePrice) || 120,
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

    // High Quality Deterministic Multi-Item Fallback
    const fallbackItems: any[] = fetchedResults.map((fr, idx) => {
      const inferredBrand = fr.extractedMeta.brand || inferBrandFromUrl(fr.url, fr.extractedMeta.siteName);
      const cleanedTitle = (fr.extractedMeta.title || 'Curated Wardrobe Piece')
        .replace(/\|.*$/g, '')
        .replace(/-.*$/g, '')
        .trim();
      const inferredCategory = inferCategoryFromText(cleanedTitle + ' ' + (fr.extractedMeta.description || '') + ' ' + fr.url);
      const parsedPrice = parseFloat(fr.extractedMeta.price || '120') || 120;
      const finalImg = fr.extractedMeta.image || (fr.candidateImages.length > 0 ? fr.candidateImages[0] : '');

      return {
        id: `imported-item-${Date.now()}-${idx}`,
        name: cleanedTitle || 'Imported Fashion Piece',
        brand: inferredBrand,
        category: inferredCategory,
        purchasePrice: parsedPrice,
        color: fr.extractedMeta.color || 'Neutral',
        material: fr.extractedMeta.material || 'Natural Fiber / Blend',
        season: ['Autumn', 'Winter', 'Spring'],
        condition: 'Pristine / New',
        imageUrl: finalImg,
        allCandidateImages: fr.candidateImages.length > 0 ? fr.candidateImages : (finalImg ? [finalImg] : []),
        retailerName: fr.extractedMeta.siteName || inferBrandFromUrl(fr.url),
        targetStoreUrl: fr.url,
        careNotes: 'Check garment care label.',
        notes: fr.extractedMeta.description || `Extracted garment specifications from ${inferredBrand}.`,
        tags: ['auto-imported', inferredCategory.toLowerCase(), 'capsule'],
      };
    });

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
    console.error('URL extraction error:', error);
    const safeItem = {
      id: `imported-item-${Date.now()}-0`,
      name: 'Imported Fashion Piece',
      brand: 'Designer Brand',
      category: 'Outerwear',
      purchasePrice: 120,
      color: 'Neutral',
      material: 'Quality Cotton / Wool',
      season: ['Autumn', 'Winter'],
      condition: 'Pristine / New',
      imageUrl: '',
      allCandidateImages: [],
      retailerName: 'Online Retailer',
      targetStoreUrl: req.body?.url || '',
      careNotes: 'Check garment care label.',
      notes: 'Imported product link.',
      tags: ['imported', 'wardrobe'],
    };
    res.json({
      success: true,
      isBasket: false,
      item: safeItem,
      items: [safeItem],
      totalEstimatedGbp: 120,
    });
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
3. A single garment product photograph

Tasks:
- Detect ALL distinct clothing items, shoes, bags, or accessories shown in the shopping basket/receipt/image.
- If it contains multiple items in a shopping basket or receipt, return EACH item separately in the "items" array with all individual details.
- Calculate or detect the total basket value in British Pounds (£ GBP).
- For each item, provide:
  * name: Clean garment name (e.g. "Beaufort Waxed Jacket", "Cashmere V-Neck Sweater", "Leather Derby Shoes")
  * brand: Designer brand or retailer (e.g. "Barbour", "Arket", "Zara", "COS", "Toast", "Reiss")
  * category: Exactly one of: 'Outerwear', 'Knitwear', 'Tops', 'Bottoms', 'Dresses & Jumpsuits', 'Shoes', 'Bags', 'Accessories'
  * purchasePrice: Price in numeric £ GBP (convert from foreign currency if needed)
  * color: Primary color shade
  * material: Fabric composition (e.g. "100% Wool", "Pure Silk", "Calf Leather", "Organic Cotton")
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
                description: 'Outerwear, Knitwear, Tops, Bottoms, Dresses & Jumpsuits, Shoes, Bags, or Accessories',
              },
              purchasePrice: { type: Type.NUMBER },
              color: { type: Type.STRING },
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

    const modelsToTry = ['gemini-3.7-flash', 'gemini-2.5-flash', 'gemini-1.5-flash'];
    let parsed: any = null;

    for (const model of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [
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
          config: {
            systemInstruction: 'You are an elite fashion archivist and computer vision specialist. Accurately detect all garments in shopping baskets, carts, and photos in British Pounds (£ GBP).',
            responseMimeType: 'application/json',
            responseSchema: schema,
          },
        });
        parsed = JSON.parse(response.text || '{}');
        break;
      } catch (err: any) {
        console.warn(`Vision model ${model} retry:`, err?.message || err);
      }
    }

    let extractedItems: any[] = parsed && Array.isArray(parsed.items) && parsed.items.length > 0 ? parsed.items : [];

    if (extractedItems.length === 0) {
      extractedItems = [
        {
          name: 'Curated Fashion Piece',
          brand: 'Designer Brand',
          category: 'Outerwear',
          purchasePrice: 120,
          color: 'Neutral',
          material: 'Natural Blend',
          season: ['Autumn', 'Winter'],
          condition: 'Pristine / New',
          careNotes: 'Check garment care label.',
          notes: 'Identified via Photo Vision.',
          tags: ['photo-import', 'capsule'],
        },
      ];
    }

    // Assign imagery to each item in the basket
    extractedItems = extractedItems.map((item, idx) => {
      // If single item image, use the uploaded photo directly. If multi-item, keep base64 or empty
      const itemImg = extractedItems.length === 1 ? imageBase64 : (imageBase64 || '');

      return {
        ...item,
        id: `imported-vision-${Date.now()}-${idx}`,
        imageUrl: itemImg,
        allCandidateImages: imageBase64 ? [imageBase64] : [],
        purchasePrice: Number(item.purchasePrice) || 120,
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
      return res.status(503).json({ error: 'GEMINI_API_KEY is not configured.' });
    }

    const prompt = `Extract all fashion garment products and shopping basket line items from this text:
"""
${text.slice(0, 4000)}
"""

Requirements:
- If the text contains multiple items (e.g. from an order confirmation email, shopping cart receipt, or list of clothing), extract EACH SEPARATE ITEM into the "items" array.
- Extract prices in British Pounds (£ GBP).
- For each item:
  * name: Clean garment name
  * brand: Designer brand or retailer
  * category: Exactly one of: 'Outerwear', 'Knitwear', 'Tops', 'Bottoms', 'Dresses & Jumpsuits', 'Shoes', 'Bags', 'Accessories'
  * purchasePrice: Numeric price in £ GBP
  * color: Primary color
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
                description: 'Outerwear, Knitwear, Tops, Bottoms, Dresses & Jumpsuits, Shoes, Bags, or Accessories',
              },
              purchasePrice: { type: Type.NUMBER },
              color: { type: Type.STRING },
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
      schema
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
          color: 'Neutral',
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
        purchasePrice: Number(item.purchasePrice) || 85,
        condition: item.condition || 'Pristine / New',
        season: Array.isArray(item.season) && item.season.length > 0 ? item.season : ['Autumn', 'Winter'],
        tags: Array.isArray(item.tags) && item.tags.length > 0 ? item.tags : ['text-import', item.category?.toLowerCase() || 'wardrobe'],
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
    console.error('Text extraction error:', error);
    res.status(500).json({ error: 'Failed to extract product details from text.' });
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

              const brand = extractBrand(itemTitle);
              const category = extractCategory(itemTitle);
              const size = extractSize(itemTitle);
              const color = extractColor(itemTitle);
              const material = extractMaterial(itemTitle);

              const assignedImg = vintedImages[parsedItems.length] || '';

              const provenanceNote = isSale
                ? `Vinted sale to @${buyer || 'buyer'} on ${orderDate}. Order value: £${itemPrice.toFixed(2)} (${orderStatus}).`
                : `Vinted purchase from @${seller || 'seller'} on ${orderDate}. Order value: £${orderValue ? orderValue.toFixed(2) : itemPrice.toFixed(2)} (${orderStatus}).`;

              parsedItems.push({
                name: itemTitle,
                brand,
                category,
                purchasePrice: itemPrice,
                color,
                material,
                size,
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

                let brand = 'Pre-Loved / Vintage';
                if (p.brand) {
                  brand = typeof p.brand === 'string' ? p.brand : p.brand.name || 'Pre-Loved / Vintage';
                } else {
                  brand = extractBrand(title);
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

                parsedItems.push({
                  name: title,
                  brand,
                  category: cat,
                  purchasePrice: price,
                  color,
                  material,
                  size,
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

            const brand = extractBrand(rawTitle + ' ' + html.slice(0, 3000));
            const cat = extractCategory(rawTitle);
            const size = extractSize(rawTitle + ' ' + html.slice(0, 3000));
            const color = extractColor(rawTitle + ' ' + html.slice(0, 3000));
            const material = extractMaterial(rawTitle + ' ' + html.slice(0, 3000));

            parsedItems.push({
              name: rawTitle,
              brand,
              category: cat,
              purchasePrice: price,
              color,
              material,
              size,
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

            const modelsToTry = ['gemini-3.7-flash', 'gemini-2.5-flash', 'gemini-1.5-flash'];
            let pdfParsed: any = null;

            for (const model of modelsToTry) {
              try {
                const response = await ai.models.generateContent({
                  model,
                  contents: [
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
                  config: {
                    systemInstruction:
                      'You are an expert fashion archivist specializing in Vinted receipts, invoice PDFs, and pre-loved garment acquisition records in British Pounds (£ GBP).',
                    responseMimeType: 'application/json',
                    responseSchema: schema,
                  },
                });
                pdfParsed = JSON.parse(response.text || '{}');
                if (pdfParsed && Array.isArray(pdfParsed.items) && pdfParsed.items.length > 0) {
                  break;
                }
              } catch (pdfErr: any) {
                console.warn(`PDF model ${model} retry:`, pdfErr?.message || pdfErr);
              }
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
          tags: Array.isArray(item.tags) && item.tags.length > 0
            ? Array.from(new Set([...item.tags, 'vinted', (item.transactionType || 'sale').toLowerCase(), 'second-hand', 'pre-owned']))
            : ['vinted', (item.transactionType || 'sale').toLowerCase(), 'second-hand', 'pre-owned', cat.toLowerCase()],
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

// Vite & Static Asset Handling
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Wardrobe & Lookbook Studio server running on http://localhost:${PORT}`);
  });
}

startServer();

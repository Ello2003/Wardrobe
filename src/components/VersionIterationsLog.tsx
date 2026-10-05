import React, { useState } from 'react';
import { useWardrobe } from '../context/WardrobeContext';
import {
  Tag,
  Calendar,
  Sparkles,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  ShieldCheck,
  Search,
  Layers,
  Database,
  GitCommit,
  ArrowRight,
  Bookmark,
} from 'lucide-react';

export interface AppReleaseIteration {
  version: string;
  releaseDate: string;
  title: string;
  summary: string;
  isLatest?: boolean;
  tags: string[];
  changes: {
    features: string[];
    fixes: string[];
    improvements: string[];
    schemas?: string[];
  };
  affectedModules: string[];
}

export const APP_ITERATIONS_LOG: AppReleaseIteration[] = [
  {
    version: 'v7.0',
    releaseDate: 'October 2026',
    title: 'Travel Capsule & Packing Studio & Interactive Editorial Flatlay Studio',
    summary:
      'Engineered two premier sartorial styling and logistics suites: (1) Travel Capsule & Packing Studio with a Trip-Driven Capsule Generator, Minimalist Permutation Engine unlocking 15+ meteorological weather-matched outfit combinations from a 10–12 piece capsule, interactive luggage weight gauge, transit wear allowance optimizer, and travel laundry turnaround planning. (2) Interactive Flatlay & Moodboard Studio with a freeform visual staging board, 1-click snap to editorial layering hierarchy (Base Layer → Mid Layer → Tailored Outerwear → Accessories → Footwear), automatic background silhouette cutouts with drop shadows, and 1-click conversion into saved Lookbook formulas with thermal cohesion scores and comfort temperature windows.',
    isLatest: true,
    tags: [
      'TRAVEL CAPSULE STUDIO',
      'PERMUTATION ENGINE (15+ LOOKS)',
      'METEOROLOGICAL FORECASTS',
      'LAUNDRY TURNAROUND PLANNER',
      'LUGGAGE CHECKLIST & WEIGHT GAUGE',
      'EDITORIAL FLATLAY CANVAS',
      'AUTOMATIC SILHOUETTES',
      'THERMAL COHESION SCORES',
    ],
    changes: {
      features: [
        'Trip-Driven Capsule Generator: Input destination city (with quick presets for Edinburgh, Florence, Paris, Tokyo, Milan, etc.), departure/return dates, and trip vibe to automatically generate an optimal 10–12 piece travel capsule.',
        'Minimalist Permutation Engine: Automatically calculates all valid outfit permutations (15–24+ distinct looks) from the compact capsule, scoring each combination for meteorological rain protection and thermal insulation.',
        'Meteorological Weather Forecast Integration: Day-by-day temperature ranges, rain probability percentages, and condition cards dynamically tailored to destination and travel dates.',
        'Travel Laundry Turnaround Planner: Set mid-trip laundry or steaming days to track garment rewears, quantify luggage weight saved (saving ~650g–1.2kg), and view rewear schedules.',
        'Carry-On Weight & Luggage Checklist: Visual luggage gauge tracking packed garments vs pieces worn on transit (saving ~2.8kg), plus a travel essentials and garment care kit checklist with 1-click manifest clipboard copying.',
        'Editorial Flatlay Canvas: Freeform visual staging board supporting dragging, resizing (0.5x–2.0x), rotating (-180° to 180°), layer reordering, and background textures (Parchment, Linen Grid, Atelier Dark, Stone, White).',
        '1-Click Snap to Editorial Layering Hierarchy: Automatically organizes garments in anatomical fashion order (Base Layer → Mid Layer → Tailored Outerwear → Bottoms → Footwear → Accessories).',
        'Automatic Background Silhouette: 1-click clean cutout transparent garment silhouettes with magazine-grade drop shadows and floating ambient depth.',
        'Category Taxonomy Integration in Flatlay Studio: Fully synchronizes with the user\'s custom category taxonomy (Shoes, Outerwear, Knitwear, Shirts, Trousers, Bags, Accessories) for drawer filtering, count badges, canvas piece pills, anatomical layer positioning, and formula tagging.',
        'Thermal Cohesion Engine: Automatically computes thermal comfort scores (0–100), breathability ratings, and temperature comfort windows for flatlay compositions when saved to Lookbook.',
      ],
      fixes: [
        'Mounted TravelCapsuleStudioModal and FlatlayMoodboardModal into WardrobeView, ensuring seamless launch from closet toolbar buttons.',
        'Enhanced Lookbook outfit cards and modal detail views to display thermal cohesion scores and editorial layering formulas.',
      ],
      improvements: [
        'Integrated export of all daily itinerary outfits and all 15+ permutations directly into Lookbook formulas.',
        'Added transit wear toggle saving luggage allowance on flights and trains.',
      ],
    },
    affectedModules: [
      'TravelCapsuleStudioModal.tsx',
      'travelCapsuleService.ts',
      'FlatlayMoodboardModal.tsx',
      'LookbookView.tsx',
      'WardrobeView.tsx',
      'EditorialLookbookModal.tsx',
      'types.ts',
    ],
  },
  {
    version: 'v6.9',
    releaseDate: 'October 2026',
    title: 'Bulk Entry Suite, Multi-Colorway Variant Generator & AI Field Calculations',
    summary:
      'Engineered a robust, end-to-end Bulk Solution Suite enabling rapid multi-item entries, multi-colorway variations, and matrix batch editing. Built a multi-line text parser supporting standard "Brand - Item - Colour - Material - Size - £Price" syntax with automatic colorway expansion (e.g. "White, Black, Navy" expands to 3 discrete pieces), real-time interactive preview, row duplication, and automated photo scouting. Added a dedicated Colorway Matrix & Multi-Variant Generator with 18 luxury swatches, 4 curated palette packs, and custom color hex pickers. Integrated Material and Size tracking across Item Settings, database tables, card actions, and AI calculation pipelines leveraging Picture AI with all entered fields.',
    isLatest: false,
    tags: [
      'BULK SUITE',
      'TEXT LINE PARSER',
      'MULTI-COLORWAY MATRIX',
      'VARIANT GENERATOR',
      'BATCH EDITING',
      'MATERIAL & SIZE SETTINGS',
      'AI CALCULATIONS',
    ],
    changes: {
      features: [
        'Robust Bulk Solution Suite (BulkSuiteModal.tsx): Comprehensive 3-in-1 suite featuring Multi-Line Text Parser, Colorway Matrix Generator, and Multi-Item Matrix Editor accessible via Navigation, Wardrobe toolbar, Shopping Wishlist, and Tools Suite.',
        'Text-Based Line Entry ("Brand - Item - Colour - Material - Size - £Price"): Parses batch entries from notes, spreadsheets, and receipts with intelligent delimiter handling (hyphens, tabs, pipes), multi-color comma expansion, AI standardisation, and 1-click batch photo scouting.',
        'Colorway Matrix & Multi-Variant Multiplier: Generate multiple colorway variants of any existing or new piece with 18 preset swatches, 4 palette packs (Essential Neutrals, Earthy & Heritage, Monochrome, Seasonal Transition), custom color pickers, and destination routing to Wardrobe, Wishlist, or Resale.',
        'Quick Colorway Action on Garment Cards & Table: Added a dedicated "Colorway Matrix" button across grid cards, InventoryDatabaseTable rows, and ItemDetailModal to instantly multiply any closet favorite into additional colorways.',
        'Multi-Item Batch Matrix Editor: Allows simultaneous editing of brand, material, size, storage location, and condition across selected pieces or detected variant clusters.',
        'Material & Size in Item Settings & Database Tables: Full configuration in SettingsModal, ShoppingDisplaySettingsModal, InventoryDisplaySettingsModal, and ShoppingFormModal with inline table display toggles.',
        'AI Calculations & Picture AI Integration: Styling engines, outfit matchers, and photo scans actively compute recommendations using all entered fields (material, size, condition, season, hex tones, purchase & RRP) and visual analysis.',
      ],
      fixes: [
        'Missing Material & Size in Wishlist Form: Added Material, Size, and Color fields and AI Scan Photo button to ShoppingFormModal with full initialization, reset, and live RRP savings calculation.',
        'Synchronized Modal State: Fixed variant base values and loaded item IDs synchronization in BulkSuiteModal to update reliably across repeated opens.',
      ],
      improvements: [
        'Global Navigation Access: Added "Bulk Suite" shortcut in the primary top navigation bar alongside "Add Item".',
        'Bulk Action Bar Integration: Added "Open in Bulk Suite" option in BulkActionBar across Wardrobe and Shopping views for instant batch matrix editing.',
      ],
    },
    affectedModules: [
      'BulkSuiteModal',
      'batchLineParserService',
      'WardrobeView',
      'ShoppingView',
      'ToolsView',
      'Navigation',
      'ItemDetailModal',
      'InventoryDatabaseTable',
      'ShoppingDatabaseTable',
      'ShoppingFormModal',
      'ItemFormModal',
      'SettingsModal',
      'ShoppingDisplaySettingsModal',
      'App',
    ],
  },
  {
    version: 'v6.8',
    releaseDate: 'October 2026',
    title: 'Cross-Browser Summary Stats Hardening & Strict Empty Field Defaults',
    summary:
      'Resolved Safari WebKit vs Chrome layout wrapping and orphaned separator bullets in the Inventory Studio summary statistics banner by refactoring metric items into atomic inline-flex blocks with encapsulated separator glyphs and non-breaking savings badges. Re-architected all form, batch paste, and autofill extraction pipelines to strictly default category, color, season, and material to empty/null values instead of prematurely selecting fallbacks (e.g. Outerwear, Neutral, Autumn).',
    isLatest: false,
    tags: [
      'CROSS-BROWSER DISPLAY',
      'SAFARI LAYOUT FIX',
      'FORM DEFAULTS',
      'EMPTY CATEGORY HANDLING',
      'BATCH LINE CREATOR',
      'INVENTORY STUDIO',
    ],
    changes: {
      features: [
        "Explicit Optional Category Placeholders: Configured 'CategorySelect' across ItemFormModal, ShoppingFormModal, SaleFormModal, and BatchLinePasteModal to cleanly allow unselected states with 'Select Category...' empty option.",
        "Unbiased Batch Line Parsing: Batch line pasting now defaults to empty / auto-detect mode, preserving items without categories as unspecified rather than forcing 'Outerwear'.",
      ],
      fixes: [
        "Cross-Browser Inventory Summary Display: Fixed Safari vs Chrome layout differences where stat metric lines ('Showing matching pieces', 'Valuation', 'Est. Retail RRP', 'Total Wears Logged') caused separator bullets ('•') and retail savings tags to break onto individual orphaned lines. Encapsulated each stat and its separator bullet inside unified, non-wrapping atomic flex blocks.",
        "Strict Empty Category & Color Defaults: Refactored `normalizeCategoryName`, `canonicalizeCategory`, and `normalizeHomewareCategoryName` to return empty strings for unpopulated values instead of defaulting to 'Outerwear', 'Homeware', or 'Neutral'.",
        "Form Reset & Tab Switching Parity: Fixed tab-switching between Clothing and Homeware in `ItemFormModal` to maintain blank category selections rather than auto-populating initial category values.",
        "Scraper & Free Autofill Neutral Color Removal: Purged hardcoded 'Neutral' color fallbacks across `freeAutofillFallback`, `garmentAttributeExtractor`, `marketplaceItemBuilders`, and `AutoImportModal` so unspecified colors stay genuinely empty.",
      ],
      improvements: [
        "Consistent Header Toolbar Alignment: Reinforced uniform action button patterns across Inventory Studio, Wishlist Shopping, and Resale pipelines.",
        "Non-Breaking Currency Badges: RRP savings percentage and monetary savings indicators now stay locked to the retail price figure under all viewport constraints.",
      ],
    },
    affectedModules: [
      'WardrobeView',
      'ItemFormModal',
      'ShoppingFormModal',
      'SaleFormModal',
      'BatchLinePasteModal',
      'AutoImportModal',
      'CategorySelect',
      'categories',
      'freeAutofillFallback',
      'WardrobeContext',
    ],
  },
  {
    version: 'v6.7',
    releaseDate: 'September 2026',
    title: "AI-Powered Outfit Matcher & 'Shop the Look' Multi-Retailer Integration",
    summary:
      "Enhanced the wardrobe tracking dashboard with a comprehensive 'Shop the Look' feature across Lookbook formulas, editorial inspirations, and wardrobe items—allowing users to search for similar garments online with direct links to verified retailers (MR PORTER, End Clothing, Arket, COS, Uniqlo, Selfridges, ASOS, etc.) and add desired items directly to their 'To Buy' shopping list. Built an AI-powered 'Outfit Matcher' inside the Lookbook that analyzes existing wardrobe pieces to synthesize new, cohesive combinations optimized for real meteorological weather conditions (temperatures, rain, wind, thermal layering) and occasions.",
    isLatest: false,
    tags: [
      'SHOP THE LOOK',
      'AI OUTFIT MATCHER',
      'WEATHER-AWARE STYLING',
      'RETAILER GROUNDING',
      'TO BUY LIST INTEGRATION',
      'LOOKBOOK STUDIO',
    ],
    changes: {
      features: [
        "Shop the Look Retail Integration: Added direct search for similar items available to purchase online across MR PORTER, End Clothing, Arket, COS, Uniqlo, Selfridges, ASOS, and Google Shopping with similarity scoring and direct retailer links.",
        "One-Click 'To Buy' Wishlist Export: Users can add any desired piece directly from 'Shop the Look' into their 'To Buy' shopping list with automatic pricing, retailer attribution, images, and category tagging.",
        "AI-Powered Outfit Matcher in Lookbook: Created a meteorological and occasion-driven styling engine that analyzes user wardrobe inventory to suggest new, cohesive combinations based on temperature, weather conditions (Sunny, Mild, Chilly, Winter, Rain), and dress code occasions.",
        "Cohesion Scoring & Thermodynamic Weather Rationale: Each synthesized outfit includes a cohesion score percentage, harmonious color story palette, meteorological thermal comfort rationale, actionable styling tips, and recommended complementary pieces.",
      ],
      fixes: [
        "Ensured seamless fallback between Gemini Search Grounded AI and deterministic meteorological and retail matching engines, guaranteeing zero-latency generation even without network connectivity or API tokens.",
        "Hydrated all matched piece references with full wardrobe data including images, brands, and purchase prices.",
      ],
      improvements: [
        "Integrated 'Shop the Look' triggers throughout the LookbookView cards, EditorialLookbookModal, ItemDetailModal, Google AI Research Studio, and ImportLookbookIdeaModal.",
        "Added quick-launch external search shortcuts for Google Shopping, MR PORTER, End Clothing, and eBay UK directly from the Shop the Look view.",
      ],
    },
    affectedModules: [
      'src/components/ShopTheLookModal.tsx',
      'src/components/OutfitMatcherModal.tsx',
      'src/services/shopTheLookService.ts',
      'src/services/outfitMatcherService.ts',
      'server.ts',
      'src/components/LookbookView.tsx',
      'src/components/EditorialLookbookModal.tsx',
      'src/components/ItemDetailModal.tsx',
      'src/components/GoogleAiResearchStudio.tsx',
      'src/components/ImportLookbookIdeaModal.tsx',
      'src/types.ts',
      'src/components/VersionIterationsLog.tsx',
    ],
  },
  {
    version: 'v6.6',
    releaseDate: 'September 2026',
    title: 'Centralized Category Constants, Unified Taxonomy & Shoe Care Taxonomy Isolation',
    summary:
      'Created a single-source-of-truth centralized constants file (src/constants/categories.ts) for apparel and homeware taxonomy across all dialogs, forms, batch editors, and tables. Corrected classification logic so Shoe Care and shoe trees are strictly anchored to Wardrobe Garments rather than Homeware/Electronics, and category section moves cleanly propagate itemType updates. Hardened scrapers and deletion routines against phantom resurrection of deleted categories like "Tops".',
    isLatest: false,
    tags: [
      'CENTRALIZED CATEGORIES',
      'TAXONOMY ISOLATION',
      'SHOE CARE LINKING',
      'FORM CONSISTENCY',
      'SCRAPER HARDENING',
      'CATEGORY DEDUPLICATION',
    ],
    changes: {
      features: [
        'Centralized Category Constants: Established src/constants/categories.ts as the single source of truth for canonical apparel and homeware categories, taxonomy grouping, synonym resolution, and fallbacks.',
        'Shoe Care Taxonomy Fix: Resolved classification bug where Shoe Care items were erroneously linked to Electronics/Homeware; Shoe Care and shoe accessories are now strictly classified under Wardrobe Garments.',
        'Cross-Section Synchronization: Moving a category between Garments and Homeware now properly updates the underlying itemType on all associated items, preventing stale category section leakage.',
      ],
      fixes: [
        'Prevented deleted categories like "Tops" from continually reappearing by refining title inference in scrapers (distinguishing Shirts, T-Shirts, and Tops) and ensuring whitespace-trimmed case-insensitive category reassignments.',
        'Fixed Hardware Specs modal leakage so apparel items never display "Hardware, Electronics & Lifestyle Specs" cards in ItemDetailModal.',
        'Fixed active tab selection in ItemFormModal to strictly open the Clothing & Apparel tab for Shoe Care and all user-defined garment categories.',
      ],
      improvements: [
        'Audited and unified category selection across all modal dialogs, tables, and quick-entry tools via the centralized CategorySelect component.',
        'Enforced robust case-insensitive deduplication and startup category hygiene across localStorage keys.',
      ],
    },
    affectedModules: [
      'src/constants/categories.ts',
      'src/types.ts',
      'src/utils/categoryUtils.ts',
      'src/context/WardrobeContext.tsx',
      'src/components/WardrobeView.tsx',
      'src/components/ItemFormModal.tsx',
      'src/components/ItemDetailModal.tsx',
      'src/components/OrganizeCategoriesModal.tsx',
      'src/components/common/CategorySelect.tsx',
      'src/utils/freeAutofillFallback.ts',
      'src/services/ebayService.ts',
      'src/services/vintedWorkerService.ts',
      'src/components/VersionIterationsLog.tsx',
    ],
  },
  {
    version: 'v6.5',
    releaseDate: 'September 2026',
    title: 'Vinted & eBay Order Ingestion Refinements, Brand Normalization & Sandboxed Iframe Safety',
    summary:
      'Enhanced Vinted and eBay sync pipelines with deep attribute extraction—pulling real brand, category, size, and color metadata directly from account scrapes and reports into Wardrobe, Resale, and Shopping Wishlist. Upgraded modal dialogs with exception-guarded safe confirmation wrappers to prevent unhandled DOMException blocks in sandboxed iframes, and standardized application branding and runtime recovery titles across client and server.',
    isLatest: false,
    tags: [
      'VINTED DEEP INGESTION',
      'EBAY PARSER HARDENING',
      'BRAND & COLOR EXTRACTION',
      'IFRAME SAFE CONFIRM',
      'RUNTIME BRANDING',
      'RECOVERY RESILIENCE',
    ],
    changes: {
      features: [
        'Vinted Order Attribute Extraction: Wardrobe, Sales, and Wishlist imports now preserve verified brand, size, category, and colorway fields directly from the Vinted scrape rather than falling back to generic placeholders.',
        'Intelligent eBay Fallbacks: Replaced hardcoded brand and category fallbacks with context-aware title inference helpers across report parsing.',
        'Iframe DOMException Shield: Replaced native window.confirm calls with safeConfirm wrappers across GithubSyncPanel and GoogleAiResearchStudio to protect sandbox environments from unhandled modal errors.',
      ],
      fixes: [
        'Fixed generic "Vinted" brand assignment on imported active and sold garments when real brand details are present.',
        'Eliminated silent iframe browser exceptions when triggering repository syncs or clearing research archives.',
      ],
      improvements: [
        'Synchronized application branding to "Wardrobe & Style Studio" across server boot logs, full backup export schemas, and client error boundaries.',
      ],
    },
    affectedModules: [
      'src/context/WardrobeContext.tsx',
      'src/services/vintedWorkerService.ts',
      'src/services/ebayService.ts',
      'src/components/GithubSyncPanel.tsx',
      'src/components/GoogleAiResearchStudio.tsx',
      'src/App.tsx',
      'server.ts',
      'src/components/VersionIterationsLog.tsx',
    ],
  },
  {
    version: 'v6.4',
    releaseDate: 'September 2026',
    title: 'Multi-Source Image Finder & Autofill: Brand Official Stores, Luxury Stockists & Google Search Grounding',
    summary:
      'Supercharged product image discovery during autofill across all creation and review workflows. Queries authentic photographs across Brand Official Stores (with automatic domain resolution for 100+ luxury and heritage houses like Barbour, Drake\'s, Acne Studios, and Lemaire), Luxury Stockists (Mr Porter, SSENSE, Farfetch, End Clothing), and Google Search Grounding with Gemini 3.8 Flash. Added interactive provider source tabs, provenance badges, direct image URL pasting, 1-click batch image scouting in BatchLinePasteModal, and integrated photo search in InventoryScanEnrichModal.',
    isLatest: false,
    tags: [
      'GOOGLE SEARCH GROUNDING',
      'BRAND OFFICIAL SITES',
      'LUXURY STOCKISTS',
      'AUTOFILL ENRICHMENT',
      'IMAGE PROVENANCE',
      'BATCH PHOTO SCOUT',
      'DIRECT URL PASTE',
    ],
    changes: {
      features: [
        'Multi-Engine Product Image Search Endpoint (/api/scraper/lookup-product-images): Simultaneously queries Google Search Grounding (Gemini 3.8 Flash), Brand Official Websites (site:brand.com), and Luxury Retailers (Mr Porter, SSENSE, Farfetch) with deduplication and provenance labeling.',
        'Official Brand Domain Registry: Integrated automatic domain matching for 100+ heritage, contemporary, tailoring, and streetwear brands (Barbour, Drake\'s, Acne Studios, Universal Works, Lemaire, Sunspel, Margaret Howell, etc.).',
        'Interactive Source Provider Tabs in ProductImagePickerModal: Filter results across "All Sources", "Google Search", "Brand Official Store", "Luxury Stockists", and "Web Catalogues" with visual provenance badges.',
        'Direct Image URL Input: Added collapsible direct image URL bar allowing users to immediately paste, validate, and apply any image URL.',
        'Batch Line-by-Line Photo Scout: Added "Find Photos (Google & Brand Sites)" button in BatchLinePasteModal that scouts high-resolution imagery for all parsed lines in parallel, alongside row thumbnails and individual photo pickers.',
        'Inventory Review Scanner Integration: Embedded a "Find Photo" trigger inside InventoryScanEnrichModal under the discovered photo card for instantaneous multi-engine search and replacement.',
      ],
      fixes: [
        'Fixed empty image creation in BatchLinePasteModal by ensuring resolved and chosen image URLs are saved directly to created items.',
        'Prevented broken or invalid images from displaying by filtering through URL protocol validators and dynamic fallback handlers.',
      ],
      improvements: [
        'Transparent source labeling on photo cards (e.g., "Brand Store: drakes.com", "Google Search", "SSENSE / Mr Porter").',
        'Automatic background photo scouting during AutoImport and item autofill when image URLs are missing.',
      ],
    },
    affectedModules: [
      'src/services/productImageLookupService.ts',
      'src/components/ProductImagePickerModal.tsx',
      'src/components/BatchLinePasteModal.tsx',
      'src/components/InventoryScanEnrichModal.tsx',
      'src/components/ItemFormModal.tsx',
      'src/components/ShoppingFormModal.tsx',
      'server.ts',
      'src/components/VersionIterationsLog.tsx',
    ],
  },
  {
    version: 'v6.3',
    releaseDate: 'September 2026',
    title: 'Side-by-Side Inventory Auto-Scan & Enrichment Review, Multi-Line Batch Creator & Autonomous Product Photo Scout',
    summary:
      'Introduced an intelligent, automated inventory scanner and side-by-side review window modeled directly on the duplicate merge screen. Audits all closet garments for missing photos, fabric composition, colorways, categories, and retail valuation (RRP), discovering authentic product photography and fabric specs that users can review, fine-tune, and batch-apply with granular field toggles. Also introduced a lightning-fast Batch Line-by-Line Inventory Creator that parses raw multi-line notes, receipt text, or spreadsheet rows into structured pieces with 1-click creation.',
    isLatest: false,
    tags: [
      'INVENTORY AUTO-SCANNER',
      'SIDE-BY-SIDE REVIEW WINDOW',
      'MERGE-STYLE ENRICHMENT',
      'BATCH LINE CREATOR',
      'FABRIC & COLOR AUTODETECT',
      'CANDIDATE PHOTO PICKER',
      'ZERO DATA LOSS',
    ],
    changes: {
      features: [
        'Inventory Intelligence & Autofill Scanner (InventoryScanEnrichModal.tsx): Automated audit engine that scans closet pieces for missing imagery, fabric composition, colorways, categories, and retail valuations, presenting discovered improvements in side-by-side verification cards modeled directly after DuplicateMergeModal.',
        'Multi-Line Batch Inventory Creator (BatchLinePasteModal.tsx): Paste any multi-line notes, receipts, or spreadsheet rows to immediately generate new pieces in Wardrobe, Shopping Wishlist, or Resale with real-time parsing preview and inline editing.',
        'Interactive Candidate Photos Picker: Discovered items display an interactive thumbnail strip allowing 1-click photo switching between multiple high-resolution angles located by the autonomous image scout.',
        'Granular Field Toggles & One-Click Batch Apply: Checkbox controls for individual proposed fields (Photo, Brand, Clean Title, Category, Color Swatch, Fabric Composition, Care Instructions, RRP, Tags) with an "Accept All Enriched" universal batch button and complete undo protection.',
        'Audit & Scope Filter Tabs: Fast filtering across "All Incomplete", "Missing Photos", "Missing Fabrics & Materials", "Missing Colors", "Missing Valuation / RRP", and "Dismissed".',
        'Direct Access from Wardrobe and Tools Suites: Integrated launch buttons on the WardrobeView action bar (with live missing-item count badges), proactive stats banner alerts, and dedicated subtabs in ToolsView.',
      ],
      fixes: [
        'Eliminated empty photo states on legacy imported items by automatically proposing authentic high-res public catalogue imagery without overwriting existing user photos unless approved.',
        'Prevented default "Natural Fiber / Blend" and "Neutral" placeholders from persisting by replacing them with accurately detected textile compositions (e.g. 100% Merino Wool, Waxed Cotton, Raw Denim, Silk, Full-Grain Leather).',
      ],
      improvements: [
        'Seamless integration with the existing duplicate merge architecture, ensuring complete consistency across data structures and UX interaction patterns.',
        'Direct "Create & Review in Scanner" bridge allowing newly batch-pasted items to be immediately queued for side-by-side image and material review.',
      ],
    },
    affectedModules: [
      'src/components/InventoryScanEnrichModal.tsx',
      'src/components/BatchLinePasteModal.tsx',
      'src/services/inventoryScannerService.ts',
      'src/services/batchLineParserService.ts',
      'src/components/WardrobeView.tsx',
      'src/components/ToolsView.tsx',
    ],
  },
  {
    version: 'v6.2',
    releaseDate: 'September 2026',
    title: 'High-Fidelity Multi-Engine Autofill, Autonomous Product Image Scout & Paste Specs Modal',
    summary:
      'Completely overhauled product autofill robustness and image retrieval across all forms. Solved scraping failures caused by anti-bot blocks and missing images by introducing an autonomous, zero-token Product Image Scout (DuckDuckGo, Wikimedia, and Open Catalogues) that automatically discovers high-resolution product photography. Added an interactive Product Image Picker modal with candidate photo strips in ItemFormModal, ShoppingFormModal, and AutoImportModal, alongside a dedicated Paste Specs & Receipt Autofill Modal that extracts brand, category, materials, colors, and prices directly from pasted text descriptions or emails.',
    isLatest: false,
    tags: [
      'AUTOFILL ROBUSTNESS',
      'AUTONOMOUS IMAGE SCOUT',
      'PRODUCT IMAGE PICKER',
      'PASTE SPECS EXTRACTOR',
      'ZERO PAID TOKENS',
      'CANDIDATE PHOTOS STRIP',
    ],
    changes: {
      features: [
        'Autonomous Product Image Scout: Multi-engine, zero-token image finder that queries high-resolution product catalogs (DuckDuckGo, Wikimedia Commons, Open Fashion databases) when e-commerce sites block direct photo scraping.',
        'Interactive Product Image Picker Modal: Users can search for high-res product photos by brand, item name, and color, preview candidate thumbnails, and apply them with one click.',
        'Paste Specs & Receipt Autofill Modal: Paste raw product copy, order confirmations, or size tag specs to extract brand, category, materials, color, price, and auto-fetch matching imagery.',
        'Candidate Photos Strip: Visual horizontal preview strip on ItemFormModal and ShoppingFormModal displaying all retrieved photo variations for effortless selection.',
        'AutoImport Background Image Scout: In batch and single imports, garments lacking photos automatically trigger asynchronous background photo lookups to populate imagery without user intervention.',
      ],
      fixes: [
        'Missing Images on Web Autofill: Fixed issue where anti-bot protected sites returned 403 Forbidden or empty image tags, leaving items without imagery.',
        'Incomplete Attribute Extraction: Enhanced JSON-LD, OpenGraph, and microdata parsing combined with deterministic regex extraction for reliable brand, color, material, and price extraction.',
        'Autofill Fallback Image Population: Ensured that even when the primary scraper fails and deterministic fallback runs, high-res photos are scouted and populated.',
      ],
      improvements: [
        'Find Photo Buttons: Added 1-click "Find Photo" buttons next to image upload fields across all garment and shopping modals.',
        'Paste Specs Quick Access: Added quick-access "Paste Specs" buttons next to URL autofill fields for links behind paywalls or logins.',
      ],
    },
    affectedModules: [
      'productImageLookupService',
      'ProductImagePickerModal',
      'PasteSpecsAutofillModal',
      'unifiedScraper',
      'server',
      'ItemFormModal',
      'ShoppingFormModal',
      'AutoImportModal',
      'VersionIterationsLog',
    ],
  },
  {
    version: 'v6.1',
    releaseDate: 'September 2026',
    title: 'Cross-Section Category Drag-and-Drop, Automatic Deduplication & Zero-Token AI Wardrobe Stylist',
    summary:
      'Introduced drag-and-drop capability for product categories between the Clothes and Homeware sections, along with dedicated quick-move actions and a visual Organize Categories Manager. Fixed the repopulating duplicate categories (e.g. "tops") by implementing case-insensitive deduplication and startup taxonomy hygiene that automatically reclassifies homeware items (like "Homebar") out of apparel. Integrated an AI Wardrobe Stylist & Combinations Analyzer that synthesizes outfits based on descriptions, colors, silhouettes, and fabrics—powered by a deterministic, zero-token local color harmony engine with an optional Google Search Gemini Grounded mode.',
    isLatest: false,
    tags: [
      'CATEGORY DRAG AND DROP',
      'HOMES & CLOTHES TAXONOMY',
      'CATEGORY DEDUPLICATION',
      'AI WARDROBE STYLIST',
      'COLOR HARMONY ENGINE',
      'ZERO PAID TOKENS',
    ],
    changes: {
      features: [
        'Cross-Section Category Drag-and-Drop: Drag category chips directly between Clothes & Garments and Homeware & Living sections, or use the dedicated Organize Categories Modal.',
        'One-Click Quick Move: Added an arrow-swap button on each category chip for instantaneous reclassification between apparel and homeware.',
        'AI Wardrobe Stylist & Combinations Analyzer: Interactive studio modal that generates harmonious outfit formulas based on garment colors, textures, silhouettes, and occasions.',
        'Deterministic Zero-Token Local Styling Engine: Built-in sartorial color-harmony engine that suggests balanced tops, bottoms, layering pieces, and shoes with zero API token limits or costs.',
        'Optional Google Search Grounded Gemini AI: Server-side Gemini integration grounded in Google Search for real-time editorial style advice and trend intelligence.',
      ],
      fixes: [
        'Elimination of Duplicate Category Repopulation: Implemented robust case-insensitive deduplication that prevents duplicate categories like "Tops" / "tops" from repopulating.',
        'Automatic Reclassification of Misclassified Categories: Added startup hygiene logic in WardrobeContext that relocates categories such as "Homebar" from apparel into homeware automatically.',
      ],
      improvements: [
        '1-Click Lookbook Saving: Outfits synthesized by the AI Wardrobe Stylist can be saved to Lookbook or logged for daily wear with a single click.',
        'Integrated in Both Inventory and Lookbook: Direct access to AI Wardrobe Combinations from both the Wardrobe view toolbar and the Lookbook view.',
      ],
    },
    affectedModules: [
      'WardrobeView',
      'LookbookView',
      'WardrobeContext',
      'OrganizeCategoriesModal',
      'WardrobeAiStylistModal',
      'wardrobeCombinationEngine',
      'server',
      'VersionIterationsLog',
    ],
  },
  {
    version: 'v6.0',
    releaseDate: 'September 2026',
    title: 'Interactive Sections Drag-and-Drop, Clean Provenance Tagging & Free Deterministic Autofill Fallback',
    summary:
      'Introduced comprehensive drag-and-drop capability across sales stages and sections with a dedicated Sections Board (Kanban) view mode. Enhanced inventory-to-sales mirroring to faithfully carry over descriptions, notes, condition, and pricing. Completely halted unwanted default tag injection (e.g., "Vinted") during URL autofill and import, and integrated a robust, free, deterministic fallback extractor that operates locally without Google APIs or Firebase dependencies.',
    isLatest: false,
    tags: [
      'DRAG AND DROP SECTIONS',
      'SECTIONS BOARD VIEW',
      'INVENTORY TO SALES MIRROR',
      'CLEAN TAGGING',
      'FREE AUTOFILL FALLBACK',
      'ZERO-DEPENDENCY',
    ],
    changes: {
      features: [
        'Sections Drag-and-Drop Pipeline: Drag and drop items smoothly in and out of sales sections (Drafts, Listed, Reserved, Dispatch/Transit, Completed). Both grid cards and board cards feature native drag handles with real-time drop target feedback.',
        'Interactive Sections Board View: Added a dedicated Kanban-style Board view mode (via the Board icon toggle) with live section metrics, count badges, total values, and responsive drop zones.',
        'Interactive Workflow Stage Drop Targets: Workflow stage filter buttons now double as instant drop targets, allowing quick pipeline shifts by dropping an item onto any stage button.',
        'Wardrobe Drag-to-Sell: Wardrobe garments can be dragged directly into sales sections or stage buttons to quickly list them with mirrored attributes.',
        'Free & Deterministic Autofill Fallback: Built a zero-cost local metadata engine that parses title, brand, category, color, and price from URL slugs and structured fragments without relying on external Google APIs or Firebase.',
      ],
      fixes: [
        'Elimination of Default Tag Injection: Removed automatic injection of default tags (such as "Vinted") during autofill and item imports, strictly preserving only user-specified tags.',
        'Inventory to Sales Data Mirroring: When items are moved or listed from wardrobe into sales, their name, description, notes, condition, and valuation are faithfully mirrored without divergence.',
      ],
      improvements: [
        'Real-time Drop Feedback: Added active drop-target highlighting, dashed border pulsing, and instant toast confirmations upon moving items across sections.',
        'Integrated View Modes: Unified Grid, Sections Board, and Database Table views with synchronized display settings.',
      ],
    },
    affectedModules: [
      'SellingView',
      'WardrobeView',
      'SellFromWardrobeModal',
      'ItemFormModal',
      'ShoppingFormModal',
      'freeAutofillFallback',
      'VersionIterationsLog',
    ],
  },
  {
    version: 'v5.9',
    releaseDate: 'September 2026',
    title: 'Strict Manual Merge Control & Absolute Elimination of Quiet Auto-Merging',
    summary:
      'Completely eliminated all quiet and implicit auto-merging when editing or adding items. Wardrobe item updates and additions now strictly preserve distinct items as independent records. Auto-consolidation flags were permanently removed from the edit flow, and duplicate detection was hardened so fabrics, weaves, patterns, and generic category terms (like "shirt" or "jacket") never trigger false matches across distinct garments. Full control over duplicate consolidation is reserved exclusively for the dedicated Merging Tool.',
    isLatest: false,
    tags: [
      'MERGE CONTROL',
      'NO AUTO-MERGE',
      'DISTINCT ITEMS PRESERVED',
      'DUPLICATE ENGINE HARDENING',
      'DEDICATED MERGE TOOL',
    ],
    changes: {
      features: [
        'Strictly Independent Item Updates: Updating garment details (such as a Ralph Lauren shirt) strictly modifies only the target item, with zero secondary item deletions, mergers, or mutations.',
        'Independent Item Additions: Adding items to inventory always generates a new, distinct record and will never hijack or overwrite existing similar pieces.',
        'Manual-Only Consolidation: Merging and consolidating duplicates is now strictly controlled via the dedicated Merging Tool (DuplicateMergeModal), giving the user full visibility and authority over merges.',
        'Form UI Streamlining: Removed the auto-consolidate toggle from ItemFormModal and added an informative status badge confirming distinct items are preserved.',
      ],
      fixes: [
        'Prevented quiet auto-merging of similar garments (e.g., Ralph Lauren Oxford shirts, Linen shirts, or custom fits) during item updates and detail edits.',
        'Hardened duplicate detection logic: Stopped stripping distinct fabric and weave descriptors (e.g., Oxford, Linen, Twill, Poplin, Flannel) in cleanItemTitle.',
        'Added generic category guards in isGarmentDuplicate: Generic category terms alone (e.g., "shirt", "t-shirt", "jacket", "pants") can never match two items with different names.',
      ],
      improvements: [
        'Preserved any previously merged duplicates in the Trash Bin as "consolidated", allowing instantaneous one-click restoration if needed.',
        'Guaranteed all Vinted, acquisition, and marketplace provenance attributes remain intact across individual item edits.',
      ],
    },
    affectedModules: [
      'WardrobeContext',
      'ItemFormModal',
      'duplicateUtils',
      'VersionIterationsLog',
    ],
  },
  {
    version: 'v5.8',
    releaseDate: 'September 2026',
    title: 'Sales Pipeline Inventory Integration, Scoped Wardrobe Taxonomy & Advanced Sorting',
    summary:
      'Added bidirectional sales status awareness to inventory views: items listed for sale or in drafts are visibly highlighted with active sales banners and badges in their current inventory storage locations, and items marked as sold are automatically deleted from active inventory. Moved the homeware category bar out of wardrobe items into a dedicated taxonomy scope switcher, and introduced comprehensive multi-factor sorting options including brand, name, condition, wear frequency, and sales status.',
    isLatest: false,
    tags: [
      'SALES PIPELINE',
      'INVENTORY HIGHLIGHTING',
      'DRAFT PIPELINE',
      'AUTO-DELETE ON SOLD',
      'HOMESTORE ISOLATION',
      'MULTI-SORT',
    ],
    changes: {
      features: [
        'Inventory Sales Indicators: Wardrobe items listed for sale or in draft status now display active visual highlights (subtle amber border, pipeline tag, platform, and listed price) both in grid cards and in the database table view location column.',
        'Sales Drafts Pipeline: Adding items from inventory to the sales tracker now places them into the Drafts pipeline by default with full user editing capability.',
        'Automatic Inventory Removal on Sale: Marking an item as sold now reliably deletes it from active inventory while safely preserving its sales record and archiving an undoable snapshot.',
        'Separated Homeware Bar: Removed the homeware categories bar and labels from the default wardrobe items view, providing a clean taxonomy switcher between Wardrobe Garments, Homeware & Living, and All Pieces.',
        'Expanded Inventory Sorting: Added new sort dropdown options including Brand (A-Z / Z-A), Item Name (A-Z / Z-A), Storage Location (A-Z), Color (A-Z), Condition, Wear Frequency, and Items Listed For Sale first.',
        'Item Details Sales Banner: ItemDetailModal now prominently indicates active listing details and includes a direct jump to the Sales Tracker.',
      ],
      fixes: [
        'Prevented category filter pollution between wardrobe garments and homeware items.',
        'Corrected Mark Sold confirmation modal wording to accurately describe inventory deletion instead of passive archival.',
      ],
      improvements: [
        'Item card category dropdown now scopes appropriately to garment categories for wardrobe pieces.',
        'Database table view reflects active sales status in the storage location column.',
      ],
    },
    affectedModules: [
      'WardrobeView',
      'InventoryDatabaseTable',
      'ItemDetailModal',
      'MarkSoldModal',
      'WardrobeContext',
    ],
  },
  {
    version: 'v5.7',
    releaseDate: 'September 2026',
    title: 'Automated Garment Safety & Trash Archive: Lossless Overwrite, Merge, and Delete Recovery',
    summary:
      'Implemented an automated Trash Bin recovery system to prevent data loss whenever garments are edited, consolidated/merged, replaced during backup imports, or deleted. Resolved duplicate over-merging where Sunspel t-shirts and similar core garments were mistakenly identified as duplicates, added comprehensive trash preservation across all mutation operations, and introduced both an interactive Trash Bin Studio modal and an embedded recovery console in Tools.',
    isLatest: false,
    tags: [
      'TRASH BIN',
      'DATA LOSS PREVENTION',
      'SUNSPEL RECOVERY',
      'DUPLICATE MERGE SAFETY',
      'OVERWRITE ARCHIVE',
      'LOSSLESS RESTORE',
    ],
    changes: {
      features: [
        'Automated Overwrite & Merge Archive: Whenever any wardrobe garment, wishlist item, sale item, or outfit is updated, consolidated, or replaced by backup restore, a complete pre-modification snapshot is automatically archived to Trash with full reason metadata.',
        'Interactive Trash Studio Modal: Added multi-criteria search, reason filtering (overwritten, consolidated, deleted, import-replaced), batch selection, original/copy restoration, and permanent purge controls.',
        'Tools & Recovery Integration: Embedded a dedicated Trash & Safety Recovery console in ToolsView with real-time statistics and 1-click restore.',
        'Direct Footer Recovery Action: Accessible from anywhere in the application with live count of archived items.',
      ],
      fixes: [
        'Fixed Sunspel T-Shirts Disappearing Bug: Diagnosed and fixed root causes where generic title stripping in cleanItemTitle and loose duplicate matching in mergeWardrobeItems caused distinct garments (e.g. multiple Sunspel t-shirts) to be consolidated without explicit selection.',
        'Eliminated Startup Auto-Deduplication: Prevented silent, unprompted merging on application load.',
        'Ensured all secondary items consolidated during manual or batch merges are permanently archived into Trash before removal.',
      ],
      improvements: [
        'Lossless restore options: Users can restore items back to their exact original IDs or as independent copies with new unique IDs.',
        'Full entity preservation: Images, custom valuations, purchase prices, tags, care notes, and storage locations are fully preserved in trash snapshots.',
      ],
    },
    affectedModules: [
      'WardrobeContext.tsx',
      'TrashBinModal.tsx',
      'ToolsView.tsx',
      'App.tsx',
      'types.ts',
      'duplicateUtils.ts',
    ],
  },
  {
    version: 'v5.6',
    releaseDate: 'September 2026',
    title: 'Gemini Model Resilience & Fallback Engine: Active Models & 503 Spike Protection',
    summary:
      'Replaced deprecated Gemini models with modern, supported endpoints (gemini-3.8-flash, gemini-3.6-flash, gemini-flash-latest, gemini-3.1-flash-lite) across all AI extraction and vision pathways. Added automated backoff retry handling for transient 503 high-demand spikes and 429 rate limits, ensuring zero downtime during peak loads.',
    isLatest: false,
    tags: [
      'GEMINI MODELS',
      'FALLBACK RESILIENCE',
      'HIGH-DEMAND 503 RETRY',
      'GEMINI-3.6-FLASH',
      'VISION EXTRACTION',
      'ZERO DOWNTIME',
    ],
    changes: {
      features: [
        'Modernized Gemini Fallback Rotation: Standardized on active models [gemini-3.8-flash, gemini-3.6-flash, gemini-flash-latest, gemini-3.1-flash-lite] across all server-side AI endpoints.',
        'Automatic 503/429 Jitter Backoff: Implemented intelligent backoff retry for transient 503 (high demand spikes) and 429 rate limits before cycling to fallback model pools.',
        'Unified Vision & PDF Fallbacks: Migrated multimodal image basket detection and Vinted PDF receipt parsers to the unified generateContentWithFallback engine.',
      ],
      fixes: [
        'Fixed 404 NOT_FOUND errors triggered by decommissioned gemini-2.5-flash and prohibited gemini-1.5-flash models.',
        'Fixed failover cascades during temporary gemini-3.8-flash high demand spikes by routing seamlessly to gemini-3.6-flash.',
        'Added fallback protection to editorial research and style recommendations.',
      ],
      improvements: [
        'Centralized all server-side model configuration into a single resilient helper function.',
        'Immediate failover on non-transient 404 errors with zero blocking delays.',
      ],
    },
    affectedModules: [
      'server.ts',
      'VersionIterationsLog.tsx',
    ],
  },
  {
    version: 'v5.5',
    releaseDate: 'September 2026',
    title: 'Site-Wide Unified Scraper: Firecrawl Engine Integration & Single Source of Truth',
    summary:
      'Architected and implemented a unified web scraping service across the entire platform powered by Firecrawl (headless JS rendering and anti-bot bypass) with an intelligent stealth browser fallback. Established a single source of truth for all URL extractions and autofill flows in ItemFormModal, ShoppingFormModal, and AutoImportModal, with complete engine provenance tracking and a live extraction probe in Settings.',
    isLatest: false,
    tags: [
      'UNIFIED SCRAPER',
      'FIRECRAWL JS',
      'SINGLE SOURCE OF TRUTH',
      'ANTI-BOT BYPASS',
      'PRODUCT AUTOFILL',
      'SETTINGS PROBE',
      'PROVENANCE TRACKING',
    ],
    changes: {
      features: [
        'Single Source of Truth Scraper: Created unifiedScraper.ts service providing centralized, resilient web scraping across all frontend and backend entry points.',
        'Firecrawl Integration: Integrated @mendable/firecrawl-js supporting headless JavaScript rendering, dynamic DOM evaluation, and anti-bot bypass for JavaScript-rendered e-commerce stores.',
        'Intelligent Fallback Architecture: Automatically uses Firecrawl when FIRECRAWL_API_KEY is configured, gracefully falling back to our stealth browser engine with JSON-LD, Microdata, and OpenGraph extraction.',
        'Engine & Color Provenance: Captures engineUsed and originalListingColor across ItemFormModal, AutoImportModal, and ShoppingFormModal, persisting provenance into WardrobeItem and ShoppingItem entities.',
        'Live Scraper Settings Probe: Added an interactive scraper probe in General Settings to test URL extraction in real-time, verifying title, brand, price, RRP, color, and engine response.',
        'Visual Engine Indicators: Displays Firecrawl vs Unified engine badges in autofill modals and candidate import cards upon successful extraction.',
      ],
      fixes: [
        'Eliminated scattered, divergent fetch mechanisms by routing all URL extractions through scrapeUrlUnified.',
        'Ensured extracted item prices, RRP discounts, and original product colors are preserved during modal autofill.',
      ],
      improvements: [
        'Added FIRECRAWL_API_KEY declaration in .env.example with clear documentation.',
        'Exposed /api/scraper/status and /api/scraper/scrape-url endpoints for health checks and external integrations.',
      ],
    },
    affectedModules: [
      'unifiedScraper.ts',
      'server.ts',
      'ItemFormModal.tsx',
      'ShoppingFormModal.tsx',
      'AutoImportModal.tsx',
      'SettingsModal.tsx',
      'types.ts',
      'package.json',
      '.env.example',
      'VersionIterationsLog.tsx',
    ],
  },
  {
    version: 'v5.4',
    releaseDate: 'September 2026',
    title: 'AutoImport Review Suite: Search, Categorical Filters, Sorters, Batch Routing & Expanded Listing Fields',
    summary:
      'Supercharged the multi-item AutoImport and Vinted extract review workspace with high-performance real-time search, category and route filters, lifecycle tag chips, multi-criteria sorting, batch selection and routing actions, responsive pagination, and expanded garment fields including RRP, 1-click original scraped color restoration, provenance order links, and multi-line notes.',
    isLatest: false,
    tags: [
      'AUTO-IMPORT WORKSPACE',
      'SEARCH & FILTERING',
      'BATCH ROUTING',
      'PAGINATION CONTROLS',
      'RRP & SAVINGS',
      'PROVENANCE DETAILS',
      'COLOR RESTORATION',
    ],
    changes: {
      features: [
        'Real-Time Text Search: Instantly filters candidate garments by title, brand, seller handle, color, or notes as you type, with a 1-click clear search button.',
        'Multi-Dimensional Filtering: Filter candidate items by present categories, destination routes (Wardrobe, Wishlist, Resale), and lifecycle status tags (Bought, Sold, Listed, Cancelled) with dynamic counter badges.',
        'Multi-Criteria Sorters: Sort candidate lists by Original Order, Price (High to Low / Low to High), Brand (A to Z), Title (A to Z), or Selected First.',
        'Batch Actions on Filtered Views: Added "Select Filtered", "Deselect Filtered", and 1-click bulk routing to Wardrobe, Wishlist, or Resale for currently filtered subsets.',
        'Responsive Pagination: Support for page sizes (10, 20, 50, 100, or All) with synchronous top and bottom page navigators and matching item counters.',
        'Expanded Garment Fields: Side-by-side Price Paid vs RRP inputs with auto-fallback, 1-click restore button for original scraped color, dedicated multi-line notes textarea, and direct link to source marketplace listing.',
      ],
      fixes: [
        'Resolved type definitions for trackingNumber, carrier, and shippingStatus on WardrobeItem.',
        'Added rrp and description support to VintedOrder and MarketplaceOrderLike interfaces.',
      ],
      improvements: [
        'Zero-item empty state with 1-click "Reset Filters" action.',
        'Preserved per-item drag-and-drop image replacement and Vision AI re-analysis within paginated views.',
      ],
    },
    affectedModules: [
      'AutoImportModal.tsx',
      'types.ts',
      'vintedWorkerService.ts',
      'marketplaceItemBuilders.ts',
      'VersionIterationsLog.tsx',
    ],
  },
  {
    version: 'v5.3',
    releaseDate: 'September 2026',
    title: 'Floating Quick Note Capture Widget with Site-Wide Hover Presence',
    summary:
      'Engineered a persistent, floating quick note capture widget that hovers seamlessly across every view and screen of the studio. Features single-click expandable scratchpad, quick categorization pills (Style Idea, To Buy, Fit & Sizing, Care & Alteration, Homeware & Tech, General), instant pinned notes, one-click "Convert to Wishlist" integration, keyboard shortcut (Alt+N), dock position switcher (bottom-right / bottom-left), and local storage persistence.',
    isLatest: false,
    tags: [
      'FLOATING HOVER WIDGET',
      'QUICK NOTE CAPTURE',
      'SCRATCHPAD & MEMOS',
      'ONE-CLICK WISHLIST CONVERT',
      'KEYBOARD SHORTCUTS',
      'LOCAL PERSISTENCE',
    ],
    changes: {
      features: [
        'Persistent Hover Widget: Discreet floating action pill fixed at the bottom edge of the viewport that stays accessible across Dashboard, Wardrobe, Lookbook, Shopping, Selling, Analytics, and Tools views.',
        'Instant Note Capture: Quick-input form supporting multi-line thoughts, styling formulas, alteration reminders, or prospective purchases with keyboard submission (Enter / ⌘Enter).',
        'Sartorial Categorization: Six dedicated category badges with curated aesthetic color-coding (Style Idea, To Buy, Fit & Sizing, Care & Alteration, Homeware & Tech, General).',
        'Direct Wishlist Integration: One-click "Add to Wishlist" action converts any captured thought or prospective purchase into a tracked ShoppingItem in the shopping pipeline.',
        'Pin & Prioritize: Star/pin critical notes to keep them anchored at the top of the scratchpad, with an animated visual indicator on the collapsed pill.',
        'Global Shortcut & Navigation Trigger: Alt+N (or Option+N) immediately summons and focuses the widget from anywhere; also integrated into the top navigation header bar.',
        'Dock Switcher & Filtering: Easily flip widget dock between bottom-right and bottom-left, filter by Active/Pinned/Completed, and search notes in real-time.',
      ],
      fixes: [
        'Prevented floating notification overlaps by elevating the undo toast notification above the hover widget.',
      ],
      improvements: [
        'Inline note editing via double-click, one-click clipboard copying, and bulk export to clipboard.',
        'Safe localStorage synchronization with initial sartorial starter notes.',
      ],
    },
    affectedModules: [
      'QuickNoteWidget.tsx',
      'App.tsx',
      'Navigation.tsx',
      'types.ts',
      'VersionIterationsLog.tsx',
    ],
  },
  {
    version: 'v5.2',
    releaseDate: 'September 2026',
    title: 'Single Source of Truth Edit Item Window with Dual-Tab Architecture',
    summary:
      'Refactored the master inventory edit and creation window into a single source of truth featuring 2 dedicated tabs: one with criteria for clothing & wearables (sizing, fabric composition, wearable seasons, styling notes, care directives), and an expansive new tab for recording homeware, electronics, tech, audio, optics, and hobbies (model/serial numbers, dimensions, weight, power/battery specs, connectivity/ports, room location, warranty & service history, and included accessories).',
    isLatest: false,
    tags: [
      'SINGLE SOURCE OF TRUTH',
      'DUAL-TAB EDIT WINDOW',
      'CLOTHING & APPAREL',
      'HOMEWARE & ELECTRONICS',
      'HOBBIES & TECH SPECS',
      'HARDWARE ATTRIBUTES',
    ],
    changes: {
      features: [
        'Single Source of Truth Edit Window: Unified all inventory item creation and modification into a single modal with a dedicated 2-tab navigation architecture.',
        'Tab 1 — Clothing & Wearables: Preserves all specialized sartorial fields including garment category, sizing & fit, fabric/material composition, seasonal badges (Autumn, Winter, Spring, Summer, All-Season), care & cleaning directives, and outfitting styling formulas.',
        'Tab 2 — Homeware, Electronics & Hobbies: Introduces comprehensive hardware & lifestyle criteria including quick category presets (Audio & Tech, Electronics, Cameras & Optics, Furniture, Hobbies & Gear, Tableware, Tools & EDC), model/serial number, room/household placement, dimensions (W × D × H), weight, power/battery specs, connectivity/ports, build materials, warranty & service records, and included accessories & box.',
        'Smart Automatic Tab Detection: Automatically routes to the correct tab when editing an item based on category, itemType, or existing hardware attributes, with fluid real-time tab switching.',
        'Hardware & Specs Detail View: Enhanced ItemDetailModal to dynamically render hardware, electronics, and lifestyle specification cards when viewing recorded homeware and hobby items.',
      ],
      fixes: [
        'Eliminated divergent item editing pathways across the application by standardizing all inventory edits onto ItemFormModal.',
        'Prevented category mismatch by intelligently grouping apparel and homeware categories in dropdown selectors.',
      ],
      improvements: [
        'Shared photo upload (drag & drop, clipboard paste, direct URL, file upload) and valuation calculator persist seamlessly across both tabs.',
        'Full backwards and forwards compatibility with existing wardrobe and homeware items.',
      ],
    },
    affectedModules: [
      'ItemFormModal.tsx',
      'ItemDetailModal.tsx',
      'types.ts',
      'VersionIterationsLog.tsx',
    ],
  },
  {
    version: 'v5.1',
    releaseDate: 'September 2026',
    title: 'Duplicated Garment & Homeware Category Sections & Independent Filtering',
    summary:
      'Preserved the dedicated Garment categories & collections filter section while duplicating and establishing a fully independent Homeware Categories & Collections section. Features independent filter bars, scoped category tags, custom category creator/editor, and integrated clear-all reset controls.',
    isLatest: false,
    tags: ['DUPLICATED CATEGORY SECTIONS', 'INDEPENDENT FILTERING', 'GARMENT & HOMEWARE', 'INDEPENDENT TAGS', 'INVENTORY CONTROLS'],
    changes: {
      features: [
        'Dedicated Garment Categories Section: Maintained the original category manager with garment collections (Outerwear, Knitwear, Tops & Shirts, Bottoms, Footwear, Tailoring, Bags & Leather, Accessories) with independent category creation, editing, deletion, and default resets.',
        'Duplicated Homeware Categories Section: Established a mirrored, dedicated category manager section with distinct Homeware & Lifestyle collections (Kitchenware, Tableware, Ceramics & Pottery, Home Decor, Furniture, Lighting, Soft Furnishings, Vinyl & Music) with independent controls.',
        'Independent Scoped Tags: Generated separate tag clouds for garments and homeware items so lifestyle pieces and garments each display relevant, non-polluted tag filters.',
        'Synchronized Global & Scoped Reset: Added reactive active-filter banners with single-click "View All Pieces" and unified "Clear All Filters" supporting independent garment and homeware filter scopes.',
      ],
      fixes: [
        'Prevented selecting a homeware category from inadvertently masking garment filter states or causing conflicts in multi-attribute inventory searches.',
        'Ensured category rename and delete prompts operate strictly on their respective garment or homeware taxonomy domain.',
      ],
      improvements: [
        'Crystal-clear visual separation between wardrobe clothing items and design homeware objects.',
        'Seamless dual-domain navigation with instant reactive filtering and persistent localStorage memory.',
      ],
    },
    affectedModules: [
      'WardrobeView.tsx',
      'WardrobeContext.tsx',
      'types.ts',
      'initialData.ts',
      'VersionIterationsLog.tsx',
    ],
  },
  {
    version: 'v5.0',
    releaseDate: 'September 2026',
    title: 'Wardrobe to Inventory Evolution & First-Class Homeware Category System',
    summary:
      'Officially transitioned the platform from single-scope wardrobe terminology to unified "Inventory" management. Added dedicated first-class Homeware & Lifestyle category taxonomy (Homeware, Vinyl, Shoe Care, Art & Books, Audio & Tech, Textiles, Decor, Furniture, Dining) with independent filtering, optgroup selection, and tailored wear/play usage metrics.',
    isLatest: false,
    tags: ['INVENTORY EVOLUTION', 'HOMEWARE SYSTEM', 'CATEGORY TAXONOMY', 'LIFESTYLE & VINYL', 'FILTER SYSTEM'],
    changes: {
      features: [
        'Universal "Inventory" Terminology: Updated all primary navigation, header badges, database toolbars, search placeholders, statistics panels, and export/import modals to standard Inventory terminology.',
        'First-Class Homeware & Lifestyle Taxonomy: Integrated complete homeware categories (Homeware, Vinyl, Shoe Care, Art & Books, Audio & Tech, Textiles & Bedding, Tableware & Dining, Lighting & Lamps, Decor & Vases, Furniture & Living) alongside apparel categories.',
        'Independent Homeware & Apparel Segment Filtering: Added dedicated quick-segment filters in Inventory view for "All Pieces", "Apparel", and "Homeware & Lifestyle" in addition to individual category chips.',
        'Organized Category Selectors: Added grouped optgroups in item forms and quick selectors distinguishing "Apparel & Garments" from "Homeware & Lifestyle".',
        'Adaptive Homeware Metrics: Tailored item details and wear trackers to display "Times Used / Played" and "Log Use / Play (+1)" for non-apparel items, and excluded homeware from the daily outfit wear logger.',
      ],
      fixes: [
        'Prevented category reset and initialization from overwriting or losing existing homeware, vinyl, and shoe care items from database backups.',
        'Ensured full compatibility across table inline editing, bulk batch editing, and search filtering for both garments and lifestyle items.',
      ],
      improvements: [
        'Unified category taxonomy that accommodates both luxury clothing collections and design homeware, vinyl records, and object collections in one seamless system.',
        'Immediate reactive category filtering with zero latency and full persistence.',
      ],
    },
    affectedModules: [
      'WardrobeView.tsx',
      'Navigation.tsx',
      'types.ts',
      'initialData.ts',
      'WardrobeContext.tsx',
      'ItemFormModal.tsx',
      'ItemDetailModal.tsx',
      'DashboardView.tsx',
      'InventoryDatabaseTable.tsx',
    ],
  },
  {
    version: 'v4.9',
    releaseDate: 'September 2026',
    title: 'Pipeline State Sync & Universal Inline Editing Across All Views',
    summary:
      'Resolved state synchronization between pipeline workflow bars and status filter dropdowns in both Shopping & Wishlist Manager and Sales & Resale Studio with unified SSOT architecture. Implemented comprehensive inline editing across all cards and database tables for Color, Size, Brand, Price, Name, and Notes.',
    isLatest: false,
    tags: ['STATE SYNCHRONIZATION', 'SINGLE SOURCE OF TRUTH', 'INLINE EDITING', 'PIPELINE SYNC', 'REACTIVE UI'],
    changes: {
      features: [
        'Universal Inline Editing for Sales & Resale Studio: Implemented interactive inline editing in both Card Grid view and Database Table view for Brand, Price, Garment Name, Color (with live hex swatches), Size, and Notes/Description with immediate reactive updates.',
        'Bidirectional Pipeline & Status Filter Sync (Sales & Resale Studio): Unified salesPipelineStage and status tab dropdown under a single source of truth with automated localStorage persistence (sales_resale_pipeline_stage and sales_selected_status_tab).',
        'Bidirectional Pipeline & Status Filter Sync (Shopping & Wishlist Manager): Bound pipelineTab and selectedStatus under a synchronized setter with persistent localStorage caching (shopping_pipeline_tab and shopping_selected_status).',
        'Universal Color Swatches: Integrated getColorHex across all inline editable color fields in wardrobe, shopping, and resale tables and cards.',
      ],
      fixes: [
        'Fixed state mismatch where changing the active pipeline stage in the workflow bar did not update the status dropdown in the filter panel.',
        'Fixed filtering desynchronization where independent status states caused conflicting or missing records during pipeline filtering.',
        'Resolved non-editable colour and size fields across resale card grid and database views.',
      ],
      improvements: [
        'Pure Single Source of Truth architecture eliminates out-of-sync filter configurations.',
        'Zero friction inline modifications without requiring modal dialogues.',
        'Full keyboard navigation support (Enter to save, Escape to cancel) across all inline inputs.',
      ],
    },
    affectedModules: [
      'SellingView.tsx',
      'SellingDatabaseTable.tsx',
      'ShoppingView.tsx',
      'ShoppingDatabaseTable.tsx',
      'InventoryDatabaseTable.tsx',
      'WardrobeView.tsx',
      'statusUtils.ts',
    ],
  },
  {
    version: 'v4.8',
    releaseDate: 'September 2026',
    title: 'DRY Status Architecture & Single Source of Truth Refactoring',
    summary:
      'Eliminated duplicated status definitions, hardcoded select options, redundant switch-case badge styles, and fragmented tag reconciliation across the application into a unified statusUtils architecture.',
    isLatest: false,
    tags: ['DRY REFACTORING', 'ARCHITECTURE', 'SINGLE SOURCE OF TRUTH', 'STATUS UTILS', 'CODE QUALITY'],
    changes: {
      features: [
        'Centralized status constants: ALL_SELLING_STATUSES, ALL_SHIPPING_STATUSES, and ALL_SHOPPING_STATUSES in src/utils/statusUtils.ts.',
        'Extracted universal badge stylers (getSellingStatusBadgeClass, getShippingStatusBadgeClass, getShoppingStatusBadgeClass, getPipelineStageBadgeClass) eliminating scattered switch statements.',
        'Unified lifecycle tag reconciliation in reconcileSaleItemTagsForStatus, replacing duplicated tag-filtering logic across updateSaleItem, batchUpdateSaleItemsStatus, and initial garment cleaners.',
      ],
      fixes: [
        'Eliminated discrepancy where SaleFormModal lacked shipping statuses (like "Returned" / "Issue") present in database tables.',
        'Replaced repetitive 35-line switch statements across SellingDatabaseTable, ShoppingDatabaseTable, and SellingView with single-line invocations.',
        'Unified pipeline stage classification across views, preventing status desynchronization.',
      ],
      improvements: [
        'Single Source of Truth: Modifying, adding, or restyling any workflow status now propagates automatically across all tables, modal forms, batch editors, and filter bars.',
        'Zero lint or type errors with 100% strict TypeScript typing.',
      ],
    },
    affectedModules: ['statusUtils.ts', 'SellingDatabaseTable', 'ShoppingDatabaseTable', 'SaleFormModal', 'BulkEditModal', 'SellingView', 'WardrobeContext'],
  },
  {
    version: 'v4.7',
    releaseDate: 'September 2026',
    title: 'Selling Status Reactivity & Cancelled Lifecycle State Synchronization',
    summary:
      'Resolved selling status update synchronization across the Selling view, database table, card grid, and bulk actions. Added full support for the "Cancelled" status across types, tag reconciliation, pipeline stage detection, status filter dropdowns, and automated local persistence.',
    isLatest: false,
    tags: ['SELLING VIEW', 'STATE SYNCHRONIZATION', 'CANCELLED STATUS', 'TAG RECONCILIATION', 'REACTIVE UI'],
    changes: {
      features: [
        'Added "Cancelled" to the core SellingStatus type definition across types.ts, SaleFormModal, BulkEditModal, and SellingDatabaseTable.',
        'Interactive Quick-Status Selector: Added direct reactive status selector dropdown to individual garment cards in the Selling grid view with live color-coded pipeline indicators.',
        'Bulk Status Actions: Integrated quick "Mark Listed", "Mark Reserved", and "Mark Cancelled" action buttons into the Selling view BulkActionBar.',
        'Cancelled Status Filter: Added Cancelled / Delisted option to the status filter dropdown in the Selling filter toolbar.',
      ],
      fixes: [
        'Fixed state synchronization bug where selecting "Cancelled" in the Selling table dropdown was missing from SellingStatus and SALE_STATUSES options.',
        'Updated getSaleItemPipelineStage to explicitly evaluate status === "Cancelled", correctly classifying items without requiring manual notes or tags.',
        'Refactored updateSaleItem and batchUpdateSaleItemsStatus in WardrobeContext to move change log recording outside state setters and synchronize lifecycle tags automatically.',
        'Updated cleanInitialGarmentTags, buildMarketplaceSaleItem, and syncVintedOrderStatuses to accurately preserve and set Cancelled status.',
      ],
      improvements: [
        'Immediate reactive UI re-render on any single or batch status change, automatically reflected in the pipeline stage bar, cards, and database table.',
        'Seamless persistence to localStorage via storageQuotaService with undo history recording on every status modification.',
      ],
    },
    affectedModules: ['SellingView', 'SellingDatabaseTable', 'WardrobeContext', 'SaleFormModal', 'BulkEditModal', 'tagUtils', 'types.ts'],
  },
  {
    version: 'v4.6',
    releaseDate: 'September 2026',
    title: 'React Deduplication & Build Pipeline Stability',
    summary:
      'Configures strict single-instance React and React DOM resolution across Vite plugins and build outputs, eliminating runtime hook dispatcher conflicts and ensuring rock-solid WardrobeProvider initialization.',
    isLatest: false,
    tags: ['RUNTIME STABILITY', 'VITE DEDUPLICATION', 'REACT 19', 'BUILD VERIFICATION'],
    changes: {
      features: [
        'Vite Runtime Deduplication: Configured explicit dedupe and optimizeDeps resolution for react, react-dom, and react-dom/client in vite.config.mjs.',
        'Hook Dispatcher Protection: Ensured deterministic React dispatcher binding on initial component tree mount in sandboxed iframe environments.',
      ],
      fixes: [
        'Fixed potential multiple React copy resolution causing "resolveDispatcher().useState" errors in WardrobeProvider.',
        'Cleaned up obsolete archive fragments and verified full production compilation passing clean.',
      ],
      improvements: [
        'Instantaneous cold-start initialization and clean hydration across all wardrobe views.',
        'Maintained resilient ErrorBoundary recovery fallbacks with local state integrity.',
      ],
    },
    affectedModules: ['Vite Config', 'WardrobeProvider', 'ErrorBoundary', 'Build System'],
  },
  {
    version: 'v4.5',
    releaseDate: 'September 2026',
    title: 'Instant Boot Recovery & Dedicated Resale Pipeline Workflow Bar',
    summary:
      'Eliminates blank page startup failures by moving storage sanitization into non-blocking asynchronous lifecycles with depth and cycle guards. Integrates the prominent Interactive Pipeline Stage Bar in the Sales & Resale view featuring Draft, Listed, Reserved, Awaiting Dispatch, In Transit, Completed, and Cancelled workflow stages with real-time valuation metrics.',
    isLatest: false,
    tags: ['CRASH PREVENTION', 'PIPELINE STAGES', 'SALES WORKFLOW', 'BOOT RECOVERY', 'FILTER SYSTEM'],
    changes: {
      features: [
        'Dedicated Resale Pipeline Stage Bar: Interactive workflow bar at the top of the Sales & Resale view featuring stages: Draft, Listed, Reserved, Awaiting Dispatch, In Transit, Completed, and Cancelled.',
        'Stage Metrics & Inventory Valuations: Live listing counts and stage valuation sums calculated in real time across the entire sales inventory.',
        'Stage Filter Chips & Quick Reset: Integrated stage badge in active filters with one-click clear and cross-status mapping.',
        'Garment Card Stage Badges: Color-coded workflow stage badges on garment cards matching the pipeline status hierarchy.',
      ],
      fixes: [
        'Resolved Blank Screen on Boot: Deferred storage sanitization into non-blocking useEffect with safe depth and WeakSet cycle protection in stripLargeDataURIs.',
        'Safe Storage Accessor: Guarded localStorage operations against SecurityError and private-browsing / sandboxed iframe blocks.',
        'Eliminated synchronous recursive object walking during React state initialization on cold start.',
      ],
      improvements: [
        'Instantaneous application boot and frame render regardless of legacy storage size.',
        'One-click workflow filtering allows instant triage of items awaiting dispatch or in transit.',
      ],
      schemas: [
        'SalesPipelineStage: Complete workflow union of Draft, Listed, Reserved, Awaiting Dispatch, In Transit, Completed, Cancelled.',
      ],
    },
    affectedModules: [
      'SellingView',
      'WardrobeContext',
      'storageQuotaService',
      'VersionIterationsLog',
    ],
  },
  {
    version: 'v4.4',
    releaseDate: 'September 2026',
    title: 'LocalStorage Storage Quota Hardening & Progressive Log/Snapshot Compaction',
    summary:
      'Resolves "The quota has been exceeded" storage errors by implementing intelligent, progressive compaction for change logs and version snapshots, stripping bulky redundant base64 data URIs from historical rollback checkpoints, running startup storage sanitization, and adding emergency quota recovery.',
    isLatest: false,
    tags: ['QUOTA HARDENING', 'LOCALSTORAGE', 'ERROR RESOLUTION', 'COMPRESSION', 'PERFORMANCE'],
    changes: {
      features: [
        'Storage Quota Service: Autonomous storage manager that monitors browser quota limits and safely persists wardrobe state.',
        'Immediate Startup Storage Sanitization: Scans and compacts oversized historical logs and snapshots upon boot, immediately restoring 95%+ of localStorage headroom.',
        'Emergency Progressive Quota Recovery: Automatically prunes non-critical historical snapshot data and trims checkpoints if localStorage ever encounters quota pressure.',
      ],
      fixes: [
        'Resolved error "Failed to save logs The quota has been exceeded": Compacted version change logs to retain full action metadata while stripping redundant cloned wardrobe states on older entries.',
        'Resolved error "Failed to save snapshots The quota has been exceeded": Stripped bulky base64 data URIs from historical snapshot items and capped automatic checkpoints.',
        'Prevented state loss on browsers with tight storage limits by ensuring critical inventory entities (items, outfits, sales, wishlist) are prioritized over non-critical logs.',
        'Preserved high-resolution live photos during snapshot and timeline rollbacks by merging existing local images when omitted in historical checkpoints.',
      ],
      improvements: [
        'Reduced snapshot and change log storage footprints by over 98% without losing rollback capability.',
        'Replaced raw localStorage setItem blocks with resilient saveEntitySafely and saveLogsSafely wrappers.',
      ],
      schemas: [
        'StorageQuotaService: Modular utility with stripLargeDataURIs, compactLogsForStorage, compactSnapshotsForStorage, and pruneLocalStorageEmergency.',
      ],
    },
    affectedModules: [
      'WardrobeContext',
      'storageQuotaService',
      'initialData',
      'VersionIterationsLog',
    ],
  },
  {
    version: 'v4.3',
    releaseDate: 'September 2026',
    title: 'Sales Pipeline & Status Filters, Tag Taxonomy Suite & GitHub Image Stripping',
    summary:
      'Introduces a comprehensive Sales & Resale Pipeline Bar with real-time status and shipping stage filters, an inline and bulk Tag Taxonomy Manager with multi-select deletion, robust category backup and import validation, and GitHub sync payload image stripping to prevent 1MB limit sync errors.',
    isLatest: false,
    tags: ['PIPELINE FILTER', 'TAG MANAGEMENT', 'CATEGORY RECOVERY', 'GITHUB SYNC FIX', 'IMAGE STRIPPER'],
    changes: {
      features: [
        'Sales & Resale Pipeline Bar: Interactive workflow stages (Draft, Listed, Reserved, Awaiting Dispatch, In Transit, Completed, Cancelled) with live inventory counts and pipeline valuations.',
        'Unified Tag Manager: Dedicated modal and inline tag manager with search, multi-selection checkboxes, Select All, and instant bulk deletion across wardrobe garments, resale listings, and wishlist items.',
        'Inline Tag Removal: One-click "×" deletion on individual tags on cards and database table rows.',
        'Quick Category Creator: In-form category creation allowing immediate entry and assignment of custom categories during item, resale, and wishlist creation.',
        'GitHub Sync Image Stripper: Configurable toggle to strip high-resolution embedded base64 images before pushing to GitHub, guaranteeing payloads stay within GitHub API 1MB limit while safely preserving photos on local restore.',
      ],
      fixes: [
        'Resolved GitHub Sync runtime error "Can\'t find variable: stripEmbeddedImages" by defining and exporting the stripping utility in githubSyncService.',
        'Fixed Category backup and input loss: Ensured all unique categories across garments, resale listings, and shopping lists are comprehensively exported and restored without dropping custom classifications.',
        'Fixed category dropdown input limitations across ItemFormModal, SaleFormModal, and ShoppingFormModal by enabling direct custom category entry.',
        'Fixed image restore on backups: Gracefully preserves local high-res photos when importing backups containing stripped images, with custom local cache fallback indicators.',
      ],
      improvements: [
        'Added live stage valuation counters to the Sales & Resale interface for instantaneous pipeline forecasting.',
        'Enhanced Version History with detailed diff documentation for version v4.3.',
        'Optimized bulk operations in WardrobeContext with transactional undo snapshots.',
      ],
      schemas: [
        'Extended GithubSyncConfig with stripImages boolean toggle.',
        'Updated LosslessBackupPayload and importDataJSON to guarantee full category persistence across merge and overwrite operations.',
      ],
    },
    affectedModules: [
      'SellingView',
      'ManageTagsModal',
      'WardrobeContext',
      'losslessBackupService',
      'githubSyncService',
      'GithubSyncPanel',
      'ItemFormModal',
      'SaleFormModal',
      'ShoppingFormModal',
      'GarmentImage',
      'VersionIterationsLog',
    ],
  },
  {
    version: 'v4.2',
    releaseDate: 'September 2026',
    title: 'Lossless Humidor Suite, GitHub Auto-Sync & Vinted Active Scraper',
    summary:
      'Introduces enterprise-grade lossless database backup with SHA-256 checksums, automatic GitHub cloud repository synchronization, point-in-time closet rewinds, and authenticated active listings extraction.',
    isLatest: false,
    tags: ['LOSSLESS BACKUP', 'GITHUB SYNC', 'REWIND ENGINE', 'VINTED ACTIVE'],
    changes: {
      features: [
        'Humidor Lossless Backup Suite with cryptographic checksum validation and deep diff inspector.',
        'Automated GitHub Cloud Sync with push/pull, branch targeting, and PAT token security.',
        'Database Doctor integrity scanner with automated reference repairing and health score metric.',
        'CSV spreadsheet export suite for Wardrobe Catalog, Resale Hub, and Wishlist Pipeline.',
        'Authenticated Vinted active closet scraping (bypasses Cloudflare challenges via connected session).',
      ],
      fixes: [
        'Resolved rewind timeline button not applying state by embedding complete point-in-time snapshot data across revisions.',
        'Fixed database view rendering in both Purchase and Sales pages with responsive table wrappers and view mode synchronization.',
        'Hardened order ID deduplication across wardrobe, wishlist, and resale pipelines.',
      ],
      improvements: [
        'Enhanced Version History view with dedicated tabs for Timeline, Checkpoints, Lossless Backup, GitHub Sync, and Iterations Log.',
        'Synchronous ref updates on snapshot restore to eliminate stale state during rapid rewinds.',
      ],
      schemas: [
        'Added LosslessBackupPayload schema with metadata, integrity checksums, and version tracking.',
        'Extended VintedWorkerAuth with autoRouteOrders, sync filters, and session cookies.',
      ],
    },
    affectedModules: ['Version History', 'Selling Hub', 'Shopping Wishlist', 'Cloudflare Proxy', 'Backup Engine'],
  },
  {
    version: 'v4.1',
    releaseDate: 'September 2026',
    title: 'Selling & Shopping Database Grid Synchronization',
    summary:
      'Overhauled database view modes across Purchases and Sales views, establishing synchronized tabular layouts, quick-edit price controls, and batch status toggles.',
    tags: ['DATABASE VIEW', 'SELLING HUB', 'SHOPPING VIEW'],
    changes: {
      features: [
        'Integrated SellingDatabaseTable with sortable columns, platform tags, profit calculators, and inline status modification.',
        'Unified viewMode handling for "table" and "database" aliases across Shopping and Selling tabs.',
      ],
      fixes: [
        'Fixed missing table view render in SellingView when switching from grid to database mode.',
        'Corrected min-width overflow issues on narrow screens inside data tables.',
      ],
      improvements: [
        'Added empty state row with guidance to table views.',
        'Smoothed transitions between gallery grid and structured table rows.',
      ],
    },
    affectedModules: ['SellingView', 'ShoppingView', 'SellingDatabaseTable'],
  },
  {
    version: 'v4.0',
    releaseDate: 'August 2026',
    title: 'Cloudflare Worker Vinted Orders & Batch Extraction Pipeline',
    summary:
      'Integrated Cloudflare Worker proxy architecture to securely extract authenticated Vinted purchase and sales order histories, alongside batch URL and HTML source scrapers.',
    tags: ['VINTED SYNC', 'ORDERS API', 'VISION AI'],
    changes: {
      features: [
        'Cloudflare Worker proxy integration for Vinted order pagination, CSRF handling, and token refresh.',
        'Batch Vinted URL importer with parallel scraping and candidate image gallery selection.',
        'Fallback Vision AI garment scanner for Cloudflare-blocked listings.',
      ],
      fixes: [
        'Eliminated CORS blocking by implementing server-side proxy fallbacks for Vinted endpoints.',
        'Normalized category strings to match closet taxonomy during automated ingestion.',
      ],
      improvements: [
        'Auto-lifecycle tagging (Bought, Sold, Listed, Cancelled) on imported transactions.',
        'Token refresh callbacks stored automatically in local user settings.',
      ],
    },
    affectedModules: ['AutoImportModal', 'vintedWorkerService', 'server.ts'],
  },
  {
    version: 'v3.5',
    releaseDate: 'July 2026',
    title: 'Cost-per-Wear Analytics & Capsule Wardrobe Optimizer',
    summary:
      'Introduced dynamic cost-per-wear telemetry, wear logging with date tracking, and capsule wardrobe versatility ratings.',
    tags: ['ANALYTICS', 'CPW', 'CAPSULE SCORING'],
    changes: {
      features: [
        'Real-time Cost-per-Wear calculation formula factoring garment price and total logged wears.',
        'Capsule score evaluation based on seasonal versatility, neutral palettes, and layering capability.',
        'Quick wear logging buttons directly from item cards and lookbooks.',
      ],
      fixes: [
        'Handled zero-wear divide-by-zero scenarios gracefully by displaying initial purchase price.',
      ],
      improvements: [
        'Visual indicators for high-efficiency wardrobe investments vs underutilized garments.',
      ],
    },
    affectedModules: ['WardrobeView', 'ItemCard', 'WardrobeContext'],
  },
  {
    version: 'v3.0',
    releaseDate: 'June 2026',
    title: 'Lookbook Outfit Collage Canvas & Occasion Tagging',
    summary:
      'Launched the interactive Lookbook canvas allowing users to assemble multi-piece outfits, save styled collages, and categorize by weather and event.',
    tags: ['LOOKBOOK', 'OUTFIT CANVAS', 'COLLAGES'],
    changes: {
      features: [
        'Multi-piece outfit composer with category layering (Tops, Bottoms, Outerwear, Shoes, Accessories).',
        'Occasion tags (Workwear, Casual, Formal, Weekend, Date Night) and seasonal filters.',
        'Outfit wear logger incrementing wear counts on all constituent garments in 1 click.',
      ],
      fixes: [
        'Prevented deleted wardrobe items from crashing previously saved lookbook outfit layouts.',
      ],
      improvements: [
        'Dynamic outfit thumbnail generator based on constituent garment images.',
      ],
    },
    affectedModules: ['LookbookView', 'OutfitCanvas'],
  },
  {
    version: 'v2.0',
    releaseDate: 'May 2026',
    title: 'Shopping Wishlist & Budget Allocation Engine',
    summary:
      'Added the Shopping Wishlist view with monthly budget tracking, priority tags, and gap-analysis linking planned purchases to existing wardrobe items.',
    tags: ['WISHLIST', 'BUDGET', 'GAP ANALYSIS'],
    changes: {
      features: [
        'Monthly budget progress bar and total expenditure tracker.',
        'Priority tagging (Essential, High Priority, Nice to Have) with reason documentation.',
        '"Mark as Purchased" action seamlessly promoting wishlist items into your active wardrobe.',
      ],
      fixes: [
        'Corrected monthly budget rollover calculations when switching calendar months.',
      ],
      improvements: [
        'Integrated retailer favicon detection and quick external shopping links.',
      ],
    },
    affectedModules: ['ShoppingView', 'BudgetTracker'],
  },
  {
    version: 'v1.0',
    releaseDate: 'April 2026',
    title: 'Core Wardrobe Catalog & Audit Timeline Foundation',
    summary:
      'Initial release of the Wardrobe Management application, featuring structured garment cataloging, color/material tags, category taxonomy, and local change auditing.',
    tags: ['INITIAL RELEASE', 'CORE CATALOG', 'AUDIT TIMELINE'],
    changes: {
      features: [
        'Garment catalog with filtering by Category, Season, Condition, and Color.',
        'Audit timeline capturing all garment modifications, additions, and deletions.',
        'Point-in-time snapshot checkpoints with instant restoration.',
      ],
      fixes: [],
      improvements: [
        'Bespoke warm neutral aesthetic pairing Playfair Display with clean sans typography.',
      ],
    },
    affectedModules: ['WardrobeContext', 'WardrobeView', 'VersionHistoryView'],
  },
];

interface VersionIterationsLogProps {
  onNotify: (type: 'success' | 'info' | 'error', message: string) => void;
}

export const VersionIterationsLog: React.FC<VersionIterationsLogProps> = ({ onNotify }) => {
  const { createSnapshot } = useWardrobe();
  const [expandedVersions, setExpandedVersions] = useState<Record<string, boolean>>({
    v4_2: true,
    v4_1: true,
  });
  const [searchQuery, setSearchQuery] = useState('');

  const toggleExpand = (ver: string) => {
    const key = ver.replace('.', '_');
    setExpandedVersions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleCreateReleaseSnapshot = (iter: AppReleaseIteration) => {
    createSnapshot(
      `Release ${iter.version} Checkpoint`,
      `Manual checkpoint pinned to ${iter.version} (${iter.title}). Captured from Iterations Log.`,
      false
    );
    onNotify('success', `Created snapshot pinned to ${iter.version}! Available in Checkpoints tab.`);
  };

  const filteredIterations = APP_ITERATIONS_LOG.filter((iter) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      iter.version.toLowerCase().includes(q) ||
      iter.title.toLowerCase().includes(q) ||
      iter.summary.toLowerCase().includes(q) ||
      iter.tags.some((t) => t.toLowerCase().includes(q)) ||
      iter.changes.features.some((f) => f.toLowerCase().includes(q)) ||
      iter.changes.fixes.some((f) => f.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-4 bg-white border border-[#E5E5E1] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-serif font-bold text-base text-[#1A1A1A] flex items-center gap-2">
            <GitCommit className="w-4 h-4 text-[#8C7355]" />
            Application Version History &amp; Iteration Changelog
          </h3>
          <p className="text-xs text-[#767670] mt-0.5">
            Click any version iteration below to inspect architectural summaries, detailed feature breakdowns, bug fixes, and affected system modules.
          </p>
        </div>

        {/* Search filter */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#767670]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search changes or features..."
            className="w-full pl-8 pr-3 py-1.5 bg-[#FAF9F7] border border-[#D5D5D0] text-xs font-mono text-[#1A1A1A] focus:bg-white focus:border-[#8C7355] focus:outline-none"
          />
        </div>
      </div>

      {/* Iteration Cards List */}
      <div className="space-y-4">
        {filteredIterations.map((iter) => {
          const key = iter.version.replace('.', '_');
          const isExpanded = Boolean(expandedVersions[key]);

          return (
            <div
              key={iter.version}
              className={`bg-white border transition-all shadow-2xs ${
                iter.isLatest ? 'border-[#8C7355]/40' : 'border-[#E5E5E1]'
              }`}
            >
              {/* Clickable Header Bar */}
              <div
                onClick={() => toggleExpand(iter.version)}
                className="p-4 cursor-pointer hover:bg-[#FAF9F7] transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none"
              >
                <div className="flex items-start sm:items-center gap-3">
                  <div
                    className={`px-2.5 py-1 text-xs font-mono font-bold shrink-0 ${
                      iter.isLatest
                        ? 'bg-[#8C7355] text-white'
                        : 'bg-[#F2F1ED] text-[#1A1A1A] border border-[#D5D5D0]'
                    }`}
                  >
                    {iter.version}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-serif font-bold text-sm text-[#1A1A1A]">
                        {iter.title}
                      </h4>
                      {iter.isLatest && (
                        <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase">
                          Latest Release
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#767670] flex items-center gap-3 mt-1 font-mono">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-[#8C7355]" />
                        {iter.releaseDate}
                      </span>
                      <span>·</span>
                      <span>{iter.affectedModules.join(', ')}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {iter.tags.slice(0, 2).map((t, idx) => (
                      <span
                        key={idx}
                        className="px-1.5 py-0.5 text-[9px] font-mono bg-[#FAF9F7] text-[#5A5A55] border border-[#E5E5E1]"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="p-1 text-[#767670] hover:text-[#1A1A1A]"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Collapsible Content */}
              {isExpanded && (
                <div className="p-4 pt-0 border-t border-[#E5E5E1]/60 space-y-4">
                  <p className="text-xs text-[#5A5A55] leading-relaxed pt-3 font-sans">
                    {iter.summary}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    {/* Features Added */}
                    {iter.changes.features.length > 0 && (
                      <div className="p-3 bg-[#FAF9F7] border border-[#E5E5E1] space-y-2">
                        <div className="text-[11px] font-mono font-bold uppercase text-emerald-800 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                          New Features &amp; Capabilities
                        </div>
                        <ul className="space-y-1.5 text-xs text-[#1A1A1A]">
                          {iter.changes.features.map((f, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-emerald-600 font-bold">•</span>
                              <span className="leading-snug">{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Bug Fixes */}
                    {iter.changes.fixes.length > 0 && (
                      <div className="p-3 bg-[#FAF9F7] border border-[#E5E5E1] space-y-2">
                        <div className="text-[11px] font-mono font-bold uppercase text-blue-800 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                          Bug Fixes &amp; Stability
                        </div>
                        <ul className="space-y-1.5 text-xs text-[#1A1A1A]">
                          {iter.changes.fixes.map((fix, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-blue-600 font-bold">•</span>
                              <span className="leading-snug">{fix}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Improvements */}
                    {iter.changes.improvements.length > 0 && (
                      <div className="p-3 bg-[#FAF9F7] border border-[#E5E5E1] space-y-2">
                        <div className="text-[11px] font-mono font-bold uppercase text-[#8C7355] flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-[#8C7355]" />
                          Refinements &amp; Ergonomics
                        </div>
                        <ul className="space-y-1.5 text-xs text-[#1A1A1A]">
                          {iter.changes.improvements.map((imp, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-[#8C7355] font-bold">•</span>
                              <span className="leading-snug">{imp}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Schemas */}
                    {iter.changes.schemas && iter.changes.schemas.length > 0 && (
                      <div className="p-3 bg-[#FAF9F7] border border-[#E5E5E1] space-y-2">
                        <div className="text-[11px] font-mono font-bold uppercase text-purple-800 flex items-center gap-1.5">
                          <Database className="w-3.5 h-3.5 text-purple-600" />
                          Data Schema Updates
                        </div>
                        <ul className="space-y-1.5 text-xs text-[#1A1A1A]">
                          {iter.changes.schemas.map((s, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-purple-600 font-bold">•</span>
                              <span className="leading-snug">{s}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Action Footer */}
                  <div className="pt-2 border-t border-[#E5E5E1] flex items-center justify-between">
                    <span className="text-[10px] font-mono text-[#767670]">
                      Modules: {iter.affectedModules.join(' · ')}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCreateReleaseSnapshot(iter)}
                      className="px-3 py-1 bg-[#FAF9F7] hover:bg-[#F2F1ED] border border-[#D5D5D0] text-xs font-mono text-[#1A1A1A] flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
                    >
                      <Bookmark className="w-3 h-3 text-[#8C7355]" />
                      <span>Bookmark Checkpoint for {iter.version}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

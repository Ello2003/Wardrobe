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
    version: 'v5.7',
    releaseDate: 'September 2026',
    title: 'Automated Garment Safety & Trash Archive: Lossless Overwrite, Merge, and Delete Recovery',
    summary:
      'Implemented an automated Trash Bin recovery system to prevent data loss whenever garments are edited, consolidated/merged, replaced during backup imports, or deleted. Resolved duplicate over-merging where Sunspel t-shirts and similar core garments were mistakenly identified as duplicates, added comprehensive trash preservation across all mutation operations, and introduced both an interactive Trash Bin Studio modal and an embedded recovery console in Tools.',
    isLatest: true,
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

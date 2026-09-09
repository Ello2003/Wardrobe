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
    version: 'v4.3',
    releaseDate: 'September 2026',
    title: 'Sales Pipeline & Status Filters, Tag Taxonomy Suite & GitHub Image Stripping',
    summary:
      'Introduces a comprehensive Sales & Resale Pipeline Bar with real-time status and shipping stage filters, an inline and bulk Tag Taxonomy Manager with multi-select deletion, robust category backup and import validation, and GitHub sync payload image stripping to prevent 1MB limit sync errors.',
    isLatest: true,
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

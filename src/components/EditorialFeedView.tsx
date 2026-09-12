import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Rss,
  RefreshCw,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  Search,
  SlidersHorizontal,
  LayoutGrid,
  List,
  Sparkles,
  ShoppingBag,
  Clock,
  User,
  Tag,
  CheckCircle2,
  ChevronRight,
  ArrowUpRight,
  Filter,
  Layers,
  Info,
} from 'lucide-react';
import { useWardrobe } from '../context/WardrobeContext';
import {
  EditorialArticle,
  EditorialFeedSource,
  EditorialFeedSettings,
  Category,
  ShoppingItem,
} from '../types';
import {
  fetchEditorialFeed,
  getEditorialSettings,
  saveEditorialSettings,
  convertEditorialPieceToShoppingItem,
  DEFAULT_EDITORIAL_SOURCES,
} from '../services/editorialFeedService';
import { ManageFeedsModal } from './ManageFeedsModal';
import { TREND_RESEARCH_DATA } from '../data/initialData';

interface EditorialFeedViewProps {
  onOpenAIStylist?: () => void;
}

export const EditorialFeedView: React.FC<EditorialFeedViewProps> = ({ onOpenAIStylist }) => {
  const { addShoppingItem, items } = useWardrobe();

  // Settings & Feed State
  const [settings, setSettings] = useState<EditorialFeedSettings>(getEditorialSettings());
  const [sources, setSources] = useState<EditorialFeedSource[]>(DEFAULT_EDITORIAL_SOURCES);
  const [articles, setArticles] = useState<EditorialArticle[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isLiveActive, setIsLiveActive] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // UI Filter State
  const [selectedBrand, setSelectedBrand] = useState<string>('ALL');
  const [selectedTopic, setSelectedTopic] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'magazine' | 'compact'>('magazine');
  const [onlySaved, setOnlySaved] = useState<boolean>(false);
  const [activeMainTab, setActiveMainTab] = useState<'feed' | 'blueprints'>('feed');

  // Modal State
  const [isManageModalOpen, setIsManageModalOpen] = useState<boolean>(false);
  const [inspoArticle, setInspoArticle] = useState<EditorialArticle | null>(null);
  const [addedWishlistKeys, setAddedWishlistKeys] = useState<string[]>([]);
  const [notification, setNotification] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(
    null
  );

  const notify = useCallback((type: 'success' | 'info' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4500);
  }, []);

  // Format relative time helper
  const getRelativeTime = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

      if (diffHours < 1) {
        const diffMins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
        return `${diffMins}m ago`;
      }
      if (diffHours < 24) {
        return `${diffHours}h ago`;
      }
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    } catch {
      return 'Recent';
    }
  };

  // Currency formatter in GBP (£)
  const formatGbp = (val: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: val % 1 === 0 ? 0 : 2,
    }).format(val);
  };

  // Load feed on mount
  const loadFeed = useCallback(
    async (forceRefresh = false) => {
      if (forceRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const result = await fetchEditorialFeed({ forceRefresh });
        setArticles(result.articles);
        setSources(result.sources);
        setLastUpdated(result.lastUpdated);
        setIsLiveActive(result.isLive);
      } catch (err: any) {
        console.error('Error loading editorial feed:', err);
        notify('error', 'Could not refresh feeds.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [notify]
  );

  useEffect(() => {
    loadFeed(false);
  }, [loadFeed]);

  // Handle Save / Bookmark Article
  const handleToggleBookmark = (articleId: string) => {
    const isCurrentlySaved = settings.savedArticleIds.includes(articleId);
    const newSavedIds = isCurrentlySaved
      ? settings.savedArticleIds.filter((id) => id !== articleId)
      : [...settings.savedArticleIds, articleId];

    const newSettings = { ...settings, savedArticleIds: newSavedIds };
    setSettings(newSettings);
    saveEditorialSettings(newSettings);

    // Update in-memory articles
    setArticles((prev) =>
      prev.map((art) => (art.id === articleId ? { ...art, isSaved: !isCurrentlySaved } : art))
    );

    notify(
      'info',
      isCurrentlySaved ? 'Removed from saved dispatches.' : 'Saved to your personal Sartorial Bookmarks.'
    );
  };

  // Handle Add Piece to Shopping Wishlist
  const handleAddPieceToWishlist = (
    article: EditorialArticle,
    garment: {
      name: string;
      category: Category;
      estimatedPriceGbp: number;
      reason: string;
    }
  ) => {
    const key = `${article.id}-${garment.name}`;
    if (addedWishlistKeys.includes(key)) return;

    const shoppingItemPayload = convertEditorialPieceToShoppingItem(article, garment);
    addShoppingItem(shoppingItemPayload);

    setAddedWishlistKeys((prev) => [...prev, key]);
    notify('success', `Added "${garment.name}" (£${garment.estimatedPriceGbp}) to your Wishlist!`);
  };

  // Filtered Articles Calculation
  const filteredArticles = useMemo(() => {
    return articles.filter((art) => {
      // Source filter
      if (selectedBrand !== 'ALL' && art.sourceId !== selectedBrand) {
        return false;
      }

      // Topic filter
      if (selectedTopic !== 'ALL') {
        const searchTarget = (art.tags.join(' ') + ' ' + art.title + ' ' + art.summary).toLowerCase();
        const topicLower = selectedTopic.toLowerCase();
        if (!searchTarget.includes(topicLower)) {
          return false;
        }
      }

      // Saved only filter
      if (onlySaved && !art.isSaved) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = art.title.toLowerCase().includes(query);
        const matchSummary = art.summary.toLowerCase().includes(query);
        const matchAuthor = art.author?.toLowerCase().includes(query);
        const matchSource = art.sourceName.toLowerCase().includes(query);
        const matchTags = art.tags.some((t) => t.toLowerCase().includes(query));
        if (!matchTitle && !matchSummary && !matchAuthor && !matchSource && !matchTags) {
          return false;
        }
      }

      return true;
    });
  }, [articles, selectedBrand, selectedTopic, onlySaved, searchQuery]);

  // Topic taxonomy tags
  const topics = [
    'ALL',
    'Tailoring',
    'Knitwear',
    'Outerwear',
    'Footwear',
    'Flannel',
    'Ivy Style',
    'Bespoke',
    'Craft',
  ];

  // Active brand sources list
  const activeSources = useMemo(() => {
    return sources.filter((s) => settings.activeSourceIds.includes(s.id));
  }, [sources, settings.activeSourceIds]);

  // Selected trend for blueprints archive tab
  const [selectedBlueprint, setSelectedBlueprint] = useState(TREND_RESEARCH_DATA[0]);

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-18 right-6 z-50 px-4 py-2.5 rounded-lg shadow-lg border text-xs font-semibold flex items-center gap-2 animate-slideDown ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : notification.type === 'error'
              ? 'bg-rose-50 border-rose-300 text-rose-900'
              : 'bg-stone-900 border-stone-800 text-white'
          }`}
        >
          <span>{notification.message}</span>
        </div>
      )}

      {/* Main Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white border border-[#E5E5E1] rounded-xl p-4 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-serif font-bold text-[#1A1A1A]">
              Brand Editorials &amp; Sartorial Dispatches
            </h1>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[#FAF9F5] border border-[#E5E5E1] text-[#767670]">
              <span
                className={`w-2 h-2 rounded-full ${
                  isLiveActive ? 'bg-emerald-500 animate-pulse' : 'bg-[#8C7355]'
                }`}
              />
              <span>{isLiveActive ? 'Live RSS Feed' : 'Curated Dispatches'}</span>
              {lastUpdated && (
                <span className="text-[9px] text-[#A3A39D]">
                  • updated {getRelativeTime(lastUpdated)}
                </span>
              )}
            </div>
          </div>
          <p className="text-xs text-[#767670]">
            Continuous live updates, craft journals, and seasonal lookbooks from Drake's, Suitsupply, The Rake, and Permanent Style.
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
          {/* Main Tab Toggle: Live Feed vs Classic Blueprints */}
          <div className="flex items-center p-0.5 bg-[#FAF9F5] border border-[#E5E5E1] rounded-lg text-xs font-medium">
            <button
              onClick={() => setActiveMainTab('feed')}
              className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                activeMainTab === 'feed'
                  ? 'bg-white text-[#1A1A1A] font-semibold shadow-2xs'
                  : 'text-[#767670] hover:text-[#1A1A1A]'
              }`}
            >
              <Rss className="w-3.5 h-3.5 text-[#8C7355]" />
              <span>Live Feed</span>
            </button>
            <button
              onClick={() => setActiveMainTab('blueprints')}
              className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                activeMainTab === 'blueprints'
                  ? 'bg-white text-[#1A1A1A] font-semibold shadow-2xs'
                  : 'text-[#767670] hover:text-[#1A1A1A]'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-[#8C7355]" />
              <span>Style Blueprints</span>
            </button>
          </div>

          <button
            onClick={() => loadFeed(true)}
            disabled={isRefreshing}
            title="Fetch latest RSS dispatches from brand feeds"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-[#E5E5E1] hover:bg-[#FAF9F5] text-[#1A1A1A] shadow-2xs transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#8C7355] ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isRefreshing ? 'Refreshing…' : 'Refresh'}</span>
          </button>

          <button
            onClick={() => setIsManageModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-[#E5E5E1] hover:bg-[#FAF9F5] text-[#1A1A1A] shadow-2xs transition cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#767670]" />
            <span>Manage Feeds</span>
            <span className="text-[10px] font-mono bg-[#E5E5E1] text-[#1A1A1A] px-1.5 py-0.2 rounded-full">
              {settings.activeSourceIds.length}
            </span>
          </button>

          {onOpenAIStylist && (
            <button
              onClick={onOpenAIStylist}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#8C7355] hover:bg-[#786248] text-white shadow-xs transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Capsule Advisor</span>
            </button>
          )}
        </div>
      </div>

      {/* VIEW: LIVE EDITORIAL FEED */}
      {activeMainTab === 'feed' && (
        <div className="space-y-4">
          {/* Brand Filter Bar & Search */}
          <div className="bg-white border border-[#E5E5E1] rounded-xl p-3.5 shadow-xs space-y-3">
            {/* Row 1: Brand Badges Chips */}
            <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-thin">
              <div className="flex items-center gap-2 flex-nowrap">
                <button
                  onClick={() => setSelectedBrand('ALL')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 border ${
                    selectedBrand === 'ALL'
                      ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] shadow-2xs'
                      : 'bg-white text-[#767670] border-[#E5E5E1] hover:bg-[#FAF9F5]'
                  }`}
                >
                  <span>All Brands</span>
                  <span className="text-[10px] font-mono opacity-80">({articles.length})</span>
                </button>

                {activeSources.map((source) => {
                  const isSelected = selectedBrand === source.id;
                  const count = articles.filter((a) => a.sourceId === source.id).length;
                  return (
                    <button
                      key={source.id}
                      onClick={() => setSelectedBrand(source.id)}
                      className={`px-3 py-1 rounded-md text-xs font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 border ${
                        isSelected
                          ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] shadow-2xs'
                          : 'bg-white text-[#767670] border-[#E5E5E1] hover:bg-[#FAF9F5]'
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: source.brandColor || '#8C7355' }}
                      />
                      <span>{source.name}</span>
                      {count > 0 && <span className="text-[10px] font-mono opacity-80">({count})</span>}
                    </button>
                  );
                })}
              </div>

              {/* View Layout Switcher & Saved Filter */}
              <div className="flex items-center gap-1.5 shrink-0 pl-2 border-l border-[#E5E5E1]">
                <button
                  onClick={() => setOnlySaved((prev) => !prev)}
                  title="Show only bookmarked editorials"
                  className={`p-1.5 rounded-md border text-xs font-medium transition cursor-pointer flex items-center gap-1 ${
                    onlySaved
                      ? 'bg-amber-50 border-amber-300 text-amber-900 font-semibold'
                      : 'bg-white border-[#E5E5E1] text-[#767670] hover:bg-[#FAF9F5]'
                  }`}
                >
                  <Bookmark className={`w-3.5 h-3.5 ${onlySaved ? 'fill-amber-600 text-amber-600' : ''}`} />
                  <span className="text-[11px] hidden sm:inline">Saved ({settings.savedArticleIds.length})</span>
                </button>

                <div className="flex items-center p-0.5 bg-[#FAF9F5] border border-[#E5E5E1] rounded-md">
                  <button
                    onClick={() => setViewMode('magazine')}
                    title="Magazine Editorial View"
                    className={`p-1 rounded transition cursor-pointer ${
                      viewMode === 'magazine'
                        ? 'bg-white text-[#1A1A1A] shadow-2xs'
                        : 'text-[#767670] hover:text-[#1A1A1A]'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setViewMode('compact')}
                    title="Compact Dispatch List View"
                    className={`p-1 rounded transition cursor-pointer ${
                      viewMode === 'compact'
                        ? 'bg-white text-[#1A1A1A] shadow-2xs'
                        : 'text-[#767670] hover:text-[#1A1A1A]'
                    }`}
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Row 2: Search & Topic Filter Pills */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-1 border-t border-[#F0EFEB]">
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#767670]" />
                <input
                  type="text"
                  placeholder="Search editorials, authors, cloth..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#FAF9F5] border border-[#E5E5E1] rounded-lg focus:outline-none focus:border-[#8C7355] focus:bg-white text-[#1A1A1A]"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[#767670] hover:text-[#1A1A1A]"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Topic Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-0.5 scrollbar-thin">
                <span className="text-[11px] text-[#A3A39D] font-medium shrink-0 flex items-center gap-1">
                  <Filter className="w-3 h-3" />
                  <span>Topic:</span>
                </span>
                {topics.map((t) => (
                  <button
                    key={t}
                    onClick={() => setSelectedTopic(t)}
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium transition cursor-pointer whitespace-nowrap ${
                      selectedTopic === t
                        ? 'bg-[#8C7355] text-white shadow-2xs'
                        : 'bg-[#FAF9F5] text-[#767670] hover:bg-[#F2F1ED] hover:text-[#1A1A1A]'
                    }`}
                  >
                    {t === 'ALL' ? 'All Topics' : t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Loading Skeleton */}
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div
                  key={n}
                  className="bg-white border border-[#E5E5E1] rounded-xl p-4 space-y-3 animate-pulse shadow-xs"
                >
                  <div className="aspect-[16/10] bg-stone-200 rounded-lg" />
                  <div className="h-4 bg-stone-200 rounded w-3/4" />
                  <div className="h-3 bg-stone-100 rounded w-full" />
                  <div className="h-3 bg-stone-100 rounded w-2/3" />
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && filteredArticles.length === 0 && (
            <div className="bg-white border border-[#E5E5E1] rounded-xl p-12 text-center space-y-3 shadow-xs">
              <div className="w-12 h-12 rounded-full bg-[#FAF9F5] text-[#8C7355] flex items-center justify-center mx-auto">
                <Rss className="w-6 h-6" />
              </div>
              <h3 className="font-serif font-bold text-base text-[#1A1A1A]">No Dispatches Match Your Filters</h3>
              <p className="text-xs text-[#767670] max-w-md mx-auto">
                Try resetting your search query or topic filter, or ensure that you have brand sources enabled in the
                feed manager.
              </p>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => {
                    setSelectedBrand('ALL');
                    setSelectedTopic('ALL');
                    setSearchQuery('');
                    setOnlySaved(false);
                  }}
                  className="px-3.5 py-1.5 bg-[#8C7355] hover:bg-[#786248] text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer"
                >
                  Reset All Filters
                </button>
                <button
                  onClick={() => setIsManageModalOpen(true)}
                  className="px-3.5 py-1.5 bg-white border border-[#E5E5E1] hover:bg-[#FAF9F5] text-[#1A1A1A] text-xs font-semibold rounded-lg shadow-2xs cursor-pointer"
                >
                  Manage Active Feeds
                </button>
              </div>
            </div>
          )}

          {/* MAGAZINE VIEW */}
          {!isLoading && viewMode === 'magazine' && filteredArticles.length > 0 && (
            <div className="space-y-4">
              {/* Featured Top Dispatch (First Item) */}
              {selectedBrand === 'ALL' && !onlySaved && !searchQuery && filteredArticles[0] && (
                <div className="bg-white border border-[#E5E5E1] rounded-xl overflow-hidden shadow-xs grid grid-cols-1 lg:grid-cols-12 group">
                  <div className="lg:col-span-7 aspect-[16/10] lg:aspect-auto relative overflow-hidden bg-stone-100">
                    <img
                      src={filteredArticles[0].imageUrl}
                      alt={filteredArticles[0].title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded text-white shadow-xs tracking-wider"
                        style={{ backgroundColor: filteredArticles[0].brandColor || '#8C7355' }}
                      >
                        {filteredArticles[0].brandBadge}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-black/60 text-white backdrop-blur-xs">
                        FEATURED ESSAY
                      </span>
                    </div>
                  </div>

                  <div className="lg:col-span-5 p-6 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-[11px] text-[#767670]">
                        <span className="font-semibold text-[#1A1A1A]">{filteredArticles[0].sourceName}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {getRelativeTime(filteredArticles[0].publishedAt)}
                        </span>
                        <span>•</span>
                        <span>{filteredArticles[0].readTimeMinutes || 5} min read</span>
                      </div>

                      <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#1A1A1A] group-hover:text-[#8C7355] transition-colors leading-snug">
                        <a
                          href={filteredArticles[0].articleUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          {filteredArticles[0].title}
                        </a>
                      </h2>

                      <p className="text-xs text-[#555550] leading-relaxed line-clamp-4">
                        {filteredArticles[0].summary}
                      </p>

                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        {filteredArticles[0].tags.slice(0, 4).map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] bg-[#FAF9F5] text-[#767670] border border-[#E5E5E1] px-2 py-0.5 rounded-full"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-[#F0EFEB] flex items-center justify-between gap-2">
                      <div className="text-[11px] text-[#767670] flex items-center gap-1.5">
                        <User className="w-3 h-3" />
                        <span>By {filteredArticles[0].author || filteredArticles[0].sourceName}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleBookmark(filteredArticles[0].id)}
                          title={filteredArticles[0].isSaved ? 'Remove Bookmark' : 'Save Article'}
                          className={`p-2 rounded-lg border transition cursor-pointer ${
                            filteredArticles[0].isSaved
                              ? 'bg-amber-50 border-amber-300 text-amber-700'
                              : 'bg-white border-[#E5E5E1] text-[#767670] hover:bg-[#FAF9F5]'
                          }`}
                        >
                          <Bookmark
                            className={`w-4 h-4 ${filteredArticles[0].isSaved ? 'fill-amber-600 text-amber-600' : ''}`}
                          />
                        </button>

                        {filteredArticles[0].suggestedGarments && filteredArticles[0].suggestedGarments.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setInspoArticle(filteredArticles[0])}
                            className="px-3 py-1.5 bg-[#FAF9F5] hover:bg-[#F2F1ED] border border-[#E5E5E1] text-[#1A1A1A] text-xs font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                          >
                            <ShoppingBag className="w-3.5 h-3.5 text-[#8C7355]" />
                            <span>Style Inspo</span>
                          </button>
                        )}

                        <a
                          href={filteredArticles[0].articleUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-1.5 bg-[#1A1A1A] hover:bg-[#333] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition"
                        >
                          <span>Read Editorial</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Grid of Remaining Articles */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(selectedBrand === 'ALL' && !onlySaved && !searchQuery
                  ? filteredArticles.slice(1)
                  : filteredArticles
                ).map((article) => {
                  return (
                    <div
                      key={article.id}
                      className="bg-white border border-[#E5E5E1] rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                    >
                      <div>
                        {/* Image Thumbnail */}
                        <div className="aspect-[16/10] relative overflow-hidden bg-stone-100 border-b border-[#E5E5E1]">
                          <img
                            src={article.imageUrl}
                            alt={article.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                          />
                          <div className="absolute top-2.5 left-2.5">
                            <span
                              className="text-[9px] font-bold px-2 py-0.5 rounded text-white shadow-2xs tracking-wider"
                              style={{ backgroundColor: article.brandColor || '#8C7355' }}
                            >
                              {article.brandBadge}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleBookmark(article.id)}
                            title={article.isSaved ? 'Remove Bookmark' : 'Bookmark Article'}
                            className={`absolute top-2.5 right-2.5 p-1.5 rounded-md backdrop-blur-md transition cursor-pointer shadow-2xs ${
                              article.isSaved
                                ? 'bg-amber-500 text-white'
                                : 'bg-white/80 hover:bg-white text-[#1A1A1A]'
                            }`}
                          >
                            <Bookmark className={`w-3.5 h-3.5 ${article.isSaved ? 'fill-white' : ''}`} />
                          </button>
                        </div>

                        {/* Text Content */}
                        <div className="p-4 space-y-2">
                          <div className="flex items-center justify-between text-[11px] text-[#767670]">
                            <span className="font-semibold text-[#1A1A1A]">{article.sourceName}</span>
                            <span className="flex items-center gap-1 font-mono text-[10px]">
                              <Clock className="w-2.5 h-2.5" />
                              {getRelativeTime(article.publishedAt)}
                            </span>
                          </div>

                          <h3 className="font-serif font-bold text-base text-[#1A1A1A] group-hover:text-[#8C7355] transition-colors leading-snug line-clamp-2">
                            <a
                              href={article.articleUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline"
                            >
                              {article.title}
                            </a>
                          </h3>

                          <p className="text-xs text-[#666660] line-clamp-3 leading-relaxed">
                            {article.summary}
                          </p>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="p-4 pt-2 space-y-3">
                        <div className="flex items-center gap-1 flex-wrap">
                          {article.tags.slice(0, 3).map((t) => (
                            <span
                              key={t}
                              className="text-[9px] bg-[#FAF9F5] text-[#767670] border border-[#E5E5E1] px-1.5 py-0.2 rounded"
                            >
                              {t}
                            </span>
                          ))}
                          {article.readTimeMinutes && (
                            <span className="text-[9px] text-[#A3A39D] ml-auto font-mono">
                              {article.readTimeMinutes} min
                            </span>
                          )}
                        </div>

                        <div className="pt-2 border-t border-[#F0EFEB] flex items-center justify-between gap-2">
                          {article.suggestedGarments && article.suggestedGarments.length > 0 ? (
                            <button
                              type="button"
                              onClick={() => setInspoArticle(article)}
                              className="px-2.5 py-1 text-[11px] font-semibold rounded bg-[#FAF9F5] hover:bg-[#F2F1ED] text-[#1A1A1A] border border-[#E5E5E1] flex items-center gap-1 transition cursor-pointer"
                            >
                              <ShoppingBag className="w-3 h-3 text-[#8C7355]" />
                              <span>Style Gap ({article.suggestedGarments.length})</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-[#A3A39D]">
                              By {article.author?.split(' ')?.[0] || article.sourceName}
                            </span>
                          )}

                          <a
                            href={article.articleUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1 bg-[#FAF9F5] hover:bg-[#1A1A1A] text-[#1A1A1A] hover:text-white border border-[#E5E5E1] hover:border-[#1A1A1A] text-xs font-semibold rounded flex items-center gap-1 transition-all"
                          >
                            <span>Read</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* COMPACT DISPATCH LIST VIEW */}
          {!isLoading && viewMode === 'compact' && filteredArticles.length > 0 && (
            <div className="bg-white border border-[#E5E5E1] rounded-xl divide-y divide-[#E5E5E1] overflow-hidden shadow-xs">
              {filteredArticles.map((article) => {
                return (
                  <div
                    key={article.id}
                    className="p-3.5 sm:p-4 hover:bg-[#FAF9F5] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-stone-100 shrink-0 border border-[#E5E5E1]">
                        <img
                          src={article.imageUrl}
                          alt={article.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>

                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.2 rounded text-white tracking-wider"
                            style={{ backgroundColor: article.brandColor || '#8C7355' }}
                          >
                            {article.brandBadge}
                          </span>
                          <span className="text-[11px] font-semibold text-[#1A1A1A]">{article.sourceName}</span>
                          <span className="text-[#A3A39D] text-[10px]">•</span>
                          <span className="text-[10px] text-[#767670] font-mono">
                            {getRelativeTime(article.publishedAt)}
                          </span>
                          {article.author && (
                            <span className="text-[10px] text-[#767670] hidden md:inline">
                              • By {article.author}
                            </span>
                          )}
                        </div>

                        <h3 className="font-serif font-bold text-sm sm:text-base text-[#1A1A1A] group-hover:text-[#8C7355] transition-colors leading-snug truncate">
                          <a
                            href={article.articleUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                          >
                            {article.title}
                          </a>
                        </h3>

                        <p className="text-xs text-[#767670] truncate max-w-2xl hidden sm:block">
                          {article.summary}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => handleToggleBookmark(article.id)}
                        className={`p-1.5 rounded border transition cursor-pointer ${
                          article.isSaved
                            ? 'bg-amber-50 border-amber-300 text-amber-600'
                            : 'bg-white border-[#E5E5E1] text-[#767670] hover:bg-[#F2F1ED]'
                        }`}
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${article.isSaved ? 'fill-amber-600' : ''}`} />
                      </button>

                      {article.suggestedGarments && article.suggestedGarments.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setInspoArticle(article)}
                          className="px-2.5 py-1.5 bg-[#FAF9F5] hover:bg-[#F2F1ED] border border-[#E5E5E1] text-xs font-semibold rounded text-[#1A1A1A] flex items-center gap-1 cursor-pointer"
                        >
                          <ShoppingBag className="w-3.5 h-3.5 text-[#8C7355]" />
                          <span className="hidden md:inline">Style Inspo</span>
                        </button>
                      )}

                      <a
                        href={article.articleUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-[#1A1A1A] hover:bg-[#333] text-white text-xs font-semibold rounded flex items-center gap-1 transition shadow-2xs"
                      >
                        <span>Open</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW: CLASSIC STYLE BLUEPRINTS ARCHIVE */}
      {activeMainTab === 'blueprints' && (
        <div className="space-y-4">
          <div className="p-3 bg-[#FAF9F5] border border-[#E5E5E1] rounded-xl text-xs text-[#767670] flex items-center justify-between">
            <span>
              Curated capsule formula blueprints and sartorial color stories saved in your style archive.
            </span>
            <button
              onClick={() => setActiveMainTab('feed')}
              className="font-semibold text-[#8C7355] hover:underline flex items-center gap-1"
            >
              <span>Back to Live Brand Feeds</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {TREND_RESEARCH_DATA.map((trend) => {
              const isSelected = selectedBlueprint.id === trend.id;
              return (
                <div
                  key={trend.id}
                  onClick={() => setSelectedBlueprint(trend)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between space-y-2.5 relative overflow-hidden group shadow-xs ${
                    isSelected
                      ? 'bg-white border-[#8C7355] ring-1 ring-[#8C7355]/40 shadow-xs'
                      : 'bg-white border-[#E5E5E1] hover:border-[#8C7355]/50'
                  }`}
                >
                  <div className="aspect-[16/9] rounded-lg overflow-hidden bg-stone-100 mb-0.5 border border-[#E5E5E1]">
                    <img
                      src={trend.coverImageUrl}
                      alt={trend.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-[#8C7355] uppercase tracking-wider text-[10px]">
                        {trend.season}
                      </span>
                      <span className="text-[#767670]">{trend.aesthetic}</span>
                    </div>
                    <h3 className="font-serif font-bold text-sm text-[#1A1A1A] group-hover:text-[#8C7355] transition-colors">
                      {trend.title}
                    </h3>
                    <p className="text-xs text-[#767670] line-clamp-2 leading-relaxed">
                      {trend.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Blueprint Detail */}
          {selectedBlueprint && (
            <div className="bg-white border border-[#E5E5E1] rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5E5E1] pb-3">
                <div>
                  <h2 className="font-serif font-bold text-lg text-[#1A1A1A]">{selectedBlueprint.title}</h2>
                  <p className="text-xs text-[#767670] mt-0.5">{selectedBlueprint.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-semibold px-2.5 py-1 bg-[#FAF9F5] border border-[#E5E5E1] rounded-md text-[#8C7355]">
                    {selectedBlueprint.aesthetic}
                  </span>
                </div>
              </div>

              {/* Essential Pieces */}
              <div>
                <h4 className="text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider mb-2">
                  Essential Blueprint Pieces ({selectedBlueprint.keyPieces.length})
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedBlueprint.keyPieces.map((piece, i) => {
                    const key = `${selectedBlueprint.title}-${piece.name}`;
                    const isAdded = addedWishlistKeys.includes(key);
                    return (
                      <div
                        key={i}
                        className="p-3 bg-[#FAF9F5] border border-[#E5E5E1] rounded-lg flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-xs text-[#1A1A1A] truncate">{piece.name}</div>
                          <div className="text-[11px] text-[#767670] mt-0.5">
                            {piece.category} • Est. £{piece.suggestedPrice}
                          </div>
                          <p className="text-[11px] text-[#555] line-clamp-1 mt-1 italic">{piece.whyItWorks}</p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (isAdded) return;
                            addShoppingItem({
                              name: piece.name,
                              brand: piece.brandExamples?.[0] || 'Curated Heritage Brand',
                              category: piece.category as Category,
                              estimatedPrice: piece.suggestedPrice || 150,
                              priority: 'High',
                              status: 'Researching',
                              season: selectedBlueprint.season,
                              matchingWardrobeItemIds: items.slice(0, 3).map((i) => i.id),
                              imageUrl: piece.imageUrl,
                              reasonOrGap: `Blueprint: ${piece.whyItWorks}`,
                              estimatedWearsPerYear: 35,
                              tags: ['Blueprint', selectedBlueprint.aesthetic],
                            });
                            setAddedWishlistKeys((prev) => [...prev, key]);
                            notify('success', `Added "${piece.name}" to Wishlist!`);
                          }}
                          disabled={isAdded}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-md border flex items-center gap-1 shrink-0 cursor-pointer ${
                            isAdded
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 cursor-default'
                              : 'bg-white hover:bg-[#8C7355] hover:text-white border-[#E5E5E1] text-[#1A1A1A]'
                          }`}
                        >
                          {isAdded ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>In Wishlist</span>
                            </>
                          ) : (
                            <>
                              <ShoppingBag className="w-3.5 h-3.5" />
                              <span>Add to Wishlist</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STYLE INSPO & WARDROBE GAP MODAL */}
      {inspoArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white border border-[#E5E5E1] rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-fadeIn space-y-4">
            <div className="p-4 border-b border-[#E5E5E1] flex items-center justify-between bg-[#FAF9F5]">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-[#8C7355]" />
                <div>
                  <h3 className="font-serif font-bold text-sm text-[#1A1A1A]">Editorial Style Gaps &amp; Wishlist</h3>
                  <p className="text-[11px] text-[#767670]">From {inspoArticle.sourceName}: "{inspoArticle.title}"</p>
                </div>
              </div>
              <button
                onClick={() => setInspoArticle(null)}
                className="p-1 text-[#767670] hover:text-[#1A1A1A] rounded hover:bg-[#E5E5E1]"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              {inspoArticle.stylingNotes && (
                <div className="p-3 bg-[#FAF9F5] border border-[#E5E5E1] rounded-lg text-xs space-y-1">
                  <span className="font-semibold text-[#8C7355] uppercase tracking-wider text-[10px]">
                    Curator's Styling Blueprint
                  </span>
                  <p className="text-[#1A1A1A] italic">{inspoArticle.stylingNotes}</p>
                </div>
              )}

              <div className="space-y-3">
                <span className="text-xs font-semibold text-[#1A1A1A]">
                  Suggested Garments ({inspoArticle.suggestedGarments?.length || 0})
                </span>

                <div className="space-y-2.5">
                  {inspoArticle.suggestedGarments?.map((garment, idx) => {
                    const key = `${inspoArticle.id}-${garment.name}`;
                    const isAdded = addedWishlistKeys.includes(key);

                    return (
                      <div
                        key={idx}
                        className="p-3 border border-[#E5E5E1] rounded-lg bg-white flex items-center justify-between gap-3 shadow-2xs"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-xs text-[#1A1A1A]">{garment.name}</div>
                          <div className="text-[11px] text-[#8C7355] font-mono font-medium">
                            {formatGbp(garment.estimatedPriceGbp)} • {garment.category}
                          </div>
                          <p className="text-[11px] text-[#767670] mt-0.5 leading-snug">{garment.reason}</p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleAddPieceToWishlist(inspoArticle, garment)}
                          disabled={isAdded}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg border flex items-center gap-1.5 shrink-0 cursor-pointer ${
                            isAdded
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 cursor-default'
                              : 'bg-[#1A1A1A] hover:bg-[#333] text-white border-[#1A1A1A] shadow-xs'
                          }`}
                        >
                          {isAdded ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Added</span>
                            </>
                          ) : (
                            <>
                              <ShoppingBag className="w-3.5 h-3.5" />
                              <span>Add to Wishlist</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-3 bg-[#FAF9F5] border-t border-[#E5E5E1] flex justify-end">
              <button
                onClick={() => setInspoArticle(null)}
                className="px-4 py-1.5 bg-[#1A1A1A] hover:bg-[#333] text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANAGE FEEDS MODAL */}
      <ManageFeedsModal
        isOpen={isManageModalOpen}
        onClose={() => setIsManageModalOpen(false)}
        sources={sources}
        settings={settings}
        onUpdateSettings={(newSettings) => {
          setSettings(newSettings);
          saveEditorialSettings(newSettings);
        }}
        onRefreshFeeds={() => {
          loadFeed(true);
        }}
        onNotify={notify}
      />
    </div>
  );
};

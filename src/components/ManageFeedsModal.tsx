import React, { useState } from 'react';
import {
  X,
  Plus,
  Rss,
  Check,
  Globe,
  Trash2,
  RefreshCw,
  ExternalLink,
  SlidersHorizontal,
  AlertCircle,
  Settings2,
  RotateCcw,
} from 'lucide-react';
import { EditorialFeedSource, EditorialFeedSettings } from '../types';
import {
  testRssFeedUrl,
  restoreDefaultEditorialSources,
  DEFAULT_EDITORIAL_SOURCES,
} from '../services/editorialFeedService';

interface ManageFeedsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sources: EditorialFeedSource[];
  settings: EditorialFeedSettings;
  onUpdateSettings: (newSettings: EditorialFeedSettings) => void;
  onRefreshFeeds: () => void;
  onNotify: (type: 'success' | 'info' | 'error', message: string) => void;
}

export const ManageFeedsModal: React.FC<ManageFeedsModalProps> = ({
  isOpen,
  onClose,
  sources,
  settings,
  onUpdateSettings,
  onRefreshFeeds,
  onNotify,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'sources' | 'add' | 'settings'>('sources');
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  // New Custom Feed Form State
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [newName, setNewName] = useState('');
  const [newTagline, setNewTagline] = useState('');
  const [newBrandBadge, setNewBrandBadge] = useState('');
  const [newBrandColor, setNewBrandColor] = useState('#8C7355');
  const [newSiteUrl, setNewSiteUrl] = useState('');

  // Validation State
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    tested: boolean;
    valid: boolean;
    title?: string;
    itemCount?: number;
    error?: string;
  } | null>(null);

  const handleToggleSource = (sourceId: string) => {
    const isCurrentlyActive = settings.activeSourceIds.includes(sourceId);
    let newActiveIds: string[];

    if (isCurrentlyActive) {
      if (settings.activeSourceIds.length <= 1) {
        onNotify('info', 'At least one editorial feed source must remain active.');
        return;
      }
      newActiveIds = settings.activeSourceIds.filter((id) => id !== sourceId);
    } else {
      newActiveIds = [...settings.activeSourceIds, sourceId];
    }

    onUpdateSettings({
      ...settings,
      activeSourceIds: newActiveIds,
    });
  };

  const handleTestFeed = async () => {
    if (!newFeedUrl.trim()) {
      onNotify('error', 'Please enter a valid RSS / Atom feed URL.');
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    const res = await testRssFeedUrl(newFeedUrl.trim());
    setIsTesting(false);
    setTestResult({
      tested: true,
      valid: res.valid,
      title: res.title,
      itemCount: res.itemCount,
      error: res.error,
    });

    if (res.valid && res.title && !newName) {
      setNewName(res.title);
      setNewBrandBadge(res.title.slice(0, 16).toUpperCase());
    }
  };

  const handleAddCustomFeed = () => {
    if (!newFeedUrl.trim() || !newName.trim()) {
      onNotify('error', 'Feed URL and Source Name are required.');
      return;
    }

    const newSourceId = `custom-${Date.now()}`;
    const newSource: EditorialFeedSource = {
      id: newSourceId,
      name: newName.trim(),
      tagline: newTagline.trim() || 'Custom Editorial Feed',
      siteUrl: newSiteUrl.trim() || newFeedUrl.trim(),
      feedUrl: newFeedUrl.trim(),
      brandBadge: newBrandBadge.trim().toUpperCase() || newName.trim().toUpperCase(),
      brandColor: newBrandColor || '#8C7355',
      enabled: true,
      isCustom: true,
      category: 'Custom Brand',
      logoLetter: newName.trim().slice(0, 2).toUpperCase(),
    };

    const updatedCustomSources = [...(settings.customSources || []), newSource];
    const updatedActiveIds = [...settings.activeSourceIds, newSourceId];

    onUpdateSettings({
      ...settings,
      customSources: updatedCustomSources,
      activeSourceIds: updatedActiveIds,
    });

    onNotify('success', `Added custom feed "${newSource.name}"!`);
    setNewFeedUrl('');
    setNewName('');
    setNewTagline('');
    setNewBrandBadge('');
    setNewSiteUrl('');
    setTestResult(null);
    setActiveTab('sources');
    onRefreshFeeds();
  };

  const handleDeleteSource = (sourceId: string, sourceName: string) => {
    const isDefault = DEFAULT_EDITORIAL_SOURCES.some((s) => s.id === sourceId);

    const updatedDeleted = Array.from(
      new Set([...(settings.deletedSourceIds || []), sourceId])
    );
    const updatedCustom = (settings.customSources || []).filter((s) => s.id !== sourceId);
    const updatedActive = (settings.activeSourceIds || []).filter((id) => id !== sourceId);

    const updated: EditorialFeedSettings = {
      ...settings,
      deletedSourceIds: isDefault ? updatedDeleted : settings.deletedSourceIds || [],
      customSources: updatedCustom,
      activeSourceIds: updatedActive,
    };

    onUpdateSettings(updated);
    setConfirmingDeleteId(null);
    onNotify('info', `Deleted feed subscription for "${sourceName}".`);
    onRefreshFeeds();
  };

  const handleRestoreDefaults = () => {
    const updated = restoreDefaultEditorialSources();
    onUpdateSettings(updated);
    onNotify('success', 'Restored all curated default editorial feeds!');
    onRefreshFeeds();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white border border-[#E5E5E1] rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="p-4 border-b border-[#E5E5E1] flex items-center justify-between bg-[#FAF9F5]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#8C7355]/10 text-[#8C7355] flex items-center justify-center">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-base text-[#1A1A1A]">Manage Brand &amp; Editorial Feeds</h2>
              <p className="text-[11px] text-[#767670]">
                Configure sartorial publications, Drake's, Suitsupply, and custom RSS subscriptions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#767670] hover:text-[#1A1A1A] rounded-md hover:bg-[#F2F1ED] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 pt-3 border-b border-[#E5E5E1] flex gap-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('sources')}
            className={`pb-2.5 transition-colors border-b-2 cursor-pointer ${
              activeTab === 'sources'
                ? 'border-[#8C7355] text-[#8C7355]'
                : 'border-transparent text-[#767670] hover:text-[#1A1A1A]'
            }`}
          >
            Subscribed Feeds ({sources.length})
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`pb-2.5 transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'add'
                ? 'border-[#8C7355] text-[#8C7355]'
                : 'border-transparent text-[#767670] hover:text-[#1A1A1A]'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            Add Custom RSS
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`pb-2.5 transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'settings'
                ? 'border-[#8C7355] text-[#8C7355]'
                : 'border-transparent text-[#767670] hover:text-[#1A1A1A]'
            }`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            Feed Settings
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTab === 'sources' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[#767670] pb-1">
                <span>Delete feeds inline or toggle which brand dispatches appear in your feed:</span>
                <button
                  onClick={onRefreshFeeds}
                  className="text-[#8C7355] hover:underline font-semibold flex items-center gap-1 text-[11px] cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  Refresh All Now
                </button>
              </div>

              {(settings.deletedSourceIds?.length ?? 0) > 0 && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between gap-2 text-xs">
                  <span className="text-amber-800">
                    <strong>{settings.deletedSourceIds?.length}</strong> feed subscription{settings.deletedSourceIds && settings.deletedSourceIds.length > 1 ? 's are' : ' is'} currently deleted.
                  </span>
                  <button
                    type="button"
                    onClick={handleRestoreDefaults}
                    className="flex items-center gap-1 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-medium text-[11px] cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Restore Default Feeds
                  </button>
                </div>
              )}

              {sources.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-[#E5E5E1] rounded-lg bg-[#FAF9F5] space-y-2">
                  <p className="text-xs text-[#767670]">No editorial feeds active or subscribed.</p>
                  <button
                    type="button"
                    onClick={handleRestoreDefaults}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#8C7355] text-white rounded-md text-xs font-semibold cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Restore Standard Curated Feeds
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-[#E5E5E1] border border-[#E5E5E1] rounded-lg overflow-hidden bg-white">
                  {sources.map((source) => {
                    const isActive = settings.activeSourceIds.includes(source.id);
                    const isConfirmingDelete = confirmingDeleteId === source.id;

                    return (
                      <div
                        key={source.id}
                        className="p-3.5 flex items-center justify-between gap-3 hover:bg-[#FAF9F5] transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-8 h-8 rounded-md flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-2xs"
                            style={{ backgroundColor: source.brandColor || '#8C7355' }}
                          >
                            {source.logoLetter || source.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-xs text-[#1A1A1A] truncate">{source.name}</span>
                              <span
                                className="text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wider uppercase border"
                                style={{
                                  color: source.brandColor || '#8C7355',
                                  borderColor: `${source.brandColor}30`,
                                  backgroundColor: `${source.brandColor}10`,
                                }}
                              >
                                {source.brandBadge}
                              </span>
                              {source.isCustom && (
                                <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded">
                                  Custom
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-[#767670] truncate mt-0.5">{source.tagline}</p>
                            <div className="flex items-center gap-2 mt-1 text-[10px] text-[#8C7355]">
                              <a
                                href={source.siteUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline flex items-center gap-0.5"
                              >
                                <span>Official Site</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                              <span>•</span>
                              <span className="text-[#A3A39D] truncate max-w-[200px]">{source.feedUrl}</span>
                            </div>
                          </div>
                        </div>

                        {/* Inline Actions: Delete Button & Status Toggle */}
                        <div className="flex items-center gap-2 shrink-0">
                          {isConfirmingDelete ? (
                            <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 px-2 py-1 rounded-md animate-fadeIn">
                              <span className="text-[11px] font-medium text-rose-800">Delete feed?</span>
                              <button
                                type="button"
                                onClick={() => handleDeleteSource(source.id, source.name)}
                                className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold rounded cursor-pointer"
                              >
                                Yes
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmingDeleteId(null)}
                                className="px-1.5 py-0.5 text-stone-600 hover:text-stone-900 text-[10px] font-medium cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmingDeleteId(source.id)}
                              title={`Delete feed subscription for ${source.name}`}
                              className="p-1.5 text-stone-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleToggleSource(source.id)}
                            className={`px-3 py-1 text-xs font-semibold rounded-md border transition-all cursor-pointer ${
                              isActive
                                ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] shadow-2xs'
                                : 'bg-white text-[#767670] border-[#E5E5E1] hover:bg-[#F2F1ED]'
                            }`}
                          >
                            {isActive ? 'Active' : 'Disabled'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : activeTab === 'add' ? (
            <div className="space-y-4">
              <div className="p-3 bg-[#FAF9F5] border border-[#E5E5E1] rounded-lg text-xs text-[#767670] space-y-1">
                <div className="font-semibold text-[#1A1A1A] flex items-center gap-1.5">
                  <Rss className="w-3.5 h-3.5 text-[#8C7355]" />
                  Add Any Menswear, Brand Lookbook or Substack Feed
                </div>
                <p>
                  Paste any valid RSS, Atom, or XML feed address. The engine automatically ingests new dispatches, hero
                  images, and author essays.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-[#1A1A1A] mb-1">
                    Feed URL (RSS / Atom) <span className="text-rose-600">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="e.g. https://example.com/feed or https://brand.substack.com/feed"
                      value={newFeedUrl}
                      onChange={(e) => setNewFeedUrl(e.target.value)}
                      className="flex-1 px-3 py-2 border border-[#E5E5E1] rounded-lg text-xs focus:outline-none focus:border-[#8C7355] bg-white font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleTestFeed}
                      disabled={isTesting || !newFeedUrl.trim()}
                      className="px-3 py-2 bg-[#8C7355] hover:bg-[#786248] text-white font-semibold rounded-lg flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shrink-0"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                      <span>{isTesting ? 'Testing...' : 'Test Feed'}</span>
                    </button>
                  </div>
                </div>

                {testResult && (
                  <div
                    className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
                      testResult.valid
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}
                  >
                    {testResult.valid ? (
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      {testResult.valid ? (
                        <div>
                          <span className="font-bold">Valid Feed Discovered: </span>
                          <span>
                            "{testResult.title}" ({testResult.itemCount} articles found)
                          </span>
                        </div>
                      ) : (
                        <div>
                          <span className="font-bold">Feed Validation Failed: </span>
                          <span>{testResult.error || 'Could not parse RSS XML format.'}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[#1A1A1A] mb-1">
                      Publication / Brand Name <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Spier & Mackay Journal"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full px-3 py-2 border border-[#E5E5E1] rounded-lg text-xs focus:outline-none focus:border-[#8C7355] bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#1A1A1A] mb-1">Brand Badge Tag (Short)</label>
                    <input
                      type="text"
                      placeholder="e.g. SPIER & MACKAY"
                      value={newBrandBadge}
                      onChange={(e) => setNewBrandBadge(e.target.value)}
                      className="w-full px-3 py-2 border border-[#E5E5E1] rounded-lg text-xs focus:outline-none focus:border-[#8C7355] bg-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[#1A1A1A] mb-1">Official Website URL</label>
                    <input
                      type="url"
                      placeholder="e.g. https://www.spierandmackay.com"
                      value={newSiteUrl}
                      onChange={(e) => setNewSiteUrl(e.target.value)}
                      className="w-full px-3 py-2 border border-[#E5E5E1] rounded-lg text-xs focus:outline-none focus:border-[#8C7355] bg-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#1A1A1A] mb-1">Brand Accent Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={newBrandColor}
                        onChange={(e) => setNewBrandColor(e.target.value)}
                        className="w-8 h-8 rounded border border-[#E5E5E1] cursor-pointer"
                      />
                      <input
                        type="text"
                        value={newBrandColor}
                        onChange={(e) => setNewBrandColor(e.target.value)}
                        className="flex-1 px-3 py-2 border border-[#E5E5E1] rounded-lg text-xs focus:outline-none focus:border-[#8C7355] bg-white font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-[#1A1A1A] mb-1">Editorial Tagline or Scope</label>
                  <input
                    type="text"
                    placeholder="e.g. Modern Neapolitan tailoring and curated British cloth mills"
                    value={newTagline}
                    onChange={(e) => setNewTagline(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E5E5E1] rounded-lg text-xs focus:outline-none focus:border-[#8C7355] bg-white"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('sources')}
                    className="px-4 py-2 border border-[#E5E5E1] hover:bg-[#F2F1ED] text-xs font-semibold rounded-lg text-[#1A1A1A] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddCustomFeed}
                    className="px-4 py-2 bg-[#8C7355] hover:bg-[#786248] text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer"
                  >
                    Save &amp; Subscribe Feed
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Feed Preferences & Settings Tab */
            <div className="space-y-4 text-xs">
              <div className="p-3 bg-[#FAF9F5] border border-[#E5E5E1] rounded-lg space-y-1">
                <div className="font-semibold text-[#1A1A1A] flex items-center gap-1.5">
                  <Settings2 className="w-3.5 h-3.5 text-[#8C7355]" />
                  Editorial Synchronization &amp; Layout Settings
                </div>
                <p className="text-[#767670]">
                  Configure automatic refresh intervals, cache retention, and default viewing layouts.
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 border border-[#E5E5E1] rounded-lg bg-white space-y-2">
                  <label className="block font-semibold text-[#1A1A1A]">Auto-Refresh Frequency</label>
                  <p className="text-[11px] text-[#767670]">
                    How often the studio background syncs fresh articles and lookbooks from active feeds:
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    {[15, 30, 60, 120].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() =>
                          onUpdateSettings({
                            ...settings,
                            autoRefreshMinutes: mins,
                          })
                        }
                        className={`py-2 px-3 rounded-lg border text-center font-medium cursor-pointer transition-all ${
                          settings.autoRefreshMinutes === mins
                            ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] shadow-2xs font-bold'
                            : 'bg-[#F8F7F4] text-[#767670] border-[#E5E5E1] hover:bg-white'
                        }`}
                      >
                        {mins} minutes
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3.5 border border-[#E5E5E1] rounded-lg bg-white space-y-2">
                  <label className="block font-semibold text-[#1A1A1A]">Default Layout Mode</label>
                  <p className="text-[11px] text-[#767670]">Initial editorial presentation style when loading the Sartorial Desk:</p>
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {[
                      { id: 'magazine', label: 'Magazine Hero' },
                      { id: 'compact', label: 'Compact Grid' },
                      { id: 'editorial-split', label: 'Editorial Split' },
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() =>
                          onUpdateSettings({
                            ...settings,
                            defaultViewMode: mode.id as any,
                          })
                        }
                        className={`py-2 px-3 rounded-lg border text-center font-medium cursor-pointer transition-all ${
                          settings.defaultViewMode === mode.id
                            ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] shadow-2xs font-bold'
                            : 'bg-[#F8F7F4] text-[#767670] border-[#E5E5E1] hover:bg-white'
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3.5 border border-[#E5E5E1] rounded-lg bg-white space-y-3">
                  <label className="block font-semibold text-[#1A1A1A]">Feed Health &amp; Recovery</label>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                    <div>
                      <div className="font-medium text-[#1A1A1A]">Restore Curated Default Feeds</div>
                      <p className="text-[11px] text-[#767670]">
                        Re-activates Drake's, Suitsupply, The Rake, Permanent Style, Die, Workwear, and Put This On.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRestoreDefaults}
                      className="px-3.5 py-1.5 bg-[#F2F1ED] hover:bg-[#E5E5E1] text-[#1A1A1A] font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <RotateCcw className="w-3 h-3 text-[#8C7355]" />
                      Restore Defaults
                    </button>
                  </div>

                  <div className="pt-2 border-t border-[#E5E5E1] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div>
                      <div className="font-medium text-[#1A1A1A]">Clear Editorial Cache</div>
                      <p className="text-[11px] text-[#767670]">
                        Clears locally stored RSS article dispatches and re-fetches latest items.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          localStorage.removeItem('wardrobe_editorial_feed_cache_v1');
                          onRefreshFeeds();
                          onNotify('success', 'Editorial cache cleared. Refreshing dispatches...');
                        } catch {
                          onNotify('error', 'Could not clear cache.');
                        }
                      }}
                      className="px-3.5 py-1.5 bg-white border border-[#E5E5E1] hover:bg-[#F2F1ED] text-[#767670] hover:text-[#1A1A1A] font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Clear Cache
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-[#FAF9F5] border-t border-[#E5E5E1] flex items-center justify-between text-xs text-[#767670]">
          <span className="text-[11px]">
            {settings.activeSourceIds.length} feeds actively publishing to your Sartorial Desk
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#1A1A1A] hover:bg-[#333] text-white font-semibold rounded-lg text-xs cursor-pointer shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  History,
  Camera,
  RotateCcw,
  Download,
  Upload,
  Trash2,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { useWardrobe } from '../context/WardrobeContext';
import { ChangeActionType } from '../types';

interface VersionHistoryViewProps {
  onOpenCreateSnapshot: () => void;
}

export const VersionHistoryView: React.FC<VersionHistoryViewProps> = ({
  onOpenCreateSnapshot,
}) => {
  const {
    changeLogs,
    snapshots,
    currentVersion,
    restoreSnapshot,
    deleteSnapshot,
    exportDataJSON,
    importDataJSON,
    resetToDefaultData,
    clearDatabase,
  } = useWardrobe();

  const [activeTab, setActiveTab] = useState<'timeline' | 'snapshots' | 'backup'>('timeline');
  const [filterAction, setFilterAction] = useState<string>('ALL');
  const [restoringSnapId, setRestoringSnapId] = useState<string | null>(null);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [importStatus, setImportStatus] = useState<{ success?: boolean; message?: string } | null>(
    null
  );

  const formatGbp = (val: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: val % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  const getActionBadge = (type: ChangeActionType) => {
    switch (type) {
      case 'ITEM_ADDED':
        return { label: 'Item Added', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
      case 'ITEM_UPDATED':
        return { label: 'Item Edited', bg: 'bg-blue-100 text-blue-800 border-blue-300' };
      case 'ITEM_WORN':
        return { label: 'Wear Logged', bg: 'bg-amber-100 text-amber-900 border-amber-300' };
      case 'ITEM_DELETED':
        return { label: 'Item Removed', bg: 'bg-rose-100 text-rose-800 border-rose-300' };
      case 'LOOK_CREATED':
        return { label: 'Look Created', bg: 'bg-purple-100 text-purple-800 border-purple-300' };
      case 'LOOK_UPDATED':
        return { label: 'Look Edited', bg: 'bg-purple-50 text-purple-800 border-purple-200' };
      case 'WISHLIST_ADDED':
        return { label: 'Wishlist Added', bg: 'bg-sky-100 text-sky-800 border-sky-300' };
      case 'WISHLIST_PURCHASED':
        return { label: 'Purchased & Added', bg: 'bg-emerald-100 text-emerald-900 border-emerald-400 font-semibold' };
      case 'SNAPSHOT_CREATED':
        return { label: 'Snapshot Point', bg: 'bg-[#F8F7F4] text-[#1A1A1A] border-[#E5E5E1]' };
      case 'SNAPSHOT_RESTORED':
        return { label: 'Version Rollback', bg: 'bg-amber-100 text-amber-900 border-amber-400 font-semibold' };
      default:
        return { label: type, bg: 'bg-[#F8F7F4] text-[#767670] border-[#E5E5E1]' };
    }
  };

  const filteredLogs = changeLogs.filter((log) => {
    if (filterAction === 'ALL') return true;
    if (filterAction === 'WARDROBE' && log.entityType === 'wardrobe_item') return true;
    if (filterAction === 'LOOKS' && log.entityType === 'lookbook_outfit') return true;
    if (filterAction === 'SHOPPING' && log.entityType === 'shopping_item') return true;
    if (filterAction === 'SNAPSHOTS' && (log.entityType === 'snapshot' || log.entityType === 'system'))
      return true;
    return true;
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const result = importDataJSON(content);
        setImportStatus(result);
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmRestore = (snapId: string) => {
    const success = restoreSnapshot(snapId);
    if (success) {
      setRestoringSnapId(null);
      setActiveTab('timeline');
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-[#E5E5E1] rounded-xl p-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-serif font-bold text-[#1A1A1A]">
              Audit &amp; Change History
            </h1>
          </div>
          <p className="text-xs text-[#767670]">
            Audit log of all closet modifications, financial adjustments, wear logs, and version snapshot rollback points in £ GBP.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenCreateSnapshot}
            id="create-snapshot-btn"
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md bg-[#8C7355] hover:bg-[#786248] text-white shadow-xs transition-all cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5" />
            Create Snapshot Checkpoint
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-[#E5E5E1] space-x-4 text-xs">
        <button
          onClick={() => setActiveTab('timeline')}
          className={`pb-2.5 font-semibold flex items-center gap-1.5 transition-colors border-b-2 cursor-pointer ${
            activeTab === 'timeline'
              ? 'border-[#8C7355] text-[#8C7355]'
              : 'border-transparent text-[#767670] hover:text-[#1A1A1A]'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          Live Audit Timeline ({changeLogs.length})
        </button>

        <button
          onClick={() => setActiveTab('snapshots')}
          className={`pb-2.5 font-semibold flex items-center gap-1.5 transition-colors border-b-2 cursor-pointer ${
            activeTab === 'snapshots'
              ? 'border-[#8C7355] text-[#8C7355]'
              : 'border-transparent text-[#767670] hover:text-[#1A1A1A]'
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          Version Snapshots &amp; Rollback ({snapshots.length})
        </button>

        <button
          onClick={() => setActiveTab('backup')}
          className={`pb-2.5 font-semibold flex items-center gap-1.5 transition-colors border-b-2 cursor-pointer ${
            activeTab === 'backup'
              ? 'border-[#8C7355] text-[#8C7355]'
              : 'border-transparent text-[#767670] hover:text-[#1A1A1A]'
          }`}
        >
          <Download className="w-3.5 h-3.5" />
          Backup &amp; Migration
        </button>
      </div>

      {/* TAB 1: AUDIT TIMELINE */}
      {activeTab === 'timeline' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 bg-white border border-[#E5E5E1] rounded-xl p-3 shadow-xs">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
              <span className="text-[11px] text-[#767670] font-mono mr-1 font-semibold">Filter:</span>
              {[
                { id: 'ALL', label: 'All Changes' },
                { id: 'WARDROBE', label: 'Wardrobe & Wears' },
                { id: 'LOOKS', label: 'Lookbook' },
                { id: 'SHOPPING', label: 'Wishlist & Purchases' },
                { id: 'SNAPSHOTS', label: 'Snapshots & Rollbacks' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilterAction(f.id)}
                  className={`px-2.5 py-0.5 text-xs rounded-md whitespace-nowrap transition-all cursor-pointer ${
                    filterAction === f.id
                      ? 'bg-[#1A1A1A] text-white font-semibold shadow-xs'
                      : 'bg-[#F8F7F4] text-[#5A5A55] hover:bg-[#F3F2EE] border border-[#E5E5E1]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <span className="text-[11px] text-[#767670] font-mono">
              Showing {filteredLogs.length} events
            </span>
          </div>

          {/* Timeline Feed */}
          <div className="relative pl-6 sm:pl-7 space-y-3.5 before:absolute before:left-2.5 sm:before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E5E5E1]">
            {filteredLogs.map((log) => {
              const badge = getActionBadge(log.actionType);
              const date = new Date(log.timestamp);

              return (
                <div key={log.id} className="relative group">
                  {/* Dot on timeline line */}
                  <div className="absolute -left-6 sm:-left-7 top-2 w-2.5 h-2.5 rounded-full bg-white border-2 border-[#8C7355] group-hover:scale-125 transition-transform" />

                  <div className="bg-white border border-[#E5E5E1] hover:border-[#8C7355]/50 rounded-xl p-3.5 space-y-2 shadow-xs transition-all">
                    {/* Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-mono font-bold text-[#8C7355]">
                          Rev #{log.versionNumber}
                        </span>
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.5 rounded border font-semibold ${badge.bg}`}
                        >
                          {badge.label}
                        </span>
                        <span className="text-xs font-semibold text-[#1A1A1A]">
                          {log.entityTitle}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-[11px] text-[#767670] font-mono">
                        <Clock className="w-3 h-3 text-[#767670]" />
                        <span>
                          {date.toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}{' '}
                          at {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {/* Summary Description */}
                    <p className="text-xs text-[#5A5A55] leading-relaxed">
                      {log.summary}
                    </p>

                    {/* Diff / Financial Impact details */}
                    {log.details && (
                      <div className="pt-2 border-t border-[#E5E5E1] flex flex-wrap items-center gap-2.5 text-[11px] font-mono">
                        {log.details.financialImpact !== undefined && (
                          <div className="text-[#8C7355] bg-[#F8F7F4] px-1.5 py-0.5 rounded border border-[#E5E5E1] font-semibold">
                            Impact: {log.details.financialImpact > 0 ? '+' : ''}
                            {formatGbp(log.details.financialImpact)}
                          </div>
                        )}
                        {log.details.wearCount !== undefined && (
                          <div className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-semibold">
                            Total Wears: {log.details.wearCount}x
                          </div>
                        )}
                        {log.details.oldValue !== undefined && log.details.newValue !== undefined && (
                          <div className="text-[#767670] text-[10px]">
                            {typeof log.details.oldValue === 'number'
                              ? `£${log.details.oldValue.toFixed(2)} → £${log.details.newValue.toFixed(2)}`
                              : `${JSON.stringify(log.details.oldValue).slice(0, 20)} → ${JSON.stringify(log.details.newValue).slice(0, 20)}`}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: VERSION SNAPSHOTS & ROLLBACK */}
      {activeTab === 'snapshots' && (
        <div className="space-y-4">
          <div className="p-3.5 bg-white border border-[#E5E5E1] rounded-xl flex items-center justify-between shadow-xs">
            <div className="space-y-0.5">
              <h3 className="text-xs font-bold text-[#1A1A1A]">
                Saved Checkpoints &amp; Rollback Points
              </h3>
              <p className="text-[11px] text-[#767670]">
                Snapshots freeze the complete state of items, valuations in £, lookbooks, and shopping lists at a specific moment in time.
              </p>
            </div>
            <button
              onClick={onOpenCreateSnapshot}
              className="px-3 py-1.5 text-xs font-semibold bg-[#8C7355] hover:bg-[#786248] text-white rounded-md shadow-xs cursor-pointer"
            >
              Take Snapshot Now
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {snapshots.map((snap) => {
              const date = new Date(snap.createdAt);
              return (
                <div
                  key={snap.id}
                  className="bg-white border border-[#E5E5E1] rounded-xl p-4 space-y-3 shadow-xs flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono font-bold text-[#8C7355]">
                        Snapshot #{snap.versionNumber}
                      </span>
                      <span className="text-[11px] text-[#767670] font-mono">
                        {date.toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>

                    <h4 className="text-sm font-serif font-bold text-[#1A1A1A]">{snap.name}</h4>
                    <p className="text-xs text-[#767670] leading-relaxed">{snap.description}</p>

                    {/* Snapshot Stats */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#E5E5E1] text-center text-xs">
                      <div className="p-1.5 bg-[#F8F7F4] rounded-lg border border-[#E5E5E1]">
                        <div className="font-mono font-bold text-[#1A1A1A]">
                          {snap.itemCount}
                        </div>
                        <div className="text-[9px] text-[#767670]">Pieces</div>
                      </div>
                      <div className="p-1.5 bg-[#F8F7F4] rounded-lg border border-[#E5E5E1]">
                        <div className="font-mono font-bold text-[#8C7355]">
                          {formatGbp(snap.totalValuation)}
                        </div>
                        <div className="text-[9px] text-[#767670]">Valuation</div>
                      </div>
                      <div className="p-1.5 bg-[#F8F7F4] rounded-lg border border-[#E5E5E1]">
                        <div className="font-mono font-bold text-[#1A1A1A]">
                          {snap.outfitCount}
                        </div>
                        <div className="text-[9px] text-[#767670]">Looks</div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-[#E5E5E1] flex items-center justify-between">
                    <button
                      onClick={() => deleteSnapshot(snap.id)}
                      className="text-[#767670] hover:text-rose-600 text-xs p-1 cursor-pointer"
                      title="Delete Snapshot"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => setRestoringSnapId(snap.id)}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-[#F8F7F4] hover:bg-[#8C7355] hover:text-white text-[#1A1A1A] border border-[#E5E5E1] transition-all cursor-pointer shadow-2xs"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Restore to this Version
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: BACKUP & DATA MIGRATION */}
      {activeTab === 'backup' && (
        <div className="space-y-4 max-w-2xl">
          {/* Export JSON */}
          <div className="bg-white border border-[#E5E5E1] rounded-xl p-4 space-y-2.5 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-amber-50 text-[#8C7355] border border-amber-200">
                <Download className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-[#1A1A1A]">
                  Export Complete Wardrobe Archive (JSON)
                </h3>
                <p className="text-[11px] text-[#767670]">
                  Downloads all active pieces, prices in £, outfit formulas, wishlist items, and change logs.
                </p>
              </div>
            </div>

            <button
              onClick={exportDataJSON}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-[#8C7355] hover:bg-[#786248] text-white shadow-xs transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Download Backup Archive
            </button>
          </div>

          {/* Import JSON */}
          <div className="bg-white border border-[#E5E5E1] rounded-xl p-4 space-y-2.5 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
                <Upload className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-[#1A1A1A]">
                  Restore from JSON Backup File
                </h3>
                <p className="text-[11px] text-[#767670]">
                  Upload a previously exported JSON backup to restore wardrobe inventory and change history.
                </p>
              </div>
            </div>

            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-[#F8F7F4] hover:bg-[#F3F2EE] text-[#1A1A1A] border border-[#E5E5E1] cursor-pointer transition-all">
              <Upload className="w-3.5 h-3.5 text-[#767670]" />
              Select Backup File (.json)
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {importStatus && (
              <div
                className={`p-2.5 rounded-lg text-xs ${
                  importStatus.success
                    ? 'bg-emerald-50 border border-emerald-300 text-emerald-800'
                    : 'bg-rose-50 border border-rose-300 text-rose-800'
                }`}
              >
                {importStatus.message}
              </div>
            )}
          </div>

          {/* Reset to Demo Baseline */}
          <div className="bg-white border border-[#E5E5E1] rounded-xl p-4 space-y-2.5 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                <RotateCcw className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-[#1A1A1A]">Reset to Initial Sample State</h3>
                <p className="text-[11px] text-[#767670]">
                  Restores the baseline 12 British &amp; international designer staples with default lookbook formulas.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                if (window.confirm('Reset all wardrobe data to initial baseline state?')) {
                  resetToDefaultData();
                }
              }}
              className="px-3 py-1.5 text-xs font-semibold text-amber-800 hover:text-amber-900 border border-amber-300 rounded-md hover:bg-amber-50 cursor-pointer"
            >
              Reset to Sample Closet
            </button>
          </div>

          {/* Clear Database Completely */}
          <div className="bg-white border border-rose-200 rounded-xl p-4 space-y-2.5 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
                <Trash2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-rose-900">Clear Entire Database</h3>
                <p className="text-[11px] text-[#767670]">
                  Wipes all inventory, lookbooks, wishlist items, and snapshots for a clean fresh start.
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsClearConfirmOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-md shadow-xs cursor-pointer"
            >
              Clear Entire Database
            </button>
          </div>
        </div>
      )}

      {/* CLEAR DATABASE CONFIRMATION MODAL */}
      {isClearConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white border border-[#E5E5E1] rounded-xl p-5 max-w-md w-full space-y-3.5 shadow-lg">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-200">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-serif font-bold text-[#1A1A1A]">
                  Clear Wardrobe Database
                </h3>
                <p className="text-xs text-[#767670]">
                  Are you sure you want to permanently clear all data?
                </p>
              </div>
            </div>

            <p className="text-xs text-[#5A5A55] bg-rose-50/50 p-2.5 rounded-lg border border-rose-200">
              This will erase all wardrobe items, lookbook outfits, shopping wishlist items, and snapshot checkpoints. You can re-import a backup or add new items at any time.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E5E1]">
              <button
                onClick={() => setIsClearConfirmOpen(false)}
                className="px-3 py-1.5 text-xs text-[#767670] hover:text-[#1A1A1A] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  clearDatabase();
                  setIsClearConfirmOpen(false);
                }}
                className="px-3.5 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-md shadow-xs cursor-pointer"
              >
                Yes, Clear All Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESTORE CONFIRMATION MODAL */}
      {restoringSnapId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white border border-[#E5E5E1] rounded-xl p-5 max-w-md w-full space-y-3.5 shadow-lg">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-amber-50 text-[#8C7355] border border-amber-200">
                <RotateCcw className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-serif font-bold text-[#1A1A1A]">
                  Confirm Version Rollback
                </h3>
                <p className="text-xs text-[#767670]">
                  Are you sure you want to restore the entire wardrobe state to this snapshot checkpoint?
                </p>
              </div>
            </div>

            <p className="text-xs text-[#5A5A55] bg-[#F8F7F4] p-2.5 rounded-lg border border-[#E5E5E1]">
              This will overwrite current items, lookbooks, and shopping lists with the state recorded in this snapshot. A new change log entry will be created.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E5E1]">
              <button
                onClick={() => setRestoringSnapId(null)}
                className="px-3 py-1.5 text-xs text-[#767670] hover:text-[#1A1A1A] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirmRestore(restoringSnapId)}
                className="px-3.5 py-1.5 text-xs font-semibold bg-[#8C7355] hover:bg-[#786248] text-white rounded-md shadow-xs cursor-pointer"
              >
                Proceed with Rollback
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

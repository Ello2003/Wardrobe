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
  CheckCircle2,
  ShieldCheck,
  Undo2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Sparkles,
  Github,
  GitCommit,
  Layers,
  FileSpreadsheet,
  Cloud,
} from 'lucide-react';
import { useWardrobe } from '../context/WardrobeContext';
import { ChangeActionType, VersionChangeLog } from '../types';
import { safeConfirm } from '../utils/safeConfirm';
import { GoogleDriveSyncPanel } from './GoogleDriveSyncPanel';
import { GithubSyncPanel } from './GithubSyncPanel';
import { HumidorLosslessBackupModal } from './HumidorLosslessBackupModal';
import { VersionIterationsLog } from './VersionIterationsLog';

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
    cleanupAutoSnapshots,
    lastAutoSnapshotTime,
    triggerAutoSnapshot,
    restoreTimelineEntryItem,
    restoreTimelineState,
    canRestoreEntry,
    settings,
    updateSettings,
    exportDataJSON,
    importDataJSON,
    resetToDefaultData,
    clearDatabase,
  } = useWardrobe();

  const [activeTab, setActiveTab] = useState<'timeline' | 'snapshots' | 'backup' | 'googledrive' | 'github' | 'releases'>('timeline');
  const [filterAction, setFilterAction] = useState<string>('ALL');
  const [snapshotTypeFilter, setSnapshotTypeFilter] = useState<'all' | 'manual' | 'auto'>('all');
  const [restoringSnapId, setRestoringSnapId] = useState<string | null>(null);
  const [restoringLogEntry, setRestoringLogEntry] = useState<VersionChangeLog | null>(null);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [expandedLogIds, setExpandedLogIds] = useState<Record<string, boolean>>({});
  const [statusNotification, setStatusNotification] = useState<{
    type: 'success' | 'info' | 'error';
    message: string;
  } | null>(null);
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
      case 'LOOK_DELETED':
        return { label: 'Look Deleted', bg: 'bg-rose-100 text-rose-800 border-rose-300' };
      case 'WISHLIST_ADDED':
        return { label: 'Wishlist Added', bg: 'bg-sky-100 text-sky-800 border-sky-300' };
      case 'WISHLIST_PURCHASED':
        return { label: 'Purchased & Added', bg: 'bg-emerald-100 text-emerald-900 border-emerald-400 font-semibold' };
      case 'WISHLIST_DELETED':
        return { label: 'Wishlist Removed', bg: 'bg-rose-100 text-rose-800 border-rose-300' };
      case 'SALE_ADDED':
        return { label: 'Listed for Sale', bg: 'bg-indigo-100 text-indigo-800 border-indigo-300' };
      case 'SALE_UPDATED':
        return { label: 'Sale Updated', bg: 'bg-indigo-50 text-indigo-800 border-indigo-200' };
      case 'SALE_DELETED':
        return { label: 'Listing Deleted', bg: 'bg-rose-100 text-rose-800 border-rose-300' };
      case 'SNAPSHOT_CREATED':
        return { label: 'Checkpoint Saved', bg: 'bg-[#F8F7F4] text-[#1A1A1A] border-[#E5E5E1]' };
      case 'SNAPSHOT_RESTORED':
        return { label: 'Version Rollback', bg: 'bg-amber-100 text-amber-900 border-amber-400 font-semibold' };
      case 'VINTED_SYNC':
        return { label: 'Vinted Live Sync', bg: 'bg-[#007782]/10 text-[#007782] border-[#007782]/30 font-semibold' };
      case 'VINTED_EXTRACT':
        return { label: 'Vinted Extraction', bg: 'bg-[#007782]/10 text-[#007782] border-[#007782]/30 font-semibold' };
      case 'BULK_IMPORT':
        return { label: 'Bulk Import', bg: 'bg-teal-100 text-teal-800 border-teal-300 font-medium' };
      default:
        return { label: type, bg: 'bg-[#F8F7F4] text-[#767670] border-[#E5E5E1]' };
    }
  };

  const filteredLogs = changeLogs.filter((log) => {
    if (filterAction === 'ALL') return true;
    if (filterAction === 'WARDROBE' && log.entityType === 'wardrobe_item') return true;
    if (filterAction === 'LOOKS' && log.entityType === 'lookbook_outfit') return true;
    if (filterAction === 'SHOPPING' && log.entityType === 'shopping_item') return true;
    if (filterAction === 'SALES' && log.entityType === 'sale_item') return true;
    if (filterAction === 'VINTED' && (log.actionType === 'VINTED_SYNC' || log.actionType === 'VINTED_EXTRACT' || log.entityTitle.toLowerCase().includes('vinted'))) return true;
    if (filterAction === 'SNAPSHOTS' && (log.entityType === 'snapshot' || log.entityType === 'system'))
      return true;
    return true;
  });

  const filteredSnapshots = snapshots.filter((snap) => {
    if (snapshotTypeFilter === 'all') return true;
    if (snapshotTypeFilter === 'auto') return Boolean(snap.isAuto);
    if (snapshotTypeFilter === 'manual') return !snap.isAuto;
    return true;
  });

  const toggleLogDetails = (id: string) => {
    setExpandedLogIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleRestoreItem = (logId: string) => {
    const res = restoreTimelineEntryItem(logId);
    if (res.success) {
      setStatusNotification({ type: 'success', message: res.message });
      setTimeout(() => setStatusNotification(null), 6000);
    } else {
      setStatusNotification({ type: 'error', message: res.message });
      setTimeout(() => setStatusNotification(null), 5000);
    }
  };

  const handleConfirmRewindToLog = (log: VersionChangeLog) => {
    const res = restoreTimelineState(log.id);
    setRestoringLogEntry(null);
    if (res.success) {
      setStatusNotification({ type: 'success', message: res.message });
      setTimeout(() => setStatusNotification(null), 7000);
    } else {
      setStatusNotification({ type: 'error', message: res.message });
      setTimeout(() => setStatusNotification(null), 5000);
    }
  };

  const handleManualTriggerAutoSnapshot = () => {
    const id = triggerAutoSnapshot('Manual user checkpoint');
    setStatusNotification({
      type: 'success',
      message: 'Periodic rollback checkpoint captured successfully!',
    });
    setTimeout(() => setStatusNotification(null), 5000);
  };

  const handleCleanupOldSnapshots = () => {
    const count = cleanupAutoSnapshots(5);
    setStatusNotification({
      type: 'info',
      message: count > 0 ? `Cleaned up ${count} older auto-checkpoints. Kept latest 5.` : 'No excess auto-checkpoints to prune.',
    });
    setTimeout(() => setStatusNotification(null), 5000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const inputEl = e.target;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const result = importDataJSON(content);
        setImportStatus(result);
        setStatusNotification({
          type: result.success ? 'success' : 'error',
          message: result.message,
        });
        setTimeout(() => setStatusNotification(null), 6000);
      }
      inputEl.value = '';
    };
    reader.readAsText(file);
  };

  const handleConfirmRestore = (snapId: string) => {
    const success = restoreSnapshot(snapId);
    if (success) {
      setRestoringSnapId(null);
      setActiveTab('timeline');
      setStatusNotification({
        type: 'success',
        message: 'Wardrobe state successfully restored to selected snapshot!',
      });
      setTimeout(() => setStatusNotification(null), 6000);
    }
  };

  const autoSnapEnabled = settings.autoSnapshotEnabled !== false;
  const autoInterval = settings.autoSnapshotIntervalMinutes || 10;
  const lastSavedDate = lastAutoSnapshotTime ? new Date(lastAutoSnapshotTime) : null;

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Toast Notification Banner */}
      {statusNotification && (
        <div
          className={`p-3 rounded-xl text-xs font-mono border flex items-center justify-between shadow-xs transition-all ${
            statusNotification.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : statusNotification.type === 'error'
              ? 'bg-rose-50 border-rose-300 text-rose-900'
              : 'bg-amber-50 border-amber-300 text-amber-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusNotification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : statusNotification.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
            )}
            <span>{statusNotification.message}</span>
          </div>
          <button
            onClick={() => setStatusNotification(null)}
            className="text-[11px] underline opacity-75 hover:opacity-100 cursor-pointer ml-3"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header & Automated Rollback Status Bar */}
      <div className="bg-white border border-[#E5E5E1] rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-serif font-bold text-[#1A1A1A]">
                Audit, Time-Travel &amp; Rollback History
              </h1>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#F8F7F4] border border-[#E5E5E1] text-[#8C7355] font-bold">
                Rev #{currentVersion}
              </span>
            </div>
            <p className="text-xs text-[#767670] mt-0.5">
              Live audit timeline of every closet modification, price change, and automatic rollback checkpoint in £ GBP.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleManualTriggerAutoSnapshot}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-[#F8F7F4] hover:bg-[#F3F2EE] text-[#1A1A1A] border border-[#E5E5E1] shadow-2xs transition-all cursor-pointer"
              title="Capture a new point-in-time rollback checkpoint immediately"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#8C7355]" />
              Save Checkpoint
            </button>
            <button
              onClick={onOpenCreateSnapshot}
              id="create-snapshot-btn"
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md bg-[#8C7355] hover:bg-[#786248] text-white shadow-xs transition-all cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              Named Snapshot
            </button>
          </div>
        </div>

        {/* Live Automatic Rollbacks Status Bar */}
        <div className="pt-3 border-t border-[#E5E5E1] flex flex-wrap items-center justify-between gap-3 bg-[#FAF9F6] p-2.5 rounded-lg border border-[#EBEAE5]">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              {autoSnapEnabled ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400"></span>
              )}
            </span>
            <div className="text-xs">
              <span className="font-semibold text-[#1A1A1A]">
                {autoSnapEnabled ? `Automated Rollbacks Active (Every ${autoInterval} mins)` : 'Automated Rollbacks Paused'}
              </span>
              <span className="text-[#767670] ml-2 text-[11px]">
                {lastSavedDate
                  ? `Last auto-save: ${lastSavedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : 'Periodic background checkpoints enabled'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() =>
                updateSettings({
                  autoSnapshotEnabled: !autoSnapEnabled,
                })
              }
              className="text-[11px] font-mono px-2 py-1 rounded bg-white hover:bg-[#F3F2EE] border border-[#E5E5E1] text-[#5A5A55] cursor-pointer"
            >
              {autoSnapEnabled ? 'Pause Auto-Save' : 'Enable Auto-Save'}
            </button>
            <select
              value={autoInterval}
              onChange={(e) => updateSettings({ autoSnapshotIntervalMinutes: Number(e.target.value) })}
              className="text-[11px] font-mono px-2 py-1 rounded bg-white border border-[#E5E5E1] text-[#5A5A55] cursor-pointer"
              title="Change automated rollback interval"
            >
              <option value={2}>Every 2 min</option>
              <option value={5}>Every 5 min</option>
              <option value={10}>Every 10 min</option>
              <option value={15}>Every 15 min</option>
              <option value={30}>Every 30 min</option>
              <option value={60}>Every 60 min</option>
            </select>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-[#E5E5E1] space-x-2 sm:space-x-4 text-xs overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('timeline')}
          className={`pb-2.5 font-semibold flex items-center gap-1.5 transition-colors border-b-2 cursor-pointer whitespace-nowrap ${
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
          className={`pb-2.5 font-semibold flex items-center gap-1.5 transition-colors border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'snapshots'
              ? 'border-[#8C7355] text-[#8C7355]'
              : 'border-transparent text-[#767670] hover:text-[#1A1A1A]'
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          Checkpoints &amp; Rollbacks ({snapshots.length})
        </button>

        <button
          onClick={() => setActiveTab('backup')}
          className={`pb-2.5 font-semibold flex items-center gap-1.5 transition-colors border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'backup'
              ? 'border-[#8C7355] text-[#8C7355]'
              : 'border-transparent text-[#767670] hover:text-[#1A1A1A]'
          }`}
        >
          <Download className="w-3.5 h-3.5" />
          Lossless Backup Suite
        </button>

        <button
          onClick={() => setActiveTab('googledrive')}
          className={`pb-2.5 font-semibold flex items-center gap-1.5 transition-colors border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'googledrive'
              ? 'border-[#4285F4] text-[#4285F4]'
              : 'border-transparent text-[#767670] hover:text-[#1A1A1A]'
          }`}
        >
          <Cloud className="w-3.5 h-3.5 text-[#4285F4]" />
          Google Drive Vault
        </button>

        <button
          onClick={() => setActiveTab('github')}
          className={`pb-2.5 font-semibold flex items-center gap-1.5 transition-colors border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'github'
              ? 'border-[#8C7355] text-[#8C7355]'
              : 'border-transparent text-[#767670] hover:text-[#1A1A1A]'
          }`}
        >
          <Github className="w-3.5 h-3.5" />
          GitHub Sync
        </button>

        <button
          onClick={() => setActiveTab('releases')}
          className={`pb-2.5 font-semibold flex items-center gap-1.5 transition-colors border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'releases'
              ? 'border-[#8C7355] text-[#8C7355]'
              : 'border-transparent text-[#767670] hover:text-[#1A1A1A]'
          }`}
        >
          <GitCommit className="w-3.5 h-3.5" />
          Iterations &amp; Changelog
        </button>
      </div>

      {/* TAB 1: AUDIT TIMELINE WITH LIVE ENTRY RESTORATION */}
      {activeTab === 'timeline' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 bg-white border border-[#E5E5E1] rounded-xl p-3 shadow-xs">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
              <span className="text-[11px] text-[#767670] font-mono mr-1 font-semibold">Filter:</span>
              {[
                { id: 'ALL', label: 'All Changes' },
                { id: 'WARDROBE', label: 'Wardrobe' },
                { id: 'LOOKS', label: 'Lookbook' },
                { id: 'SHOPPING', label: 'Wishlist' },
                { id: 'SALES', label: 'Resale' },
                { id: 'VINTED', label: 'Vinted' },
                { id: 'SNAPSHOTS', label: 'Checkpoints' },
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
              const restoreInfo = canRestoreEntry(log);
              const isExpanded = Boolean(expandedLogIds[log.id]);

              return (
                <div key={log.id} className="relative group">
                  {/* Dot on timeline line */}
                  <div className="absolute -left-6 sm:-left-7 top-2.5 w-2.5 h-2.5 rounded-full bg-white border-2 border-[#8C7355] group-hover:scale-125 transition-transform" />

                  <div className="bg-white border border-[#E5E5E1] hover:border-[#8C7355]/50 rounded-xl p-3.5 space-y-2.5 shadow-xs transition-all">
                    {/* Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
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

                    {/* Financial / Wear / Attribute metadata */}
                    {log.details && (
                      <div className="pt-2 border-t border-[#E5E5E1] flex flex-wrap items-center gap-2 text-[11px] font-mono">
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
                          <div className="text-[#767670] text-[10px] bg-[#F8F7F4] px-1.5 py-0.5 rounded border border-[#E5E5E1]">
                            {typeof log.details.oldValue === 'number'
                              ? `£${log.details.oldValue.toFixed(2)} → £${log.details.newValue.toFixed(2)}`
                              : `${typeof log.details.oldValue === 'string' ? log.details.oldValue : 'Previous'} → ${typeof log.details.newValue === 'string' ? log.details.newValue : 'Updated'}`}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Interactive Restoration Bar */}
                    <div className="pt-2.5 border-t border-[#E5E5E1] flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {/* 1. Restore specific item / entity */}
                        {restoreInfo.canRestoreItem && (
                          <button
                            onClick={() => handleRestoreItem(log.id)}
                            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 transition-all cursor-pointer shadow-2xs"
                            title={restoreInfo.description}
                          >
                            <Undo2 className="w-3 h-3 text-emerald-700" />
                            <span>{restoreInfo.actionLabel}</span>
                          </button>
                        )}

                        {/* 2. Full Closet Time-Travel Rewind to this entry */}
                        <button
                          onClick={() => setRestoringLogEntry(log)}
                          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded bg-[#F8F7F4] hover:bg-[#8C7355] hover:text-white text-[#1A1A1A] border border-[#E5E5E1] transition-all cursor-pointer shadow-2xs"
                          title={`Rollback the entire wardrobe state to the moment of Revision #${log.versionNumber}`}
                        >
                          <RotateCcw className="w-3 h-3 text-[#8C7355] hover:text-white" />
                          <span>Rewind Closet to Rev #{log.versionNumber}</span>
                        </button>
                      </div>

                      {/* Expandable Diff Inspector */}
                      <button
                        onClick={() => toggleLogDetails(log.id)}
                        className="flex items-center gap-1 text-[11px] font-mono text-[#767670] hover:text-[#1A1A1A] cursor-pointer"
                      >
                        <span>{isExpanded ? 'Hide Payload' : 'Inspect Details'}</span>
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    </div>

                    {/* Expanded Payload Viewer */}
                    {isExpanded && (
                      <div className="mt-2.5 p-3 bg-[#1A1A1A] text-emerald-400 rounded-lg text-[10px] font-mono overflow-x-auto space-y-2 border border-black/20 animate-fadeIn">
                        <div className="flex items-center justify-between text-[#888] pb-1 border-b border-white/10">
                          <span>Revision Payload (JSON)</span>
                          <span>ID: {log.id}</span>
                        </div>
                        <pre className="leading-relaxed">
                          {JSON.stringify(
                            {
                              action: log.actionType,
                              entityType: log.entityType,
                              entityId: log.entityId,
                              details: log.details,
                              hasSnapshotData: Boolean(log.snapshotData),
                              snapshotSummary: log.snapshotData
                                ? {
                                    itemsCount: log.snapshotData.items?.length,
                                    outfitsCount: log.snapshotData.outfits?.length,
                                    shoppingCount: log.snapshotData.shoppingList?.length,
                                    salesCount: log.snapshotData.saleItems?.length,
                                  }
                                : undefined,
                            },
                            null,
                            2
                          )}
                        </pre>
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
          <div className="p-3.5 bg-white border border-[#E5E5E1] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="space-y-0.5">
              <h3 className="text-xs font-bold text-[#1A1A1A]">
                Rollback Checkpoints ({snapshots.length})
              </h3>
              <p className="text-[11px] text-[#767670]">
                Snapshots freeze the complete state of garments, £ valuations, lookbooks, wishlist, and sales listings.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCleanupOldSnapshots}
                className="px-2.5 py-1.5 text-xs font-medium bg-[#F8F7F4] hover:bg-[#F3F2EE] text-[#5A5A55] border border-[#E5E5E1] rounded-md shadow-2xs cursor-pointer"
                title="Keep only the latest 5 automated snapshots to preserve storage"
              >
                Prune Older Auto-Saves
              </button>
              <button
                onClick={onOpenCreateSnapshot}
                className="px-3 py-1.5 text-xs font-semibold bg-[#8C7355] hover:bg-[#786248] text-white rounded-md shadow-xs cursor-pointer"
              >
                Take Snapshot Now
              </button>
            </div>
          </div>

          {/* Snapshot Type Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[11px] text-[#767670] font-mono mr-1 font-semibold">Show:</span>
            {[
              { id: 'all', label: `All Checkpoints (${snapshots.length})` },
              { id: 'manual', label: `Manual (${snapshots.filter((s) => !s.isAuto).length})` },
              { id: 'auto', label: `Auto-Saved (${snapshots.filter((s) => s.isAuto).length})` },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setSnapshotTypeFilter(st.id as any)}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  snapshotTypeFilter === st.id
                    ? 'bg-[#1A1A1A] text-white font-semibold'
                    : 'bg-white text-[#5A5A55] border border-[#E5E5E1] hover:bg-[#F8F7F4]'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredSnapshots.map((snap) => {
              const date = new Date(snap.createdAt);
              return (
                <div
                  key={snap.id}
                  className={`bg-white border rounded-xl p-4 space-y-3 shadow-xs flex flex-col justify-between transition-all ${
                    snap.isAuto ? 'border-emerald-200 hover:border-emerald-400' : 'border-[#E5E5E1] hover:border-[#8C7355]/50'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-mono font-bold text-[#8C7355]">
                          Snapshot #{snap.versionNumber}
                        </span>
                        {snap.isAuto && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-300 font-semibold">
                            Auto-Checkpoint
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-[#767670] font-mono">
                        {date.toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}{' '}
                        at {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <h4 className="text-sm font-serif font-bold text-[#1A1A1A]">{snap.name}</h4>
                    <p className="text-xs text-[#767670] leading-relaxed">{snap.description}</p>

                    {/* Snapshot Stats */}
                    <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-[#E5E5E1] text-center text-xs">
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
                      <div className="p-1.5 bg-[#F8F7F4] rounded-lg border border-[#E5E5E1]">
                        <div className="font-mono font-bold text-[#1A1A1A]">
                          {snap.wishlistCount || 0}
                        </div>
                        <div className="text-[9px] text-[#767670]">Wishlist</div>
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
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-[#F8F7F4] hover:bg-[#8C7355] hover:text-white text-[#1A1A1A] border border-[#E5E5E1] transition-all cursor-pointer shadow-2xs"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Restore this Version
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: HUMIDOR LOSSLESS BACKUP SUITE */}
      {activeTab === 'backup' && (
        <div className="space-y-6">
          <HumidorLosslessBackupModal
            onNotify={(type, message) => {
              setStatusNotification({ type, message });
              setTimeout(() => setStatusNotification(null), 6000);
            }}
          />

          {/* Danger Zone: Reset & Clear Database */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[#E5E5E1]">
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
                  if (safeConfirm('Reset all wardrobe data to initial baseline state?')) {
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
        </div>
      )}

      {/* TAB 3: GOOGLE DRIVE CLOUD VAULT */}
      {activeTab === 'googledrive' && (
        <GoogleDriveSyncPanel
          onNotify={(type, message) => {
            setStatusNotification({ type, message });
            setTimeout(() => setStatusNotification(null), 6000);
          }}
        />
      )}

      {/* TAB 4: AUTOMATIC GITHUB CLOUD SYNC */}
      {activeTab === 'github' && (
        <GithubSyncPanel
          onNotify={(type, message) => {
            setStatusNotification({ type, message });
            setTimeout(() => setStatusNotification(null), 6000);
          }}
        />
      )}

      {/* TAB 5: ITERATION CHANGELOG & SUMMARY OF CHANGES */}
      {activeTab === 'releases' && (
        <VersionIterationsLog
          onNotify={(type, message) => {
            setStatusNotification({ type, message });
            setTimeout(() => setStatusNotification(null), 6000);
          }}
        />
      )}

      {/* REWIND CLOSET TO TIMELINE REVISION MODAL */}
      {restoringLogEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white border border-[#E5E5E1] rounded-xl p-5 max-w-md w-full space-y-4 shadow-lg">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-amber-50 text-[#8C7355] border border-amber-200">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-serif font-bold text-[#1A1A1A]">
                  Rewind Closet to Revision #{restoringLogEntry.versionNumber}
                </h3>
                <p className="text-xs text-[#767670]">
                  Time-travel rollback to state captured at this audit entry
                </p>
              </div>
            </div>

            <div className="p-3 bg-[#FAF9F6] border border-[#E5E5E1] rounded-lg text-xs space-y-1.5">
              <div className="flex items-center justify-between text-[#8C7355] font-mono font-semibold">
                <span>Entry: {restoringLogEntry.entityTitle}</span>
                <span>{new Date(restoringLogEntry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <p className="text-[#5A5A55]">{restoringLogEntry.summary}</p>
            </div>

            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Safety First: An automatic safety checkpoint of your current closet will be preserved prior to rewinding.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E5E1]">
              <button
                onClick={() => setRestoringLogEntry(null)}
                className="px-3 py-1.5 text-xs text-[#767670] hover:text-[#1A1A1A] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirmRewindToLog(restoringLogEntry)}
                className="px-3.5 py-1.5 text-xs font-semibold bg-[#8C7355] hover:bg-[#786248] text-white rounded-md shadow-xs cursor-pointer"
              >
                Confirm Rewind
              </button>
            </div>
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
              This will restore current items, lookbooks, and shopping lists with the state recorded in this snapshot. A safety checkpoint of your current state will be saved.
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


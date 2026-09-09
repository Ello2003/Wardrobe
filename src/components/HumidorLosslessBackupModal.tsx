import React, { useState, useRef } from 'react';
import { useWardrobe } from '../context/WardrobeContext';
import {
  createLosslessBackup,
  validateLosslessBackup,
  compareLosslessBackups,
  exportWardrobeToCsv,
  exportSalesToCsv,
  exportShoppingToCsv,
  runDatabaseHealthCheck,
  repairDatabaseInconsistencies,
  LosslessBackupPayload,
  BackupDiffSummary,
  DatabaseHealthReport,
} from '../services/losslessBackupService';
import {
  Archive,
  Download,
  Upload,
  ShieldCheck,
  AlertTriangle,
  FileSpreadsheet,
  Stethoscope,
  Wrench,
  CheckCircle2,
  RefreshCw,
  Eye,
  FileJson,
  Layers,
  Sparkles,
} from 'lucide-react';

interface HumidorLosslessBackupModalProps {
  onNotify: (type: 'success' | 'info' | 'error', message: string) => void;
}

export const HumidorLosslessBackupModal: React.FC<HumidorLosslessBackupModalProps> = ({ onNotify }) => {
  const {
    items,
    outfits,
    shoppingList,
    saleItems,
    snapshots,
    changeLogs,
    categories,
    monthlyBudget,
    importDataJSON,
    createSnapshot,
  } = useWardrobe();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeSubTab, setActiveSubTab] = useState<'export' | 'import' | 'csv' | 'health'>('export');
  const [importedJson, setImportedJson] = useState<string>('');
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    errors: string[];
    warnings: string[];
    payload?: LosslessBackupPayload;
  } | null>(null);
  const [diffSummary, setDiffSummary] = useState<BackupDiffSummary | null>(null);
  const [healthReport, setHealthReport] = useState<DatabaseHealthReport | null>(null);
  const [isRepairing, setIsRepairing] = useState(false);

  // Format currency helper
  const formatGbp = (val: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: val % 1 === 0 ? 0 : 2,
    }).format(val);
  };

  // 1. Generate & Download Lossless JSON
  const handleDownloadLosslessJson = () => {
    const backup = createLosslessBackup({
      items,
      outfits,
      shoppingList,
      saleItems,
      snapshots,
      changeLogs,
      categories,
      monthlyBudget,
    });

    const jsonString = JSON.stringify(backup, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `humidor-lossless-wardrobe-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    onNotify('success', 'Lossless Humidor database archive exported with SHA integrity check!');
  };

  // 2. Handle File Input for Lossless Import
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const inputEl = e.target;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setImportedJson(content);
        const validation = validateLosslessBackup(content);
        setValidationResult(validation);

        if (validation.valid && validation.payload) {
          const currentData = createLosslessBackup({
            items,
            outfits,
            shoppingList,
            saleItems,
            snapshots,
            changeLogs,
            categories,
            monthlyBudget,
          });
          const diff = compareLosslessBackups(currentData, validation.payload);
          setDiffSummary(diff);
        } else {
          setDiffSummary(null);
        }
      }
      inputEl.value = '';
    };
    reader.readAsText(file);
  };

  // 3. Confirm Full Lossless Restore
  const handleConfirmRestore = (mode: 'overwrite' | 'merge') => {
    if (!validationResult?.payload || !importedJson) return;

    // Automatic pre-rollback safety snapshot
    createSnapshot(
      `[Pre-Restore Safety] Before Lossless Archive`,
      `Safety rollback captured prior to restoring Humidor lossless archive (${validationResult.payload.data.items.length} items).`,
      true
    );

    const res = importDataJSON(importedJson, { mode });
    if (res.success) {
      onNotify(
        'success',
        `Lossless database restored: ${validationResult.payload.data.items.length} garments, ${validationResult.payload.data.outfits.length} looks, ${validationResult.payload.data.saleItems.length} sales.`
      );
      setImportedJson('');
      setValidationResult(null);
      setDiffSummary(null);
    } else {
      onNotify('error', res.message || 'Failed to restore database.');
    }
  };

  // 4. CSV Download handlers
  const handleDownloadCsv = (type: 'wardrobe' | 'sales' | 'shopping') => {
    let csvContent = '';
    let fileName = '';

    if (type === 'wardrobe') {
      csvContent = exportWardrobeToCsv(items);
      fileName = `humidor-wardrobe-catalog-${new Date().toISOString().slice(0, 10)}.csv`;
    } else if (type === 'sales') {
      csvContent = exportSalesToCsv(saleItems);
      fileName = `humidor-resale-inventory-${new Date().toISOString().slice(0, 10)}.csv`;
    } else {
      csvContent = exportShoppingToCsv(shoppingList);
      fileName = `humidor-wishlist-pipeline-${new Date().toISOString().slice(0, 10)}.csv`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    onNotify('success', `Exported ${type} dataset as CSV spreadsheet.`);
  };

  // 5. Run Health Doctor
  const handleRunDoctor = () => {
    const current = createLosslessBackup({
      items,
      outfits,
      shoppingList,
      saleItems,
      snapshots,
      changeLogs,
      categories,
      monthlyBudget,
    });
    const report = runDatabaseHealthCheck(current.data);
    setHealthReport(report);
  };

  // 6. Repair Inconsistencies
  const handleRepairDoctor = () => {
    setIsRepairing(true);
    try {
      const current = createLosslessBackup({
        items,
        outfits,
        shoppingList,
        saleItems,
        snapshots,
        changeLogs,
        categories,
        monthlyBudget,
      });
      const repaired = repairDatabaseInconsistencies(current.data);

      createSnapshot(
        `[Pre-Doctor Repair Safety]`,
        `Safety checkpoint captured before running Database Doctor repair routines.`,
        true
      );

      const res = importDataJSON(JSON.stringify({ ...current, data: repaired }));
      if (res.success) {
        onNotify('success', 'Database Doctor completed repairs! All references and fields harmonized.');
        handleRunDoctor();
      } else {
        onNotify('error', 'Repair application encountered an error.');
      }
    } finally {
      setIsRepairing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-navigation tabs */}
      <div className="flex border-b border-[#E5E5E1] bg-white text-xs font-mono">
        <button
          type="button"
          onClick={() => setActiveSubTab('export')}
          className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 font-medium cursor-pointer transition ${
            activeSubTab === 'export'
              ? 'border-[#8C7355] text-[#8C7355] bg-[#FAF9F7]'
              : 'border-transparent text-[#767670] hover:text-[#1A1A1A]'
          }`}
        >
          <Download className="w-3.5 h-3.5" />
          <span>Lossless JSON Export</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('import')}
          className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 font-medium cursor-pointer transition ${
            activeSubTab === 'import'
              ? 'border-[#8C7355] text-[#8C7355] bg-[#FAF9F7]'
              : 'border-transparent text-[#767670] hover:text-[#1A1A1A]'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Lossless Import &amp; Diff</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('csv')}
          className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 font-medium cursor-pointer transition ${
            activeSubTab === 'csv'
              ? 'border-[#8C7355] text-[#8C7355] bg-[#FAF9F7]'
              : 'border-transparent text-[#767670] hover:text-[#1A1A1A]'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>CSV Spreadsheet Suite</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveSubTab('health');
            handleRunDoctor();
          }}
          className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 font-medium cursor-pointer transition ${
            activeSubTab === 'health'
              ? 'border-[#8C7355] text-[#8C7355] bg-[#FAF9F7]'
              : 'border-transparent text-[#767670] hover:text-[#1A1A1A]'
          }`}
        >
          <Stethoscope className="w-3.5 h-3.5" />
          <span>Database Doctor</span>
        </button>
      </div>

      {/* 1. EXPORT TAB */}
      {activeSubTab === 'export' && (
        <div className="space-y-4">
          <div className="p-5 bg-white border border-[#E5E5E1] shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-serif font-bold text-base text-[#1A1A1A] flex items-center gap-2">
                  <Archive className="w-4 h-4 text-[#8C7355]" />
                  Complete Lossless Database Snapshot
                </h3>
                <p className="text-xs text-[#767670] mt-1 max-w-xl leading-relaxed">
                  Generates an immutable JSON archive containing every garment, color tag, high-res visual, outfit collage, resale listing, wishlist item, and version revision log with an integrated SHA-256 integrity checksum.
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownloadLosslessJson}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#8C7355] hover:bg-[#786248] text-white text-xs font-semibold shadow-xs cursor-pointer transition shrink-0"
              >
                <Download className="w-4 h-4" />
                <span>Download Lossless JSON</span>
              </button>
            </div>

            {/* Current Vault Statistics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[#E5E5E1]">
              <div className="p-3 bg-[#FAF9F7] border border-[#E5E5E1]">
                <div className="text-[10px] font-mono uppercase text-[#767670]">Wardrobe Items</div>
                <div className="text-lg font-serif font-bold text-[#1A1A1A] mt-0.5">{items.length}</div>
              </div>
              <div className="p-3 bg-[#FAF9F7] border border-[#E5E5E1]">
                <div className="text-[10px] font-mono uppercase text-[#767670]">Outfits / Looks</div>
                <div className="text-lg font-serif font-bold text-[#1A1A1A] mt-0.5">{outfits.length}</div>
              </div>
              <div className="p-3 bg-[#FAF9F7] border border-[#E5E5E1]">
                <div className="text-[10px] font-mono uppercase text-[#767670]">Wishlist Items</div>
                <div className="text-lg font-serif font-bold text-[#1A1A1A] mt-0.5">{shoppingList.length}</div>
              </div>
              <div className="p-3 bg-[#FAF9F7] border border-[#E5E5E1]">
                <div className="text-[10px] font-mono uppercase text-[#767670]">Resale Listings</div>
                <div className="text-lg font-serif font-bold text-[#1A1A1A] mt-0.5">{saleItems.length}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. IMPORT TAB */}
      {activeSubTab === 'import' && (
        <div className="space-y-4">
          <div className="p-5 bg-white border border-[#E5E5E1] shadow-2xs space-y-4">
            <h3 className="font-serif font-bold text-base text-[#1A1A1A] flex items-center gap-2">
              <Upload className="w-4 h-4 text-[#8C7355]" />
              Lossless Archive Importer &amp; Diff Inspector
            </h3>
            <p className="text-xs text-[#767670]">
              Load a Humidor JSON backup to inspect incoming differences, verify schema integrity, and restore your closet with an automatic safety rollback checkpoint.
            </p>

            {/* Drop Zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="p-6 border-2 border-dashed border-[#D5D5D0] hover:border-[#8C7355] bg-[#FAF9F7] text-center cursor-pointer transition flex flex-col items-center justify-center gap-2"
            >
              <FileJson className="w-8 h-8 text-[#8C7355]" />
              <div className="text-xs font-semibold text-[#1A1A1A]">
                Click or drag &amp; drop a Humidor JSON backup file here
              </div>
              <div className="text-[10px] font-mono text-[#767670]">Supports .json files up to 50MB</div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Validation & Diff Results */}
            {validationResult && (
              <div className="space-y-3 pt-3 border-t border-[#E5E5E1]">
                <div
                  className={`p-3 border text-xs font-mono flex items-center justify-between ${
                    validationResult.valid
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-rose-50 border-rose-300 text-rose-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {validationResult.valid ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span>
                      {validationResult.valid
                        ? `Valid Humidor Archive (Format: ${validationResult.payload?.formatVersion || 'v1.0'})`
                        : 'Invalid backup format. Please verify file integrity.'}
                    </span>
                  </div>
                  {validationResult.payload && (
                    <span className="text-[10px] opacity-75">
                      Checksum: {validationResult.payload.integrityChecksum.slice(0, 16)}...
                    </span>
                  )}
                </div>

                {/* Diff Summary */}
                {diffSummary && (
                  <div className="p-4 bg-[#FAF9F7] border border-[#E5E5E1] space-y-3">
                    <div className="text-xs font-serif font-bold text-[#1A1A1A] flex items-center gap-2">
                      <Eye className="w-4 h-4 text-[#8C7355]" />
                      Diff Comparison (Incoming Archive vs. Current Closet)
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                      <div className="p-2 bg-white border border-[#E5E5E1]">
                        <div className="text-[10px] text-[#767670]">Wardrobe Items</div>
                        <div className="font-bold text-[#1A1A1A]">
                          {diffSummary.incomingItemsCount} (vs {diffSummary.currentItemsCount})
                        </div>
                      </div>
                      <div className="p-2 bg-white border border-[#E5E5E1]">
                        <div className="text-[10px] text-[#767670]">Outfits</div>
                        <div className="font-bold text-[#1A1A1A]">
                          {diffSummary.incomingOutfitsCount} (vs {diffSummary.currentOutfitsCount})
                        </div>
                      </div>
                      <div className="p-2 bg-white border border-[#E5E5E1]">
                        <div className="text-[10px] text-[#767670]">Wishlist</div>
                        <div className="font-bold text-[#1A1A1A]">
                          {diffSummary.incomingShoppingCount} (vs {diffSummary.currentShoppingCount})
                        </div>
                      </div>
                      <div className="p-2 bg-white border border-[#E5E5E1]">
                        <div className="text-[10px] text-[#767670]">Sales Inventory</div>
                        <div className="font-bold text-[#1A1A1A]">
                          {diffSummary.incomingSalesCount} (vs {diffSummary.currentSalesCount})
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <span className="text-[11px] text-[#767670] font-mono">
                        Valuation Delta: {diffSummary.valuationDifference >= 0 ? '+' : ''}
                        {formatGbp(diffSummary.valuationDifference)}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleConfirmRestore('overwrite')}
                        className="px-4 py-2 bg-[#8C7355] hover:bg-[#786248] text-white text-xs font-semibold shadow-xs cursor-pointer transition flex items-center gap-1.5"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>Restore Closet from Archive (Safe Rollback Auto-Created)</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. CSV TAB */}
      {activeSubTab === 'csv' && (
        <div className="space-y-4">
          <div className="p-5 bg-white border border-[#E5E5E1] shadow-2xs space-y-4">
            <div>
              <h3 className="font-serif font-bold text-base text-[#1A1A1A] flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-[#8C7355]" />
                CSV Spreadsheet Exporter
              </h3>
              <p className="text-xs text-[#767670] mt-1">
                Export your wardrobe data into clean, formatted CSV spreadsheets ready for Excel, Google Sheets, or Notion.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-4 bg-[#FAF9F7] border border-[#E5E5E1] space-y-3 flex flex-col justify-between">
                <div>
                  <div className="font-serif font-bold text-sm text-[#1A1A1A]">Wardrobe Catalog</div>
                  <div className="text-[11px] text-[#767670] mt-1 font-mono">
                    {items.length} garments · Names, brands, costs, wear counts, CPW, and categories.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDownloadCsv('wardrobe')}
                  className="w-full py-2 bg-white hover:bg-[#F2F1ED] border border-[#D5D5D0] text-xs font-mono font-semibold text-[#1A1A1A] flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs transition"
                >
                  <Download className="w-3.5 h-3.5 text-[#8C7355]" />
                  <span>Download Wardrobe CSV</span>
                </button>
              </div>

              <div className="p-4 bg-[#FAF9F7] border border-[#E5E5E1] space-y-3 flex flex-col justify-between">
                <div>
                  <div className="font-serif font-bold text-sm text-[#1A1A1A]">Resale &amp; Sales Hub</div>
                  <div className="text-[11px] text-[#767670] mt-1 font-mono">
                    {saleItems.length} listings · Listing prices, sold prices, platforms, and margins.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDownloadCsv('sales')}
                  className="w-full py-2 bg-white hover:bg-[#F2F1ED] border border-[#D5D5D0] text-xs font-mono font-semibold text-[#1A1A1A] flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs transition"
                >
                  <Download className="w-3.5 h-3.5 text-[#8C7355]" />
                  <span>Download Sales CSV</span>
                </button>
              </div>

              <div className="p-4 bg-[#FAF9F7] border border-[#E5E5E1] space-y-3 flex flex-col justify-between">
                <div>
                  <div className="font-serif font-bold text-sm text-[#1A1A1A]">Wishlist Pipeline</div>
                  <div className="text-[11px] text-[#767670] mt-1 font-mono">
                    {shoppingList.length} items · Estimated prices, priorities, and gaps filled.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDownloadCsv('shopping')}
                  className="w-full py-2 bg-white hover:bg-[#F2F1ED] border border-[#D5D5D0] text-xs font-mono font-semibold text-[#1A1A1A] flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs transition"
                >
                  <Download className="w-3.5 h-3.5 text-[#8C7355]" />
                  <span>Download Wishlist CSV</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. HEALTH DOCTOR TAB */}
      {activeSubTab === 'health' && (
        <div className="space-y-4">
          <div className="p-5 bg-white border border-[#E5E5E1] shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-serif font-bold text-base text-[#1A1A1A] flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-[#8C7355]" />
                  Database Health Doctor
                </h3>
                <p className="text-xs text-[#767670] mt-1">
                  Inspects your database schema, validates orphaned item IDs in lookbooks, identifies broken image URLs, and checks for duplicates.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRunDoctor}
                  className="px-3 py-1.5 bg-[#FAF9F7] hover:bg-[#F2F1ED] border border-[#D5D5D0] text-xs font-mono text-[#1A1A1A] flex items-center gap-1.5 cursor-pointer transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Re-scan Database</span>
                </button>
                <button
                  type="button"
                  onClick={handleRepairDoctor}
                  disabled={isRepairing || !healthReport || healthReport.issues.length === 0}
                  className="px-3 py-1.5 bg-[#8C7355] hover:bg-[#786248] text-white text-xs font-mono font-semibold disabled:opacity-50 cursor-pointer transition flex items-center gap-1.5"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>{isRepairing ? 'Repairing...' : 'Auto-Repair Inconsistencies'}</span>
                </button>
              </div>
            </div>

            {/* Health Score Meter */}
            {healthReport && (
              <div className="space-y-3 pt-3 border-t border-[#E5E5E1]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-[#1A1A1A]">Overall Integrity Score</span>
                  <span
                    className={`text-sm font-mono font-bold ${
                      healthReport.healthScore >= 90
                        ? 'text-emerald-700'
                        : healthReport.healthScore >= 75
                        ? 'text-amber-700'
                        : 'text-rose-700'
                    }`}
                  >
                    {healthReport.healthScore}% · {healthReport.healthScore >= 90 ? 'Optimal' : 'Needs Repair'}
                  </span>
                </div>
                <div className="w-full bg-[#E5E5E1] h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      healthReport.healthScore >= 90
                        ? 'bg-emerald-500'
                        : healthReport.healthScore >= 75
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${healthReport.healthScore}%` }}
                  />
                </div>

                {/* Issues List */}
                <div className="space-y-2 mt-3">
                  <div className="text-[11px] font-mono uppercase text-[#767670]">Diagnostic Findings:</div>
                  {healthReport.issues.length === 0 ? (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-xs font-mono text-emerald-900 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Zero database anomalies detected. All schemas and links are pristine!</span>
                    </div>
                  ) : (
                    healthReport.issues.map((issue, idx) => (
                      <div
                        key={idx}
                        className={`p-2.5 border text-xs font-mono flex items-start gap-2 ${
                          issue.severity === 'high'
                            ? 'bg-rose-50 border-rose-200 text-rose-900'
                            : issue.severity === 'medium'
                            ? 'bg-amber-50 border-amber-200 text-amber-900'
                            : 'bg-blue-50 border-blue-200 text-blue-900'
                        }`}
                      >
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold uppercase tracking-wider text-[10px] mr-2">
                            [{issue.severity}]
                          </span>
                          <span>{issue.description}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

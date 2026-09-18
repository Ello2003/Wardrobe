import React, { useState } from 'react';
import { Github, Printer, X } from 'lucide-react';
import { useWardrobe } from '../context/WardrobeContext';
import { GithubSyncPanel } from './GithubSyncPanel';

const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const formatGbp = (value: number): string =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);

export const DataSyncToolbar: React.FC = () => {
  const { shoppingList } = useWardrobe();
  const [isGitHubOpen, setIsGitHubOpen] = useState(false);
  const [githubNotice, setGithubNotice] = useState<string | null>(null);
  const [printError, setPrintError] = useState<string | null>(null);

  const printBasket = () => {
    setPrintError(null);
    const basket = shoppingList.filter((item) => item.status === 'In Basket');

    if (basket.length === 0) {
      setPrintError('There are no items currently marked “In Basket”.');
      window.setTimeout(() => setPrintError(null), 5000);
      return;
    }

    const total = basket.reduce((sum, item) => sum + (Number(item.estimatedPrice) || 0), 0);
    const today = new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(new Date());

    const rows = basket
      .map(
        (item, index) => `
          <tr>
            <td class="num">${index + 1}</td>
            <td>
              <strong>${escapeHtml(item.name)}</strong>
              ${item.brand ? `<div class="muted">${escapeHtml(item.brand)}</div>` : ''}
            </td>
            <td>${escapeHtml(item.category || '—')}</td>
            <td>${escapeHtml(item.retailerName || '—')}</td>
            <td>${escapeHtml(item.priority || '—')}</td>
            <td class="price">${formatGbp(Number(item.estimatedPrice) || 0)}</td>
          </tr>
        `
      )
      .join('');

    const notes = basket
      .filter((item) => item.notes || item.reasonOrGap)
      .map(
        (item) => `
          <div class="note">
            <strong>${escapeHtml(item.name)}</strong>
            ${item.reasonOrGap ? `<span>${escapeHtml(item.reasonOrGap)}</span>` : ''}
            ${item.notes ? `<span>${escapeHtml(item.notes)}</span>` : ''}
          </div>
        `
      )
      .join('');

    const win = window.open('', '_blank', 'noopener,noreferrer,width=1100,height=800');
    if (!win) {
      setPrintError('The print window was blocked. Allow pop-ups for this site and try again.');
      window.setTimeout(() => setPrintError(null), 6000);
      return;
    }

    win.document.write(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Wardrobe & Style Studio — Shopping Basket</title>
<style>
  @page { size: A4; margin: 16mm; }
  * { box-sizing: border-box; }
  body { margin: 0; color: #1a1a1a; background: #fff; font: 12px/1.45 Arial, Helvetica, sans-serif; }
  .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #1a1a1a; padding-bottom: 12px; margin-bottom: 18px; }
  h1 { margin: 0; font: 700 24px Georgia, serif; }
  .subtitle { color: #666; margin-top: 4px; }
  .meta { text-align: right; color: #666; font-size: 11px; }
  .summary { display: flex; gap: 28px; margin: 0 0 18px; }
  .metric { border-left: 3px solid #8c7355; padding-left: 9px; }
  .metric strong { display: block; font-size: 16px; }
  .metric span { color: #666; font-size: 10px; text-transform: uppercase; letter-spacing: .08em; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; background: #f3f2ee; border-bottom: 1px solid #ccc; padding: 8px 7px; font-size: 10px; text-transform: uppercase; letter-spacing: .06em; }
  td { border-bottom: 1px solid #e5e5e1; padding: 9px 7px; vertical-align: top; }
  .num { width: 28px; color: #777; }
  .price { text-align: right; white-space: nowrap; font-weight: 700; }
  .muted { color: #777; margin-top: 2px; }
  .notes { margin-top: 20px; }
  .notes h2 { font: 700 14px Georgia, serif; margin: 0 0 8px; }
  .note { padding: 7px 0; border-bottom: 1px solid #eee; }
  .note span { display: block; color: #666; margin-top: 2px; }
  .footer { margin-top: 24px; color: #777; font-size: 10px; border-top: 1px solid #ddd; padding-top: 8px; }
  @media print { .no-print { display: none !important; } }
</style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Shopping Basket</h1>
      <div class="subtitle">Wardrobe &amp; Style Studio</div>
    </div>
    <div class="meta">Printed ${escapeHtml(today)}<br>In Basket</div>
  </div>
  <div class="summary">
    <div class="metric"><strong>${basket.length}</strong><span>Items</span></div>
    <div class="metric"><strong>${formatGbp(total)}</strong><span>Estimated total</span></div>
  </div>
  <table>
    <thead><tr><th>#</th><th>Item</th><th>Category</th><th>Retailer</th><th>Priority</th><th style="text-align:right">Estimated</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  ${notes ? `<section class="notes"><h2>Notes</h2>${notes}</section>` : ''}
  <div class="footer">Use your browser's Print dialog to choose “Save as PDF” or a physical printer.</div>
  <script>
    window.addEventListener('load', function () {
      setTimeout(function () { window.print(); }, 150);
    });
  </script>
</body>
</html>`);
    win.document.close();
    win.focus();
  };

  return (
    <>
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-3">
        <div className="flex justify-end items-center gap-2">
          {printError && (
            <div
              role="status"
              className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-900"
            >
              <span>{printError}</span>
              <button type="button" onClick={() => setPrintError(null)} aria-label="Dismiss print message">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={printBasket}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#E5E5E1] bg-white px-3 py-1.5 text-xs font-medium shadow-xs transition hover:bg-[#F3F2EE]"
            title="Print the items currently in your shopping basket"
          >
            <Printer className="h-3.5 w-3.5" />
            Print Basket / PDF
          </button>
          <button
            type="button"
            onClick={() => setIsGitHubOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#E5E5E1] bg-white px-3 py-1.5 text-xs font-medium shadow-xs transition hover:bg-[#F3F2EE]"
            title="Push and pull your wardrobe data with GitHub"
          >
            <Github className="h-3.5 w-3.5" />
            GitHub Sync
          </button>
        </div>
      </div>

      {isGitHubOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="github-sync-dialog-title">
          <div className="w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-lg bg-[#F8F7F4] shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E5E5E1] bg-white px-5 py-3">
              <h2 id="github-sync-dialog-title" className="font-serif text-lg font-bold">GitHub Sync</h2>
              <button type="button" onClick={() => setIsGitHubOpen(false)} aria-label="Close GitHub Sync" className="rounded-md p-1.5 text-[#767670] hover:bg-[#F3F2EE]"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-5">
              {githubNotice && <div className="mb-4 rounded-md border border-[#E5E5E1] bg-white px-3 py-2 text-xs text-[#5A5A55]">{githubNotice}</div>}
              <GithubSyncPanel onNotify={(type, msg) => setGithubNotice(msg)} />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

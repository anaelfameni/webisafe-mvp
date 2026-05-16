/**
 * R.3 — Export CSV / JSON des scans pour les utilisateurs (dashboard client,
 * console agence, panel admin). Aucune information sensible n'est embarquée :
 * uniquement domaine, date, durée et scores publics.
 */

import { extractDomain } from './validators';

const CSV_COLUMNS = [
  { key: 'domain', label: 'Domaine' },
  { key: 'url', label: 'URL' },
  { key: 'scanDate', label: 'Date du scan' },
  { key: 'global', label: 'Score global' },
  { key: 'performance', label: 'Performance' },
  { key: 'security', label: 'Sécurité' },
  { key: 'seo', label: 'SEO' },
  { key: 'ux', label: 'UX Mobile' },
  { key: 'paid', label: 'Premium' },
];

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n;]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildScanExportRows(scans, { isPaid } = {}) {
  return (scans || []).map((scan) => ({
    id: scan.id,
    domain: extractDomain(scan.url || ''),
    url: scan.url || '',
    scanDate: scan.scanDate || scan.savedAt || scan.created_at || '',
    global: scan.scores?.global ?? '',
    performance: scan.scores?.performance ?? '',
    security: scan.scores?.security ?? '',
    seo: scan.scores?.seo ?? '',
    ux: scan.scores?.ux_mobile ?? scan.scores?.ux ?? '',
    paid: typeof isPaid === 'function' ? Boolean(isPaid(scan.id)) : Boolean(scan.paid),
  }));
}

export function rowsToCsv(rows, columns = CSV_COLUMNS) {
  const header = columns.map((c) => csvEscape(c.label)).join(',');
  const body = rows
    .map((row) => columns.map((c) => csvEscape(row[c.key])).join(','))
    .join('\n');
  return `${header}\n${body}`;
}

export function rowsToJson(rows) {
  return JSON.stringify(rows, null, 2);
}

function downloadBlob(content, filename, mimeType) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadScansCsv(scans, options = {}) {
  const rows = buildScanExportRows(scans, options);
  const csv = rowsToCsv(rows);
  const filename = options.filename || `webisafe-scans-${new Date().toISOString().slice(0, 10)}.csv`;
  downloadBlob(csv, filename, 'text/csv');
}

export function downloadScansJson(scans, options = {}) {
  const rows = buildScanExportRows(scans, options);
  const json = rowsToJson(rows);
  const filename = options.filename || `webisafe-scans-${new Date().toISOString().slice(0, 10)}.json`;
  downloadBlob(json, filename, 'application/json');
}

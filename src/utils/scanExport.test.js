import { describe, it, expect } from 'vitest';
import {
  buildScanExportRows,
  rowsToCsv,
  rowsToJson,
} from './scanExport';

const SCANS = [
  {
    id: 's1',
    url: 'https://exemple.ci',
    scanDate: '2026-05-15',
    scores: { global: 78, performance: 80, security: 70, seo: 85, ux_mobile: 76 },
    paid: true,
  },
  {
    id: 's2',
    url: 'https://autre.com',
    scanDate: '2026-05-14',
    scores: { global: 52, performance: 40, security: 60, seo: 55, ux: 53 },
    paid: false,
  },
];

describe('scanExport', () => {
  it('builds rows with stable shape', () => {
    const rows = buildScanExportRows(SCANS, { isPaid: (id) => id === 's1' });
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual(
      expect.objectContaining({
        id: 's1',
        domain: 'exemple.ci',
        url: 'https://exemple.ci',
        scanDate: '2026-05-15',
        global: 78,
        performance: 80,
        security: 70,
        seo: 85,
        ux: 76,
        paid: true,
      })
    );
    expect(rows[1].paid).toBe(false);
  });

  it('serializes rows to CSV with header + escaped fields', () => {
    const rows = buildScanExportRows([
      { id: 'x', url: 'https://a,comma.com', scanDate: '2026-05-15', scores: { global: 90 }, paid: true },
    ]);
    const csv = rowsToCsv(rows);
    expect(csv).toMatch(/^Domaine,URL,/);
    // L'URL contient une virgule → doit être encadrée par des guillemets
    expect(csv).toContain('"https://a,comma.com"');
  });

  it('serializes rows to JSON', () => {
    const rows = buildScanExportRows(SCANS);
    const json = JSON.parse(rowsToJson(rows));
    expect(json).toHaveLength(2);
    expect(json[0].domain).toBe('exemple.ci');
  });
});

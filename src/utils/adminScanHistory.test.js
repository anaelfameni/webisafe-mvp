import { describe, expect, it } from 'vitest';
import { mergeAdminScans, normalizeAdminScan } from './adminScanHistory';

describe('adminScanHistory', () => {
  it('normalizes legacy local scans', () => {
    const scan = normalizeAdminScan({
      id: 'local-1',
      url: 'https://example.com',
      email: 'client@example.com',
      scores: { global: 82 },
      savedAt: '2026-05-01T10:00:00.000Z',
    });

    expect(scan).toMatchObject({
      id: 'local-1',
      url: 'https://example.com',
      user_email: 'client@example.com',
      score: 82,
      scanned_at: '2026-05-01T10:00:00.000Z',
      paid: false,
    });
  });

  it('merges remote scans with legacy scans and keeps remote duplicates authoritative', () => {
    const scans = mergeAdminScans(
      [{ id: 'same', url: 'https://remote.com', score: 90, scanned_at: '2026-05-02T10:00:00.000Z' }],
      [
        { id: 'legacy', url: 'https://legacy.com', scores: { global: 70 }, savedAt: '2026-05-01T10:00:00.000Z' },
        { id: 'same', url: 'https://old.com', scores: { global: 40 }, savedAt: '2026-04-01T10:00:00.000Z' },
      ]
    );

    expect(scans).toHaveLength(2);
    expect(scans[0]).toMatchObject({ id: 'same', url: 'https://remote.com', score: 90 });
    expect(scans[1]).toMatchObject({ id: 'legacy', url: 'https://legacy.com', score: 70 });
  });
});

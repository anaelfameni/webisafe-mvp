import { describe, expect, it } from 'vitest';
import { buildFreeScanUrl, shouldForceFreshScan, stripFreshScanMarker } from './scanNavigation';

describe('free scan navigation', () => {
  it('marks explicit Scanner Gratuitement submissions as fresh scans', () => {
    const target = buildFreeScanUrl({
      url: 'https://example.ci',
      email: 'client@example.ci',
      requestId: 'scan-123',
    });

    expect(target).toBe('/analyse?url=https%3A%2F%2Fexample.ci&email=client%40example.ci&fresh_scan=scan-123');
  });

  it('detects and strips the one-time fresh scan marker without losing url or email', () => {
    const params = new URLSearchParams('url=https%3A%2F%2Fexample.ci&email=client%40example.ci&fresh_scan=scan-123');

    expect(shouldForceFreshScan(params)).toBe(true);
    expect(stripFreshScanMarker(params)).toBe('/analyse?url=https%3A%2F%2Fexample.ci&email=client%40example.ci');
  });

  it('does not force a scan when returning to an audit URL without marker', () => {
    const params = new URLSearchParams('url=https%3A%2F%2Fexample.ci&email=client%40example.ci');

    expect(shouldForceFreshScan(params)).toBe(false);
    expect(stripFreshScanMarker(params)).toBe('/analyse?url=https%3A%2F%2Fexample.ci&email=client%40example.ci');
  });
});

import assert from 'node:assert/strict';
import { test } from 'vitest';
import { buildPerformanceMetricsFromPageSpeed, getPageSpeedScore } from './pageSpeedScanner.js';

test('getPageSpeedScore reads category scores from shared Lighthouse data', () => {
  const data = {
    lighthouseResult: {
      categories: {
        performance: { score: 0.42 },
        seo: { score: 0.84 },
      },
    },
  };

  assert.equal(getPageSpeedScore(data, 'performance'), 42);
  assert.equal(getPageSpeedScore(data, 'seo'), 84);
  assert.equal(getPageSpeedScore(data, 'accessibility'), null);
});

test('buildPerformanceMetricsFromPageSpeed maps Lighthouse audits to performance metrics', () => {
  const result = buildPerformanceMetricsFromPageSpeed({
    final_url: 'https://example.com/final',
    lighthouseResult: {
      categories: {
        performance: { score: 0.57 },
      },
      audits: {
        'largest-contentful-paint': { numericValue: 1200 },
        'cumulative-layout-shift': { numericValue: 0.01 },
        'first-contentful-paint': { numericValue: 700 },
        'total-blocking-time': { numericValue: 10 },
        interactive: { numericValue: 1800 },
        'total-byte-weight': { numericValue: 1048576 },
      },
    },
  });

  assert.equal(result.score, 57);
  assert.equal(result.lcp, 1200);
  assert.equal(result.cls, 0.01);
  assert.equal(result.fcp, 700);
  assert.equal(result.tbt, 10);
  assert.equal(result.tti, 1800);
  assert.equal(result.page_weight_mb, 1);
  assert.equal(result.pageSpeed_final_url, 'https://example.com/final');
  assert.equal(result.partial, false);
});

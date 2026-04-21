import test from 'node:test';
import assert from 'node:assert/strict';

import { buildPerformanceAnalysis, scanPerformance } from './performance.ts';

function createContext(overrides = {}) {
  return {
    target: {
      normalizedUrl: 'https://example.com',
      hostname: 'example.com',
      domain: 'example.com',
      protocol: 'https:',
      httpsEnabled: true,
    },
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent',
    snapshot: null,
    externalApis: {
      appUrl: 'http://localhost:5173',
      ...(overrides.externalApis || {}),
    },
    startedAt: Date.now(),
    ...overrides,
  };
}

test('scanPerformance throws API_KEY_MISSING when the PageSpeed key is absent', async () => {
  await assert.rejects(
    () => scanPerformance(createContext()),
    (error) => {
      assert.equal(error instanceof Error, true);
      assert.equal(error.message, 'API_KEY_MISSING');
      return true;
    }
  );
});

test('buildPerformanceAnalysis derives findings and recommendations from real PageSpeed audits', () => {
  const pageSpeedBundle = {
    lighthouseResult: {
      categories: {
        performance: { score: 0.42 },
      },
      audits: {
        'largest-contentful-paint': { numericValue: 4800, score: 0.2 },
        'first-contentful-paint': { numericValue: 3200, score: 0.3 },
        'cumulative-layout-shift': { numericValue: 0.32, score: 0.15 },
        interactive: { numericValue: 6100 },
        'speed-index': { numericValue: 5400 },
        'total-blocking-time': { numericValue: 480 },
        'total-byte-weight': { numericValue: 4_700_000 },
        'network-requests': {
          details: {
            items: new Array(120).fill({}),
          },
        },
        'uses-optimized-images': {
          score: 0,
          details: { overallSavingsBytes: 900_000 },
        },
        'render-blocking-resources': {
          score: 0.1,
          details: { overallSavingsMs: 1450 },
        },
        'unused-javascript': {
          score: 0.2,
          details: { overallSavingsBytes: 280_000 },
        },
        'unused-css-rules': {
          score: 0.25,
          details: { overallSavingsBytes: 110_000 },
        },
        'uses-text-compression': {
          score: 0.4,
          details: { overallSavingsBytes: 180_000 },
        },
        'uses-long-cache-ttl': {
          score: 0.3,
        },
      },
    },
  };

  const analysis = buildPerformanceAnalysis(pageSpeedBundle, createContext());

  assert.equal(analysis.score > 0, true);
  assert.equal(analysis.findings.length >= 3, true);
  assert.equal(analysis.recommendations.length >= 4, true);
  assert.equal(
    analysis.findings.some((finding) => finding.titre.includes('Temps de rendu principal')),
    true
  );
  assert.equal(
    analysis.recommendations.some((recommendation) =>
      recommendation.action.includes('Supprimer les ressources bloquantes')
    ),
    true
  );
  assert.equal(
    analysis.recommendations.some((recommendation) =>
      recommendation.action.includes('Optimiser les images')
    ),
    true
  );
});

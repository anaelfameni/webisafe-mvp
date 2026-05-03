import test from 'node:test';
import assert from 'node:assert/strict';

import { buildScanConclusion } from './scanConclusion.js';

test('builds a three-paragraph conclusion coherent with weak results and free scan limits', () => {
  const text = buildScanConclusion({
    scores: {
      performance: 42,
      security: 38,
      seo: 51,
      ux: 47,
    },
    recommendations: [
      { priority: 'CRITIQUE' },
      { priority: 'HAUTE' },
      { priority: 'MOYENNE' },
      { priority: 'CRITIQUE' },
    ],
    performance: { loadTime: '4.8s' },
    seo: { altMissing: 9, sitemapOk: false, robotsTxtOk: false },
    security: { https: false, sslValid: false, hsts: false, csp: false, malware: false },
    ux: { responsive: false, tapTargets: false, textReadable: false },
  });

  assert.match(text, /performances|performance/i);
  assert.match(text, /sécurité|securite/i);
  assert.match(text, /trafic|conversion|revenus/i);
  assert.match(text, /analyse gratuite|scan gratuit/i);
  assert.match(text, /rapport complet/i);
  assert.match(text, /l'acquisition|d'image|qu'une|d'identifier/i);

  const paragraphs = text.split('\n\n').filter(Boolean);
  assert.equal(paragraphs.length, 3, `expected 3 paragraphs, got ${paragraphs.length}`);

  const sentenceCount = text
    .split(/[.!?]+/)
    .map((part) => part.trim())
    .filter(Boolean).length;

  assert.ok(sentenceCount <= 6, `expected at most 6 sentences, got ${sentenceCount}`);
});

test('keeps the conclusion business-oriented even with fewer critical issues', () => {
  const text = buildScanConclusion({
    scores: {
      performance: 78,
      security: 74,
      seo: 69,
      ux: 81,
    },
    recommendations: [
      { priority: 'HAUTE' },
      { priority: 'MOYENNE' },
      { priority: 'MOYENNE' },
    ],
    performance: { loadTime: '2.4s' },
    seo: { altMissing: 2, sitemapOk: true, robotsTxtOk: true },
    security: { https: true, sslValid: true, hsts: false, csp: false, malware: false },
    ux: { responsive: true, tapTargets: true, textReadable: true },
  });

  assert.match(text, /marge de progression|points de fragilité|fragilités|axes de progression/i);
  assert.match(text, /analyse gratuite|scan gratuit/i);
  assert.match(text, /rapport complet/i);
  assert.equal(text.split('\n\n').filter(Boolean).length, 3);
});

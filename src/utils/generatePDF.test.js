import test from 'node:test';
import assert from 'node:assert/strict';

import { buildPdfFilename, sanitizePdfText } from './generatePDF.js';

test('sanitizePdfText removes unsupported symbols while preserving readable content', () => {
  const result = sanitizePdfText("Rapport d’audit — Sécurité ✅ 📱 Côte d'Ivoire");

  assert.equal(result, "Rapport d'audit - Securite Cote d'Ivoire");
});

test('buildPdfFilename creates a stable downloadable filename', () => {
  const filename = buildPdfFilename({
    domain: 'mon-site.ci',
    url: 'https://mon-site.ci',
    scanDate: '2026-04-19T12:00:00.000Z',
  });

  assert.equal(filename, 'Webisafe_Rapport_mon-site.ci_2026-04-19.pdf');
});

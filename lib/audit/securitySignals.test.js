import assert from 'node:assert/strict';
import { describe, test } from 'vitest';
import * as cheerio from 'cheerio';

import { analyzeCspQuality, analyzeSri, buildComplianceBadges, detectCms, detectJsLibraries } from './securitySignals.js';

const WORDPRESS_HTML = `<!doctype html>
<html>
  <head>
    <meta name="generator" content="WordPress 5.8">
    <script src="https://code.jquery.com/jquery-1.12.4.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@3.4.1/dist/js/bootstrap.min.js" integrity="sha384-demo" crossorigin="anonymous"></script>
    <script src="https://cdn.example.com/app.js"></script>
  </head>
  <body>
    <link rel="stylesheet" href="/wp-content/plugins/contact-form-7/style.css">
    <script>React.createElement('div')</script>
  </body>
</html>`;

describe('security signal helpers', () => {
  test('scores weak CSP quality with concrete issues', () => {
    const result = analyzeCspQuality("script-src * 'unsafe-inline' 'unsafe-eval'");

    assert.equal(result.present, true);
    assert.equal(result.status, 'warning');
    assert.equal(result.issues.includes('unsafe-inline'), true);
    assert.equal(result.issues.includes('unsafe-eval'), true);
    assert.equal(result.issues.includes('wildcard-source'), true);
    assert.equal(result.issues.includes('missing-default-src'), true);
    assert.equal(result.issues.includes('missing-frame-ancestors'), true);
    assert.equal(result.score < 70, true);
  });

  test('detects CMS, JS libraries, and SRI findings from HTML', () => {
    const $ = cheerio.load(WORDPRESS_HTML);
    const cms = detectCms($, WORDPRESS_HTML, { headers: { 'x-powered-by': 'Next.js' } });
    const libraries = detectJsLibraries($, WORDPRESS_HTML);
    const sri = analyzeSri($, 'https://example.com/');

    assert.equal(cms.primary, 'WordPress');
    assert.equal(cms.detected.some((item) => item.name === 'Next.js'), true);
    assert.equal(libraries.detected.some((item) => item.name === 'jQuery' && item.version === '1.12.4'), true);
    assert.equal(libraries.detected.some((item) => item.name === 'Bootstrap' && item.version === '3.4.1'), true);
    assert.equal(libraries.outdated_or_risky.some((item) => item.name === 'jQuery'), true);
    assert.equal(libraries.outdated_or_risky.some((item) => item.name === 'Bootstrap'), true);
    assert.equal(sri.external_scripts_count, 3);
    assert.equal(sri.missing_integrity_count, 2);
    assert.equal(sri.status, 'warning');
  });

  test('builds compliance preparation badges without certification wording', () => {
    const badges = buildComplianceBadges({
      https: true,
      csp_quality: { score: 82 },
      dnssec: { status: 'warning' },
      sri: { status: 'warning' },
      malware_detected: false,
    });

    assert.deepEqual(badges.map((badge) => badge.label), [
      'Préparation PCI DSS',
      'Préparation GDPR',
      'Préparation ISO 27001',
      'Préparation cyber assurance',
    ]);
    assert.equal(badges.every((badge) => !/certifié/i.test(badge.explanation)), true);
    assert.equal(badges.every((badge) => badge.explanation.includes('Signaux techniques utiles')), true);
  });
});

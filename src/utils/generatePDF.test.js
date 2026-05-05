import test from 'node:test';

import assert from 'node:assert/strict';



import { buildPdfAuditModel, buildPdfFilename, sanitizePdfText } from './generatePDF.js';



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



test('buildPdfFilename extracts a clean domain when only a URL is provided', () => {

  const filename = buildPdfFilename({

    url: 'https://www.mon-site.ci/audit?ref=webisafe',

    scanDate: '2026-04-19T12:00:00.000Z',

  });



  assert.equal(filename, 'Webisafe_Rapport_mon-site.ci_2026-04-19.pdf');

});



test('buildPdfAuditModel keeps all important UI report metrics and explanations', () => {

  const model = buildPdfAuditModel({

    url: 'https://mon-site.ci',

    scanDate: '2026-04-19T12:00:00.000Z',

    scan_origin: {

      region_code: 'cpt1',

      city: 'Cape Town',

      country: 'Afrique du Sud',

      label: 'Mesure africaine',

    },

    global_score: 62,

    scores: {

      performance: 48,

      security: 58,

      seo: 71,

      ux: 66,

    },

    metrics: {

      performance: {

        lcp: 5443,

        fcp: 2110,

        cls: 0.17,

        tbt: 380,

        tti: 6120,

        page_weight_mb: 4.7,

        partial: true,

        partial_reason: 'pagespeed_failed_fallback_ttfb',

        server_location: {

          city: 'Paris',

          country: 'France',

          isp: 'ExampleHost',

          ip: '203.0.113.10',

          latency_warning: {

            warning: true,

            message: 'Serveur en France - latence estimee +120ms pour vos visiteurs ivoiriens',

            impact: 'Vos visiteurs africains chargent votre site 2-3x plus lentement',

            recommendation: 'Envisagez un CDN ou un hebergeur africain',

          },

        },

        opportunities: [

          {

            title: 'Réduire le JavaScript inutilisé',

            description: 'Supprimez le code non utilisé pour accélérer le chargement.',

            savings_ms: 860,

          },

        ],

      },

      security: {

        ssl_grade: 'B',

        security_grade: 'C',

        malware_detected: false,

        observatory_score: 55,

        headers_manquants: [

          { header: 'CSP', message: 'Content-Security-Policy manquant' },

        ],

        cookie_issues: ['Cookie session sans Secure'],

        sensitive_files: {

          critical: true,

          alert_message: '.env expose',

          exposed_files: ['/.env'],

        },

      },

      seo: {

        has_title: true,

        has_description: false,

        h1_count: 2,

        has_viewport: true,

        has_open_graph: false,

      },

      ux: {

        grade: 'C',

        tap_targets_ok: false,

        issues: [

          {

            severity: 'high',

            message: 'Boutons trop proches',

            impact: 'Clics difficiles sur mobile',

            type: 'tap-targets',

          },

        ],

      },

    },

    critical_alerts: [

      {

        severity: 'warning',

        title: 'Serveur éloigné',

        message: 'Latence élevée',

        impact: 'Conversion mobile pénalisée',

        recommendation: 'Activer un CDN',

      },

    ],

    recommendations: [

      {

        priority: 'IMPORTANT',

        category: 'performance',

        title: 'Optimiser le LCP',

        description: 'Le contenu principal apparaît trop tard.',

        impact: 'Les visiteurs quittent la page.',

        action: 'Compresser les images principales.',

        difficulty: 'Moyenne',

        time: '2-4 heures',

        impactBusiness: 'Plus de demandes depuis mobile',

      },

    ],

  });



  assert.equal(model.scanOrigin.region_code, 'cpt1');

  assert.equal(model.scanOrigin.label, 'Mesure africaine');



  assert.deepEqual(

    model.sections.performance.metrics.map((item) => item.label),

    ['Score Performance', 'LCP', 'FCP', 'CLS', 'TBT', 'TTI', 'Poids page', 'Mode du scan']

  );

  assert.equal(model.sections.performance.serverLocation.ip, '203.0.113.10');

  assert.match(model.sections.performance.opportunities[0].description, /Supprimez le code/);



  assert.deepEqual(

    model.sections.security.metrics.map((item) => item.label),

    ['Score Securite', 'SSL Grade', 'Grade Headers', 'Malware (VirusTotal)', 'Observatory (Mozilla)']

  );

  assert.match(model.sections.security.missingHeaders[0].message, /Content-Security-Policy/);

  assert.equal(model.sections.security.cookieIssues[0], 'Cookie session sans Secure');

  assert.equal(model.sections.security.sensitiveFiles.exposed_files[0], '/.env');



  assert.deepEqual(

    model.sections.seo.metrics.map((item) => item.label),

    ['Score SEO', 'Title', 'Meta Description', 'H1', 'Viewport', 'Open Graph']

  );



  assert.deepEqual(

    model.sections.ux.metrics.map((item) => item.label),

    ['Score UX', 'Grade UX', 'Tap targets']

  );

  assert.equal(model.sections.ux.issues[0].type, 'tap-targets');

  assert.match(model.narrative.paragraphs.join('\n'), /Votre audit premium met en evidence/);

  assert.match(model.narrative.paragraphs.join('\n'), /Optimiser le LCP/);

  assert.equal(model.recommendations[0].impactBusiness, 'Plus de demandes depuis mobile');

});


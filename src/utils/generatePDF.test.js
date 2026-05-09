import { it } from 'vitest';

import assert from 'node:assert/strict';



import { buildPdfAuditModel, buildPdfFilename, sanitizePdfText } from './generatePDF.js';



it('sanitizePdfText preserves French accents while removing unsupported symbols', () => {

  const result = sanitizePdfText("Rapport d’audit — Sécurité ✅ 📱 Côte d'Ivoire");



  assert.equal(result, "Rapport d'audit - Sécurité Côte d'Ivoire");

});



it('buildPdfFilename creates a stable downloadable filename', () => {

  const filename = buildPdfFilename({

    domain: 'mon-site.ci',

    url: 'https://mon-site.ci',

    scanDate: '2026-04-19T12:00:00.000Z',

  });



  assert.equal(filename, 'Webisafe_Rapport_mon-site.ci_2026-04-19.pdf');

});



it('buildPdfFilename extracts a clean domain when only a URL is provided', () => {

  const filename = buildPdfFilename({

    url: 'https://www.mon-site.ci/audit?ref=webisafe',

    scanDate: '2026-04-19T12:00:00.000Z',

  });



  assert.equal(filename, 'Webisafe_Rapport_mon-site.ci_2026-04-19.pdf');

});



it('buildPdfAuditModel keeps all important UI report metrics and explanations', () => {

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

        https_enabled: true,

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

        compression: 'gzip',

        images_without_alt: 7,

        links_without_text: 2,

        user_zoom_blocked: true,

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

    ['Score performance', 'LCP', 'FCP', 'CLS', 'TBT', 'TTI', 'Poids de la page', 'Mode du scan']

  );

  assert.equal(model.sections.performance.serverLocation.ip, '203.0.113.10');

  assert.match(model.sections.performance.opportunities[0].description, /Supprimez le code/);



  assert.deepEqual(

    model.sections.security.metrics.map((item) => item.label),

    ['Score sécurité', 'Grade SSL', 'HTTPS', 'VirusTotal']

  );

  assert.match(model.sections.security.missingHeaders[0].message, /Content-Security-Policy/);

  assert.equal(model.sections.security.cookieIssues[0], 'Cookie session sans Secure');

  assert.equal(model.sections.security.sensitiveFiles.exposed_files[0], '/.env');



  assert.deepEqual(

    model.sections.seo.metrics.map((item) => item.label),

    ['Score SEO', 'Balise Title', 'Méta Description', 'H1', 'Viewport', 'Open Graph']

  );



  assert.deepEqual(

    model.sections.ux.metrics.map((item) => item.label),

    ['Score UX', 'Grade UX', 'Compression', 'Images sans alt', 'Liens sans texte', 'Zoom bloqué']

  );

  assert.equal(model.sections.ux.issues[0].type, 'tap-targets');

  assert.match(model.narrative.paragraphs.join('\n'), /Votre audit premium met en evidence|Votre audit premium met en évidence/);

  assert.match(model.narrative.paragraphs.join('\n'), /Optimiser le LCP/);

  assert.equal(model.recommendations[0].impactBusiness, 'Plus de demandes depuis mobile');

});

it('buildPdfAuditModel creates a premium executive audit model with calibrated priorities', () => {
  const model = buildPdfAuditModel({
    url: 'https://jumia.ci',
    scanDate: '2026-05-09T00:45:00.000Z',
    score: 77,
    scores: {
      performance: 50,
      security: 92,
      advanced_security: 74,
      seo: 89,
      ux: 94,
    },
    metrics: {
      performance: {
        score: 50,
        partial: true,
        partial_reason: 'Core Web Vitals indisponibles pendant le scan.',
        server_location: {
          city: 'Montreal',
          country: 'Canada',
          isp: 'Cloudflare, Inc.',
          latency_warning: {
            message: 'Serveur hébergé au Canada, latence estimée +150 ms pour vos visiteurs africains',
            impact: 'Risque d’abandon plus élevé sur mobile',
            recommendation: 'Tester un CDN proche de la Côte d’Ivoire',
          },
        },
      },
      security: {
        score: 92,
        https_enabled: true,
        ssl_grade: 'A',
        malware_detected: undefined,
        headers_manquants: [
          { header: 'HSTS', message: 'Strict-Transport-Security manquant', severity: 'critical' },
          { header: 'CSP', message: 'Content-Security-Policy manquant', severity: 'critical' },
          { header: 'Permissions-Policy', message: 'Permissions-Policy manquant' },
        ],
        extended_security_score: 74,
        advanced_checks: [
          {
            key: 'security_txt',
            name: 'security.txt',
            status: 'missing',
            description: 'security.txt manquant',
          },
          {
            key: 'cors',
            name: 'CORS mal configuré',
            status: 'critical',
            description: 'Access-Control-Allow-Origin trop permissif sur une réponse testée.',
          },
          {
            key: 'email_advanced',
            name: 'Sécurité email incomplète',
            status: 'critical',
            description: 'SPF, DMARC et DKIM manquants.',
            data: {
              spf: [],
              dmarc: [],
              dkim: [],
              missing: ['SPF', 'DMARC', 'DKIM'],
            },
          },
        ],
      },
      seo: {
        score: 89,
        has_title: true,
        has_description: true,
        h1_count: 1,
        has_viewport: true,
        has_open_graph: true,
        has_sitemap: false,
      },
      ux: {
        score: 94,
        grade: 'A+',
        images_without_alt: 6,
        links_without_text: 30,
        tap_targets_ok: true,
        user_zoom_blocked: false,
        issues: [
          {
            message: '30 lien(s) sans texte visible',
            impact: 'Confort réduit pour les utilisateurs et les moteurs de recherche',
            severity: 'low',
          },
        ],
      },
    },
  });

  assert.equal(model.report.id, 'WSF-JUMIA-CI-20260509');
  assert.equal(model.report.scanType, 'Scan passif non intrusif');
  assert.match(model.executive.verdict, /jumia\.ci/);
  assert.match(model.executive.businessSummary, /performance mobile|sécurité avancée/);
  assert.equal(model.executive.scanConfidence.label, 'Moyenne');
  assert.equal(model.sections.ux.metrics.find((item) => item.label === 'Grade UX').status, 'OK');
  assert.equal(model.sections.advancedSecurity.summaryRows.find((item) => item[0] === 'security.txt')[2], 'À corriger');
  assert.equal(model.sections.security.score, 92);
  assert.equal(model.sections.advancedSecurity.score, 74);
  assert.equal(model.cover.categoryScores.find((item) => item.label === 'Sécurité').score, 92);
  assert.equal(model.cover.categoryScores.find((item) => item.label === 'Sécurité avancée').score, 74);
  assert.equal(model.scorecard.find((item) => item.label === 'Sécurité').score, 92);
  assert.equal(model.scorecard.find((item) => item.label === 'Sécurité avancée').score, 74);
  assert.equal(model.sections.security.metrics.find((item) => item.label === 'Score sécurité').status, 'À corriger');
  assert.equal(model.scorecard.find((item) => item.label === 'Sécurité').status, 'À corriger');
  assert.equal(model.scorecard.find((item) => item.label === 'Sécurité avancée').status, 'À corriger');
  assert.ok(model.topRisks.length >= 5);
  assert.equal(model.topRisks[0].severity, 'Critique');
  assert.ok(model.topRisks.some((risk) => /HSTS|CSP/.test(risk.title)));
  assert.ok(model.topRisks.some((risk) => /email/i.test(risk.title)));
  assert.ok(model.actionPlan.now.length > 0);
  assert.ok(model.actionPlan.next.length > 0);
  assert.ok(model.actionPlan.later.length > 0);
  assert.deepEqual(
    model.scorecard.map((item) => item.label),
    ['Performance', 'Sécurité', 'Sécurité avancée', 'SEO', 'UX Mobile']
  );
  assert.ok(model.methodology.limitations.some((item) => /Non mesuré|indisponible|partiel/i.test(item)));
});

it('buildPdfAuditModel keeps official security scores when missing headers are warnings', () => {
  const model = buildPdfAuditModel({
    url: 'https://cybastiontech.com',
    scanDate: '2026-05-09T03:40:00.000Z',
    score: 85,
    scores: {
      performance: 69,
      security: 90,
      advanced_security: 76,
      seo: 97,
      ux: 94,
    },
    metrics: {
      security: {
        score: 90,
        https_enabled: true,
        ssl_grade: 'A',
        headers_manquants: [
          { header: 'HSTS', message: 'HSTS manquant', status: 'Avertissement' },
          { header: 'CSP', message: 'CSP manquant', status: 'Avertissement' },
          { header: 'X-Frame-Options', message: 'X-Frame-Options manquant', status: 'Avertissement' },
          { header: 'X-Content-Type-Options', message: 'X-Content-Type-Options manquant', status: 'Avertissement' },
          { header: 'Referrer-Policy', message: 'Referrer-Policy manquant', status: 'Avertissement' },
          { header: 'Permissions-Policy', message: 'Permissions-Policy manquant', status: 'Avertissement' },
        ],
        advanced_security_score: 76,
        advanced_checks: [
          { key: 'waf', name: 'Aucun WAF détecté', status: 'Avertissement' },
          { key: 'subdomains', name: 'Sous-domaines', status: 'not_run', description: 'Contrôle bloqué par un bot anti-scan' },
          { key: 'security_txt', name: 'security.txt manquant', status: 'missing' },
          { key: 'cors', name: 'CORS correctement configuré', status: 'OK' },
          {
            key: 'email_advanced',
            name: 'Sécurité email incomplète',
            status: 'critical',
            data: {
              spf: ['v=spf1 include:_spf.google.com ~all'],
              dmarc: [],
              dkim: [],
              missing: ['DMARC', 'DKIM'],
            },
          },
        ],
      },
    },
  });

  assert.equal(model.sections.security.score, 90);
  assert.equal(model.cover.categoryScores.find((item) => item.label === 'Sécurité').score, 90);
  assert.equal(model.scorecard.find((item) => item.label === 'Sécurité').score, 90);
  assert.equal(model.sections.advancedSecurity.score, 76);
  assert.equal(model.cover.categoryScores.find((item) => item.label === 'Sécurité avancée').status, 'À corriger');
  assert.equal(model.scorecard.find((item) => item.label === 'Sécurité avancée').status, 'À corriger');
  assert.notEqual(model.risk.label, 'Élevé');
  assert.doesNotMatch(model.executive.potentialImpact, /critique/i);
  assert.ok(model.methodology.limitations.some((item) => /non scann|bloqu|bot/i.test(item)));
});


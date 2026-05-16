import { describe, expect, it } from 'vitest';

import { buildTemplate } from './pdfTemplate.js';

const sampleScanData = {
  url: 'https://jumia.co',
  scanDate: '2026-05-07T02:45:00.000Z',
  score: 65,
  scores: {
    performance: 67,
    security: 32,
    advanced_security: 82,
    seo: 20,
    ux: 70,
  },
  critical_alerts: [
    {
      title: 'Faille critique détectée',
      message: 'Un header de sécurité majeur est absent.',
      severity: 'Critique',
    },
  ],
  metrics: {
    performance: {
      score: 67,
      lcp: 3100,
      page_weight_mb: 3.2,
      opportunities: [
        {
          title: 'Réduire le JavaScript inutilisé',
          description: 'Supprimez le code non utilisé.',
          savings_ms: 850,
        },
      ],
    },
    security: {
      score: 32,
      https: true,
      missing_headers: [
        {
          header: 'Content-Security-Policy',
          message: 'Header absent',
          severity: 'Critique',
        },
        {
          header: 'X-Frame-Options',
          message: 'Header absent',
          severity: 'Critique',
        },
      ],
      sensitive_files: {
        critical: true,
        alert_message: '.env exposé publiquement',
        exposed_files: ['/.env'],
      },
      http_methods: {
        status: 'pass',
        risky: [],
      },
      csp_quality: {
        status: 'warning',
        score: 42,
        issues: ['unsafe-inline'],
      },
      dnssec: {
        status: 'warning',
        ds_records_found: 0,
        message: 'Aucun DS détecté.',
      },
      cms_detection: {
        primary: 'WordPress',
        detected: [{ name: 'WordPress', confidence: 95 }],
      },
      wordpress_security: {
        applicable: true,
        checks: [{ label: 'xmlrpc.php actif', status: 'warning' }],
      },
      js_libraries: {
        detected: [{ name: 'jQuery', version: '1.12.4' }],
        outdated_or_risky: [{ name: 'jQuery', version: '1.12.4' }],
        status: 'warning',
      },
      sri: {
        external_scripts_count: 1,
        missing_integrity_count: 1,
        status: 'warning',
      },
      compliance_badges: [
        {
          key: 'pci_dss_preparation',
          label: 'Préparation PCI DSS',
          status: 'warning',
          missing_signals: ['CSP solide'],
        },
      ],
      advanced_checks: [
        {
          key: 'subdomains',
          name: 'Indisponible',
          status: 'error',
          description: 'The operation was aborted due to timeout',
        },
        {
          key: 'email_advanced',
          name: 'Sécurité email incomplète',
          status: 'critical',
          description: 'SPF=0 | DMARC=0 | DKIM=0 | MX=1.',
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
      score: 20,
      has_description: false,
      has_canonical: false,
      technical_checks: {
        meta_description_length: {
          status: 'fail',
          value: 0,
          message: 'Meta description absente',
        },
        title_length: {
          status: 'pass',
          value: 42,
          message: 'Longueur title: 42 caractères.',
        },
        h1_unique: {
          status: 'pass',
          value: 1,
          message: 'Un H1 principal est présent.',
        },
        headings_structure: {
          status: 'pass',
          value: 4,
          message: 'H2: 2, H3: 2.',
          h2_count: 2,
          h3_count: 2,
        },
        images_alt: {
          status: 'warning',
          value: 2,
          message: '2 images sans alt.',
          missing_count: 2,
          total: 7,
        },
        lang_attribute: {
          status: 'pass',
          value: 'fr',
          message: 'Langue déclarée: fr.',
        },
        robots_txt: {
          status: 'pass',
          value: 'https://jumia.co/robots.txt',
          message: 'Signal conforme.',
        },
        sitemap_xml: {
          status: 'warning',
          value: null,
          message: 'Sitemap non confirmé.',
        },
        structured_data: {
          status: 'warning',
          value: 0,
          message: 'Aucune donnée structurée JSON-LD détectée.',
          types: [],
        },
        twitter_cards: {
          status: 'warning',
          value: 1,
          message: 'Tags Twitter manquants: twitter:description, twitter:image.',
        },
        favicon: {
          status: 'pass',
          value: 'https://jumia.co/favicon.ico',
          message: 'Favicon détecté.',
        },
      },
      ai_visibility: {
        score: 40,
        checks: [
          {
            key: 'readable_without_js',
            label: 'Contenu lisible sans JS',
            status: 'warning',
            evidence: 'Signal faible',
            business_impact: 'Baisse du taux de clic.',
            recommendation: 'Servir le contenu principal dans le HTML initial.',
          },
        ],
      },
      business_recommendations: [
        {
          problem: 'Meta description absente',
          impact_business: 'Baisse du taux de clic.',
          correction: 'Ajouter une description unique de 120 à 160 caractères.',
          effort: 'Faible',
          priority: 'P2',
        },
      ],
    },
    ux: {
      score: 70,
      issues: [
        {
          message: 'Images sans texte alternatif',
          impact: 'Accessibilité réduite',
          severity: 'À corriger',
        },
      ],
    },
  },
  recommendations: [
    {
      priorite: 1,
      categorie: 'Sécurité',
      action: 'Corriger les headers critiques',
      explication: 'Ajouter une Content-Security-Policy adaptée.',
      impact: 'Réduction du risque de compromission.',
    },
    {
      priorite: 4,
      categorie: 'Performance',
      action: 'Activer le cache navigateur',
      explication: 'Mettre en cache les ressources statiques.',
      impact: 'Navigation plus rapide.',
    },
  ],
};

describe('buildTemplate premium PDF layout', () => {
  it('renders the premium executive PDF structure without prototype wording', () => {
    const html = buildTemplate(sampleScanData);

    expect(html).not.toContain('Alertes à traiter en priorité');
    expect(html).not.toContain('Alertes à surveiller');
    expect(html).not.toContain('<canvas');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('stunning pro');
    expect(html).not.toContain('webisafe-app');
    expect(html).not.toContain('The operation was aborted due to timeout');
    expect(html).not.toContain('SPF=0');
    expect(html).not.toContain('DMARC=0');
    expect(html).not.toContain('DKIM=0');
    expect(html).not.toContain('Check non exécuté');
    expect(html).not.toContain('Non mesuré: LCP');

    expect(html).toContain('premium-shell');
    expect(html).toContain('.page,.cover{position:relative;width:210mm;height:297mm;page-break-after:always;break-after:page;overflow:hidden;background:#020617 linear-gradient');
    expect(html).toContain('box-shadow:0 8px 22px rgba(0,0,0,.18)');
    expect(html).not.toContain('background-size:38px 38px');
    expect(html).toContain('scorecard-card');
    expect(html).toContain('scorecard-status');
    expect(html).toContain('section-score-card');
    expect(html).toContain('scorecard-card section-score-card');
    expect(html).not.toContain('score-bar"><div><p>Score sécurité</p>');
    expect(html).not.toContain('score-bar"><div><p>Score sécurité avancée</p>');
    expect(html).not.toContain('score-bar"><div><p>Score performance</p>');
    expect(html).not.toContain('.scorecard-list article{display:grid;grid-template-columns:.85fr');
    expect(html).toContain('webisafe.vercel.app');
    expect(html).toContain('Contrôle indisponible pendant le scan');
    expect(html).toContain('Contrôle non disponible pendant ce scan');
    expect(html).toContain('Donnée non disponible pendant le scan: FCP.');
    expect(html).toContain('SPF, DMARC et DKIM absents ou non confirmés pendant le scan');
    expect(html).toContain('Rapport d’audit Webisafe');
    expect(html).toContain('Verdict exécutif');
    expect(html).toContain('Top 5 risques &amp; priorités');
    expect(html).toContain('Plan d’action 7 / 30 / 90 jours');
    expect(html).toContain('Scorecard détaillée');
    expect(html).toContain('Méthodologie &amp; limites');
    expect(html).toContain('Visibilité IA &amp; conformité préparatoire');
    expect(html).toContain('Préparation PCI DSS');
    expect(html).toContain('Longueur title');
    expect(html).toContain('Meta description');
    expect(html).toContain('H1 unique');
    expect(html).toContain('Structure H2/H3');
    expect(html).toContain('Images avec alt');
    expect(html).toContain('Langue HTML');
    expect(html).toContain('Robots.txt');
    expect(html).toContain('Sitemap XML');
    expect(html).toContain('Données structurées');
    expect(html).toContain('Twitter Cards');
    expect(html).toContain('Favicon');
    expect(html).toContain('Méthodes HTTP');
    expect(html).toContain('DNSSEC');
    expect(html).toContain('CMS');
    expect(html).toContain('JavaScript');
    expect(html).toContain('SRI');
    expect(html).toContain('WordPress');
    expect(html).toContain('Aucun DS détecté.');
    expect(html).toContain('WordPress');
    expect(html).toContain('jQuery');
    expect(html).toContain('Meta description absente');
    expect(html).toContain('Baisse du taux de clic.');
    expect(html).toContain('Scan passif non intrusif');
    expect(html).toContain('Page 1 /');
    expect(html).toContain('Page 10 /');
    expect(html).toContain('Page 11 /');
    expect(html).toContain('Page 12 /');
    expect(html).toContain('Page 13 /');
    expect(html).toContain('Configurer Content-Security-Policy');
    expect(html).toContain('Glossaire technique');
    expect(html).toContain('Comparaison avant/après correction');
    expect(html).toContain('Notre équipe recommande');
    expect(html).toContain('Verdict de notre équipe');
    expect(html).not.toContain('Webisafe recommande un sprint');
    expect(html).not.toContain('Verdict Webisafe');
    expect(html).toContain('class="qr-code"');
    expect(html).toContain('section-icon-wrap');
    expect(html).toContain('brand-mark');
    expect(html).toContain('Largest Contentful Paint');
    expect(html).toContain('Content Security Policy');
    expect(html).toContain('DomainKeys Identified Mail');
  });
});

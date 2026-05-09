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
    expect(html).not.toContain('webisafe.vercel.app');
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
    expect(html).toContain('webisafe.app');
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
    expect(html).toContain('Scan passif non intrusif');
    expect(html).toContain('Page 1 /');
    expect(html).toContain('Page 10 /');
    expect(html).toContain('Configurer Content-Security-Policy');
  });
});

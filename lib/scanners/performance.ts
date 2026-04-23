import type { ScanContext, ScannerResult } from '../types.ts';
import { bytesToMb, clampScore, ratingFromThresholds } from '../utils/validators.ts';
import { createFinding, createRecommendation, fetchPageSpeedBundle } from './shared.ts';

type AuditMap = Record<string, {
  score?: number;
  numericValue?: number;
  displayValue?: string;
  title?: string;
  description?: string;
  details?: {
    overallSavingsBytes?: number;
    overallSavingsMs?: number;
    items?: unknown[];
    [key: string]: unknown;
  };
}>;

function toNumericAudit(audits: AuditMap | undefined, key: string): number {
  return Number(audits?.[key]?.numericValue || 0);
}

function toSavingsBytes(audits: AuditMap | undefined, key: string): number {
  return Number(audits?.[key]?.details?.overallSavingsBytes || 0);
}

function countNetworkRequests(audits: AuditMap | undefined): number {
  const details = audits?.['network-requests']?.details as { items?: unknown[] } | undefined;
  return Array.isArray(details?.items) ? details.items.length : 0;
}

function metricScore(value: number, good: number, medium: number): number {
  const rating = ratingFromThresholds(value, good, medium);
  if (rating === 'good') return 100;
  if (rating === 'needs_improvement') return 60;
  return 25;
}

function pageWeightScore(totalMb: number): number {
  if (totalMb < 1) return 100;
  if (totalMb < 2) return 70;
  if (totalMb < 5) return 40;
  return 10;
}

function hasOpportunity(audits: AuditMap | undefined, key: string, threshold = 0.9): boolean {
  const score = audits?.[key]?.score;
  return typeof score === 'number' && score < threshold;
}

const AUDIT_METADATA: Record<string, {
  difficulte: 'facile' | 'moyenne' | 'difficile';
  temps: string;
  impact_financier: number;
}> = {
  'uses-optimized-images': { difficulte: 'facile', temps: '2 à 4 heures', impact_financier: 150000 },
  'render-blocking-resources': { difficulte: 'moyenne', temps: '4 à 8 heures', impact_financier: 200000 },
  'unused-javascript': { difficulte: 'moyenne', temps: '1 journée', impact_financier: 180000 },
  'unused-css-rules': { difficulte: 'moyenne', temps: '4 à 6 heures', impact_financier: 120000 },
  'uses-text-compression': { difficulte: 'facile', temps: '1 à 2 heures', impact_financier: 90000 },
  'uses-long-cache-ttl': { difficulte: 'facile', temps: '1 heure', impact_financier: 80000 },
  'offscreen-images': { difficulte: 'facile', temps: '2 heures', impact_financier: 110000 },
  'unminified-javascript': { difficulte: 'facile', temps: '1 heure', impact_financier: 70000 },
  'unminified-css': { difficulte: 'facile', temps: '1 heure', impact_financier: 60000 },
  'modern-image-formats': { difficulte: 'facile', temps: '2 à 3 heures', impact_financier: 140000 },
  'server-response-time': { difficulte: 'difficile', temps: '1 à 2 jours', impact_financier: 300000 },
  'redirects': { difficulte: 'moyenne', temps: '2 heures', impact_financier: 100000 },
};

export function buildPerformanceAnalysis(
  pageSpeedBundle: NonNullable<Awaited<ReturnType<typeof fetchPageSpeedBundle>>>,
  context: ScanContext
) {
  const findings: ReturnType<typeof createFinding>[] = [];
  const recommendations: ReturnType<typeof createRecommendation>[] = [];

  const audits = pageSpeedBundle.lighthouseResult?.audits as AuditMap | undefined;
  const categories = pageSpeedBundle.lighthouseResult?.categories;

  const pageSpeedScore = clampScore(Number(categories?.performance?.score || 0) * 100);

  const lcp = toNumericAudit(audits, 'largest-contentful-paint');
  const fid = toNumericAudit(audits, 'max-potential-fid');
  const cls = toNumericAudit(audits, 'cumulative-layout-shift');
  const fcp = toNumericAudit(audits, 'first-contentful-paint');
  const tti = toNumericAudit(audits, 'interactive');
  const speedIndex = toNumericAudit(audits, 'speed-index');
  const totalBlockingTime = toNumericAudit(audits, 'total-blocking-time');
  const totalByteWeight = toNumericAudit(audits, 'total-byte-weight');

  const totalPageMb = bytesToMb(totalByteWeight);
  const imageSavingsMb = bytesToMb(toSavingsBytes(audits, 'uses-optimized-images'));
  const jsSavingsMb = bytesToMb(toSavingsBytes(audits, 'unused-javascript'));
  const cssSavingsMb = bytesToMb(toSavingsBytes(audits, 'unused-css-rules'));
  const networkRequests = countNetworkRequests(audits);

  const lcpScore = metricScore(lcp, 2500, 4000);
  const clsScore = metricScore(cls, 0.1, 0.25);
  const fcpScore = metricScore(fcp, 1800, 3000);
  const coreWebVitalsScore = clampScore((lcpScore + clsScore + fcpScore) / 3);
  const poidsPageScore = pageWeightScore(totalPageMb);
  const score = clampScore(pageSpeedScore * 0.4 + coreWebVitalsScore * 0.4 + poidsPageScore * 0.2);

  if (lcp > 2500) {
    findings.push(createFinding({
      categorie: 'performance',
      titre: 'Temps de rendu principal (LCP) suboptimal',
      severite: lcp > 4000 ? 'majeure' : 'mineure',
      description: audits?.['largest-contentful-paint']?.description
        || `Le contenu principal met ${Math.round(lcp)} ms à s'afficher.`,
      impact_business: 'Réduit le taux de conversion et augmente le taux de rebond.',
      impact_financier_fcfa: lcp > 4000 ? 180000 : 90000,
    }));
  }

  if (cls > 0.1) {
    findings.push(createFinding({
      categorie: 'performance',
      titre: 'Instabilité de la mise en page (CLS)',
      severite: cls > 0.25 ? 'majeure' : 'mineure',
      description: audits?.['cumulative-layout-shift']?.description
        || `La page subit des décalages visuels (${cls.toFixed(3)}).`,
      impact_business: 'Frustre les utilisateurs et provoque des erreurs de clic involontaires.',
      impact_financier_fcfa: cls > 0.25 ? 120000 : 60000,
    }));
  }

  if (totalBlockingTime > 200) {
    findings.push(createFinding({
      categorie: 'performance',
      titre: 'Interactivité retardée (TBT)',
      severite: totalBlockingTime > 600 ? 'critique' : 'majeure',
      description: audits?.['total-blocking-time']?.description
        || `JavaScript bloque le thread principal pendant ${Math.round(totalBlockingTime)} ms.`,
      impact_business: 'Donne une impression de lenteur et de non-réponse aux interactions.',
      impact_financier_fcfa: 160000,
    }));
  }

  const opportunities = Object.entries(audits || {})
    .filter(([_key, audit]) => {
      const savingsBytes = Number(audit.details?.overallSavingsBytes || 0);
      const savingsMs = Number(audit.details?.overallSavingsMs || 0);
      return (
        typeof audit.score === 'number' &&
        audit.score < 0.9 &&
        (savingsBytes + savingsMs) > 0
      );
    })
    .sort((a, b) => {
      const savingsA = Number(a[1].details?.overallSavingsBytes || 0)
        + Number(a[1].details?.overallSavingsMs || 0) * 1000;
      const savingsB = Number(b[1].details?.overallSavingsBytes || 0)
        + Number(b[1].details?.overallSavingsMs || 0) * 1000;
      return savingsB - savingsA;
    })
    .slice(0, 6);

  opportunities.forEach(([key, audit]) => {
    const meta = AUDIT_METADATA[key]
      || { difficulte: 'moyenne' as const, temps: '4 heures', impact_financier: 100000 };

    findings.push(createFinding({
      categorie: 'performance',
      titre: audit.title || key,
      severite: (audit.score || 0) < 0.5 ? 'majeure' : 'mineure',
      description: audit.description || 'Audit de performance Google PageSpeed.',
      impact_business: 'Impact direct sur la vitesse de chargement et le score SEO Google.',
      impact_financier_fcfa: meta.impact_financier,
      description_courte: audit.title,
    }));

    recommendations.push(createRecommendation({
      ordre: recommendations.length + 1,
      categorie: 'performance',
      action: audit.title || key,
      justification: audit.description || 'Optimisation recommandée par Lighthouse.',
      impact: `Gain potentiel de ${audit.displayValue || 'performance'}.`,
      difficulte: meta.difficulte,
      temps: meta.temps,
    }));
  });

  findings.sort((a, b) => {
    const rank: Record<string, number> = { mineure: 1, majeure: 2, critique: 3 };
    return rank[a.severite] - rank[b.severite];
  });

  return {
    score,
    metrics: {
      pageSpeed_score: pageSpeedScore,
      core_web_vitals: {
        lcp: { value: Math.round(lcp), rating: ratingFromThresholds(lcp, 2500, 4000) },
        cls: { value: Number(cls.toFixed(3)), rating: ratingFromThresholds(cls, 0.1, 0.25) },
        fcp: { value: Math.round(fcp), rating: ratingFromThresholds(fcp, 1800, 3000) },
        fid: { value: Math.round(fid), rating: ratingFromThresholds(fid, 100, 300) },
        ttfb: {
          value: Math.round(context.snapshot?.ttfbMs || 0),
          rating: ratingFromThresholds(context.snapshot?.ttfbMs || 0, 800, 1800),
        },
      },
      poids_page: {
        total_mb: totalPageMb,
        images_mb: imageSavingsMb,
        js_mb: jsSavingsMb,
        css_mb: cssSavingsMb,
        nb_requetes: networkRequests,
      },
      temps_chargement: {
        tti: Math.round(tti),
        speed_index: Math.round(speedIndex),
        tbt: Math.round(totalBlockingTime),
      },
      recommendations: {
        uses_optimized_images: hasOpportunity(audits, 'uses-optimized-images'),
        uses_long_cache_ttl: hasOpportunity(audits, 'uses-long-cache-ttl'),
        uses_text_compression: hasOpportunity(audits, 'uses-text-compression'),
        render_blocking_resources: hasOpportunity(audits, 'render-blocking-resources'),
        unused_javascript: hasOpportunity(audits, 'unused-javascript'),
        unused_css_rules: hasOpportunity(audits, 'unused-css-rules'),
      },
    },
    findings,
    recommendations,
  };
}

export async function scanPerformance(context: ScanContext): Promise<ScannerResult> {
  const apisUsed: string[] = [];
  const apisFailed: string[] = [];
  const partial = false;

  if (!context.externalApis.pageSpeedKey) {
    throw new Error('API_KEY_MISSING');
  }

  const pageSpeedBundle = await fetchPageSpeedBundle(
    context.target.normalizedUrl,
    context.externalApis.pageSpeedKey,
    ['performance', 'seo', 'accessibility', 'best-practices']
  );

  if (!pageSpeedBundle) {
    throw new Error('SCAN_FAILED_PAGESPEED');
  }

  apisUsed.push('PageSpeed');
  const analysis = buildPerformanceAnalysis(pageSpeedBundle, context);

  return {
    score: analysis.score,
    metrics: analysis.metrics,
    findings: analysis.findings,
    recommendations: analysis.recommendations,
    apisUsed,
    apisFailed,
    partial,
  };
}
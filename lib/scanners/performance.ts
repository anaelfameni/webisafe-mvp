import type { ScanContext, ScannerResult } from '../types.ts';
import { bytesToMb, clampScore, ratingFromThresholds } from '../utils/validators.ts';
import { createFinding, createRecommendation, fetchPageSpeedBundle } from './shared.ts';

function toNumericAudit(audits: Record<string, { numericValue?: number; details?: Record<string, unknown> }> | undefined, key: string) {
  return Number(audits?.[key]?.numericValue || 0);
}

function toSavingsBytes(audits: Record<string, { details?: Record<string, unknown> }> | undefined, key: string) {
  const details = audits?.[key]?.details as { overallSavingsBytes?: number } | undefined;
  return Number(details?.overallSavingsBytes || 0);
}

function countNetworkRequests(audits: Record<string, { details?: Record<string, unknown> }> | undefined) {
  const details = audits?.['network-requests']?.details as { items?: unknown[] } | undefined;
  return Array.isArray(details?.items) ? details.items.length : 0;
}

function metricScore(value: number, good: number, medium: number, inverse = false) {
  const rating = ratingFromThresholds(value, good, medium, inverse);
  if (rating === 'good') return 100;
  if (rating === 'needs_improvement') return 60;
  return 25;
}

function pageWeightScore(totalMb: number) {
  if (totalMb < 1) return 100;
  if (totalMb < 2) return 70;
  if (totalMb < 5) return 40;
  return 10;
}

export async function scanPerformance(context: ScanContext): Promise<ScannerResult> {
  const findings = [];
  const recommendations = [];
  const apisUsed: string[] = [];
  const apisFailed: string[] = [];
  let partial = false;

  const pageSpeed = await fetchPageSpeedBundle(
    context.target.normalizedUrl,
    context.externalApis.pageSpeedKey,
    ['performance', 'seo', 'accessibility', 'best-practices']
  );

  if (pageSpeed) {
    apisUsed.push('PageSpeed');
  } else {
    apisFailed.push('PageSpeed');
    partial = true;
  }

  const audits = pageSpeed?.lighthouseResult?.audits;
  const categories = pageSpeed?.lighthouseResult?.categories;
  const pageSpeedScore = clampScore(Number(categories?.performance?.score || 0) * 100);

  const lcp = toNumericAudit(audits, 'largest-contentful-paint') || context.snapshot?.ttfbMs || 0;
  const fid = toNumericAudit(audits, 'max-potential-fid');
  const cls = toNumericAudit(audits, 'cumulative-layout-shift');
  const fcp = toNumericAudit(audits, 'first-contentful-paint') || context.snapshot?.ttfbMs || 0;
  const tti = toNumericAudit(audits, 'interactive');
  const speedIndex = toNumericAudit(audits, 'speed-index');
  const totalBlockingTime = toNumericAudit(audits, 'total-blocking-time');
  const totalByteWeight = toNumericAudit(audits, 'total-byte-weight') || context.snapshot?.htmlBytes || 0;
  const totalPageMb = bytesToMb(totalByteWeight);
  const imageSavingsMb = bytesToMb(toSavingsBytes(audits, 'uses-optimized-images'));
  const jsSavingsMb = bytesToMb(toSavingsBytes(audits, 'unminified-javascript'));
  const cssSavingsMb = bytesToMb(toSavingsBytes(audits, 'unminified-css'));
  const networkRequests = countNetworkRequests(audits) || context.snapshot?.externalResourceCount || 0;

  const lcpScore = metricScore(lcp, 2500, 4000);
  const clsScore = metricScore(cls, 0.1, 0.25);
  const fcpScore = metricScore(fcp, 1800, 3000);
  const coreWebVitalsScore = clampScore((lcpScore + clsScore + fcpScore) / 3);
  const poidsPageScore = pageWeightScore(totalPageMb);

  const directFallbackScore = clampScore(
    (context.snapshot ? 25 : 0) +
      (context.snapshot && context.snapshot.ttfbMs < 1000 ? 35 : 10) +
      (context.snapshot && context.snapshot.externalResourceCount < 50 ? 25 : 10) +
      (context.snapshot && context.snapshot.htmlBytes < 500_000 ? 15 : 5)
  );

  const score = clampScore(
    (pageSpeedScore || directFallbackScore) * 0.4 +
      coreWebVitalsScore * 0.4 +
      poidsPageScore * 0.2
  );

  if (lcp > 4000) {
    findings.push(
      createFinding({
        categorie: 'performance',
        titre: 'Temps de rendu principal trop long',
        severite: 'majeure',
        description: `Le Largest Contentful Paint atteint ${Math.round(lcp)} ms, au-dessus des 2500 ms recommandés. Cela retarde l’affichage du contenu principal et augmente fortement le risque d’abandon sur mobile.`,
        impact_business: 'Des visiteurs quittent la page avant de voir votre offre, ce qui réduit les conversions et la qualité perçue du site.',
        impact_financier_fcfa: 180000,
        description_courte: `LCP de ${Math.round(lcp)} ms : le contenu principal met trop de temps à s’afficher.`,
        temps_resolution: '1 à 2 jours',
      })
    );
  }

  if (totalPageMb > 3 || networkRequests > 100) {
    findings.push(
      createFinding({
        categorie: 'performance',
        titre: 'Page trop lourde pour un usage mobile confortable',
        severite: totalPageMb > 5 ? 'critique' : 'majeure',
        description: `La page pèse environ ${totalPageMb} MB et déclenche ${networkRequests} requêtes. Cette charge pénalise la vitesse sur les réseaux mobiles et augmente le coût de navigation pour vos visiteurs.`,
        impact_business: 'Une page lourde dégrade l’expérience utilisateur, le référencement mobile et la conversion sur les connexions faibles.',
        impact_financier_fcfa: 220000,
        description_courte: `Poids estimé ${totalPageMb} MB et ${networkRequests} requêtes : le chargement mobile est pénalisé.`,
        difficulte: 'moyenne',
      })
    );
  }

  if (imageSavingsMb > 0.2) {
    recommendations.push(
      createRecommendation({
        ordre: 1,
        categorie: 'performance',
        action: 'Compresser et redimensionner les images principales',
        justification: `Lighthouse estime un gain d’environ ${imageSavingsMb} MB sur les images non optimisées.`,
        impact: 'Performance +10 à +20 points et chargement plus rapide sur mobile.',
        difficulte: 'facile',
        temps: '2 à 4 heures',
        etapes: [
          'Identifier les images hero, bannières et vignettes les plus lourdes.',
          'Convertir les formats compatibles vers WebP ou AVIF.',
          'Servir des tailles adaptées selon les breakpoints mobile et desktop.',
        ],
      })
    );
  }

  if (jsSavingsMb > 0.1 || cssSavingsMb > 0.05) {
    recommendations.push(
      createRecommendation({
        ordre: 2,
        categorie: 'performance',
        action: 'Minifier et différer les assets CSS/JavaScript non critiques',
        justification: 'Une partie des scripts et feuilles de style peut encore être optimisée ou chargée après le contenu principal.',
        impact: 'Réduction du Total Blocking Time et amélioration de l’interactivité.',
        difficulte: 'moyenne',
        temps: '1 journée',
        etapes: [
          'Activer la minification côté build ou CDN.',
          'Différer les scripts tiers non critiques.',
          'Extraire le CSS critique utile au premier écran.',
        ],
      })
    );
  }

  return {
    score,
    metrics: {
      pageSpeed_score: pageSpeedScore || directFallbackScore,
      core_web_vitals: {
        lcp: { value: Math.round(lcp), rating: ratingFromThresholds(lcp, 2500, 4000) },
        cls: { value: Number(cls.toFixed(3)), rating: ratingFromThresholds(cls, 0.1, 0.25) },
        fcp: { value: Math.round(fcp), rating: ratingFromThresholds(fcp, 1800, 3000) },
        fid: { value: Math.round(fid), rating: ratingFromThresholds(fid, 100, 300) },
        ttfb: { value: Math.round(context.snapshot?.ttfbMs || 0), rating: ratingFromThresholds(context.snapshot?.ttfbMs || 0, 800, 1800) },
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
        uses_optimized_images: Boolean(audits?.['uses-optimized-images']),
        uses_long_cache_ttl: Boolean(audits?.['uses-long-cache-ttl']),
        uses_text_compression: Boolean(audits?.['uses-text-compression']),
      },
    },
    findings,
    recommendations,
    apisUsed,
    apisFailed,
    partial,
  };
}

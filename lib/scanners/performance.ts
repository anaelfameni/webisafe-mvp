import type { ScanContext, ScannerResult } from '../types.ts';
import { bytesToMb, clampScore, ratingFromThresholds } from '../utils/validators.ts';
import { createFinding, createRecommendation, fetchPageSpeedBundle } from './shared.ts';

function toNumericAudit(
  audits: Record<string, { numericValue?: number; details?: Record<string, unknown> }> | undefined,
  key: string
) {
  return Number(audits?.[key]?.numericValue || 0);
}

function toSavingsBytes(
  audits: Record<string, { details?: Record<string, unknown> }> | undefined,
  key: string
) {
  const details = audits?.[key]?.details as { overallSavingsBytes?: number } | undefined;
  return Number(details?.overallSavingsBytes || 0);
}

function toSavingsMs(
  audits: Record<string, { details?: Record<string, unknown> }> | undefined,
  key: string
) {
  const details = audits?.[key]?.details as { overallSavingsMs?: number } | undefined;
  return Number(details?.overallSavingsMs || 0);
}

function countNetworkRequests(
  audits: Record<string, { details?: Record<string, unknown> }> | undefined
) {
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

function auditScore(audits: Record<string, { score?: number }> | undefined, key: string) {
  const raw = audits?.[key]?.score;
  return typeof raw === 'number' ? raw : null;
}

function hasOpportunity(
  audits: Record<string, { score?: number }> | undefined,
  key: string,
  threshold = 0.9
) {
  const score = auditScore(audits, key);
  return score !== null && score < threshold;
}

export function buildPerformanceAnalysis(
  pageSpeedBundle: NonNullable<Awaited<ReturnType<typeof fetchPageSpeedBundle>>>,
  context: ScanContext
) {
  const findings = [];
  const recommendations = [];
  const audits = pageSpeedBundle.lighthouseResult?.audits;
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
  const compressionSavingsMb = bytesToMb(toSavingsBytes(audits, 'uses-text-compression'));
  const renderBlockingSavingsMs = toSavingsMs(audits, 'render-blocking-resources');
  const networkRequests = countNetworkRequests(audits);

  const lcpScore = metricScore(lcp, 2500, 4000);
  const clsScore = metricScore(cls, 0.1, 0.25);
  const fcpScore = metricScore(fcp, 1800, 3000);
  const coreWebVitalsScore = clampScore((lcpScore + clsScore + fcpScore) / 3);
  const poidsPageScore = pageWeightScore(totalPageMb);
  const score = clampScore(pageSpeedScore * 0.4 + coreWebVitalsScore * 0.4 + poidsPageScore * 0.2);

  if (lcp > 4000) {
    findings.push(
      createFinding({
        categorie: 'performance',
        titre: 'Temps de rendu principal trop long',
        severite: lcp > 6000 ? 'critique' : 'majeure',
        description: `Le Largest Contentful Paint atteint ${Math.round(lcp)} ms, au-dessus des 2500 ms recommandés. Le contenu principal apparaît trop tard pour une expérience mobile confortable.`,
        impact_business: 'Les visiteurs attendent trop longtemps avant de voir le contenu clé, ce qui réduit l’engagement et la conversion.',
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
        titre: 'Page trop lourde pour un usage mobile fluide',
        severite: totalPageMb > 5 || networkRequests > 140 ? 'critique' : 'majeure',
        description: `PageSpeed remonte environ ${totalPageMb} MB transférés et ${networkRequests} requêtes réseau. Cette charge ralentit fortement le chargement sur mobile.`,
        impact_business: 'Une page lourde dégrade l’expérience utilisateur, le référencement mobile et la probabilité de conversion.',
        impact_financier_fcfa: 220000,
        description_courte: `${totalPageMb} MB et ${networkRequests} requêtes : le chargement mobile est pénalisé.`,
      })
    );
  }

  if (totalBlockingTime > 300) {
    findings.push(
      createFinding({
        categorie: 'performance',
        titre: 'JavaScript bloque trop longtemps l’interaction',
        severite: totalBlockingTime > 600 ? 'critique' : 'majeure',
        description: `Le Total Blocking Time atteint ${Math.round(totalBlockingTime)} ms. La page devient interactive trop tard à cause de tâches JavaScript trop longues.`,
        impact_business: 'Les utilisateurs ont l’impression que le site ne répond pas, ce qui augmente les abandons sur les parcours clés.',
        impact_financier_fcfa: 160000,
        description_courte: `TBT de ${Math.round(totalBlockingTime)} ms : l’interactivité est retardée.`,
      })
    );
  }

  if (cls > 0.25) {
    findings.push(
      createFinding({
        categorie: 'performance',
        titre: 'Mise en page instable pendant le chargement',
        severite: 'majeure',
        description: `Le Cumulative Layout Shift atteint ${cls.toFixed(3)}, au-dessus du seuil recommandé de 0.1. Des éléments se déplacent pendant le chargement.`,
        impact_business: 'Les décalages visuels créent des clics involontaires et diminuent la confiance dans le site.',
        impact_financier_fcfa: 90000,
        description_courte: `CLS de ${cls.toFixed(3)} : la page manque de stabilité visuelle.`,
      })
    );
  }

  if (hasOpportunity(audits, 'uses-optimized-images') && imageSavingsMb > 0.1) {
    recommendations.push(
      createRecommendation({
        ordre: recommendations.length + 1,
        categorie: 'performance',
        action: 'Optimiser les images les plus lourdes',
        justification: `PageSpeed estime un gain d’environ ${imageSavingsMb} MB sur les images non optimisées.`,
        impact: 'Chargement plus rapide, meilleur score mobile et affichage principal accéléré.',
        difficulte: 'facile',
        temps: '2 à 4 heures',
        etapes: [
          'Identifier les images responsables du plus gros poids transféré.',
          'Convertir les formats compatibles vers WebP ou AVIF.',
          'Servir des tailles adaptées selon mobile et desktop.',
        ],
      })
    );
  }

  if (hasOpportunity(audits, 'render-blocking-resources') && renderBlockingSavingsMs > 0) {
    recommendations.push(
      createRecommendation({
        ordre: recommendations.length + 1,
        categorie: 'performance',
        action: 'Supprimer les ressources bloquantes au rendu',
        justification: `PageSpeed estime un gain d’environ ${Math.round(renderBlockingSavingsMs)} ms si les CSS/JS bloquants sont différés ou allégés.`,
        impact: 'Le contenu visible apparaît plus vite et le FCP/LCP s’améliorent.',
        difficulte: 'moyenne',
        temps: '4 à 8 heures',
        etapes: [
          'Repérer les feuilles CSS et scripts chargés avant le premier écran.',
          'Différer ou charger en async les scripts non critiques.',
          'Extraire le CSS critique du premier écran.',
        ],
      })
    );
  }

  if (hasOpportunity(audits, 'unused-javascript') && jsSavingsMb > 0.05) {
    recommendations.push(
      createRecommendation({
        ordre: recommendations.length + 1,
        categorie: 'performance',
        action: 'Réduire le JavaScript inutilisé',
        justification: `PageSpeed estime environ ${jsSavingsMb} MB de JavaScript évitable.`,
        impact: 'Moins de blocage main-thread et une interactivité plus rapide.',
        difficulte: 'moyenne',
        temps: '1 journée',
        etapes: [
          'Identifier les bundles ou librairies chargés mais peu utilisés.',
          'Découper le code par page ou par fonctionnalité.',
          'Retirer les scripts tiers non essentiels au premier affichage.',
        ],
      })
    );
  }

  if (hasOpportunity(audits, 'unused-css-rules') && cssSavingsMb > 0.02) {
    recommendations.push(
      createRecommendation({
        ordre: recommendations.length + 1,
        categorie: 'performance',
        action: 'Nettoyer le CSS inutilisé',
        justification: `PageSpeed remonte environ ${cssSavingsMb} MB de CSS non utilisé.`,
        impact: 'Moins de données téléchargées et rendu plus rapide.',
        difficulte: 'moyenne',
        temps: '4 à 6 heures',
        etapes: [
          'Repérer les styles jamais utilisés dans les écrans critiques.',
          'Supprimer ou purger le CSS mort au build.',
          'Vérifier les régressions visuelles sur les pages principales.',
        ],
      })
    );
  }

  if (hasOpportunity(audits, 'uses-text-compression') && compressionSavingsMb > 0.02) {
    recommendations.push(
      createRecommendation({
        ordre: recommendations.length + 1,
        categorie: 'performance',
        action: 'Activer la compression texte HTTP',
        justification: `PageSpeed estime un gain d’environ ${compressionSavingsMb} MB sur les ressources texte non compressées.`,
        impact: 'Réduction du poids transféré pour HTML, CSS et JavaScript.',
        difficulte: 'facile',
        temps: '1 à 2 heures',
        etapes: [
          'Activer Brotli ou Gzip sur le CDN ou le serveur.',
          'Vérifier la compression sur HTML, CSS, JS et JSON.',
          'Contrôler que les en-têtes de cache restent cohérents après déploiement.',
        ],
      })
    );
  }

  if (hasOpportunity(audits, 'uses-long-cache-ttl')) {
    recommendations.push(
      createRecommendation({
        ordre: recommendations.length + 1,
        categorie: 'performance',
        action: 'Allonger la durée de cache des assets statiques',
        justification: 'PageSpeed signale que certains fichiers statiques ne bénéficient pas encore d’un cache long efficace.',
        impact: 'Accélération des visites récurrentes et baisse de la consommation de bande passante.',
        difficulte: 'facile',
        temps: '1 à 2 heures',
        etapes: [
          'Ajouter des en-têtes de cache longs sur les assets versionnés.',
          'Conserver une stratégie d’invalidation via hash de fichiers.',
          'Vérifier les headers sur les images, polices et bundles JS/CSS.',
        ],
      })
    );
  }

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
  let partial = false;

  if (!context.externalApis.pageSpeedKey) {
    throw new Error('API_KEY_MISSING');
  }

  const pageSpeedBundle = await fetchPageSpeedBundle(
    context.target.normalizedUrl,
    context.externalApis.pageSpeedKey,
    ['performance', 'seo', 'accessibility', 'best-practices']
  );

  if (!pageSpeedBundle) {
    apisFailed.push('PageSpeed');
    partial = true;
    return {
      score: 0,
      metrics: {
        pageSpeed_score: 0,
        core_web_vitals: {},
        poids_page: {},
        temps_chargement: {},
        recommendations: {},
      },
      findings: [],
      recommendations: [],
      apisUsed,
      apisFailed,
      partial,
    };
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

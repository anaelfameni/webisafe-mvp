// Calcul des scores pondérés Webisafe
// Performance: 30% | Sécurité: 35% | SEO: 20% | UX: 15%

export function calculateGlobalScore(scores) {
  const weights = {
    performance: 0.30,
    security: 0.35,
    seo: 0.20,
    ux: 0.15,
  };

  return Math.round(
    (scores.performance || 0) * weights.performance +
    (scores.security || 0) * weights.security +
    (scores.seo || 0) * weights.seo +
    (scores.ux || 0) * weights.ux
  );
}

export function calculatePerformanceScore(data) {
  let score = 100;

  // LCP (Largest Contentful Paint)
  const lcp = parseFloat(data.lcp);
  if (lcp > 4) score -= 30;
  else if (lcp > 2.5) score -= 15;

  // FID (First Input Delay)
  const fid = parseInt(data.fid);
  if (fid > 300) score -= 25;
  else if (fid > 100) score -= 10;

  // CLS (Cumulative Layout Shift)
  const cls = parseFloat(data.cls);
  if (cls > 0.25) score -= 25;
  else if (cls > 0.1) score -= 10;

  // Temps de chargement
  const loadTime = parseFloat(data.loadTime);
  if (loadTime > 5) score -= 20;
  else if (loadTime > 3) score -= 10;

  return Math.max(0, Math.min(100, score));
}

export function calculateSecurityScore(data) {
  let score = 100;

  if (!data.https) score -= 30;
  if (!data.sslValid) score -= 20;
  if (!data.hsts) score -= 15;
  if (!data.csp) score -= 15;
  if (!data.xframe) score -= 10;
  if (!data.xContentType) score -= 5;
  if (data.malware) score -= 30;
  if (data.blacklisted) score -= 20;

  return Math.max(0, Math.min(100, score));
}

export function calculateSEOScore(data) {
  let score = 100;

  if (!data.titleOk) score -= 20;
  if (!data.descriptionOk) score -= 15;
  if (data.altMissing > 5) score -= 15;
  else if (data.altMissing > 0) score -= 5;
  if (!data.sitemapOk) score -= 10;
  if (!data.robotsTxtOk) score -= 10;
  if (!data.h1Ok) score -= 10;
  if (!data.canonicalOk) score -= 5;
  if (!data.ogTagsOk) score -= 5;

  return Math.max(0, Math.min(100, score));
}

export function calculateUXScore(data) {
  let score = 100;

  if (!data.responsive) score -= 30;
  if (!data.textReadable) score -= 15;
  if (!data.tapTargets) score -= 15;
  if (!data.viewport) score -= 20;
  if (!data.fontSizeOk) score -= 10;

  const tti = parseFloat(data.timeToInteractive);
  if (tti > 5) score -= 20;
  else if (tti > 3) score -= 10;

  return Math.max(0, Math.min(100, score));
}

export function getScoreColor(score) {
  if (score >= 75) return '#22C55E';
  if (score >= 50) return '#F97316';
  return '#EF4444';
}

export function getScoreLabel(score) {
  if (score >= 90) return 'Excellent !';
  if (score >= 75) return 'Bon état général';
  if (score >= 50) return 'À améliorer';
  return 'Améliorations urgentes nécessaires';
}

export function getScoreBadge(score) {
  if (score >= 75) return { text: 'Bon', color: 'text-success bg-success/10' };
  if (score >= 50) return { text: 'Moyen', color: 'text-warning bg-warning/10' };
  return { text: 'Critique', color: 'text-danger bg-danger/10' };
}

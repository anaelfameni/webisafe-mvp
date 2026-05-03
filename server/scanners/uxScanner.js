import * as cheerio from 'cheerio';

const TIMEOUT_MS = 10_000;
const SEVERITY_WEIGHT = { high: 3, medium: 2, low: 1 };

// ── Scanner principal exporté (appelé par scanController) ─────────────────────
export async function scanUXMobile(url, _psKey) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Webisafe/1.0)' },
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const html = await response.text();
    const $ = cheerio.load(html);

    const analysis = deepUXAnalysis($, html, response.headers);

    // Compatibilité avec l'ancien format attendu par scanController
    return {
      score: analysis.score,
      accessibility_score: analysis.score,
      tap_targets_ok: !analysis.issues.some(i => i.type === 'inputs_without_labels'),
      issues: analysis.issues,
      issues_count: analysis.issues_count,
      critical_count: analysis.critical_count,
      medium_count: analysis.medium_count,
      low_count: analysis.low_count,
      grade: analysis.grade,
      partial: false,
    };
  } catch (err) {
    console.error('[UX] scanUXMobile failed:', err.message);
    return {
      score: null,
      accessibility_score: null,
      tap_targets_ok: null,
      issues: [],
      issues_count: 0,
      critical_count: 0,
      partial: true,
    };
  } finally {
    clearTimeout(timer);
  }
}

// ── Analyse UX profonde (réutilisable) ────────────────────────────────────────
export function deepUXAnalysis($, html, headers) {
  const issues = [];

  // ── 1. Inputs email mal typés ──────────────────────────────────────────────
  const emailInputsWrong = $(
    'input[name*="email"], input[placeholder*="mail"], input[placeholder*="email"]'
  ).not('[type="email"]').length;

  if (emailInputsWrong > 0) {
    issues.push({
      type: 'input_type',
      severity: 'medium',
      message: `${emailInputsWrong} champ(s) email sans type="email" — clavier mobile non optimisé`,
      impact: 'Abandon de formulaire +25%',
    });
  }

  // ── 2. Zoom utilisateur bloqué ─────────────────────────────────────────────
  const viewport = $('meta[name="viewport"]').attr('content') || '';
  if (
    viewport.includes('user-scalable=no') ||
    viewport.includes('user-scalable=0') ||
    viewport.includes('maximum-scale=1')
  ) {
    issues.push({
      type: 'zoom_blocked',
      severity: 'high',
      message: 'Zoom utilisateur bloqué — Pénalité Google + problème accessibilité',
      impact: 'Pénalité SEO mobile confirmée par Google',
    });
  }

  // ── 3. Landmarks ARIA manquants ────────────────────────────────────────────
  const hasMain = $('main, [role="main"]').length > 0;
  const hasNav = $('nav, [role="navigation"]').length > 0;
  const hasHeader = $('header, [role="banner"]').length > 0;

  if (!hasMain || !hasNav || !hasHeader) {
    const missing = [
      !hasMain && '<main>',
      !hasNav && '<nav>',
      !hasHeader && '<header>',
    ].filter(Boolean).join(', ');

    issues.push({
      type: 'aria_landmarks',
      severity: 'medium',
      message: `Structure ARIA incomplète (${missing} manquant(s)) — Site non navigable pour les malvoyants`,
      impact: "15% de l'audience potentiellement exclue",
    });
  }

  // ── 4. Images sans attribut alt ────────────────────────────────────────────
  const totalImages = $('img').length;
  const imagesWithoutAlt = $('img:not([alt]), img[alt=""]').length;

  if (imagesWithoutAlt > 0 && totalImages > 0) {
    issues.push({
      type: 'missing_alt',
      severity: 'medium',
      message: `${imagesWithoutAlt}/${totalImages} images sans attribut alt — SEO et accessibilité dégradés`,
      impact: 'Google ne peut pas indexer le contenu de vos images',
    });
  }

  // ── 5. Compression Brotli / Gzip ──────────────────────────────────────────
  const encoding = headers.get
    ? headers.get('content-encoding')
    : headers['content-encoding'];

  if (!encoding || (!encoding.includes('br') && !encoding.includes('gzip'))) {
    issues.push({
      type: 'no_compression',
      severity: 'high',
      message: 'Compression Brotli/Gzip désactivée — Vous envoyez 3x plus de données',
      impact: 'Temps de chargement x3 sur connexion mobile africaine',
    });
  }

  // ── 6. Mixed Content (HTTP dans page HTTPS) ────────────────────────────────
  const mixedContent =
    $('img[src^="http://"]').length +
    $('script[src^="http://"]').length +
    $('link[href^="http://"]').length +
    $('iframe[src^="http://"]').length;

  if (mixedContent > 0) {
    issues.push({
      type: 'mixed_content',
      severity: 'high',
      message: `${mixedContent} ressource(s) chargée(s) en HTTP non sécurisé sur votre site HTTPS`,
      impact: 'Blocage navigateur + pénalité SEO',
    });
  }

  // ── 7. Format d'images obsolètes ──────────────────────────────────────────
  const oldFormatImages = $(
    'img[src$=".jpg"], img[src$=".jpeg"], img[src$=".png"], img[src$=".gif"]'
  ).length;
  const modernImages = $(
    'img[src$=".webp"], img[src$=".avif"], picture source[type="image/webp"], picture source[type="image/avif"]'
  ).length;

  if (oldFormatImages > 0 && modernImages === 0) {
    issues.push({
      type: 'image_format',
      severity: 'medium',
      message: `${oldFormatImages} image(s) en format obsolète (JPG/PNG/GIF) — Passez en WebP`,
      impact: 'Réduction du poids de -50 à -80%',
    });
  }

  // ── 8. Viewport manquant ──────────────────────────────────────────────────
  if (!viewport) {
    issues.push({
      type: 'missing_viewport',
      severity: 'high',
      message: 'Balise meta viewport absente — Site non responsive sur mobile',
      impact: 'Pénalité Google Mobile-First Indexing',
    });
  }

  // ── 9. Title et meta description ──────────────────────────────────────────
  const titleText = $('title').text().trim();
  const metaDesc = $('meta[name="description"]').attr('content') || '';

  if (!titleText) {
    issues.push({
      type: 'missing_title',
      severity: 'high',
      message: "Balise <title> absente — Indispensable pour le SEO et l'onglet navigateur",
      impact: 'Pénalité SEO majeure',
    });
  } else if (titleText.length < 10 || titleText.length > 70) {
    issues.push({
      type: 'title_length',
      severity: 'low',
      message: `Title de ${titleText.length} caractères (idéal : 10-70)`,
      impact: 'Affichage tronqué dans Google',
    });
  }

  if (!metaDesc) {
    issues.push({
      type: 'missing_meta_description',
      severity: 'medium',
      message: 'Meta description absente — Taux de clic Google dégradé',
      impact: 'Perte de visiteurs organiques estimée -30%',
    });
  }

  // ── 10. Formulaires sans labels ───────────────────────────────────────────
  const inputsWithoutLabel = $(
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"])'
  ).filter((_, el) => {
    const id = $(el).attr('id');
    return !id || $(`label[for="${id}"]`).length === 0;
  }).length;

  if (inputsWithoutLabel > 0) {
    issues.push({
      type: 'inputs_without_labels',
      severity: 'medium',
      message: `${inputsWithoutLabel} champ(s) de formulaire sans label associé — Inaccessible aux lecteurs d'écran`,
      impact: 'Non-conformité WCAG 2.1 niveau AA',
    });
  }

  // ── Calcul du score ──────────────────────────────────────────────────────
  const uxScore = computeUXScore(issues);

  return {
    score: uxScore,
    issues,
    issues_count: issues.length,
    critical_count: issues.filter(i => i.severity === 'high').length,
    medium_count: issues.filter(i => i.severity === 'medium').length,
    low_count: issues.filter(i => i.severity === 'low').length,
    grade:
      uxScore >= 90 ? 'A' :
        uxScore >= 75 ? 'B' :
          uxScore >= 55 ? 'C' :
            uxScore >= 35 ? 'D' : 'F',
  };
}

function computeUXScore(issues) {
  if (issues.length === 0) return 100;

  const totalPenalty = issues.reduce((acc, issue) => {
    const weight = SEVERITY_WEIGHT[issue.severity] ?? 1;
    return acc + (weight * 5);
  }, 0);

  return Math.max(0, Math.min(100, 100 - totalPenalty));
}
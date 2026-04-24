import * as cheerio from 'cheerio';

const TIMEOUT_MS = 8_000;

/**
 * Analyse SEO on-page alignée sur les audits PageSpeed Insights.
 * Audits couverts : title, meta description, canonical, viewport, robots,
 *                   liens crawlables, texte de lien, Open Graph (bonus).
 *
 * Pondération :
 *   Title        20 pts  — présence suffit (PageSpeed ne pénalise pas la longueur)
 *   Description  20 pts  — présence suffit
 *   Canonical    10 pts  — audit PageSpeed : document-has-canonical
 *   Indexabilité 15 pts  — meta robots noindex → FAIL
 *   Liens crawl. 15 pts  — audit crawlable-anchors (href valide, pas javascript:)
 *   Texte liens   5 pts  — audit link-text (textes non génériques)
 *   Viewport     10 pts  — signal UX/mobile, pas SEO pur pour PageSpeed
 *   H1            3 pts  — bonus léger
 *   Open Graph    2 pts  — bonus social
 *   ─────────────────────
 *   Total max   100 pts
 */
export async function scanSEO(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let html;
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Webisafe/1.0; +https://webisafe.ci)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} lors du fetch HTML`);
    }

    html = await response.text();
  } finally {
    clearTimeout(timer);
  }

  const $ = cheerio.load(html);

  // ── 1. Title (présence suffit — PageSpeed ne pénalise pas la longueur) ────
  const title = $('title').first().text().trim();
  const hasTitle = title.length > 0;

  // ── 2. Meta description (présence suffit) ────────────────────────────────
  const description = $('meta[name="description"]').attr('content')?.trim() ?? '';
  const hasDescription = description.length > 0;

  // ── 3. Canonical (audit PageSpeed : document-has-canonical) ──────────────
  const canonical = $('link[rel="canonical"]').attr('href')?.trim() ?? '';
  const hasCanonical = canonical.length > 0;

  // ── 4. Viewport ──────────────────────────────────────────────────────────
  const hasViewport = $('meta[name="viewport"]').length > 0;

  // ── 5. Robots — page non bloquée ─────────────────────────────────────────
  const metaRobots = $('meta[name="robots"]').attr('content')?.toLowerCase() ?? '';
  const isIndexable = !metaRobots.includes('noindex');

  // ── 6. Liens crawlables (audit crawlable-anchors) ─────────────────────────
  // PageSpeed vérifie que les <a> ont un href valide (pas javascript:void, pas #)
  let totalLinks = 0;
  let crawlableLinks = 0;

  $('a').each((_, el) => {
    const href = $(el).attr('href')?.trim() ?? '';
    totalLinks++;
    if (
      href &&
      !href.startsWith('javascript:') &&
      !href.startsWith('#') &&
      href !== ''
    ) {
      crawlableLinks++;
    }
  });

  const crawlableRatio = totalLinks > 0
    ? crawlableLinks / totalLinks
    : 1; // pas de liens = pas de problème

  // ── 7. Texte de lien descriptif (audit link-text) ─────────────────────────
  // PageSpeed pénalise les liens "cliquez ici", "lire plus", "ici", etc.
  const GENERIC_LINK_TEXTS = new Set([
    'cliquez ici', 'click here', 'ici', 'here', 'lire plus', 'read more',
    'plus', 'more', 'voir', 'voir plus', 'suite', 'en savoir plus',
    'learn more', 'link', 'lien', '...', 'continuer',
  ]);

  let totalLinksWithText = 0;
  let descriptiveLinks = 0;

  $('a').each((_, el) => {
    const text = $(el).text().trim().toLowerCase();
    if (text.length > 0) {
      totalLinksWithText++;
      if (!GENERIC_LINK_TEXTS.has(text) && text.length >= 3) {
        descriptiveLinks++;
      }
    }
  });

  const descriptiveRatio = totalLinksWithText > 0
    ? descriptiveLinks / totalLinksWithText
    : 1;

  // ── 8. H1 (bonus léger — PageSpeed n'en fait pas un critère fort) ─────────
  const h1Count = $('h1').length;

  // ── 9. Open Graph (bonus social — ignoré par PageSpeed) ───────────────────
  const ogTitle = $('meta[property="og:title"]').attr('content');
  const ogDescription = $('meta[property="og:description"]').attr('content');
  const ogImage = $('meta[property="og:image"]').attr('content');
  const hasOpenGraph = Boolean(ogTitle && ogDescription && ogImage);

  // ── Calcul du score aligné PageSpeed ──────────────────────────────────────
  let score = 0;

  // Title — présence (20 pts)
  if (hasTitle) score += 20;

  // Meta description — présence (20 pts)
  if (hasDescription) score += 20;

  // Canonical — présence (10 pts)
  if (hasCanonical) score += 10;

  // Viewport (10 pts) — signal UX, pas SEO pur pour PageSpeed
  if (hasViewport) score += 10;

  // Indexabilité robots (15 pts)
  if (isIndexable) score += 15;

  // Liens crawlables (15 pts)
  if (crawlableRatio >= 0.90) score += 15;
  else if (crawlableRatio >= 0.75) score += 10;
  else if (crawlableRatio >= 0.50) score += 5;

  // Texte de lien descriptif (5 pts)
  if (descriptiveRatio >= 0.90) score += 5;
  else if (descriptiveRatio >= 0.70) score += 3;

  // H1 (3 pts bonus)
  if (h1Count === 1) score += 3;
  else if (h1Count > 1) score += 1;

  // Open Graph (2 pts bonus social)
  if (hasOpenGraph) score += 2;

  return {
    score: Math.min(100, score),
    has_title: hasTitle,
    title_length: title.length,
    has_description: hasDescription,
    desc_length: description.length,
    h1_count: h1Count,
    has_viewport: hasViewport,
    has_open_graph: hasOpenGraph,
    has_canonical: hasCanonical,
    is_indexable: isIndexable,
    crawlable_ratio: Math.round(crawlableRatio * 100),
    descriptive_ratio: Math.round(descriptiveRatio * 100),
  };
}
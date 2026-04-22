import * as cheerio from 'cheerio';

const TIMEOUT_MS = 8_000;

// Longueurs recommandées Google
const TITLE_MIN       = 30;
const TITLE_MAX       = 65;
const DESC_MIN        = 70;
const DESC_MAX        = 160;

/**
 * Analyse SEO on-page via scraping HTML + Cheerio.
 * @param {string} url - URL à analyser
 * @returns {{ score, has_title, title_length, has_description, desc_length,
 *             h1_count, has_viewport, has_open_graph }}
 */
export async function scanSEO(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let html;
  try {
    const response = await fetch(url, {
      signal  : controller.signal,
      headers : {
        // User-agent réaliste pour éviter les blocages bot
        'User-Agent': 'Mozilla/5.0 (compatible; Webisafe/1.0; +https://webisafe.ci)',
        'Accept'    : 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
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

  // ── Balises de base ───────────────────────────────────────────────────────
  const title       = $('title').first().text().trim();
  const description = $('meta[name="description"]').attr('content')?.trim() ?? '';
  const h1Count     = $('h1').length;
  const hasViewport = $('meta[name="viewport"]').length > 0;

  // ── Open Graph ────────────────────────────────────────────────────────────
  const ogTitle       = $('meta[property="og:title"]').attr('content');
  const ogDescription = $('meta[property="og:description"]').attr('content');
  const ogImage       = $('meta[property="og:image"]').attr('content');
  const hasOpenGraph  = Boolean(ogTitle && ogDescription && ogImage);

  // ── Calcul du score sur 100 ───────────────────────────────────────────────
  let score = 0;

  // Title (25 pts)
  if (title.length >= TITLE_MIN && title.length <= TITLE_MAX) score += 25;
  else if (title.length > 0) score += 12; // présent mais mal calibré

  // Description (25 pts)
  if (description.length >= DESC_MIN && description.length <= DESC_MAX) score += 25;
  else if (description.length > 0) score += 12;

  // H1 (20 pts) — exactement 1 H1 est idéal
  if (h1Count === 1) score += 20;
  else if (h1Count > 1) score += 10; // plusieurs H1 = mauvaise pratique
  // 0 H1 → 0 point

  // Viewport (15 pts) — critique pour le ranking mobile
  if (hasViewport) score += 15;

  // Open Graph (15 pts)
  if (hasOpenGraph) score += 15;

  return {
    score : Math.min(100, score),
    has_title      : title.length > 0,
    title_length   : title.length,
    has_description: description.length > 0,
    desc_length    : description.length,
    h1_count       : h1Count,
    has_viewport   : hasViewport,
    has_open_graph : hasOpenGraph,
  };
}

import * as cheerio from 'cheerio';
import { analyzeSeoSignals, buildSeoBusinessRecommendations } from '../../lib/audit/seoSignals.js';
import { detectProtectionPage } from '../utils/protectionDetection.js';
import { getPageSpeedScore } from './pageSpeedScanner.js';

const TIMEOUT_MS = 8_000;
const PAGESPEED_TIMEOUT_MS = 25_000;
const PAGESPEED_BASE = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

async function fetchPageSpeedSeoScore(url, apiKey) {
  if (!apiKey) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PAGESPEED_TIMEOUT_MS);

  try {
    const apiUrl =
      `${PAGESPEED_BASE}` +
      `?url=${encodeURIComponent(url)}` +
      `&strategy=mobile` +
      `&category=seo` +
      `&key=${apiKey}`;

    const response = await fetch(apiUrl, { signal: controller.signal });
    if (!response.ok) throw new Error(`PageSpeed HTTP ${response.status}`);

    const data = await response.json();
    const score = data?.lighthouseResult?.categories?.seo?.score;

    if (typeof score !== 'number') {
      throw new Error('PageSpeed SEO score absent');
    }

    return Math.round(score * 100);
  } catch (err) {
    console.warn('[SEO] PageSpeed SEO indisponible:', err.message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchProbeText(url, timeoutMs = 3_500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Webisafe/1.0; +https://webisafe.vercel.app)',
        'Accept': 'text/plain,text/html,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    const text = await response.text().catch(() => '');
    return { ok: response.ok, status: response.status, text, url };
  } catch (error) {
    return { ok: false, status: 0, text: '', url, error: error?.name || 'FETCH_ERROR' };
  } finally {
    clearTimeout(timer);
  }
}

async function probeSeoResources(pageUrl) {
  const origin = new URL(pageUrl).origin;
  const robotsUrl = `${origin}/robots.txt`;
  const robotsResponse = await fetchProbeText(robotsUrl);
  const robotsText = robotsResponse.text || '';
  const sitemapMatch = robotsText.match(/^\s*Sitemap:\s*(\S+)/im);
  const sitemapCandidates = [sitemapMatch?.[1], `${origin}/sitemap.xml`].filter(Boolean);
  let sitemap = { status: 'warning', url: null, discovered_from: null };

  for (const candidate of sitemapCandidates) {
    const sitemapResponse = await fetchProbeText(candidate);
    if (sitemapResponse.ok && /<urlset|<sitemapindex/i.test(sitemapResponse.text)) {
      sitemap = {
        status: 'pass',
        url: candidate,
        discovered_from: candidate === sitemapMatch?.[1] ? 'robots' : 'common_path',
      };
      break;
    }
  }

  const faviconUrl = `${origin}/favicon.ico`;
  const faviconResponse = await fetchProbeText(faviconUrl);

  return {
    robots: {
      status: robotsResponse.ok ? 'pass' : 'warning',
      url: robotsResponse.ok ? robotsUrl : null,
      blocking: /disallow:\s*\//i.test(robotsText) && !/allow:\s*\//i.test(robotsText),
    },
    sitemap,
    favicon: {
      status: faviconResponse.ok ? 'pass' : 'warning',
      url: faviconResponse.ok ? faviconUrl : null,
    },
  };
}

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
export async function scanSEO(url, apiKey, pageSpeedData = null) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let html;
  let responseHeaders = null;
  let finalUrl = url;
  let fetchError = null;
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Webisafe/1.0; +https://webisafe.vercel.app)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} lors du fetch HTML`);
    }

    responseHeaders = response.headers;
    finalUrl = response.url || url;
    html = await response.text();
  } catch (err) {
    fetchError = err;
  } finally {
    clearTimeout(timer);
  }

  if (!html) {
    const pageSpeedScore = pageSpeedData
      ? getPageSpeedScore(pageSpeedData, 'seo')
      : await fetchPageSpeedSeoScore(url, apiKey);
    return {
      score: pageSpeedScore,
      local_score: null,
      pageSpeed_score: pageSpeedScore,
      has_title: null,
      title_length: null,
      has_description: null,
      desc_length: null,
      h1_count: null,
      has_viewport: null,
      has_open_graph: null,
      has_canonical: null,
      is_indexable: null,
      crawlable_ratio: null,
      descriptive_ratio: null,
      partial: true,
      partial_reason: fetchError?.message || 'html_unavailable',
      protection_detected: null,
      html_snippet: '',
    };
  }

  const protection = detectProtectionPage({ url, finalUrl, html, headers: responseHeaders });
  if (protection.detected) {
    const pageSpeedScore = pageSpeedData
      ? getPageSpeedScore(pageSpeedData, 'seo')
      : await fetchPageSpeedSeoScore(url, apiKey);
    return {
      score: pageSpeedScore,
      local_score: null,
      pageSpeed_score: pageSpeedScore,
      has_title: null,
      title_length: null,
      has_description: null,
      desc_length: null,
      h1_count: null,
      has_viewport: null,
      has_open_graph: null,
      has_canonical: null,
      is_indexable: null,
      crawlable_ratio: null,
      descriptive_ratio: null,
      partial: true,
      partial_reason: 'protection_detected',
      protection_detected: protection,
      html_snippet: html.slice(0, 60_000),
    };
  }

  const $ = cheerio.load(html);
  const seoProbes = await probeSeoResources(url).catch(() => ({
    robots: { status: 'error', url: null, blocking: null },
    sitemap: { status: 'error', url: null, discovered_from: null },
    favicon: { status: 'error', url: null },
  }));
  const seoSignals = analyzeSeoSignals($, url, seoProbes);
  const businessRecommendations = buildSeoBusinessRecommendations(seoSignals);

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

  const localScore = Math.min(100, score);
  const pageSpeedScore = pageSpeedData
    ? getPageSpeedScore(pageSpeedData, 'seo')
    : await fetchPageSpeedSeoScore(url, apiKey);

  return {
    score: pageSpeedScore ?? localScore,
    local_score: localScore,
    pageSpeed_score: pageSpeedScore,
    has_title: hasTitle,
    title_length: title.length,
    has_description: hasDescription,
    desc_length: description.length,
    description_length: description.length,
    h1_count: h1Count,
    h2_count: seoSignals.technical_checks.headings_structure.h2_count,
    h3_count: seoSignals.technical_checks.headings_structure.h3_count,
    images_without_alt: seoSignals.technical_checks.images_alt.missing_count,
    has_lang: seoSignals.technical_checks.lang_attribute.status === 'pass',
    has_structured_data: seoSignals.technical_checks.structured_data.status === 'pass',
    has_twitter_cards: seoSignals.technical_checks.twitter_cards.status === 'pass',
    has_favicon: seoSignals.technical_checks.favicon.status === 'pass',
    has_viewport: hasViewport,
    has_open_graph: hasOpenGraph,
    has_canonical: hasCanonical,
    is_indexable: isIndexable,
    has_sitemap: seoSignals.technical_checks.sitemap_xml.status === 'pass',
    technical_checks: seoSignals.technical_checks,
    ai_visibility: seoSignals.ai_visibility,
    business_recommendations: businessRecommendations,
    crawlable_ratio: Math.round(crawlableRatio * 100),
    descriptive_ratio: Math.round(descriptiveRatio * 100),
    partial: pageSpeedScore === null && Boolean(apiKey),
    protection_detected: null,
    html_snippet: html.slice(0, 60_000),
  };
}

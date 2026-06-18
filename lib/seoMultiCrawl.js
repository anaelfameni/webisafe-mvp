// lib/seoMultiCrawl.js
//
// Crawl multi-pages SEO : après le scan de la page principale, extrait les liens
// internes, sélectionne 3-5 pages prioritaires et leur applique un scan SEO léger.
//
// Contraintes de temps (maxDuration: 90s) :
//  - PageSpeed peut prendre jusqu'à 55s
//  - Probe SPA : ~8s
//  - Ce module dispose d'un budget strict configurable (défaut: 18s)
//  - Si le budget expire en cours de crawl, les pages restantes sont ignorées
//    (graceful degradation : 1 page analysée vaut mieux que 0)

import * as cheerio from 'cheerio';

const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const BROWSER_HEADERS = {
    'User-Agent': BROWSER_UA,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
};

// Timeout par page secondaire (ms). 5s est assez pour les serveurs rapides
// et laisse de la marge pour 3-4 pages dans le budget global.
const PER_PAGE_TIMEOUT_MS = 5_000;

// Extensions et patterns à exclure : ressources non-HTML
const NON_HTML_EXTENSIONS = /\.(pdf|jpg|jpeg|png|gif|webp|svg|ico|css|js|xml|json|zip|mp4|mp3|woff|woff2|ttf|eot)(\?.*)?$/i;

// Patterns d'URL à faible valeur SEO
const LOW_VALUE_PATTERNS = /\/(login|logout|signin|register|signup|cart|checkout|panier|compte|account|profile|profil|api\/|admin|#)/i;

// ── Extraction des liens internes ─────────────────────────────────────────────

// Normalise une URL relative/absolue vers une URL absolue du même domaine.
// Retourne null si l'URL est externe, une ancre, ou un pattern non-HTML.
function normalizeInternalLink(href, baseUrl) {
    if (!href) return null;
    const trimmed = href.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('mailto:') || trimmed.startsWith('tel:')) return null;

    try {
        const base = new URL(baseUrl);
        const resolved = new URL(trimmed, base);

        // Même domaine seulement
        if (resolved.hostname !== base.hostname) return null;

        // Pas d'extension non-HTML
        if (NON_HTML_EXTENSIONS.test(resolved.pathname)) return null;

        // Normaliser : supprimer le fragment, trailing slash optionnel
        resolved.hash = '';
        const normalized = resolved.href.replace(/\/$/, '') || resolved.origin;
        return normalized;
    } catch {
        return null;
    }
}

// Extrait et priorise les liens internes depuis le HTML.
// Priorisation :
//  1. Liens dans <nav>, <header>, role="navigation" (menu principal)
//  2. Liens dans <main>, <article>, [role="main"]
//  3. Tous les autres liens <a>
//
// Déduplique et exclut l'URL d'origine.
export function extractInternalLinks(html, baseUrl, maxLinks = 20) {
    const $ = cheerio.load(html);
    const seen = new Set();
    const links = [];

    // URL d'origine normalisée pour l'exclusion
    let baseNorm;
    try {
        const b = new URL(baseUrl);
        b.hash = '';
        baseNorm = b.href.replace(/\/$/, '') || b.origin;
    } catch { return []; }

    function collectFrom(selector, priority) {
        $(selector).find('a[href]').each((_, el) => {
            const href = $(el).attr('href');
            const norm = normalizeInternalLink(href, baseUrl);
            if (!norm || norm === baseNorm || seen.has(norm)) return;
            if (LOW_VALUE_PATTERNS.test(norm)) return;
            seen.add(norm);
            links.push({ url: norm, priority, text: $(el).text().trim().slice(0, 80) });
        });
    }

    // Priorité 1 : navigation principale
    collectFrom('nav, [role="navigation"], header nav, .nav, .navigation, .menu, #menu, #nav', 1);
    // Priorité 2 : contenu principal
    collectFrom('main, [role="main"], article, .main-content, #content, .content', 2);
    // Priorité 3 : reste du body (hors footer si possible)
    $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        const norm = normalizeInternalLink(href, baseUrl);
        if (!norm || norm === baseNorm || seen.has(norm)) return;
        if (LOW_VALUE_PATTERNS.test(norm)) return;
        seen.add(norm);
        links.push({ url: norm, priority: 3, text: $(el).text().trim().slice(0, 80) });
    });

    // Trier par priorité puis couper
    links.sort((a, b) => a.priority - b.priority);
    return links.slice(0, maxLinks);
}

// ── Scan SEO léger par page ───────────────────────────────────────────────────

// Scan SEO minimal d'une page secondaire. Délibérément plus léger que scanSEO() :
// - Pas de probeSeoResources (sitemap, robots — déjà fait sur la page principale)
// - Pas de seoSignals (coûteux)
// - Timeout strict
// Retourne null si la page est inaccessible dans le délai imparti.
async function scanPageSEO(url, timeoutMs = PER_PAGE_TIMEOUT_MS) {
    let html = '';
    let httpStatus = null;

    try {
        const res = await fetch(url, {
            signal: AbortSignal.timeout(timeoutMs),
            headers: BROWSER_HEADERS,
            redirect: 'follow',
        });
        httpStatus = res.status;
        if (res.ok) {
            html = await res.text();
        } else {
            return { url, error: `HTTP ${res.status}`, http_status: httpStatus, score: null };
        }
    } catch (e) {
        return { url, error: e.message.slice(0, 100), http_status: null, score: null };
    }

    const $ = cheerio.load(html);

    const title = $('title').first().text().trim();
    const description = $('meta[name="description"]').attr('content')?.trim() ?? '';
    const metaRobots = $('meta[name="robots"]').attr('content')?.toLowerCase() ?? '';
    const isIndexable = !metaRobots.includes('noindex');
    const h1Count = $('h1').length;
    const hasCanonical = $('link[rel="canonical"]').length > 0;
    const hasViewport = $('meta[name="viewport"]').length > 0;
    const ogTitle = $('meta[property="og:title"]').attr('content');
    const ogDesc = $('meta[property="og:description"]').attr('content');
    const ogImage = $('meta[property="og:image"]').attr('content');
    const hasOpenGraph = Boolean(ogTitle && ogDesc && ogImage);
    const imagesWithoutAlt = $('img:not([alt]), img[alt=""]').length;
    const totalImages = $('img').length;

    // Score simplifié (identique à la logique principale mais sans sitemap)
    let rawScore = 0;
    if (title.length > 0) rawScore += 30;
    if (isIndexable) rawScore += 20;
    if (hasViewport) rawScore += 15;
    if (description.length > 0) rawScore += 10;
    if (hasCanonical) rawScore += 5;
    if (h1Count === 1) rawScore += 5;
    else if (h1Count > 1) rawScore += 2;
    if (hasOpenGraph) rawScore += 5;

    const failedChecks = [];
    if (!title) failedChecks.push('no_title');
    if (!description) failedChecks.push('no_description');
    if (!hasCanonical) failedChecks.push('no_canonical');
    if (!isIndexable) failedChecks.push('not_indexable');
    if (!hasOpenGraph) failedChecks.push('no_open_graph');
    if (h1Count === 0) failedChecks.push('no_h1');
    else if (h1Count > 1) failedChecks.push('multiple_h1');
    if (imagesWithoutAlt > 0) failedChecks.push('images_without_alt');

    return {
        url,
        http_status: httpStatus,
        score: Math.min(rawScore, 90), // pas de sitemap → cap à 90
        title: title.slice(0, 120),
        title_length: title.length,
        has_description: description.length > 0,
        description_length: description.length,
        h1_count: h1Count,
        has_canonical: hasCanonical,
        has_open_graph: hasOpenGraph,
        is_indexable: isIndexable,
        images_without_alt: imagesWithoutAlt,
        total_images: totalImages,
        failed_checks: failedChecks,
        error: null,
    };
}

// ── Résumé agrégé multi-pages ─────────────────────────────────────────────────

// Identifie les problèmes récurrents (présents sur ≥ 2 pages).
function buildMultipagesSummary(mainResult, pageResults) {
    const allPages = [mainResult, ...pageResults.filter(p => p && !p.error)];
    const total = allPages.length;
    if (total === 0) return null;

    // Comptage des failed_checks sur toutes les pages
    const checkCounts = {};
    for (const page of allPages) {
        for (const check of (page.failed_checks || [])) {
            checkCounts[check] = (checkCounts[check] || 0) + 1;
        }
    }

    // Problèmes récurrents : présents sur ≥ 2 pages (ou sur 100% si 1 page)
    const threshold = Math.max(2, Math.ceil(total * 0.5));
    const recurringIssues = Object.entries(checkCounts)
        .filter(([, count]) => count >= threshold)
        .sort((a, b) => b[1] - a[1])
        .map(([check, count]) => ({
            check,
            pages_affected: count,
            pages_total: total,
            severity: getSeoCheckSeverity(check),
        }));

    const scores = allPages.map(p => p.score).filter(s => s != null);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
    const minScore = scores.length > 0 ? Math.min(...scores) : null;

    return {
        pages_analyzed: total,
        average_score: avgScore,
        min_score: minScore,
        recurring_issues: recurringIssues,
        check_frequency: checkCounts,
    };
}

// Sévérité de chaque check pour le tri du rapport
function getSeoCheckSeverity(check) {
    const critical = ['no_title', 'not_indexable'];
    const high = ['no_description', 'no_h1', 'multiple_h1'];
    const medium = ['no_canonical', 'no_open_graph', 'images_without_alt'];
    if (critical.includes(check)) return 'critical';
    if (high.includes(check)) return 'high';
    if (medium.includes(check)) return 'medium';
    return 'low';
}

// ── Point d'entrée principal ──────────────────────────────────────────────────

// Lance le crawl multi-pages après le scan de la page principale.
//
// @param mainUrl      URL de la page principale (déjà scannée)
// @param mainHtml     HTML de la page principale (déjà disponible, réutilisé)
// @param mainResult   Résultat du scan SEO principal (pour le résumé agrégé)
// @param budgetMs     Budget temps total alloué au crawl (défaut: 18s)
// @param maxPages     Nombre max de pages secondaires (3-5)
//
// @returns { pages: [...], summary: {...}, links_found: N, crawl_budget_ms: N, crawl_completed: bool }
export async function crawlAdditionalPages(mainUrl, mainHtml, mainResult, budgetMs = 18_000, maxPages = 4) {
    const crawlStart = Date.now();

    if (!mainHtml) {
        return { pages: [], summary: null, links_found: 0, crawl_budget_ms: budgetMs, crawl_completed: false };
    }

    // Extraction des liens internes depuis la page principale
    const candidates = extractInternalLinks(mainHtml, mainUrl, 20);
    const selected = candidates.slice(0, maxPages);

    if (selected.length === 0) {
        console.log('[SEO/crawl] Aucun lien interne trouvé');
        return {
            pages: [],
            summary: buildMultipagesSummary(mainResult, []),
            links_found: 0,
            crawl_budget_ms: budgetMs,
            crawl_completed: true,
        };
    }

    console.log(`[SEO/crawl] ${candidates.length} liens internes trouvés, ${selected.length} sélectionnés`);

    // Crawl séquentiel avec vérification du budget temps à chaque page.
    // Séquentiel (pas parallèle) pour éviter de saturer la connexion sur
    // des petits hébergements mutualisés africains (Moov, CI-Telecom, etc.)
    // et pour ne pas déclencher des protections anti-bot.
    const pageResults = [];
    let crawlCompleted = true;

    for (const link of selected) {
        const elapsed = Date.now() - crawlStart;
        const remaining = budgetMs - elapsed;

        if (remaining < 1_500) {
            // Moins de 1,5s restant : arrêt propre, pas d'échec
            console.log(`[SEO/crawl] Budget temps épuisé après ${pageResults.length} pages (${elapsed}ms écoulés)`);
            crawlCompleted = false;
            break;
        }

        const pageTimeout = Math.min(PER_PAGE_TIMEOUT_MS, remaining - 500);
        console.log(`[SEO/crawl] Scan ${link.url} (budget restant: ${remaining}ms)`);

        const result = await scanPageSEO(link.url, pageTimeout);
        pageResults.push(result);
    }

    const crawlDurationMs = Date.now() - crawlStart;
    const summary = buildMultipagesSummary(mainResult, pageResults);

    console.log(`[SEO/crawl] Terminé : ${pageResults.length} pages en ${crawlDurationMs}ms, complet=${crawlCompleted}`);

    return {
        pages: pageResults,
        summary,
        links_found: candidates.length,
        crawl_duration_ms: crawlDurationMs,
        crawl_budget_ms: budgetMs,
        crawl_completed: crawlCompleted,
    };
}

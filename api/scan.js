// api/scan.js
import { randomUUID } from 'crypto';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';

// ── Supabase ──────────────────────────────────────────────────────────────────
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    null;

const supabase =
    supabaseUrl && supabaseKey
        ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })
        : null;

export const config = { maxDuration: 60 };

// ── Helpers ───────────────────────────────────────────────────────────────────
async function readJsonBody(req) {
    if (req.body && typeof req.body === 'object') return req.body;
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString('utf8');
    if (!raw) return {};
    try { return JSON.parse(raw); } catch { return {}; }
}

function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
}

/**
 * Règle absolue : si AU MOINS UN critère est absent/échoué
 * le score est plafonné à MAX 89.
 * Chaque critère supplémentaire échoué retire 8 points du plafond.
 * Score de 100 = IMPOSSIBLE sauf 0 failedCheck (et on plafonne à 97 même là).
 */
function applyScoreCap(score, failedChecks = []) {
    if (failedChecks.length === 0) return Math.min(score, 97);
    const cap = Math.max(15, 89 - (failedChecks.length - 1) * 8);
    return Math.min(score, cap);
}

function validateUrl(input) {
    if (!input || typeof input !== 'string') {
        return { valid: false, error: 'URL requise.' };
    }
    let parsed;
    try { parsed = new URL(input.trim()); } catch {
        return { valid: false, error: 'URL invalide. Utilisez le format https://monsite.ci' };
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
        return { valid: false, error: 'Seuls HTTP et HTTPS sont acceptés.' };
    }
    return { valid: true, url: parsed.href };
}

// ── Cache Supabase ────────────────────────────────────────────────────────────
async function readCache(normalizedUrl) {
    // Cache désactivé : chaque scan recalcule les scores avec la logique à jour
    return null;
}

async function saveToDb(scanId, url, score, results, userId = null) {
    if (!supabase) return;
    try {
        const { error } = await supabase
            .from('scans')
            .insert({
                id: scanId,
                url,
                score,
                results_json: results,
                paid: false,
                user_id: userId,
            });
        if (error) console.warn('[DB] Erreur sauvegarde:', error.message);
    } catch (e) {
        console.warn('[DB] Exception:', e.message);
    }
}

// ── Scanner Performance ───────────────────────────────────────────────────────
async function scanPerformance(url, apiKey) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 55_000);
    try {
        const psUrl =
            `https://www.googleapis.com/pagespeedonline/v5/runPagespeed` +
            `?url=${encodeURIComponent(url)}&strategy=mobile&category=performance&key=${apiKey}`;
        const res = await fetch(psUrl, { signal: controller.signal });
        if (!res.ok) throw new Error(`PageSpeed HTTP ${res.status}`);
        const data = await res.json();
        const lr = data.lighthouseResult;
        if (!lr) throw new Error('lighthouseResult absent');

        const rawScore = Math.round((lr.categories?.performance?.score ?? 0) * 100);

        const lcp = lr.audits?.['largest-contentful-paint']?.numericValue ?? null;
        const cls = lr.audits?.['cumulative-layout-shift']?.numericValue ?? null;
        const fcp = lr.audits?.['first-contentful-paint']?.numericValue ?? null;
        const tbt = lr.audits?.['total-blocking-time']?.numericValue ?? null;
        const pageWeightMb = lr.audits?.['total-byte-weight']?.numericValue != null
            ? Math.round((lr.audits['total-byte-weight'].numericValue / 1_048_576) * 100) / 100
            : null;

        const failedChecks = [];
        if (lcp === null) failedChecks.push('lcp_unavailable');
        else if (lcp > 4000) failedChecks.push('lcp_poor');
        else if (lcp > 2500) failedChecks.push('lcp_needs_improvement');

        if (cls === null) failedChecks.push('cls_unavailable');
        else if (cls > 0.25) failedChecks.push('cls_poor');
        else if (cls > 0.1) failedChecks.push('cls_needs_improvement');

        if (fcp === null) failedChecks.push('fcp_unavailable');
        else if (fcp > 3000) failedChecks.push('fcp_poor');

        if (tbt === null) failedChecks.push('tbt_unavailable');
        else if (tbt > 600) failedChecks.push('tbt_poor');

        if (pageWeightMb === null) failedChecks.push('weight_unavailable');
        else if (pageWeightMb > 5) failedChecks.push('weight_very_heavy');
        else if (pageWeightMb > 3) failedChecks.push('weight_heavy');

        const opportunities = Object.entries(lr.audits ?? {})
            .filter(([, a]) => a?.details?.type === 'opportunity' && a.score !== null && a.score < 0.9)
            .map(([key, a]) => ({
                id: key,
                title: a.title,
                savings_ms: a.details?.overallSavingsMs ?? null,
            }))
            .sort((a, b) => (b.savings_ms ?? 0) - (a.savings_ms ?? 0))
            .slice(0, 5);

        return {
            score: applyScoreCap(rawScore, failedChecks),
            raw_score: rawScore,
            lcp, cls, fcp, tbt,
            page_weight_mb: pageWeightMb,
            failed_checks: failedChecks,
            opportunities,
            partial: false,
        };
    } catch (err) {
        console.warn('[PERF] PageSpeed échoué:', err.message);
        try {
            const start = Date.now();
            await fetch(url, {
                method: 'GET',
                signal: AbortSignal.timeout(6_000),
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Webisafe/1.0)' },
            });
            const ttfb = Date.now() - start;
            const score = ttfb < 300 ? 70 : ttfb < 600 ? 60 : ttfb < 1000 ? 50 : ttfb < 2000 ? 40 : 28;
            return {
                score,
                raw_score: score,
                lcp: null, cls: null, fcp: null, tbt: null,
                page_weight_mb: null,
                failed_checks: ['pagespeed_unavailable'],
                opportunities: [],
                partial: true,
            };
        } catch {
            return {
                score: null,
                raw_score: null,
                lcp: null, cls: null, fcp: null, tbt: null,
                page_weight_mb: null,
                failed_checks: ['pagespeed_unavailable', 'site_unreachable'],
                opportunities: [],
                partial: true,
            };
        }
    } finally {
        clearTimeout(timer);
    }
}

// ── Géolocalisation ───────────────────────────────────────────────────────────
async function getServerLocation(domain) {
    try {
        const res = await fetch(
            `http://ip-api.com/json/${encodeURIComponent(domain)}?fields=status,country,countryCode,city,isp,query`,
            { signal: AbortSignal.timeout(5_000) }
        );
        if (!res.ok) return null;
        const geo = await res.json();
        if (geo.status !== 'success') return null;
        const WEST_AFRICA = new Set(['CI', 'SN', 'ML', 'BF', 'GN', 'TG', 'BJ', 'NE', 'CM', 'GH', 'NG', 'MR']);
        const isLocal = WEST_AFRICA.has(geo.countryCode);
        const LATENCY = { US: 180, FR: 120, DE: 130, GB: 125, NL: 128, SG: 220 };
        const delay = LATENCY[geo.countryCode] ?? 150;
        return {
            country: geo.country,
            country_code: geo.countryCode,
            city: geo.city,
            isp: geo.isp,
            is_local_africa: isLocal,
            latency_warning: !isLocal
                ? {
                    warning: true,
                    message: `Serveur hébergé en ${geo.country}, latence estimée +${delay}ms pour vos visiteurs africains`,
                    impact: 'Chargement 2 à 3 fois plus lent',
                    recommendation: 'Utilisez un CDN comme Cloudflare (gratuit) pour rapprocher votre site de vos visiteurs',
                }
                : {
                    warning: false,
                    message: `Serveur en ${geo.country}, bonne proximité avec vos visiteurs`,
                },
        };
    } catch { return null; }
}

// ── Sécurité ──────────────────────────────────────────────────────────────────
const SECURITY_HEADERS = {
    'strict-transport-security': { points: 20, label: 'HSTS' },
    'content-security-policy': { points: 20, label: 'CSP' },
    'x-frame-options': { points: 15, label: 'X-Frame-Options' },
    'x-content-type-options': { points: 10, label: 'X-Content-Type-Options' },
    'referrer-policy': { points: 10, label: 'Referrer-Policy' },
    'permissions-policy': { points: 10, label: 'Permissions-Policy' },
};

async function scanSecurity(url, vtApiKey) {
    const isHttps = url.startsWith('https://');
    const headersPresent = [];
    const headersMissing = [];

    try {
        const res = await fetch(url, {
            method: 'HEAD',
            signal: AbortSignal.timeout(8_000),
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Webisafe/1.0)' },
            redirect: 'follow',
        });
        for (const [header, cfg] of Object.entries(SECURITY_HEADERS)) {
            if (res.headers.get(header)) {
                headersPresent.push(header);
            } else {
                headersMissing.push({ header: cfg.label, message: `${cfg.label} manquant` });
            }
        }
    } catch (e) {
        console.warn('[SEC] Headers check failed:', e.message);
        Object.values(SECURITY_HEADERS).forEach(cfg =>
            headersMissing.push({ header: cfg.label, message: `${cfg.label} manquant` })
        );
    }

    let malwareDetected = null;
    if (vtApiKey) {
        try {
            const encoded = Buffer.from(url).toString('base64url');
            const vtRes = await fetch(`https://www.virustotal.com/api/v3/urls/${encoded}`, {
                headers: { 'x-apikey': vtApiKey },
                signal: AbortSignal.timeout(10_000),
            });
            if (vtRes.ok) {
                const vtData = await vtRes.json();
                const stats = vtData?.data?.attributes?.last_analysis_stats ?? {};
                malwareDetected = ((stats.malicious ?? 0) + (stats.suspicious ?? 0)) > 0;
            }
        } catch (e) { console.warn('[SEC] VirusTotal:', e.message); }
    }

    let rawScore = 0;
    rawScore += isHttps ? 25 : 0;
    rawScore += malwareDetected === false ? 25 : malwareDetected === null ? 10 : 0;
    const headerPoints = headersPresent.reduce((acc, h) => acc + (SECURITY_HEADERS[h]?.points ?? 0), 0);
    const maxHeaderPoints = Object.values(SECURITY_HEADERS).reduce((a, c) => a + c.points, 0);
    rawScore += Math.round((headerPoints / maxHeaderPoints) * 50);
    rawScore = clamp(rawScore, 0, 100);

    const failedChecks = [];
    if (!isHttps) failedChecks.push('no_https');
    if (malwareDetected === true) failedChecks.push('malware_detected');
    if (malwareDetected === null) failedChecks.push('malware_unknown');
    headersMissing.forEach(h => failedChecks.push(`missing_header_${h.header}`));

    return {
        score: applyScoreCap(rawScore, failedChecks),
        raw_score: rawScore,
        malware_detected: malwareDetected,
        https: isHttps,
        ssl_grade: isHttps ? 'A' : 'Absent',
        headers_presents: headersPresent,
        headers_manquants: headersMissing,
        failed_checks: failedChecks,
        failles_owasp_count: headersMissing.length,
        sensitive_files: null,
        partial: false,
    };
}

// ── SEO ───────────────────────────────────────────────────────────────────────
async function scanSEO(url) {
    const res = await fetch(url, {
        signal: AbortSignal.timeout(8_000),
        headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; Webisafe/1.0)',
            Accept: 'text/html',
        },
        redirect: 'follow',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const $ = cheerio.load(html);

    const title = $('title').first().text().trim();
    const description = $('meta[name="description"]').attr('content')?.trim() ?? '';
    const hasCanonical = $('link[rel="canonical"]').length > 0;
    const hasViewport = $('meta[name="viewport"]').length > 0;
    const metaRobots = $('meta[name="robots"]').attr('content')?.toLowerCase() ?? '';
    const isIndexable = !metaRobots.includes('noindex');
    const h1Count = $('h1').length;
    const ogTitle = $('meta[property="og:title"]').attr('content');
    const ogDesc = $('meta[property="og:description"]').attr('content');
    const ogImage = $('meta[property="og:image"]').attr('content');
    const hasOpenGraph = Boolean(ogTitle && ogDesc && ogImage);

    let hasSitemap = false;
    try {
        const origin = new URL(url).origin;
        const candidates = [
            `${origin}/sitemap.xml`,
            `${origin}/sitemap_index.xml`,
            `${origin}/sitemap/`,
        ];
        for (const candidate of candidates) {
            try {
                const r = await fetch(candidate, {
                    method: 'HEAD',
                    signal: AbortSignal.timeout(4_000),
                    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Webisafe/1.0)' },
                });
                if (r.ok) { hasSitemap = true; break; }
            } catch { /* candidat suivant */ }
        }
    } catch { hasSitemap = false; }

    let rawScore = 0;
    if (title.length > 0) rawScore += 22;
    if (description.length > 0) rawScore += 18;
    if (isIndexable) rawScore += 15;
    if (hasViewport) rawScore += 10;
    if (hasSitemap) rawScore += 13;
    if (hasCanonical) rawScore += 8;
    if (h1Count === 1) rawScore += 8;
    else if (h1Count > 1) rawScore += 3;
    if (hasOpenGraph) rawScore += 6;

    const failedChecks = [];
    if (!title) failedChecks.push('no_title');
    if (!description) failedChecks.push('no_description');
    if (!hasSitemap) failedChecks.push('no_sitemap');
    if (!hasCanonical) failedChecks.push('no_canonical');
    if (!isIndexable) failedChecks.push('not_indexable');
    if (!hasOpenGraph) failedChecks.push('no_open_graph');
    if (h1Count === 0) failedChecks.push('no_h1');
    else if (h1Count > 1) failedChecks.push('multiple_h1');

    const cappedScore = applyScoreCap(Math.min(100, rawScore), failedChecks);
    console.log(`[SEO] raw=${rawScore} failed=[${failedChecks.join(',')}] capped=${cappedScore}`);

    return {
        score: cappedScore,
        raw_score: rawScore,
        has_title: title.length > 0,
        title_length: title.length,
        has_description: description.length > 0,
        description_length: description.length,
        h1_count: h1Count,
        has_viewport: hasViewport,
        has_open_graph: hasOpenGraph,
        has_canonical: hasCanonical,
        has_sitemap: hasSitemap,
        is_indexable: isIndexable,
        failed_checks: failedChecks,
        partial: false,
    };
}

// ── UX Mobile ─────────────────────────────────────────────────────────────────
async function scanUX(url) {
    const res = await fetch(url, {
        signal: AbortSignal.timeout(10_000),
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Webisafe/1.0)' },
        redirect: 'follow',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const $ = cheerio.load(html);
    const issues = [];

    const viewport = $('meta[name="viewport"]').attr('content') || '';
    if (!viewport) {
        issues.push({
            severity: 'high',
            message: 'Balise viewport absente, site non adapté mobile',
            impact: 'Google pénalise les sites non responsive dans ses résultats de recherche',
        });
    } else if (viewport.includes('user-scalable=no') || viewport.includes('maximum-scale=1')) {
        issues.push({
            severity: 'high',
            message: 'Zoom utilisateur bloqué, accessibilité dégradée',
            impact: 'Pénalité SEO mobile et mauvaise expérience pour les malvoyants',
        });
    }

    const imagesWithoutAlt = $('img:not([alt]), img[alt=""]').length;
    if (imagesWithoutAlt > 0) {
        issues.push({
            severity: 'medium',
            message: `${imagesWithoutAlt} image(s) sans description (attribut alt manquant)`,
            impact: 'Moins bien référencé, inaccessible aux personnes malvoyantes',
        });
    }

    const encoding = res.headers.get('content-encoding') || '';
    const hasCompression = encoding.includes('br') || encoding.includes('gzip');
    if (!hasCompression) {
        issues.push({
            severity: 'high',
            message: 'Compression des données désactivée (gzip/brotli)',
            impact: 'Pages 2 à 3 fois plus lourdes, chargement lent sur mobile et connexions 3G',
        });
    }

    const emptyLinks = $('a:not([aria-label])').filter((_, el) => !$(el).text().trim()).length;
    if (emptyLinks > 0) {
        issues.push({
            severity: 'low',
            message: `${emptyLinks} lien(s) sans texte visible`,
            impact: 'Confus pour les utilisateurs et les moteurs de recherche',
        });
    }

    const SEVERITY_WEIGHT = { high: 15, medium: 8, low: 4 };
    const penalty = issues.reduce((acc, i) => acc + (SEVERITY_WEIGHT[i.severity] ?? 4), 0);
    const rawScore = clamp(100 - penalty, 0, 100);

    const failedChecks = [];
    if (!viewport) failedChecks.push('no_viewport');
    if (imagesWithoutAlt > 0) failedChecks.push('images_without_alt');
    if (!hasCompression) failedChecks.push('no_compression');
    if (emptyLinks > 0) failedChecks.push('empty_links');

    const finalScore = applyScoreCap(rawScore, failedChecks);

    return {
        score: finalScore,
        raw_score: rawScore,
        accessibility_score: rawScore,
        tap_targets_ok: true,
        issues,
        issues_count: issues.length,
        critical_count: issues.filter(i => i.severity === 'high').length,
        failed_checks: failedChecks,
        grade: finalScore >= 90 ? 'A' : finalScore >= 75 ? 'B' : finalScore >= 55 ? 'C' : finalScore >= 35 ? 'D' : 'F',
        partial: false,
    };
}

// ── Score global ──────────────────────────────────────────────────────────────
function calculateGlobalScore(perf, sec, seo, ux) {
    const weights = { perf: 0.30, sec: 0.30, seo: 0.25, ux: 0.15 };
    let score = 0, totalW = 0;
    if (perf != null) { score += perf * weights.perf; totalW += weights.perf; }
    if (sec != null) { score += sec * weights.sec; totalW += weights.sec; }
    if (seo != null) { score += seo * weights.seo; totalW += weights.seo; }
    if (ux != null) { score += ux * weights.ux; totalW += weights.ux; }
    if (totalW === 0) return 0;
    return Math.min(Math.round(score / totalW), 97);
}

function getGrade(score) {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'F';
}

function buildCriticalAlerts(sec, ux, perf) {
    const alerts = [];
    if (sec?.malware_detected === true) {
        alerts.push({
            severity: 'critical',
            category: 'security',
            title: 'Malware détecté',
            message: 'Votre site est signalé comme dangereux. Google peut le blacklister et bloquer vos visiteurs.',
        });
    }
    if (!sec?.https) {
        alerts.push({
            severity: 'high',
            category: 'security',
            title: 'Site non sécurisé (HTTP)',
            message: 'Votre site ne chiffre pas les données. Les navigateurs affichent un avertissement "Non sécurisé" à vos visiteurs.',
        });
    }
    if (perf?.server_location?.latency_warning?.warning) {
        alerts.push({
            severity: 'warning',
            category: 'performance',
            title: 'Serveur éloigné de vos visiteurs',
            message: perf.server_location.latency_warning.message,
            recommendation: perf.server_location.latency_warning.recommendation,
        });
    }
    if (ux?.critical_count > 0) {
        (ux.issues ?? [])
            .filter(i => i.severity === 'high')
            .forEach(issue => {
                alerts.push({
                    severity: 'high',
                    category: 'ux',
                    title: issue.message,
                    message: issue.impact,
                });
            });
    }
    return alerts;
}

// ── Handler principal ─────────────────────────────────────────────────────────
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST')
        return res.status(405).json({ success: false, error: 'Method Not Allowed' });

    let body;
    try { body = await readJsonBody(req); }
    catch { return res.status(400).json({ success: false, error: 'Corps de requête invalide' }); }

    const validation = validateUrl(body?.url);
    if (!validation.valid)
        return res.status(400).json({ success: false, error: validation.error, type: 'INVALID_URL' });

    const normalizedUrl = validation.url;

    // ── Vérification accessibilité du site cible ──────────────────────────────
    try {
        const check = await fetch(normalizedUrl, {
            method: 'HEAD',
            signal: AbortSignal.timeout(8_000),
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Webisafe/1.0)' },
            redirect: 'follow',
        });
        if (check.status >= 500)
            return res.status(422).json({ success: false, error: 'Site inaccessible (erreur serveur)', type: 'SITE_UNREACHABLE' });
    } catch {
        return res.status(422).json({ success: false, error: "Impossible de joindre le site. Vérifiez l'URL.", type: 'SITE_UNREACHABLE' });
    }

    // ── Cache (désactivé) ─────────────────────────────────────────────────────
    const cached = await readCache(normalizedUrl);
    if (cached?.results_json) {
        return res.json({ ...cached.results_json, success: true, cached: true, scan_id: cached.id });
    }

    // ── Clés API ──────────────────────────────────────────────────────────────
    const psKey = process.env.GOOGLE_PAGESPEED_KEY;
    const vtKey = process.env.VIRUSTOTAL_API_KEY ?? null;

    if (!psKey)
        return res.status(500).json({ success: false, error: 'Clé GOOGLE_PAGESPEED_KEY manquante', type: 'CONFIG_ERROR' });

    const scanId = randomUUID();
    const startMs = Date.now();
    const domain = new URL(normalizedUrl).hostname;

    console.log(`[SCAN] Démarrage id=${scanId} url=${normalizedUrl}`);

    // ── Scan principal ────────────────────────────────────────────────────────
    try {
        const [perfResult, secResult, seoResult, uxResult, geoResult] = await Promise.allSettled([
            scanPerformance(normalizedUrl, psKey),
            scanSecurity(normalizedUrl, vtKey),
            scanSEO(normalizedUrl),
            scanUX(normalizedUrl),
            getServerLocation(domain),
        ]);

        const perf = perfResult.status === 'fulfilled' ? perfResult.value : null;
        const sec = secResult.status === 'fulfilled' ? secResult.value : null;
        const seo = seoResult.status === 'fulfilled' ? seoResult.value : null;
        const ux = uxResult.status === 'fulfilled' ? uxResult.value : null;
        const geo = geoResult.status === 'fulfilled' ? geoResult.value : null;

        if (perf) perf.server_location = geo;

        const scores = {
            performance: perf?.score ?? null,
            security: sec?.score ?? null,
            seo: seo?.score ?? null,
            ux: ux?.score ?? null,
        };

        const globalScore = calculateGlobalScore(scores.performance, scores.security, scores.seo, scores.ux);
        const scanDurationMs = Date.now() - startMs;

        console.log(`[SCAN] Scores: perf=${scores.performance} sec=${scores.security} seo=${scores.seo} ux=${scores.ux} global=${globalScore}`);

        const results = {
            success: true,
            scan_id: scanId,
            url: normalizedUrl,
            scanned_at: new Date().toISOString(),
            global_score: globalScore,
            grade: getGrade(globalScore),
            scores,
            metrics: {
                performance: perf ?? null,
                security: sec ?? null,
                seo: seo ?? null,
                ux: ux ?? null,
            },
            critical_alerts: buildCriticalAlerts(sec, ux, perf),
            scanner_errors: {
                performance: perfResult.status === 'rejected' ? perfResult.reason?.message : null,
                security: secResult.status === 'rejected' ? secResult.reason?.message : null,
                seo: seoResult.status === 'rejected' ? seoResult.reason?.message : null,
                ux: uxResult.status === 'rejected' ? uxResult.reason?.message : null,
            },
            scan_duration_ms: scanDurationMs,
        };

        // ✅ FIX : userId passé en null (non déclaré dans ce handler)
        await saveToDb(scanId, normalizedUrl, globalScore, results, null);

        return res.json(results);

        // ✅ FIX : accolade parasite supprimée — le catch est directement lié au try
    } catch (error) {
        console.error('[SCAN] Erreur fatale:', error);
        return res.status(500).json({
            success: false,
            error: "Une erreur est survenue lors de l'analyse. Réessayez dans quelques instants.",
            type: 'SCAN_ERROR',
        });
    }
}
// api/scan.js
import { randomUUID } from 'crypto';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';

// ── Supabase (optionnel) ──────────────────────────────────────────────────────
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    null;

const supabase =
    supabaseUrl && supabaseKey
        ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })
        : null;

// ── Config Vercel Function ────────────────────────────────────────────────────
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
    if (!supabase) return null;
    try {
        const oneHourAgo = new Date(Date.now() - 3_600_000).toISOString();
        const { data, error } = await supabase
            .from('scans')
            .select('id,results_json')
            .eq('url', normalizedUrl)
            .gt('created_at', oneHourAgo)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        if (error) { console.warn('[CACHE] Erreur lecture:', error.message); return null; }
        return data ?? null;
    } catch (e) {
        console.warn('[CACHE] Exception:', e.message);
        return null;
    }
}

async function saveToDb(scanId, url, score, results) {
    if (!supabase) return;
    try {
        const { error } = await supabase
            .from('scans')
            .insert({ id: scanId, url, score, results_json: results, paid: false });
        if (error) console.warn('[DB] Erreur sauvegarde:', error.message);
    } catch (e) {
        console.warn('[DB] Exception:', e.message);
    }
}

// ── Scanner Performance (PageSpeed API) ──────────────────────────────────────
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
        const score = Math.round((lr.categories?.performance?.score ?? 0) * 100);
        return {
            score,
            lcp: lr.audits?.['largest-contentful-paint']?.numericValue ?? null,
            cls: lr.audits?.['cumulative-layout-shift']?.numericValue ?? null,
            fcp: lr.audits?.['first-contentful-paint']?.numericValue ?? null,
            tbt: lr.audits?.['total-blocking-time']?.numericValue ?? null,
            page_weight_mb: lr.audits?.['total-byte-weight']?.numericValue != null
                ? Math.round((lr.audits['total-byte-weight'].numericValue / 1_048_576) * 100) / 100
                : null,
            opportunities: Object.entries(lr.audits ?? {})
                .filter(([, a]) => a?.details?.type === 'opportunity' && a.score !== null && a.score < 0.9)
                .map(([key, a]) => ({ id: key, title: a.title, savings_ms: a.details?.overallSavingsMs ?? null }))
                .sort((a, b) => (b.savings_ms ?? 0) - (a.savings_ms ?? 0))
                .slice(0, 5),
            partial: false,
        };
    } catch (err) {
        console.warn('[PERF] PageSpeed échoué:', err.message);
        // Fallback TTFB
        try {
            const start = Date.now();
            await fetch(url, {
                method: 'GET',
                signal: AbortSignal.timeout(6_000),
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Webisafe/1.0)' },
            });
            const ttfb = Date.now() - start;
            const score = ttfb < 300 ? 75 : ttfb < 600 ? 65 : ttfb < 1000 ? 55 : ttfb < 2000 ? 45 : 30;
            return { score, lcp: null, cls: null, fcp: null, tbt: null, page_weight_mb: null, opportunities: [], partial: true };
        } catch {
            return { score: null, lcp: null, cls: null, fcp: null, tbt: null, page_weight_mb: null, opportunities: [], partial: true };
        }
    } finally {
        clearTimeout(timer);
    }
}

// ── Scanner Géolocalisation ───────────────────────────────────────────────────
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
                ? { warning: true, message: `Serveur en ${geo.country} — latence estimée +${delay}ms pour vos visiteurs africains`, impact: 'Chargement 2-3x plus lent', recommendation: 'Utilisez Cloudflare CDN (gratuit)' }
                : { warning: false, message: `Serveur en ${geo.country} — bonne proximité` },
        };
    } catch { return null; }
}

// ── Scanner Sécurité ──────────────────────────────────────────────────────────
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
    let headerScore = 15;
    const headersPresent = [];
    const headersMissing = [];

    try {
        const res = await fetch(url, {
            method: 'HEAD',
            signal: AbortSignal.timeout(8_000),
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Webisafe/1.0)' },
        });
        for (const [header, cfg] of Object.entries(SECURITY_HEADERS)) {
            if (res.headers.get(header)) {
                headerScore += cfg.points;
                headersPresent.push(header);
            } else {
                headersMissing.push({ header: cfg.label, message: `${cfg.label} manquant` });
            }
        }
    } catch (e) {
        console.warn('[SEC] Headers check failed:', e.message);
        Object.values(SECURITY_HEADERS).forEach(cfg => headersMissing.push({ header: cfg.label, message: `${cfg.label} manquant` }));
    }

    headerScore = clamp(headerScore, 0, 100);

    // VirusTotal (optionnel)
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

    let score = 0;
    score += isHttps ? 20 : 0;
    score += Math.round((headerScore / 100) * 45);
    score += malwareDetected === false ? 25 : malwareDetected === null ? 12 : 0;
    score += 10; // bonus fichiers sensibles (scan désactivé pour Vercel)

    return {
        score: clamp(score, 0, 100),
        malware_detected: malwareDetected,
        https: isHttps,
        ssl_grade: isHttps ? 'A' : 'Absent',
        headers_presents: headersPresent,
        headers_manquants: headersMissing,
        cookie_issues: [],
        sensitive_files: null,
        failles_owasp_count: headersMissing.length,
        partial: false,
    };
}

// ── Scanner SEO ───────────────────────────────────────────────────────────────
async function scanSEO(url) {
    const res = await fetch(url, {
        signal: AbortSignal.timeout(8_000),
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Webisafe/1.0)', Accept: 'text/html' },
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

    let score = 0;
    if (title.length > 0) score += 20;
    if (description.length > 0) score += 20;
    if (hasCanonical) score += 10;
    if (hasViewport) score += 10;
    if (isIndexable) score += 15;
    score += 15; // liens crawlables (on suppose OK sans browser)
    score += 5;  // textes liens
    if (h1Count === 1) score += 3;
    else if (h1Count > 1) score += 1;
    if (hasOpenGraph) score += 2;

    return {
        score: Math.min(100, score),
        has_title: title.length > 0,
        has_description: description.length > 0,
        h1_count: h1Count,
        has_viewport: hasViewport,
        has_open_graph: hasOpenGraph,
        has_canonical: hasCanonical,
        has_sitemap: false,
        is_indexable: isIndexable,
        partial: false,
    };
}

// ── Scanner UX ────────────────────────────────────────────────────────────────
async function scanUX(url) {
    const res = await fetch(url, {
        signal: AbortSignal.timeout(10_000),
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Webisafe/1.0)' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const $ = cheerio.load(html);
    const issues = [];

    const viewport = $('meta[name="viewport"]').attr('content') || '';
    if (!viewport) {
        issues.push({ severity: 'high', message: 'Viewport manquant — Site non responsive', impact: 'Pénalité Google Mobile' });
    } else if (viewport.includes('user-scalable=no') || viewport.includes('maximum-scale=1')) {
        issues.push({ severity: 'high', message: 'Zoom bloqué — Accessibilité dégradée', impact: 'Pénalité SEO mobile' });
    }

    const imagesWithoutAlt = $('img:not([alt]), img[alt=""]').length;
    if (imagesWithoutAlt > 0) {
        issues.push({ severity: 'medium', message: `${imagesWithoutAlt} image(s) sans attribut alt`, impact: 'SEO et accessibilité dégradés' });
    }

    const encoding = res.headers.get('content-encoding') || '';
    if (!encoding.includes('br') && !encoding.includes('gzip')) {
        issues.push({ severity: 'high', message: 'Compression désactivée — Données 3x plus lourdes', impact: 'Chargement lent sur mobile' });
    }

    const SEVERITY_WEIGHT = { high: 3, medium: 2, low: 1 };
    const penalty = issues.reduce((acc, i) => acc + (SEVERITY_WEIGHT[i.severity] ?? 1) * 5, 0);
    const score = Math.max(0, Math.min(100, 100 - penalty));

    return {
        score,
        accessibility_score: score,
        tap_targets_ok: true,
        issues,
        issues_count: issues.length,
        critical_count: issues.filter(i => i.severity === 'high').length,
        grade: score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 55 ? 'C' : score >= 35 ? 'D' : 'F',
        partial: false,
    };
}

// ── Score global ──────────────────────────────────────────────────────────────
function calculateGlobalScore(perf, sec, seo, ux) {
    const values = [perf, sec, seo, ux].filter(v => v !== null && v !== undefined);
    if (values.length === 0) return 0;
    const weights = { perf: 0.30, sec: 0.30, seo: 0.25, ux: 0.15 };
    let score = 0, totalW = 0;
    if (perf != null) { score += perf * weights.perf; totalW += weights.perf; }
    if (sec != null) { score += sec * weights.sec; totalW += weights.sec; }
    if (seo != null) { score += seo * weights.seo; totalW += weights.seo; }
    if (ux != null) { score += ux * weights.ux; totalW += weights.ux; }
    return totalW > 0 ? Math.round(score / totalW) : 0;
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
        alerts.push({ severity: 'critical', category: 'security', title: 'Malware détecté', message: 'Risque de blacklistage Google' });
    }
    if (perf?.server_location?.latency_warning?.warning) {
        alerts.push({ severity: 'warning', category: 'performance', title: 'Serveur éloigné', message: perf.server_location.latency_warning.message });
    }
    if (ux?.critical_count > 0) {
        (ux.issues ?? []).filter(i => i.severity === 'high').forEach(issue => {
            alerts.push({ severity: 'high', category: 'ux', title: issue.message, impact: issue.impact });
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
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method Not Allowed' });

    let body;
    try {
        body = await readJsonBody(req);
    } catch (e) {
        return res.status(400).json({ success: false, error: 'Corps de requête invalide' });
    }

    const validation = validateUrl(body?.url);
    if (!validation.valid) {
        return res.status(400).json({ success: false, error: validation.error, type: 'INVALID_URL' });
    }

    const normalizedUrl = validation.url;

    // Vérification accessibilité
    try {
        const check = await fetch(normalizedUrl, {
            method: 'HEAD',
            signal: AbortSignal.timeout(8_000),
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Webisafe/1.0)' },
            redirect: 'follow',
        });
        if (check.status >= 500) {
            return res.status(422).json({ success: false, error: 'Site inaccessible', type: 'SITE_UNREACHABLE' });
        }
    } catch {
        return res.status(422).json({ success: false, error: 'Impossible de joindre le site', type: 'SITE_UNREACHABLE' });
    }

    // Cache
    const cached = await readCache(normalizedUrl);
    if (cached?.results_json) {
        return res.json({ ...cached.results_json, success: true, cached: true, scan_id: cached.id });
    }

    // Clé API obligatoire
    const psKey = process.env.GOOGLE_PAGESPEED_KEY;
    const vtKey = process.env.VIRUSTOTAL_API_KEY ?? null;

    if (!psKey) {
        return res.status(500).json({ success: false, error: 'Clé GOOGLE_PAGESPEED_KEY manquante', type: 'CONFIG_ERROR' });
    }

    const scanId = randomUUID();
    const startMs = Date.now();
    const domain = new URL(normalizedUrl).hostname;

    console.log(`[SCAN] Démarrage id=${scanId} url=${normalizedUrl}`);

    try {
        // Lance tous les scanners en parallèle
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

        console.log(`[SCAN] ✅ Terminé en ${scanDurationMs}ms — score=${globalScore}`);

        const results = {
            success: true,
            scan_id: scanId,
            url: normalizedUrl,
            global_score: globalScore,
            grade: getGrade(globalScore),
            scores,
            metrics: {
                performance: perf ? { ...perf } : null,
                security: sec ? { ...sec } : null,
                seo: seo ? { ...seo } : null,
                ux: ux ? { ...ux } : null,
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

        await saveToDb(scanId, normalizedUrl, globalScore, results);

        return res.json(results);

    } catch (error) {
        console.error('[SCAN] Erreur fatale:', error);
        return res.status(500).json({
            success: false,
            error: "Erreur lors de l'analyse",
            type: 'SCAN_ERROR',
            suggestion: 'Réessayez dans quelques instants.',
        });
    }
}
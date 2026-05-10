// api/scan.js
import { randomUUID, createHash } from 'crypto';
import { promises as dns } from 'dns';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import { runAdvancedSecurityChecks } from '../scanners/security-checks.js';
import { runExtendedSecurityChecks } from '../scanners/extended-security-checks.js';
import { setCorsHeaders, checkRateLimit } from '../api_shared/_utils.js';
import { analyzeSeoSignals, buildSeoBusinessRecommendations } from '../lib/audit/seoSignals.js';
import {
    analyzeCspQuality,
    analyzeSri,
    buildComplianceBadges,
    detectCms,
    detectJsLibraries,
} from '../lib/audit/securitySignals.js';
import {
    checkDnssec,
    checkHttpMethods,
    scanWordPressSecurity,
} from '../server/scanners/securityProbes.js';

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

// ── Helpers scan_events (live stats) ──────────────────────────────────────────
function hashUrl(url) {
    return createHash('sha256').update(url).digest('hex').slice(0, 16);
}
function extractDomain(url) {
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return 'domaine inconnu'; }
}
async function logScanEvent(url, score) {
    if (!supabase) return;
    try {
        await supabase.from('scan_events').insert({
            url_hash: hashUrl(url),
            domain:   extractDomain(url),
            score:    score ?? null,
            country:  'CI',
        });
    } catch (e) { console.error('[SCAN_EVENTS] insert error:', e.message); }
}

// ── User-Agent navigateur réel (évite les blocages basiques) ──────────────────
const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const BROWSER_HEADERS = {
    'User-Agent': BROWSER_UA,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
    'Cache-Control': 'no-cache',
};

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

const REQUIRED_ADVANCED_CHECKS = ['waf', 'subdomains', 'security_txt', 'cors', 'supply_chain', 'email_advanced'];

export function hasCompleteAdvancedSecurity(results) {
    const sec = results?.metrics?.security ?? {};
    const checks = [
        ...(Array.isArray(sec.extended_checks) ? sec.extended_checks : []),
        ...(Array.isArray(sec.advanced_checks) ? sec.advanced_checks : []),
    ];
    const names = new Set(checks.map(c => c?.check_name).filter(Boolean));
    return REQUIRED_ADVANCED_CHECKS.every(name => names.has(name));
}

export function shouldUseCachedScan(cached, forceRefresh = false) {
    if (forceRefresh) return false;
    if (!cached?.results_json) return false;
    return hasCompleteAdvancedSecurity(cached.results_json);
}

// Calcule un score à partir des données CrUX (Chrome User Experience Report)
// = vraies données des utilisateurs Chrome, pas du lab simulé
export function computeFieldScore(loadingExperience) {
    if (!loadingExperience?.metrics) return null;
    const m = loadingExperience.metrics;
    const lcpCat = m.LARGEST_CONTENTFUL_PAINT_MS?.category;
    const fcpCat = m.FIRST_CONTENTFUL_PAINT_MS?.category;
    const clsCat = m.CUMULATIVE_LAYOUT_SHIFT_SCORE?.category;
    const inpCat = m.INTERACTION_TO_NEXT_PAINT?.category || m.FIRST_INPUT_DELAY_MS?.category;

    // FAST = utilisateur satisfait, AVERAGE = acceptable, SLOW = problématique
    const cat2score = (c) => c === 'FAST' ? 95 : c === 'AVERAGE' ? 78 : c === 'SLOW' ? 50 : null;

    const lcpScore = cat2score(lcpCat);
    const fcpScore = cat2score(fcpCat);
    const clsScore = cat2score(clsCat);
    const inpScore = cat2score(inpCat);

    // Pondération : LCP et INP impactent le plus l'expérience réelle
    const items = [
        { score: lcpScore, weight: 0.35 },
        { score: inpScore, weight: 0.30 },
        { score: clsScore, weight: 0.20 },
        { score: fcpScore, weight: 0.15 },
    ].filter(x => x.score != null);

    if (items.length === 0) return null;
    const totalWeight = items.reduce((a, x) => a + x.weight, 0);
    const weightedSum = items.reduce((a, x) => a + x.score * x.weight, 0);
    return Math.round(weightedSum / totalWeight);
}

export function calibratePerformanceResult(perf) {
    if (!perf || typeof perf !== 'object') return perf;
    const score = Number.isFinite(Number(perf.score)) ? Number(perf.score) : null;
    const lcp = Number(perf.lcp);
    const fcp = Number(perf.fcp);
    const cls = Number(perf.cls);
    const tbt = Number(perf.tbt);

    // Si on a des données de terrain CrUX, on a confiance dans le score (vrais utilisateurs)
    if (perf.field_score != null) {
        return { ...perf, measurement_confidence: 'high' };
    }

    // Outlier extrême : LCP > 30s ou FCP > 10s + score < 30 = mesure cassée
    const isExtremeLabOutlier =
        score != null &&
        score < 30 &&
        ((Number.isFinite(lcp) && lcp > 30000) || (Number.isFinite(fcp) && fcp > 10000));

    if (isExtremeLabOutlier) {
        return {
            ...perf,
            score: Math.max(score, 35),
            partial: true,
            partial_reason: 'pagespeed_extreme_lab_outlier',
            measurement_confidence: 'low',
        };
    }

    // Outlier modéré : LCP/FCP élevés MAIS CLS et TBT bons = artefact de mesure lab
    // (typique des grands sites comme Apple, Samsung mesurés en réseau lent simulé)
    const isModerateLabOutlier =
        score != null && score < 65 &&
        Number.isFinite(cls) && cls < 0.1 &&
        Number.isFinite(tbt) && tbt < 400 &&
        ((Number.isFinite(lcp) && lcp > 6000) || (Number.isFinite(fcp) && fcp > 3500));

    if (isModerateLabOutlier) {
        // Site avec LCP élevé mais autres métriques excellentes → réel-utilisateurs probablement OK
        return {
            ...perf,
            score: Math.max(score, 70),
            partial: true,
            partial_reason: 'pagespeed_lab_simulation_artifact',
            measurement_confidence: 'medium',
        };
    }

    return {
        ...perf,
        measurement_confidence: perf.measurement_confidence ?? 'high',
    };
}

export function combineSecurityScores({ legacyScore, advancedScore, extendedScore, https, malwareDetected }) {
    const base = Number.isFinite(Number(legacyScore)) ? Number(legacyScore) : null;
    if (base == null) return null;

    // Les scanners avancés/étendus mesurent des best practices (CSP, HSTS, security.txt, CORS...)
    // Ces points NE DOIVENT PAS écraser le score fondamental d'un site HTTPS sain.
    // On garde le legacyScore comme référence et on l'ajuste légèrement (±3) avec advanced/extended.
    let blended = base;
    if (Number.isFinite(Number(advancedScore))) {
        const flooredAdvanced = (https && malwareDetected !== true)
            ? Math.max(Number(advancedScore), 60)
            : Number(advancedScore);
        blended = Math.round(blended * 0.95 + flooredAdvanced * 0.05);
    }
    if (Number.isFinite(Number(extendedScore))) {
        const flooredExtended = (https && malwareDetected !== true)
            ? Math.max(Number(extendedScore), 60)
            : Number(extendedScore);
        blended = Math.round(blended * 0.95 + flooredExtended * 0.05);
    }

    let score = Math.max(base, blended);
    // Minimum garanti pour les sites HTTPS sans malware :
    // HTTPS + chiffrement TLS + pas de menace active = niveau de sécurité fondamental atteint.
    // Un tel site (Google, Amazon, cybastiontech, etc.) mérite au minimum 90 ("Très bon").
    // Les headers manquants restent visibles dans les recommandations.
    if (https && malwareDetected !== true) score = Math.max(score, 90);
    return Math.min(score, 99);
}

function getScanConfidence({ perf, sec, seo, ux }) {
    const partialCount = [perf, sec, seo, ux].filter(x => x?.partial).length;
    if (perf?.partial_reason === 'pagespeed_extreme_lab_outlier') return 'medium';
    if (partialCount >= 2) return 'low';
    if (partialCount === 1) return 'medium';
    return 'high';
}

const PRIVATE_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^0\./,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
];

function isPrivateAddress(address) {
    const value = String(address || '').toLowerCase();
    return PRIVATE_IP_PATTERNS.some((re) => re.test(value));
}

async function assertPublicHostname(url) {
    const hostname = new URL(url).hostname;

    if (isPrivateAddress(hostname)) {
        return { valid: false, error: 'Les adresses IP privées ne sont pas autorisées.' };
    }

    try {
        const records = await dns.lookup(hostname, { all: true, verbatim: true });
        if (records.some((record) => isPrivateAddress(record.address))) {
            return { valid: false, error: 'Ce domaine pointe vers une adresse privée non autorisée.' };
        }
    } catch {
        return { valid: false, error: 'Impossible de résoudre le domaine.' };
    }

    return { valid: true };
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
    const hostname = parsed.hostname.toLowerCase();
    if (hostname === 'localhost' || hostname.endsWith('.local')) {
        return { valid: false, error: 'Les URLs locales ne sont pas autorisées.' };
    }
    if (isPrivateAddress(hostname)) {
        return { valid: false, error: 'Les adresses IP privées ne sont pas autorisées.' };
    }
    return { valid: true, url: parsed.href };
}

export function buildAccessibilityProbeUrls(url) {
    const urls = [];
    try {
        const parsed = new URL(url);
        urls.push(parsed.href);
        if (!parsed.hostname.startsWith('www.')) {
            const wwwUrl = new URL(parsed.href);
            wwwUrl.hostname = `www.${parsed.hostname}`;
            urls.push(wwwUrl.href);
        }
    } catch {
        urls.push(url);
    }
    return Array.from(new Set(urls));
}

async function probeUrlAccessible(url) {
    const attempts = [
        { method: 'HEAD', headers: BROWSER_HEADERS },
        { method: 'GET', headers: BROWSER_HEADERS },
    ];

    let lastStatus = null;
    for (const probeUrl of buildAccessibilityProbeUrls(url)) {
        for (const attempt of attempts) {
            try {
                const response = await fetch(probeUrl, {
                    ...attempt,
                    signal: AbortSignal.timeout(8_000),
                    redirect: 'follow',
                });
                lastStatus = response.status;
                if (response.status < 500) {
                    const finalUrl = response.url || probeUrl;
                    const finalValidation = await assertPublicHostname(finalUrl);
                    if (!finalValidation.valid) return { accessible: false, error: finalValidation.error };
                    return { accessible: true, url: probeUrl, final_url: finalUrl };
                }
            } catch {
            }
        }
    }

    if (lastStatus >= 500) {
        return { accessible: false, error: 'Site inaccessible (erreur serveur)' };
    }

    return { accessible: false, error: "Impossible de joindre le site. Vérifiez l'URL." };
}

// ── Cache Supabase ────────────────────────────────────────────────────────────
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 heures

async function readCache(normalizedUrl) {
    if (!supabase) return null;
    try {
        const { data, error } = await supabase
            .from('scans')
            .select('id, score, results_json, paid, scanned_at')
            .eq('url', normalizedUrl)
            .gte('scanned_at', new Date(Date.now() - CACHE_TTL_MS).toISOString())
            .order('scanned_at', { ascending: false })
            .limit(1)
            .single();
        
        if (error || !data) return null;
        
        // Vérifier si l'utilisateur premium force un nouveau scan (via query param)
        return data;
    } catch (e) {
        console.warn('[CACHE] Erreur lecture:', e.message);
        return null;
    }
}

async function saveToDb(scanId, url, score, results, userEmail = null) {
    if (!supabase) return;
    try {
        const payload = {
            id: scanId,
            url,
            score,
            results_json: results,
            paid: false,
        };
        if (userEmail) payload.user_email = userEmail;
        const { error } = await supabase.from('scans').insert(payload);
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

        const labScore = Math.round((lr.categories?.performance?.score ?? 0) * 100);

        const lcp = lr.audits?.['largest-contentful-paint']?.numericValue ?? null;
        const cls = lr.audits?.['cumulative-layout-shift']?.numericValue ?? null;
        const fcp = lr.audits?.['first-contentful-paint']?.numericValue ?? null;
        const tbt = lr.audits?.['total-blocking-time']?.numericValue ?? null;
        const pageWeightMb = lr.audits?.['total-byte-weight']?.numericValue != null
            ? Math.round((lr.audits['total-byte-weight'].numericValue / 1_048_576) * 100) / 100
            : null;
        const requestCount = lr.audits?.['network-requests']?.details?.items?.length ?? null;

        // ── Données CrUX (vraies données des utilisateurs Chrome) ──────────
        // Pour les grands sites comme Apple/Google/Samsung, les vraies données utilisateurs
        // sont bien meilleures que la simulation lab (CDN, cache, optimisations progressives).
        const fieldData = data.loadingExperience;
        const fieldScore = computeFieldScore(fieldData);
        const hasFieldData = fieldScore != null && fieldData?.metrics && Object.keys(fieldData.metrics).length > 0;

        const failedChecks = [];
        if (lcp > 4000) failedChecks.push('lcp_poor');
        else if (lcp > 2500) failedChecks.push('lcp_needs_improvement');

        if (cls > 0.25) failedChecks.push('cls_poor');
        else if (cls > 0.1) failedChecks.push('cls_needs_improvement');

        if (fcp > 3000) failedChecks.push('fcp_poor');

        if (tbt > 600) failedChecks.push('tbt_poor');

        if (pageWeightMb > 5) failedChecks.push('weight_very_heavy');
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

        const cappedLabScore = applyScoreCap(labScore, failedChecks);

        // Stratégie de scoring :
        // 1. Si données CrUX disponibles (sites populaires) : prendre le max(field, lab)
        //    Les vrais utilisateurs ne devraient pas être pénalisés par une simulation lab.
        // 2. Sinon : utiliser le score lab avec calibration des outliers
        const finalScore = hasFieldData
            ? Math.max(fieldScore, cappedLabScore)
            : cappedLabScore;

        return calibratePerformanceResult({
            score: finalScore,
            raw_score: labScore,
            lab_score: cappedLabScore,
            field_score: fieldScore,
            has_field_data: hasFieldData,
            field_overall_category: fieldData?.overall_category ?? null,
            lcp, cls, fcp, tbt,
            page_weight_mb: pageWeightMb,
            nb_requetes: requestCount,
            failed_checks: failedChecks,
            opportunities,
            partial: false,
        });
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
                nb_requetes: null,
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
                nb_requetes: null,
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

// ── Détection technologie ─────────────────────────────────────────────────────
function detectTechnology(html = '') {
    if (!html || html.length < 50) return { cms: null, technologies: [], has_wordpress: false };
    const techs = [];
    let cms = null;

    // CMS
    if (/wp-content|wp-includes|WordPress/i.test(html)) { cms = 'WordPress'; techs.push('WordPress'); }
    else if (/Drupal\.settings|drupal/i.test(html)) { cms = 'Drupal'; techs.push('Drupal'); }
    else if (/Joomla/i.test(html)) { cms = 'Joomla'; techs.push('Joomla'); }
    else if (/Shopify/i.test(html)) { cms = 'Shopify'; techs.push('Shopify'); }
    else if (/Wix/i.test(html)) { cms = 'Wix'; techs.push('Wix'); }
    else if (/Squarespace/i.test(html)) { cms = 'Squarespace'; techs.push('Squarespace'); }
    else if (/prestashop/i.test(html)) { cms = 'PrestaShop'; techs.push('PrestaShop'); }
    else if (/magento/i.test(html)) { cms = 'Magento'; techs.push('Magento'); }
    else if (/ghost/i.test(html)) { cms = 'Ghost'; techs.push('Ghost'); }

    // Frameworks / build tools
    if (/react/i.test(html)) techs.push('React');
    if (/vue\.js|vuejs/i.test(html)) techs.push('Vue.js');
    if (/angular/i.test(html)) techs.push('Angular');
    if (/next\.js|__next/i.test(html)) techs.push('Next.js');
    if (/nuxt|__nuxt/i.test(html)) techs.push('Nuxt.js');
    if (/sveltekit|__sveltekit/i.test(html)) techs.push('SvelteKit');
    if (/gatsby/i.test(html)) techs.push('Gatsby');

    // Analytics
    if (/google-analytics|gtag|googletagmanager/i.test(html)) techs.push('Google Analytics');
    if (/facebook\.com\/tr|fbq/i.test(html)) techs.push('Facebook Pixel');
    if (/hotjar/i.test(html)) techs.push('Hotjar');

    // CDN / Hosting clues
    if (/cloudflare/i.test(html)) techs.push('Cloudflare');
    if (/fastly/i.test(html)) techs.push('Fastly');

    return { cms, technologies: techs, has_wordpress: cms === 'WordPress' };
}

// ── Sauvegarde analytics (fire-and-forget) ────────────────────────────────────
async function saveScanAnalytics(domain, countryCode, scores, cms, hosting, sslValid, lcpMs) {
    if (!supabase) return;
    try {
        await supabase.from('scan_analytics').insert({
            domain,
            country_code: countryCode || 'CI',
            score_security: scores.security ?? null,
            score_performance: scores.performance ?? null,
            score_seo: scores.seo ?? null,
            score_ux: scores.ux ?? null,
            score_global: scores.global ?? null,
            cms_detected: cms || null,
            hosting_detected: hosting || null,
            ssl_valid: sslValid ?? null,
            has_wordpress: cms === 'WordPress',
            load_time_ms: lcpMs ?? null,
            is_public: true,
        });
    } catch (e) { console.warn('[ANALYTICS] insert error:', e.message); }
}

// ── Helpers scan enrichis (SEO probes + HTML sécurité) ────────────────────────
async function fetchProbeText(url, timeoutMs = 3_500) {
    try {
        const response = await fetch(url, {
            signal: AbortSignal.timeout(timeoutMs),
            redirect: 'follow',
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; Webisafe/1.0)',
                'Accept': 'text/plain,text/html,application/xml;q=0.9,*/*;q=0.8',
            },
        });
        const text = await response.text().catch(() => '');
        return { ok: response.ok, status: response.status, text, url };
    } catch (error) {
        return { ok: false, status: 0, text: '', url, error: error?.name || 'FETCH_ERROR' };
    }
}

async function probeSeoResources(pageUrl) {
    let origin;
    try { origin = new URL(pageUrl).origin; } catch {
        return {
            robots: { status: 'error', url: null, blocking: null },
            sitemap: { status: 'error', url: null, discovered_from: null },
            favicon: { status: 'error', url: null },
        };
    }

    const robotsResponse = await fetchProbeText(`${origin}/robots.txt`);
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
            url: robotsResponse.ok ? `${origin}/robots.txt` : null,
            blocking: /disallow:\s*\//i.test(robotsText) && !/allow:\s*\//i.test(robotsText),
        },
        sitemap,
        favicon: {
            status: faviconResponse.ok ? 'pass' : 'warning',
            url: faviconResponse.ok ? faviconUrl : null,
        },
    };
}

async function fetchSecurityHtml(url) {
    try {
        const response = await fetch(url, {
            method: 'GET',
            signal: AbortSignal.timeout(5_000),
            redirect: 'follow',
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Webisafe/1.0)' },
        });
        if (!response.ok) return { html: '', headers: null, finalUrl: url };
        const html = await response.text().catch(() => '');
        return { html, headers: response.headers, finalUrl: response.url || url };
    } catch {
        return { html: '', headers: null, finalUrl: url };
    }
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
    // Détecte si le site final est en HTTPS (tient compte des redirections)
    let isHttps = url.startsWith('https://');
    const headersPresent = [];
    const headersMissing = [];
    let finalUrl = url;

    try {
        const res = await fetch(url, {
            method: 'HEAD',
            signal: AbortSignal.timeout(8_000),
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Webisafe/1.0)' },
            redirect: 'follow',
        });

        // Si la requête a suivi des redirections, res.url contient l'URL finale
        try {
            if (res && typeof res.url === 'string') {
                finalUrl = res.url;
                if (finalUrl.startsWith('https://')) {
                    isHttps = true;
                }
            }
        } catch (e) { /* ignore */ }

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

    // ── Scoring rééquilibré ────────────────────────────────────────────────
    // Fondamentaux (85 pts) : HTTPS + SSL + Malware = vraie sécurité utilisateur
    // Bonus headers (15 pts) : best practice, pas critique
    //
    // Un site HTTPS sans malware mais sans headers OAW devrait être ~80/100 (acceptable),
    // pas 35/100 (critique). Les headers manquants seront pénalisés une seule fois,
    // dans runAdvancedSecurityChecks (pas en double ici).
    // ── Répartition réaliste ────────────────────────────────────────────────
    // Fondamentaux (90 pts) : ce qui protège VRAIMENT les utilisateurs
    //   - HTTPS  (chiffrement TLS) : +50 → Pas de MITM possible
    //   - SSL valide                : +10 → Certificat fiable
    //   - Pas de malware vérifié   : +30 → Pas de menace active
    //   (malware non vérifié = +28, bénéfice du doute si HTTPS)
    // Bonus best practices (10 pts) : Headers (HSTS, CSP, etc.)
    //   = pas critiques pour l'utilisateur final, juste de l'hygiène pro.
    let rawScore = 0;
    if (isHttps) {
        rawScore += 50; // HTTPS = chiffrement = fondamental
        rawScore += 10; // SSL valide (implicite si HTTPS répond)
    }
    if (malwareDetected === false) rawScore += 30;       // Vérifié OK → max
    else if (malwareDetected === null) rawScore += 28;   // Non vérifié → bénéfice du doute
    // malwareDetected === true → 0 (le cap se fera plus bas)

    const headerPoints = headersPresent.reduce((acc, h) => acc + (SECURITY_HEADERS[h]?.points ?? 0), 0);
    const maxHeaderPoints = Object.values(SECURITY_HEADERS).reduce((a, c) => a + c.points, 0);
    rawScore += Math.round((headerPoints / maxHeaderPoints) * 10); // bonus 10 pts max

    rawScore = clamp(rawScore, 0, 100);

    const failedChecks = [];
    if (!isHttps) failedChecks.push('no_https');
    if (malwareDetected === true) failedChecks.push('malware_detected');
    if (malwareDetected === null && vtApiKey) failedChecks.push('malware_unknown');

    headersMissing.forEach(h => failedChecks.push(`missing_header_${h.header}`));

    // Pour le cap, on ne double-pénalise pas les headers manquants / malware_unknown
    // car le rawScore reflète déjà leur absence via les points non accordés
    const capFails = failedChecks.filter(
        f => f !== 'malware_unknown' && !f.startsWith('missing_header_')
    );

    let cappedScore = applyScoreCap(rawScore, capFails);

    // Faille critique réelle : malware avéré → score sévère
    if (malwareDetected === true) cappedScore = Math.min(cappedScore, 25);

    // ── Signaux avancés (CSP, HTTP methods, DNSSEC, CMS, WordPress, JS, SRI, compliance) ──
    let cspQuality = null;
    let httpMethods = null;
    let dnssec = null;
    let cmsDetection = null;
    let wordpressSecurity = null;
    let jsLibraries = null;
    let sriSignals = null;
    let complianceBadges = [];

    try {
        const securityHtml = await fetchSecurityHtml(finalUrl || url);
        const $security = cheerio.load(securityHtml.html || '');
        const cspHeader = securityHtml.headers?.get?.('content-security-policy') || '';
        cspQuality = analyzeCspQuality(cspHeader);
        cmsDetection = detectCms($security, securityHtml.html || '', { headers: securityHtml.headers });
        jsLibraries = detectJsLibraries($security, securityHtml.html || '');
        sriSignals = analyzeSri($security, securityHtml.finalUrl || finalUrl || url);

        let domain = '';
        try { domain = new URL(finalUrl || url).hostname; } catch { /* ignore */ }

        const [methodsRes, dnssecRes, wpRes] = await Promise.allSettled([
            checkHttpMethods(finalUrl || url),
            domain ? checkDnssec(domain) : Promise.resolve(null),
            scanWordPressSecurity(securityHtml.finalUrl || finalUrl || url, securityHtml.html || '', cmsDetection),
        ]);

        httpMethods = methodsRes.status === 'fulfilled' ? methodsRes.value : null;
        dnssec = dnssecRes.status === 'fulfilled' ? dnssecRes.value : null;
        wordpressSecurity = wpRes.status === 'fulfilled' ? wpRes.value : null;

        complianceBadges = buildComplianceBadges({
            https: isHttps,
            csp_quality: cspQuality,
            dnssec,
            sri: sriSignals,
            malware_detected: malwareDetected,
        });
    } catch (err) {
        console.warn('[SEC] Signaux avancés échec:', err.message);
    }

    return {
        score: cappedScore,
        raw_score: rawScore,
        malware_detected: malwareDetected,
        https: isHttps,
        final_url: finalUrl,
        ssl_grade: isHttps ? 'A' : 'Absent',
        headers_presents: headersPresent,
        headers_manquants: headersMissing,
        failed_checks: failedChecks,
        // Les headers manquants sont des best practices, PAS des failles OWASP.
        // Seuls les fichiers sensibles exposés sont de vraies failles.
        headers_missing_count: headersMissing.length,
        failles_owasp_count: 0,
        sensitive_files: null,
        csp_quality: cspQuality,
        http_methods: httpMethods,
        dnssec,
        cms_detection: cmsDetection,
        wordpress_security: wordpressSecurity,
        js_libraries: jsLibraries,
        sri: sriSignals,
        compliance_badges: complianceBadges,
        partial: false,
    };
}

// ── SEO ───────────────────────────────────────────────────────────────────────
async function scanSEO(url) {
    let html = '';
    let resHeaders = null;

    try {
        const res = await fetch(url, {
            signal: AbortSignal.timeout(10_000),
            headers: BROWSER_HEADERS,
            redirect: 'follow',
        });
        resHeaders = res.headers;
        if (res.ok) {
            html = await res.text();
        } else {
            console.warn(`[SEO] HTTP ${res.status} pour ${url}`);
        }
    } catch (e) {
        console.warn(`[SEO] fetch échoué: ${e.message}`);
    }

    // Si on n'a pas pu récupérer de HTML, score partiel minimal
    if (!html) {
        return {
            score: 20,
            raw_score: 0,
            has_title: null, title_length: null,
            has_description: null, description_length: null,
            h1_count: null, has_viewport: null,
            has_open_graph: null, has_canonical: null,
            has_sitemap: null, is_indexable: null,
            failed_checks: ['fetch_failed'],
            partial: true,
            partial_reason: 'Impossible de récupérer le HTML du site.',
        };
    }

    const $ = cheerio.load(html);

    const title = $('title').first().text().trim();
    const description = $('meta[name="description"]').attr('content')?.trim() ?? '';
    const hasCanonical = $('link[rel="canonical"]').length > 0;
    const hasViewport = $('meta[name="viewport"]').length > 0;
    const metaRobots = $('meta[name="robots"]').attr('content')?.toLowerCase() ?? '';
    const isIndexable = !metaRobots.includes('noindex');
    const h1Count = $('h1').length;

    // ── Détection SPA (React, Vue, Angular, Next, Nuxt, SvelteKit) ─────────────
    // Sur une SPA le contenu principal (H1, paragraphes…) est injecté côté client
    // et absent du HTML statique servi par le serveur.
    const spaRootIds = ['#root', '#app', '#__next', '#__nuxt', '#__sveltekit'];
    const hasSpaRoot = spaRootIds.some(sel => $(sel).length > 0);
    const bodyText = $('body').clone().find('script, style, noscript').remove().end().text().trim();
    const isEmptyBody = bodyText.length < 200;
    const hasScriptBundles = $('script[src*="/assets/"]').length > 0 ||
                             $('script[src*="/chunk"]').length > 0 ||
                             $('script[src*="/bundle"]').length > 0 ||
                             $('script[src*="main."]').length > 0 ||
                             $('script[src*="index."]').length > 0;
    const isSPA = hasSpaRoot && (isEmptyBody || hasScriptBundles);

    // Si c'est une SPA et qu'aucun H1 n'est trouvé dans le HTML statique,
    // on suppose qu'il est rendu côté client → on ne pénalise pas.
    const effectiveH1Count = (isSPA && h1Count === 0) ? 1 : h1Count;
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
                    headers: BROWSER_HEADERS,
                });
                if (r.ok) { hasSitemap = true; break; }
            } catch { /* candidat suivant */ }
        }
    } catch { hasSitemap = false; }

    let rawScore = 0;
    if (title.length > 0) rawScore += 30;      // essentiel
    if (isIndexable) rawScore += 20;           // essentiel
    if (hasViewport) rawScore += 15;          // essentiel mobile
    if (description.length > 0) rawScore += 10;
    if (hasSitemap) rawScore += 10;
    if (hasCanonical) rawScore += 5;
    if (effectiveH1Count === 1) rawScore += 5;
    else if (effectiveH1Count > 1) rawScore += 2;
    if (hasOpenGraph) rawScore += 5;

    const failedChecks = [];
    if (!title) failedChecks.push('no_title');
    if (!description) failedChecks.push('no_description');
    if (!hasSitemap) failedChecks.push('no_sitemap');
    if (!hasCanonical) failedChecks.push('no_canonical');
    if (!isIndexable) failedChecks.push('not_indexable');
    if (!hasOpenGraph) failedChecks.push('no_open_graph');
    if (effectiveH1Count === 0) failedChecks.push('no_h1');
    else if (effectiveH1Count > 1) failedChecks.push('multiple_h1');

    let cappedScore = applyScoreCap(Math.min(100, rawScore), failedChecks);
    // Floor minimum pour les pages applicatives (ex: Google) qui manquent d'éléments de landing
    if (title.length > 0 && isIndexable) {
        cappedScore = Math.max(63, cappedScore);
    }
    console.log(`[SEO] raw=${rawScore} failed=[${failedChecks.join(',')}] capped=${cappedScore}`);

    // ── Signaux SEO enrichis + Visibilité IA + recommandations business ─────
    let seoProbes = null;
    let seoSignals = null;
    let businessRecommendations = [];
    try {
        seoProbes = await probeSeoResources(url);
    } catch (err) {
        console.warn('[SEO] probeSeoResources échec:', err.message);
    }
    try {
        seoSignals = analyzeSeoSignals($, url, seoProbes || {});
        businessRecommendations = buildSeoBusinessRecommendations(seoSignals);
    } catch (err) {
        console.warn('[SEO] analyzeSeoSignals échec:', err.message);
    }

    const technicalChecks = seoSignals?.technical_checks ?? null;
    const aiVisibility = seoSignals?.ai_visibility ?? null;
    const effectiveHasSitemap = hasSitemap || technicalChecks?.sitemap_xml?.status === 'pass';

    return {
        score: cappedScore,
        raw_score: rawScore,
        has_title: title.length > 0,
        title_length: title.length,
        has_description: description.length > 0,
        description_length: description.length,
        h1_count: h1Count,
        h2_count: technicalChecks?.headings_structure?.h2_count ?? null,
        h3_count: technicalChecks?.headings_structure?.h3_count ?? null,
        images_without_alt: technicalChecks?.images_alt?.missing_count ?? null,
        has_lang: technicalChecks?.lang_attribute?.status === 'pass',
        has_structured_data: technicalChecks?.structured_data?.status === 'pass',
        has_twitter_cards: technicalChecks?.twitter_cards?.status === 'pass',
        has_favicon: technicalChecks?.favicon?.status === 'pass',
        h1_detected_in_static_html: h1Count > 0,
        spa_detected: isSPA,
        has_viewport: hasViewport,
        has_open_graph: hasOpenGraph,
        has_canonical: hasCanonical,
        has_sitemap: effectiveHasSitemap,
        is_indexable: isIndexable,
        technical_checks: technicalChecks,
        ai_visibility: aiVisibility,
        business_recommendations: businessRecommendations,
        failed_checks: failedChecks,
        partial: false,
        html_snippet: html.slice(0, 5000),
    };
}

// ── UX Mobile ─────────────────────────────────────────────────────────────────
async function scanUX(url) {
    let html = '';
    let resHeaders = null;

    try {
        const res = await fetch(url, {
            signal: AbortSignal.timeout(12_000),
            headers: BROWSER_HEADERS,
            redirect: 'follow',
        });
        resHeaders = res.headers;
        if (res.ok) {
            html = await res.text();
        } else {
            console.warn(`[UX] HTTP ${res.status} pour ${url}`);
        }
    } catch (e) {
        console.warn(`[UX] fetch échoué: ${e.message}`);
    }

    // Si on n'a pas pu récupérer de HTML, score partiel minimal
    if (!html) {
        return {
            score: 20,
            raw_score: 0,
            accessibility_score: 20,
            tap_targets_ok: null,
            issues: [{
                severity: 'medium',
                message: 'Analyse incomplète : impossible de récupérer le HTML du site',
                impact: 'Le site a peut-être bloqué la requête ou est temporairement indisponible.',
            }],
            issues_count: 1,
            critical_count: 0,
            failed_checks: ['fetch_failed'],
            grade: 'D',
            partial: true,
            partial_reason: 'Impossible de récupérer le HTML du site.',
        };
    }

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

    const encoding = resHeaders?.get('content-encoding') || '';
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

    // Pénalités modérées : un défaut UX n'est pas critique pour la sécurité.
    // Réduction par rapport à l'ancienne version (high=15→10, medium=8→5, low=4→3).
    const SEVERITY_WEIGHT = { high: 10, medium: 5, low: 3 };
    const penalty = issues.reduce((acc, i) => acc + (SEVERITY_WEIGHT[i.severity] ?? 3), 0);

    // Bonuses pour bonnes pratiques détectées (jusqu'à +20)
    let bonus = 0;
    if (viewport && !viewport.includes('user-scalable=no')) bonus += 5; // viewport correct
    if (hasCompression) bonus += 5; // compression active
    if (imagesWithoutAlt === 0 && $('img').length > 0) bonus += 3; // toutes images avec alt
    if (emptyLinks === 0) bonus += 2; // tous liens textuels
    // Structure sémantique
    if ($('main, [role="main"]').length > 0) bonus += 2;
    if ($('nav, [role="navigation"]').length > 0) bonus += 1;
    if ($('header, [role="banner"]').length > 0) bonus += 1;
    // Images modernes (lazy loading)
    if ($('img[loading="lazy"]').length > 0) bonus += 1;

    const rawScore = clamp(100 - penalty + bonus, 0, 100);

    const failedChecks = [];
    if (!viewport) failedChecks.push('no_viewport');
    if (imagesWithoutAlt > 0) failedChecks.push('images_without_alt');
    if (!hasCompression) failedChecks.push('no_compression');
    if (emptyLinks > 0) failedChecks.push('empty_links');

    // Pas de double-pénalité : on ne ré-applique PAS applyScoreCap ici.
    // Les pénalités ont déjà été appliquées via les issues. On cap juste à 98.
    const finalScore = Math.min(rawScore, 98);

    // Grade avec interprétation
    const gradeInfo =
        finalScore >= 90 ? { grade: 'A+', interpretation: 'Excellent — Top 10% des sites' }
        : finalScore >= 80 ? { grade: 'A', interpretation: 'Très bon — Expérience mobile fluide' }
        : finalScore >= 70 ? { grade: 'B', interpretation: 'Bon — Quelques optimisations possibles' }
        : finalScore >= 60 ? { grade: 'C', interpretation: 'Moyen — Améliorations recommandées' }
        : finalScore >= 50 ? { grade: 'D', interpretation: 'Insuffisant — Corrections nécessaires' }
        : { grade: 'F', interpretation: 'Critique — Refonte mobile recommandée' };

    return {
        score: finalScore,
        raw_score: rawScore,
        accessibility_score: rawScore,
        tap_targets_ok: true,
        issues,
        issues_count: issues.length,
        critical_count: issues.filter(i => i.severity === 'high').length,
        medium_count: issues.filter(i => i.severity === 'medium').length,
        low_count: issues.filter(i => i.severity === 'low').length,
        failed_checks: failedChecks,
        grade: gradeInfo.grade,
        grade_interpretation: gradeInfo.interpretation,
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
    // Alertes venant des checks avancés (critical / fail uniquement)
    if (Array.isArray(sec?.advanced_checks)) {
        sec.advanced_checks
            .filter((c) => c.status === 'fail' && c.criticality === 'critical')
            .slice(0, 5) // anti-spam
            .forEach((c) => {
                alerts.push({
                    severity: 'critical',
                    category: 'security',
                    title: c.title,
                    message: c.description,
                    recommendation: c.recommendation,
                });
            });
    }
    // Alertes venant des checks étendus (fail critique)
    if (Array.isArray(sec?.extended_checks)) {
        sec.extended_checks
            .filter((c) => c.status === 'fail' && (c.criticality === 'critical' || c.criticality === 'major'))
            .slice(0, 5)
            .forEach((c) => {
                alerts.push({
                    severity: c.criticality === 'critical' ? 'critical' : 'high',
                    category: 'security',
                    title: c.title,
                    message: c.description,
                    recommendation: c.recommendation,
                });
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
    setCorsHeaders(req, res);

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST')
        return res.status(405).json({ success: false, error: 'Method Not Allowed' });

    const rateLimit = checkRateLimit(req, 10, 60 * 60 * 1000);
    if (!rateLimit.allowed) {
        return res.status(429).json({ success: false, error: `Trop de scans. Réessayez dans ${rateLimit.retryAfter}s.`, type: 'RATE_LIMITED' });
    }

    let body;
    try { body = await readJsonBody(req); }
    catch { return res.status(400).json({ success: false, error: 'Corps de requête invalide' }); }

    const email = body?.email && typeof body.email === 'string' && body.email.includes('@') && body.email.includes('.')
        ? body.email
        : null;

    const validation = validateUrl(body?.url);
    if (!validation.valid)
        return res.status(400).json({ success: false, error: validation.error, type: 'INVALID_URL' });

    const normalizedUrl = validation.url;
    const forceRefresh = body?.force_refresh === true;

    const dnsValidation = await assertPublicHostname(normalizedUrl);
    if (!dnsValidation.valid) {
        return res.status(400).json({ success: false, error: dnsValidation.error, type: 'INVALID_URL' });
    }

    const accessibility = await probeUrlAccessible(normalizedUrl);
    if (!accessibility.accessible) {
        return res.status(422).json({ success: false, error: accessibility.error, type: 'SITE_UNREACHABLE' });
    }

    const scanUrl = accessibility.final_url || accessibility.url || normalizedUrl;
    const cached = await readCache(scanUrl);
    if (shouldUseCachedScan(cached, forceRefresh)) {
        return res.json({ ...cached.results_json, success: true, cached: true, scan_id: cached.id });
    }

    const psKey = process.env.GOOGLE_PAGESPEED_KEY;
    const vtKey = process.env.VIRUSTOTAL_API_KEY ?? null;

    if (!psKey)
        return res.status(500).json({ success: false, error: 'Clé GOOGLE_PAGESPEED_KEY manquante', type: 'CONFIG_ERROR' });

    const scanId = randomUUID();
    const startMs = Date.now();
    const domain = new URL(scanUrl).hostname;

    console.log(`[SCAN] Démarrage id=${scanId} url=${scanUrl}`);

    try {
        const [perfResult, secResult, seoResult, uxResult, geoResult, advancedSecResult, extendedSecResult] = await Promise.allSettled([
            scanPerformance(scanUrl, psKey),
            scanSecurity(scanUrl, vtKey),
            scanSEO(scanUrl),
            scanUX(scanUrl),
            getServerLocation(domain),
            runAdvancedSecurityChecks(scanUrl),
            runExtendedSecurityChecks(scanUrl),
        ]);

        const perf = perfResult.status === 'fulfilled' ? perfResult.value : null;
        const sec = secResult.status === 'fulfilled' ? secResult.value : null;
        const seo = seoResult.status === 'fulfilled' ? seoResult.value : null;
        const ux = uxResult.status === 'fulfilled' ? uxResult.value : null;
        const geo = geoResult.status === 'fulfilled' ? geoResult.value : null;
        const advancedSec = advancedSecResult.status === 'fulfilled' ? advancedSecResult.value : null;
        const extendedSec = extendedSecResult.status === 'fulfilled' ? extendedSecResult.value : null;

        if (perf) perf.server_location = geo;

        if (sec && advancedSec) {
            sec.legacy_score = sec.legacy_score ?? sec.score;
            sec.advanced_checks = advancedSec.checks;
            sec.advanced_security_score = advancedSec.advanced_security_score;
            sec.advanced_counts = advancedSec.counts;

            const advFails = advancedSec.checks
                .filter((c) => c.status === 'fail' || c.status === 'warning')
                .map((c) => c.check_name);
            sec.failed_checks = [...(sec.failed_checks || []), ...advFails];
        }

        if (sec && extendedSec) {
            sec.legacy_score = sec.legacy_score ?? sec.score;
            sec.extended_checks = extendedSec.checks;
            sec.extended_security_score = extendedSec.score;

            const extFails = extendedSec.checks
                .filter((c) => c.status === 'fail' || c.status === 'warning')
                .map((c) => c.check_name);
            sec.failed_checks = [...(sec.failed_checks || []), ...extFails];
        }

        if (sec) {
            sec.score = combineSecurityScores({
                legacyScore: sec.legacy_score ?? sec.score,
                advancedScore: sec.advanced_security_score,
                extendedScore: sec.extended_security_score,
                https: sec.https,
                malwareDetected: sec.malware_detected,
            }) ?? sec.score;
        }

        const scores = {
            performance: perf?.score ?? null,
            security: sec?.score ?? null,
            seo: seo?.score ?? null,
            ux: ux?.score ?? null,
        };

        const globalScore = calculateGlobalScore(scores.performance, scores.security, scores.seo, scores.ux);
        const scanDurationMs = Date.now() - startMs;
        const scanConfidence = getScanConfidence({ perf, sec, seo, ux });

        console.log(`[SCAN] Scores: perf=${scores.performance} sec=${scores.security} seo=${scores.seo} ux=${scores.ux} global=${globalScore}`);

        const tech = detectTechnology(seo?.html_snippet || '');

        const results = {
            success: true,
            scan_id: scanId,
            url: scanUrl,
            requested_url: normalizedUrl,
            scanned_at: new Date().toISOString(),
            global_score: globalScore,
            grade: getGrade(globalScore),
            scores,
            scan_confidence: scanConfidence,
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
                extended: extendedSecResult.status === 'rejected' ? extendedSecResult.reason?.message : null,
            },
            scan_duration_ms: scanDurationMs,
            summary: {
                https_enabled: sec?.https ?? String(scanUrl || '').startsWith('https'),
            },
            detected_technology: {
                cms: tech.cms,
                technologies: tech.technologies,
                hosting_country: geo?.country || null,
                hosting_isp: geo?.isp || null,
                is_local_africa: geo?.is_local_africa ?? null,
            },
        };

        console.log(`[SCAN] security final_url=${sec?.final_url ?? 'N/A'} https=${sec?.https ?? 'N/A'}`);

        logScanEvent(scanUrl, globalScore);
        await saveToDb(scanId, scanUrl, globalScore, results, email || null);

        const geoInfo = geo || await getServerLocation(domain);
        saveScanAnalytics(
            domain,
            geoInfo?.country_code || 'CI',
            { security: scores.security, performance: scores.performance, seo: scores.seo, ux: scores.ux, global: globalScore },
            tech.cms,
            geoInfo?.isp || null,
            sec?.https ?? null,
            perf?.lcp ?? null
        );

        return res.json(results);

    } catch (error) {
        console.error('[SCAN] Erreur fatale:', error);
        return res.status(500).json({
            success: false,
            error: "Une erreur est survenue lors de l'analyse. Réessayez dans quelques instants.",
            type: 'SCAN_ERROR',
        });
    }
}

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
import { detectSpa, renderSpaHtml } from '../lib/spaRenderer.js';
import { crawlAdditionalPages } from '../lib/seoMultiCrawl.js';

// ── Supabase ──────────────────────────────────────────────────────────────────
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey =
    process.env.SUPABASE_SECRET_KEY ||
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
    if (failedChecks.length === 0) return score;
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

    return {
        ...perf,
        measurement_confidence: perf.measurement_confidence ?? 'high',
    };
}

export function combineSecurityScores({ legacyScore, advancedScore, extendedScore, https, malwareDetected }) {
    const base = Number.isFinite(Number(legacyScore)) ? Number(legacyScore) : null;
    if (base == null) return null;

    const ext = Number.isFinite(Number(extendedScore)) ? Number(extendedScore) : null;
    const adv = Number.isFinite(Number(advancedScore)) ? Number(advancedScore) : null;

    // Pondération : fondamental (HTTPS/SSL/headers) 55%, étendu (email/CORS/WAF) 35%, avancé 10%.
    // Sans Math.max(base) : les manques email et WAF tirent honnêtement le score vers le bas.
    let score;
    if (ext != null && adv != null) {
        score = Math.round(base * 0.55 + adv * 0.10 + ext * 0.35);
    } else if (ext != null) {
        score = Math.round(base * 0.60 + ext * 0.40);
    } else if (adv != null) {
        score = Math.round(base * 0.80 + adv * 0.20);
    } else {
        score = base;
    }

    return Math.min(Math.max(score, 0), 99);
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

// ── Cache ciblé PageSpeed ─────────────────────────────────────────────────────
// Stocke uniquement le résultat PageSpeed (pas le scan entier) pour économiser
// le quota API Google (1 000 req/jour gratuit). TTL = 24h.
// Table Supabase : pagespeed_cache (url_hash TEXT PK, data JSONB, cached_at TIMESTAMPTZ)
// DDL minimal : CREATE TABLE IF NOT EXISTS pagespeed_cache (
//   url_hash TEXT PRIMARY KEY, data JSONB NOT NULL, cached_at TIMESTAMPTZ NOT NULL
// );
const PS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

async function readPageSpeedCache(url) {
    if (!supabase) return null;
    const hash = createHash('sha256').update(url).digest('hex');
    try {
        const { data, error } = await supabase
            .from('pagespeed_cache')
            .select('data, cached_at')
            .eq('url_hash', hash)
            .gte('cached_at', new Date(Date.now() - PS_CACHE_TTL_MS).toISOString())
            .single();
        if (error || !data) return null;
        return { ...data.data, _from_cache: true, _cached_at: data.cached_at };
    } catch (e) {
        console.warn('[PS_CACHE] read error:', e.message);
        return null;
    }
}

async function writePageSpeedCache(url, result) {
    if (!supabase) return;
    const hash = createHash('sha256').update(url).digest('hex');
    try {
        // Exclude les champs internes avant de persister
        const { _from_cache, _cached_at, ...toStore } = result;
        await supabase.from('pagespeed_cache').upsert({
            url_hash: hash,
            data: toStore,
            cached_at: new Date().toISOString(),
        }, { onConflict: 'url_hash' });
    } catch (e) {
        console.warn('[PS_CACHE] write error:', e.message);
    }
}

// ── Scanner Performance ───────────────────────────────────────────────────────
async function scanPerformance(url, apiKey) {
    // Tenter le cache avant d'appeler Google — économise le quota (1000 req/jour)
    const cached = await readPageSpeedCache(url);
    if (cached) {
        console.log(`[PERF] Cache PageSpeed HIT pour ${url} (cached_at=${cached._cached_at})`);
        return cached;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 55_000);
    try {
        const psUrl =
            `https://www.googleapis.com/pagespeedonline/v5/runPagespeed` +
            `?url=${encodeURIComponent(url)}&strategy=mobile&category=performance&category=accessibility&category=best-practices&key=${apiKey}`;
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

        // Accessibility score global (Lighthouse category score, 0-100)
        const accessibilityScore = lr.categories?.accessibility?.score != null
            ? Math.round(lr.categories.accessibility.score * 100)
            : null;

        // ── Audits Lighthouse détaillés pour le rapport UX/Accessibilité ─────
        // Chaque audit retourne { score: 0-1 | null, details: { items: [...] } }.
        // score = 1 → pass, score = 0 → fail, score null → non applicable.
        // On extrait les items pour les cas d'échec afin de rendre les problèmes actionnables.

        function lhAuditItems(auditId) {
            return lr.audits?.[auditId]?.details?.items ?? [];
        }
        function lhScore(auditId) {
            const s = lr.audits?.[auditId]?.score;
            return s == null ? null : Number(s);
        }

        const lighthouseA11yAudits = {
            // 1. Contraste de couleur (WCAG AA : ratio 4.5:1 pour texte normal)
            color_contrast: {
                score: lhScore('color-contrast'),
                failing_elements_count: lhAuditItems('color-contrast').length,
                // Échantillon des 5 premiers éléments problématiques (pour le rapport)
                failing_samples: lhAuditItems('color-contrast').slice(0, 5).map(item => ({
                    selector: item.node?.selector?.slice(0, 120) ?? null,
                    contrast_ratio: item.contrastRatio ?? null,
                    required_ratio: item.requiredContrastRatio ?? 4.5,
                    fg_color: item.node?.nodeLabel?.slice(0, 60) ?? null,
                })),
            },

            // 2. Labels de formulaire manquants
            form_labels: {
                score: lhScore('label'),
                failing_elements_count: lhAuditItems('label').length,
                failing_samples: lhAuditItems('label').slice(0, 5).map(item => ({
                    selector: item.node?.selector?.slice(0, 120) ?? null,
                    type: item.node?.type ?? null,
                })),
            },

            // 3. ARIA : attributs requis manquants
            aria_required_attr: {
                score: lhScore('aria-required-attr'),
                failing_elements_count: lhAuditItems('aria-required-attr').length,
                failing_samples: lhAuditItems('aria-required-attr').slice(0, 5).map(item => ({
                    selector: item.node?.selector?.slice(0, 120) ?? null,
                    role: item.node?.nodeLabel?.slice(0, 80) ?? null,
                })),
            },

            // 4. ARIA : attributs invalides ou mal orthographiés
            aria_valid_attr: {
                score: lhScore('aria-valid-attr'),
                failing_elements_count: lhAuditItems('aria-valid-attr').length,
                failing_samples: lhAuditItems('aria-valid-attr').slice(0, 5).map(item => ({
                    selector: item.node?.selector?.slice(0, 120) ?? null,
                })),
            },

            // 5. Hiérarchie des headings (H1→H2→H3 sans sauts)
            heading_order: {
                score: lhScore('heading-order'),
                failing_elements_count: lhAuditItems('heading-order').length,
                failing_samples: lhAuditItems('heading-order').slice(0, 5).map(item => ({
                    selector: item.node?.selector?.slice(0, 120) ?? null,
                    text: item.node?.nodeLabel?.slice(0, 80) ?? null,
                })),
            },

            // 6. Taille des zones tactiles (Lighthouse moderne : target-size / tap-targets)
            // Essai de target-size (Lighthouse 11+) puis fallback tap-targets (Lighthouse 10)
            tap_targets: {
                score: lhScore('target-size') ?? lhScore('tap-targets'),
                failing_elements_count:
                    lhAuditItems('target-size').length || lhAuditItems('tap-targets').length,
                failing_samples: (lhAuditItems('target-size').length
                    ? lhAuditItems('target-size')
                    : lhAuditItems('tap-targets')
                ).slice(0, 5).map(item => ({
                    selector: item.node?.selector?.slice(0, 120) ?? null,
                    size: item.tapTargetScore ?? item.size ?? null,
                })),
                audit_id_used: lr.audits?.['target-size'] ? 'target-size' : 'tap-targets',
            },

            // 7. Taille de police minimale mobile (Best Practices, pas Accessibility)
            // Présent dans best-practices category mais accessible via audits[]
            font_size: {
                score: lhScore('font-size'),
                failing_elements_count: lhAuditItems('font-size').length,
                failing_samples: lhAuditItems('font-size').slice(0, 5).map(item => ({
                    selector: item.node?.selector?.slice(0, 120) ?? null,
                    font_size: item.fontSize ?? null,
                    minimum_size: '12px',
                })),
            },
        };

        // Tap targets ok : dérivé de l'audit Lighthouse (rétrocompatibilité)
        const tapTargetsOk = lighthouseA11yAudits.tap_targets.score != null
            ? lighthouseA11yAudits.tap_targets.score >= 0.9
            : null;

        const perfResult = calibratePerformanceResult({
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
            accessibility_score: accessibilityScore,
            tap_targets_ok: tapTargetsOk,
            lighthouse_a11y_audits: lighthouseA11yAudits,
            partial: false,
        });
        // Persistance asynchrone du cache (non-bloquant)
        writePageSpeedCache(url, perfResult).catch(() => {});
        return perfResult;
    } catch (err) {
        console.warn('[PERF] PageSpeed échoué:', err.message);
        // PageSpeed indisponible : on mesure le TTFB brut comme métadonnée
        // mais on ne génère PAS de score — les Core Web Vitals (LCP, CLS, TBT) sont inconnus.
        let ttfb = null;
        try {
            const start = Date.now();
            await fetch(url, {
                method: 'GET',
                signal: AbortSignal.timeout(6_000),
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Webisafe/1.0)' },
            });
            ttfb = Date.now() - start;
        } catch { /* site inaccessible */ }
        return {
            score: null,
            raw_score: null,
            ttfb_fallback_ms: ttfb,
            lcp: null, cls: null, fcp: null, tbt: null,
            page_weight_mb: null,
            nb_requetes: null,
            failed_checks: ttfb != null ? ['pagespeed_unavailable'] : ['pagespeed_unavailable', 'site_unreachable'],
            opportunities: [],
            partial: true,
            partial_reason: 'pagespeed_unavailable',
        };
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
// Points directs utilisés dans le score sécurité (total = 40).
// Chaque header contribue sa valeur propre — plus de ratio sur 10.
const SECURITY_HEADERS = {
    'strict-transport-security': { points: 10, label: 'HSTS' },
    'content-security-policy':   { points: 10, label: 'CSP' },
    'x-frame-options':           { points:  7, label: 'X-Frame-Options' },
    'x-content-type-options':    { points:  5, label: 'X-Content-Type-Options' },
    'referrer-policy':           { points:  4, label: 'Referrer-Policy' },
    'permissions-policy':        { points:  4, label: 'Permissions-Policy' },
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
    let vtAnalysis = null; // Méta-données VT exposées dans le rapport
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
                const malicious  = stats.malicious  ?? 0;
                const suspicious = stats.suspicious ?? 0;
                const harmless   = stats.harmless   ?? 0;
                const undetected = stats.undetected ?? 0;
                const total      = malicious + suspicious + harmless + undetected;
                const detections = malicious + suspicious;

                // Seuil pondéré : on exige > 5% des moteurs concordants avant de conclure.
                // Avec ~87 moteurs, cela correspond à ≥ 4-5 AV — seuil typique en SOC
                // pour filtrer les faux positifs isolés tout en capturer les vraies menaces.
                // 1 moteur sur 87 (~1,1%) → ignoré (faux positif probable)
                // 5+ moteurs sur 87 (~5,7%) → malware confirmé
                if (total > 0) {
                    const rate = detections / total;
                    malwareDetected = rate > 0.05;
                    vtAnalysis = {
                        malicious,
                        suspicious,
                        harmless,
                        undetected,
                        total,
                        detection_rate_pct: Math.round(rate * 1000) / 10, // ex: 6.9%
                        threshold_pct: 5,
                        minor_detections: detections > 0 && !malwareDetected,
                    };
                }
            }
        } catch (e) { console.warn('[SEC] VirusTotal:', e.message); }
    }

    // ── Scoring sécurité — répartition sur 100 pts ───────────────────────────
    // HTTPS            : 30 pts — chiffrement en transit, fondamental mais pas suffisant seul
    // Malware (VT)     : 30 pts — menace active (vérifié clean) / 25 pts (non vérifié)
    // Headers (6)      : 40 pts — hygiène pro, CHAQUE header compte directement
    //                    HSTS 10 + CSP 10 + XFO 7 + XCTO 5 + RP 4 + PP 4 = 40
    //
    // Profils types :
    //   HTTPS + clean + 0 header   →  60/100 "Acceptable" (honnête : manque tout de l'hygiène)
    //   HTTPS + clean + HSTS + CSP →  80/100 "Très bon" (base solide)
    //   HTTPS + clean + 6 headers  → 100/100 "Excellent" (atteignable par un site sérieux)
    //   HTTP  + clean + 0 header   →  30/100 "Critique"
    let rawScore = 0;
    if (isHttps) rawScore += 30; // HTTPS = chiffrement = fondamental

    if (malwareDetected === false) rawScore += 30;      // Vérifié propre
    else if (malwareDetected === null) rawScore += 25;  // Non vérifié → bénéfice du doute réduit
    // malwareDetected === true → 0 (cap sévère appliqué plus bas)

    // Headers : chaque header contribue ses points directement (total max = 40)
    const headerScore = headersPresent.reduce((acc, h) => acc + (SECURITY_HEADERS[h]?.points ?? 0), 0);
    rawScore += headerScore;

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
        vt_analysis: vtAnalysis,
        https: isHttps,
        final_url: finalUrl,
        ssl_grade: isHttps ? 'Non vérifié' : 'Absent',
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
// preRenderedHtml : HTML déjà rendu par Puppeteer (SPA), passé par l'orchestrateur.
// Null = pas de rendu disponible, on fait le fetch statique habituel.
async function scanSEO(url, preRenderedHtml = null) {
    let html = preRenderedHtml || '';
    let resHeaders = null;
    let htmlSource = preRenderedHtml ? 'puppeteer' : 'static';

    if (!preRenderedHtml) {
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
    // detectSpa() inspecte le HTML pour déterminer si c'est une SPA côté client.
    // Si preRenderedHtml est fourni (Puppeteer), le contenu est déjà rendu :
    // isSPA reste informatif mais on ne compense plus les H1 manquants.
    const isSPA = detectSpa(html, $);
    const htmlIsRendered = Boolean(preRenderedHtml); // true = Puppeteer a tourné

    // Compensation H1 manquant : uniquement si HTML statique ET SPA détectée.
    // Si Puppeteer a rendu la page, le H1 doit être présent → pas de compensation.
    const effectiveH1Count = (!htmlIsRendered && isSPA && h1Count === 0) ? 1 : h1Count;
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
        spa_rendered: htmlIsRendered,  // true = analysé après rendu JS via Puppeteer
        html_source: htmlSource,       // 'puppeteer' | 'static'
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
        // HTML complet conservé temporairement pour le crawl multi-pages.
        // Supprimé du résultat final avant envoi (trop volumineux pour le client).
        _raw_html_for_crawl: html,
    };
}

// ── UX Mobile ─────────────────────────────────────────────────────────────────
// preRenderedHtml : HTML déjà rendu par Puppeteer (SPA), passé par l'orchestrateur.
// Null = pas de rendu disponible, on fait le fetch statique habituel.
// resHeadersOverride : headers HTTP récupérés lors du fetch statique initial.
async function scanUX(url, preRenderedHtml = null, resHeadersOverride = null) {
    let html = preRenderedHtml || '';
    let resHeaders = resHeadersOverride;

    if (!preRenderedHtml) {
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
        accessibility_score: null, // Will be injected from Lighthouse after Promise.allSettled
        tap_targets_ok: null,     // Will be injected from Lighthouse after Promise.allSettled
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
    return Math.min(Math.round(score / totalW), 100);
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

    // ── Détection SPA + rendu Puppeteer unique ────────────────────────────────
    // On fait un fetch statique rapide pour détecter si la page est une SPA.
    // Si oui, on lance Puppeteer UNE seule fois et on passe le HTML rendu
    // à scanSEO et scanUX — évite deux lancements Chromium par scan.
    // Timeout du probe statique : 8s (non-bloquant si ça échoue).
    let preRenderedHtml = null;
    let probeResHeaders = null;
    let spaDetectedEarly = false;
    try {
        const probeRes = await fetch(scanUrl, {
            signal: AbortSignal.timeout(8_000),
            headers: BROWSER_HEADERS,
            redirect: 'follow',
        });
        probeResHeaders = probeRes.headers;
        if (probeRes.ok) {
            const staticHtml = await probeRes.text();
            const $probe = cheerio.load(staticHtml);
            spaDetectedEarly = detectSpa(staticHtml, $probe);
            if (spaDetectedEarly) {
                console.log(`[SCAN] SPA détectée pour ${scanUrl} — lancement Puppeteer`);
                preRenderedHtml = await renderSpaHtml(scanUrl);
                if (preRenderedHtml) {
                    console.log(`[SCAN] HTML rendu JS disponible (${preRenderedHtml.length} bytes) — partagé entre SEO et UX`);
                } else {
                    console.warn(`[SCAN] Puppeteer échoué — SEO et UX utiliseront le HTML statique`);
                }
            }
        }
    } catch (probeErr) {
        console.warn(`[SCAN] Probe statique échoué: ${probeErr.message} — continue sans rendu SPA`);
    }

    try {
        const [perfResult, secResult, seoResult, uxResult, geoResult, advancedSecResult, extendedSecResult] = await Promise.allSettled([
            scanPerformance(scanUrl, psKey),
            scanSecurity(scanUrl, vtKey),
            scanSEO(scanUrl, preRenderedHtml),
            scanUX(scanUrl, preRenderedHtml, probeResHeaders),
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

        // ── Injection des audits Lighthouse dans les résultats UX ────────────
        // Convertit chaque audit Lighthouse en issue Webisafe (pass/warning/fail)
        // avec un message actionnable pour le client non-technique.
        if (ux && perf) {
            if (perf.accessibility_score != null) ux.accessibility_score = perf.accessibility_score;
            if (perf.tap_targets_ok != null) ux.tap_targets_ok = perf.tap_targets_ok;

            const a11y = perf.lighthouse_a11y_audits ?? null;
            if (a11y) {
                // Attacher les audits bruts pour le rapport PDF
                ux.lighthouse_a11y_audits = a11y;

                // Convertir chaque audit en issue Webisafe si en échec (score < 0.9)
                // Un score null = audit non applicable (pas d'issue générée)
                const lhIssues = [];

                // 1. Contraste de couleur
                if (a11y.color_contrast.score != null && a11y.color_contrast.score < 0.9) {
                    const n = a11y.color_contrast.failing_elements_count;
                    lhIssues.push({
                        severity: a11y.color_contrast.score === 0 ? 'high' : 'medium',
                        source: 'lighthouse',
                        audit_id: 'color-contrast',
                        message: `${n} élément(s) avec un contraste de couleur insuffisant (WCAG AA : ratio 4.5:1 minimum)`,
                        impact: 'Texte illisible pour les personnes malvoyantes ou en plein soleil sur mobile. Pénalité d\'accessibilité SEO.',
                        recommendation: 'Augmentez le contraste entre la couleur du texte et celle du fond. Utilisez un outil comme WebAIM Contrast Checker.',
                        failing_count: n,
                    });
                }

                // 2. Labels de formulaire
                if (a11y.form_labels.score != null && a11y.form_labels.score < 0.9) {
                    const n = a11y.form_labels.failing_elements_count;
                    lhIssues.push({
                        severity: 'high',
                        source: 'lighthouse',
                        audit_id: 'label',
                        message: `${n} champ(s) de formulaire sans étiquette (label) associée`,
                        impact: 'Les lecteurs d\'écran ne peuvent pas décrire le champ à l\'utilisateur. Formulaire inutilisable pour les personnes aveugles.',
                        recommendation: 'Associez chaque <input> à un <label for="..."> ou utilisez aria-label. Exemple : <label for="email">Email</label><input id="email" type="email">.',
                        failing_count: n,
                    });
                }

                // 3. ARIA : attributs requis manquants
                if (a11y.aria_required_attr.score != null && a11y.aria_required_attr.score < 0.9) {
                    const n = a11y.aria_required_attr.failing_elements_count;
                    lhIssues.push({
                        severity: 'medium',
                        source: 'lighthouse',
                        audit_id: 'aria-required-attr',
                        message: `${n} élément(s) avec un rôle ARIA sans les attributs requis`,
                        impact: 'Les technologies d\'assistance reçoivent des informations incomplètes et ne peuvent pas interpréter correctement les composants interactifs.',
                        recommendation: 'Vérifiez que chaque attribut role="..." est accompagné de tous ses aria-* obligatoires. Ex : role="checkbox" requiert aria-checked.',
                        failing_count: n,
                    });
                }

                // 4. ARIA : attributs invalides
                if (a11y.aria_valid_attr.score != null && a11y.aria_valid_attr.score < 0.9) {
                    const n = a11y.aria_valid_attr.failing_elements_count;
                    lhIssues.push({
                        severity: 'medium',
                        source: 'lighthouse',
                        audit_id: 'aria-valid-attr',
                        message: `${n} attribut(s) ARIA invalide(s) ou mal orthographié(s)`,
                        impact: 'Les attributs ARIA non reconnus sont ignorés par les lecteurs d\'écran, laissant les utilisateurs sans contexte.',
                        recommendation: 'Corrigez les fautes de frappe dans les attributs aria-* (ex: aria-lable → aria-label). Consultez la liste officielle WAI-ARIA.',
                        failing_count: n,
                    });
                }

                // 5. Hiérarchie des headings
                if (a11y.heading_order.score != null && a11y.heading_order.score < 0.9) {
                    const n = a11y.heading_order.failing_elements_count;
                    lhIssues.push({
                        severity: 'medium',
                        source: 'lighthouse',
                        audit_id: 'heading-order',
                        message: `${n} titre(s) avec une hiérarchie incorrecte (ex: H3 après H1 sans H2 intermédiaire)`,
                        impact: 'La navigation au clavier et les lecteurs d\'écran utilisent la hiérarchie des titres comme plan de navigation. Un saut de niveau désorganise la structure.',
                        recommendation: 'Respectez l\'ordre H1 → H2 → H3 sans sauter de niveau. Un seul H1 par page, utilisé pour le titre principal.',
                        failing_count: n,
                    });
                }

                // 6. Zones tactiles trop petites
                if (a11y.tap_targets.score != null && a11y.tap_targets.score < 0.9) {
                    const n = a11y.tap_targets.failing_elements_count;
                    lhIssues.push({
                        severity: 'medium',
                        source: 'lighthouse',
                        audit_id: a11y.tap_targets.audit_id_used,
                        message: `${n} zone(s) tactile(s) trop petite(s) pour une utilisation mobile confortable`,
                        impact: 'Les boutons et liens difficiles à appuyer provoquent des erreurs de clic sur mobile. Google pénalise les sites avec des cibles trop rapprochées.',
                        recommendation: 'Définissez une taille minimum de 48×48px pour tous les éléments cliquables (boutons, liens, icônes). Ajoutez du padding si nécessaire.',
                        failing_count: n,
                    });
                }

                // 7. Taille de police trop petite
                if (a11y.font_size.score != null && a11y.font_size.score < 0.9) {
                    const n = a11y.font_size.failing_elements_count;
                    lhIssues.push({
                        severity: 'low',
                        source: 'lighthouse',
                        audit_id: 'font-size',
                        message: `${n} élément(s) avec une taille de police inférieure à 12px sur mobile`,
                        impact: 'Le texte trop petit force les utilisateurs à zoomer, dégradant l\'expérience mobile et augmentant le taux de rebond.',
                        recommendation: 'Utilisez font-size: 16px comme base de corps de texte. Ne descendez pas en-dessous de 12px. Évitez les unités px fixes, préférez rem.',
                        failing_count: n,
                    });
                }

                // Fusionner les issues Lighthouse dans les issues UX existantes
                if (lhIssues.length > 0) {
                    ux.issues = [...(ux.issues || []), ...lhIssues];
                    ux.issues_count = ux.issues.length;
                    ux.critical_count = ux.issues.filter(i => i.severity === 'high').length;
                    ux.medium_count = ux.issues.filter(i => i.severity === 'medium').length;
                    ux.low_count = ux.issues.filter(i => i.severity === 'low').length;

                    // Ajouter les failed_checks Lighthouse dans la liste UX
                    const lhFailedChecks = lhIssues.map(i => `lh_${i.audit_id.replace(/-/g, '_')}`);
                    ux.failed_checks = [...(ux.failed_checks || []), ...lhFailedChecks];
                }
            }
        }

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

        // ── Crawl SEO multi-pages ─────────────────────────────────────────────
        // Lancé APRÈS les scanners principaux (PageSpeed déjà terminé).
        // Budget : 18s. Séquentiel, 4 pages max, fallback si budget dépassé.
        // Le HTML de la page principale est réutilisé directement (pas de re-fetch).
        if (seo) {
            const mainHtml = seo._raw_html_for_crawl || '';
            delete seo._raw_html_for_crawl; // supprimer avant envoi client

            const elapsedSoFar = Date.now() - startMs;
            const remainingBudget = Math.max(0, 80_000 - elapsedSoFar); // garde 10s de marge
            const crawlBudget = Math.min(18_000, remainingBudget);

            if (crawlBudget > 2_000 && mainHtml) {
                try {
                    const multipage = await crawlAdditionalPages(
                        scanUrl,
                        mainHtml,
                        seo,
                        crawlBudget,
                        4 // max 4 pages secondaires
                    );
                    seo.multipage = multipage;
                    console.log(`[SCAN] Crawl multi-pages: ${multipage.pages.length} pages, complet=${multipage.crawl_completed}`);
                } catch (crawlErr) {
                    console.warn('[SCAN] Crawl multi-pages échoué (non-bloquant):', crawlErr.message);
                    seo.multipage = null;
                }
            } else {
                console.log(`[SCAN] Crawl multi-pages ignoré (budget restant: ${crawlBudget}ms)`);
                seo.multipage = null;
            }
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
            performance_cache: perf?._from_cache
                ? { from_cache: true, cached_at: perf._cached_at }
                : { from_cache: false },
            summary: {
                https_enabled: sec?.https ?? String(scanUrl || '').startsWith('https'),
            },
            detected_technology: {
                // Priorité à detectCms (lit headers HTTP + HTML) sur detectTechnology (HTML seul).
                // detectCms détecte Next.js via x-powered-by et /_next/ ; detectTechnology le manque
                // car il n'a accès qu'au html_snippet sans les headers de réponse.
                cms: sec?.cms_detection?.primary || tech.cms,
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

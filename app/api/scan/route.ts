import { buildAiAnalysis } from '../../../lib/scanners/ai-analysis.ts';
import { scanPerformance } from '../../../lib/scanners/performance.ts';
import { scanSecurity } from '../../../lib/scanners/security.ts';
import { scanSeo } from '../../../lib/scanners/seo.ts';
import { scanUxMobile } from '../../../lib/scanners/ux-mobile.ts';
import type { CombinedScores, ScanContext, ScannerResult } from '../../../lib/types.ts';
import { capturePageSnapshot, fetchWithTimeout } from '../../../lib/utils/http.ts';
import { consumeRateLimit } from '../../../lib/utils/rate-limiter.ts';
import { clampScore, deriveGrade, extractScanTarget, getEnv, pickIpAddress, resolveDns, validateScanUrl } from '../../../lib/utils/validators.ts';

const SUPPORT_URL = 'https://webisafe.com/support';

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function buildError(code: string, message: string, options: { details?: string; retry_after?: number; partial_data?: unknown } = {}) {
  return jsonResponse(code === 'RATE_LIMIT' ? 429 : 400, {
    success: false,
    error: {
      code,
      message,
      details: options.details,
      retry_after: options.retry_after,
      support_url: SUPPORT_URL,
    },
    partial_data: options.partial_data,
  });
}

function getApisConfig() {
  const env = getEnv();
  return {
    pageSpeedKey: env.VITE_PAGESPEED_API_KEY || env.VITE_GOOGLE_PAGESPEED_KEY || env.GOOGLE_PAGESPEED_KEY,
    googleSafeBrowsingKey: env.VITE_GOOGLE_API_KEY || env.VITE_GOOGLE_SAFE_BROWSING_KEY || env.GOOGLE_API_KEY,
    virusTotalKey: env.VITE_VIRUSTOTAL_API_KEY || env.VIRUSTOTAL_API_KEY,
    geminiKey: env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY,
    appUrl: env.VITE_APP_URL || env.NEXT_PUBLIC_APP_URL || 'http://localhost:5173',
    supabaseUrl: env.VITE_SUPABASE_URL,
    supabaseAnonKey: env.VITE_SUPABASE_ANON_KEY,
  };
}

function defaultScannerResult(): ScannerResult {
  return {
    score: 0,
    metrics: {},
    findings: [],
    recommendations: [],
    apisUsed: [],
    apisFailed: [],
    partial: true,
  };
}

function aggregateScanner(results: PromiseSettledResult<ScannerResult>[]) {
  return results.map((result) => (result.status === 'fulfilled' ? result.value : defaultScannerResult()));
}

function buildScores(performance: ScannerResult, security: ScannerResult, seo: ScannerResult, ux: ScannerResult): CombinedScores {
  const global = clampScore(
    performance.score * 0.3 + security.score * 0.35 + seo.score * 0.2 + ux.score * 0.15
  );
  const { grade, interpretation } = deriveGrade(global);
  return {
    performance: performance.score,
    security: security.score,
    seo: seo.score,
    ux_mobile: ux.score,
    global,
    grade,
    interpretation,
  };
}

function inferUrgency(findings: Array<{ severite: string }>, securityScore: number, malwareDetected: boolean) {
  if (malwareDetected) return 'critique';
  if (findings.some((item) => item.severite === 'critique')) return 'urgent';
  if (securityScore < 55) return 'urgent';
  return findings.length > 3 ? 'modéré' : 'satisfaisant';
}

async function persistScanRecord(payload: Record<string, unknown>) {
  const { supabaseUrl, supabaseAnonKey } = getApisConfig();
  if (!supabaseUrl || !supabaseAnonKey) return null;

  try {
    const response = await fetchWithTimeout(
      `${supabaseUrl}/rest/v1/scans`,
      {
        method: 'POST',
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify(payload),
      },
      8_000
    );

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const rows = (await response.json()) as unknown[];
    return Array.isArray(rows) ? rows[0] : rows;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const ipAddress = pickIpAddress(request.headers);
  const userAgent = request.headers.get('user-agent') || 'Unknown';

  try {
    const body = (await request.json()) as { url?: string };
    const validation = validateScanUrl(body?.url || '');

    if (!validation.ok || !validation.normalizedUrl) {
      return buildError('INVALID_URL', 'URL invalide');
    }

    const target = extractScanTarget(validation.normalizedUrl);
    const dnsOk = await resolveDns(target.hostname);
    if (!dnsOk) {
      return buildError('DNS_ERROR', 'URL invalide', {
        details: `Le domaine ${target.hostname} ne semble pas résolvable.`,
      });
    }

    const rateLimit = await consumeRateLimit(ipAddress, 'free_scan', 5, 3600);
    if (!rateLimit.allowed) {
      return buildError('RATE_LIMIT', 'Limite de scans atteinte pour cette heure.', {
        retry_after: rateLimit.retryAfter,
      });
    }

    const externalApis = getApisConfig();
    const snapshot = await capturePageSnapshot(target.normalizedUrl, 8_000);
    const context: ScanContext = {
      target,
      ipAddress,
      userAgent,
      snapshot,
      externalApis,
      startedAt,
    };

    const settled = await Promise.race([
      Promise.allSettled([
        scanPerformance(context),
        scanSecurity(context),
        scanSeo(context),
        scanUxMobile(context),
      ]),
      new Promise<PromiseSettledResult<ScannerResult>[]>((_, reject) =>
        setTimeout(() => reject(new Error('GLOBAL_TIMEOUT')), 30_000)
      ),
    ]);

    const [performance, security, seo, ux] = aggregateScanner(settled);
    const scores = buildScores(performance, security, seo, ux);
    const findings = [...performance.findings, ...security.findings, ...seo.findings, ...ux.findings].sort((a, b) => {
      const severityRank = { critique: 3, majeure: 2, mineure: 1 } as Record<string, number>;
      return severityRank[b.severite] - severityRank[a.severite];
    });
    const recommendations = [...security.recommendations, ...performance.recommendations, ...seo.recommendations, ...ux.recommendations];
    const malwareDetected = Boolean((security.metrics as { malware?: { detected?: boolean } }).malware?.detected);
    const indexedGoogle = Boolean((seo.metrics as { indexation?: { indexed?: boolean } }).indexation?.indexed);
    const apisUsed = Array.from(new Set([...performance.apisUsed, ...security.apisUsed, ...seo.apisUsed, ...ux.apisUsed]));
    const apisFailed = Array.from(new Set([...performance.apisFailed, ...security.apisFailed, ...seo.apisFailed, ...ux.apisFailed]));
    const partialScan = performance.partial || security.partial || seo.partial || ux.partial || apisFailed.length > 0;
    const aiAnalysis = await buildAiAnalysis({
      context,
      scores,
      findings,
      recommendations,
      metrics: {
        performance: performance.metrics,
        security: security.metrics,
        seo: seo.metrics,
        ux_mobile: ux.metrics,
      },
    });

    const createdAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const scanId = crypto.randomUUID();
    const impactTotalFcfa = aiAnalysis.impact_total.financier_annuel_fcfa;
    const faillesPreview = [...aiAnalysis.failles_critiques, ...aiAnalysis.failles_majeures].slice(0, 3);
    const recommendationsPreview = aiAnalysis.recommandations_prioritaires.slice(0, 3);
    const scanDurationMs = Date.now() - startedAt;

    await persistScanRecord({
      id: scanId,
      url: target.normalizedUrl,
      domain: target.domain,
      scan_type: 'free',
      score_global: scores.global,
      grade: scores.grade,
      performance_score: scores.performance,
      security_score: scores.security,
      seo_score: scores.seo,
      ux_score: scores.ux_mobile,
      metrics: {
        performance: performance.metrics,
        security: security.metrics,
        seo: seo.metrics,
        ux_mobile: ux.metrics,
      },
      ai_analysis: aiAnalysis,
      failles_critiques_count: aiAnalysis.failles_critiques.length,
      failles_majeures_count: aiAnalysis.failles_majeures.length,
      failles_mineures_count: aiAnalysis.failles_mineures.length,
      impact_total_fcfa: impactTotalFcfa,
      malware_detected: malwareDetected,
      indexed_google: indexedGoogle,
      https_enabled: target.httpsEnabled,
      ip_address: ipAddress,
      user_agent: userAgent,
      scan_duration_ms: scanDurationMs,
      apis_used: apisUsed,
      apis_failed: apisFailed,
      partial_scan: partialScan,
      paid: false,
      created_at: createdAt,
      expires_at: expiresAt,
      accessed_count: 0,
    });

    const coreWebVitals = (performance.metrics as {
      core_web_vitals?: {
        lcp?: { value?: number; rating?: string };
        cls?: { value?: number; rating?: string };
        fcp?: { value?: number; rating?: string };
      };
    }).core_web_vitals || {};

    return jsonResponse(200, {
      success: true,
      scan_id: scanId,
      url: target.normalizedUrl,
      domain: target.domain,
      scan_type: 'free',
      scores: {
        global: scores.global,
        grade: scores.grade,
        interpretation: scores.interpretation,
        performance: scores.performance,
        security: scores.security,
        seo: scores.seo,
        ux_mobile: scores.ux_mobile,
      },
      summary: {
        statut_urgence: inferUrgency(findings, scores.security, malwareDetected),
        resume_executif: aiAnalysis.resume_executif,
        failles_critiques: aiAnalysis.failles_critiques.length,
        failles_majeures: aiAnalysis.failles_majeures.length,
        failles_mineures: aiAnalysis.failles_mineures.length,
        impact_total_fcfa: impactTotalFcfa,
        malware_detected: malwareDetected,
        indexed_google: indexedGoogle,
        https_enabled: target.httpsEnabled,
      },
      core_metrics: {
        performance: {
          score: scores.performance,
          core_web_vitals: {
            lcp: { value: coreWebVitals.lcp?.value || 0, rating: coreWebVitals.lcp?.rating || 'unknown', threshold: 2500 },
            cls: { value: coreWebVitals.cls?.value || 0, rating: coreWebVitals.cls?.rating || 'unknown', threshold: 0.1 },
            fcp: { value: coreWebVitals.fcp?.value || 0, rating: coreWebVitals.fcp?.rating || 'unknown', threshold: 1800 },
          },
          poids_page_mb: (performance.metrics as { poids_page?: { total_mb?: number } }).poids_page?.total_mb || 0,
          nb_requetes: (performance.metrics as { poids_page?: { nb_requetes?: number } }).poids_page?.nb_requetes || 0,
        },
        security: {
          score: scores.security,
          ssl_grade: (security.metrics as { ssl?: { grade?: string } }).ssl?.grade || 'N/A',
          headers_manquants: Object.entries((security.metrics as { headers?: Record<string, { present?: boolean }> }).headers || {})
            .filter(([, value]) => !value?.present)
            .map(([key]) => key.toUpperCase())
            .slice(0, 5),
          malware: malwareDetected,
          failles_owasp_count: ((security.metrics as { owasp_failles?: unknown[] }).owasp_failles || []).length,
        },
        seo: {
          score: scores.seo,
          indexed: indexedGoogle,
          sitemap_present: Boolean((seo.metrics as { sitemap?: { present?: boolean } }).sitemap?.present),
          meta_tags_ok: Boolean((seo.metrics as { meta_tags?: { title?: { present?: boolean }; description?: { present?: boolean } } }).meta_tags?.title?.present) &&
            Boolean((seo.metrics as { meta_tags?: { description?: { present?: boolean } } }).meta_tags?.description?.present),
          open_graph: Boolean((seo.metrics as { open_graph?: { present?: boolean } }).open_graph?.present),
        },
        ux_mobile: {
          score: scores.ux_mobile,
          responsive: Boolean((ux.metrics as { responsive?: { viewport_present?: boolean } }).responsive?.viewport_present),
          taille_texte_px: (ux.metrics as { taille_texte?: { body_font_size?: number } }).taille_texte?.body_font_size || 0,
          elements_tactiles_ok: Boolean((ux.metrics as { elements_tactiles?: { min_size_respect?: boolean } }).elements_tactiles?.min_size_respect),
          vitesse_mobile: (ux.metrics as { vitesse_mobile?: { pageSpeed_mobile_score?: number } }).vitesse_mobile?.pageSpeed_mobile_score || 0,
        },
      },
      failles_preview: faillesPreview.map((item) => ({
        titre: item.titre,
        severite: item.severite,
        categorie: item.categorie,
        impact_fcfa: item.impact_financier_fcfa,
        description_courte: item.description_courte || item.description,
      })),
      recommendations_preview: recommendationsPreview.map((item) => ({
        ordre: item.ordre,
        action: item.action,
        impact: item.impact,
        difficulte: item.difficulte,
        temps: item.temps_implementation || item.temps,
      })),
      metadata: {
        scan_duration_ms: scanDurationMs,
        apis_used: apisUsed,
        partial_scan: partialScan,
        created_at: createdAt,
        expires_at: expiresAt,
      },
      upgrade: {
        message: '🔓 Débloquez l’analyse complète',
        inclus_version_payante: [
          '15 failles détaillées avec étapes de correction',
          '12 recommandations prioritaires actionnables',
          'Feuille de route sur 3 mois',
          'Comparaison avec votre secteur',
          'Support technique 48h',
          'Rapport PDF exportable',
        ],
        prix_fcfa: 15000,
        prix_usd: 25,
        reduction_premiere_commande: '20%',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'SCAN_FAILED';
    const code = message === 'GLOBAL_TIMEOUT' ? 'TIMEOUT' : 'SCAN_FAILED';
    return jsonResponse(code === 'TIMEOUT' ? 504 : 500, {
      success: false,
      error: {
        code,
        message: code === 'TIMEOUT' ? 'Le scan a dépassé le délai maximum autorisé.' : 'Le scan n’a pas pu être finalisé.',
        details: message,
        support_url: SUPPORT_URL,
      },
    });
  }
}

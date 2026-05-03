// server/controllers/scanController.js

import { randomUUID } from 'crypto';
import { scanPerformance } from '../scanners/performanceScanner.js';
import { scanSecurity } from '../scanners/securityScanner.js';
import { scanSEO } from '../scanners/seoScanner.js';
import { scanUXMobile } from '../scanners/uxScanner.js';
import { calculateGlobalScore, getGrade } from '../utils/scoreCalculator.js';
import { validateUrl, checkUrlAccessible } from '../utils/validators.js';
import { supabase } from '../config/supabase.js';
import { sendScanResultEmail } from '../services/emailService.js';

// ── Helper : exécute un scanner sans faire planter tout le scan ───────────────
async function safeRun(label, fn) {
  try {
    const result = await fn();
    console.log(`[SCAN] ✅ ${label} terminé — score : ${result?.score ?? 'N/A'}`);
    return { ok: true, data: result };
  } catch (err) {
    console.error(`[SCAN] ❌ ${label} échoué :`, err.message);
    return { ok: false, error: err.message };
  }
}

// ── Helper : sauvegarde DB sans faire planter le scan si Supabase est absent ──
async function saveToDb(scanId, normalizedUrl, globalScore, results, email) {
  if (!supabase) {
    console.warn('[SCAN] Supabase non configuré → sauvegarde désactivée');
    return;
  }
  try {
    const { error: dbError } = await supabase
      .from('scans')
      .insert({
        id: scanId,
        url: normalizedUrl,
        score: globalScore,
        results_json: results,
        paid: false,
        user_email: email || null,
      });

    if (dbError) {
      console.error('[SCAN] ⚠️  Erreur sauvegarde DB :', dbError.message);
    } else {
      console.log(`[SCAN] 💾 Sauvegardé en DB — id=${scanId}`);
    }
  } catch (err) {
    // Ne fait jamais planter le scan si la DB est indisponible
    console.error('[SCAN] ⚠️  Exception sauvegarde DB :', err.message);
  }
}

// ── Helper : lecture cache sans faire planter le scan si Supabase est absent ──
async function readCache(normalizedUrl) {
  if (!supabase) {
    console.warn('[SCAN] Supabase non configuré → cache désactivé');
    return null;
  }
  try {
    const oneHourAgo = new Date(Date.now() - 3_600_000).toISOString();
    const { data, error } = await supabase
      .from('scans')
      .select('id,url,score,results_json,created_at')
      .eq('url', normalizedUrl)
      .gt('created_at', oneHourAgo)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[SCAN] ⚠️  Erreur lecture cache Supabase :', error.message);
      return null;
    }
    return data ?? null;
  } catch (err) {
    console.error('[SCAN] ⚠️  Exception lecture cache :', err.message);
    return null;
  }
}

// ── Controller principal ──────────────────────────────────────────────────────
export async function handleScan(req, res) {
  const { url, email, force_refresh: forceRefresh = false } = req.body ?? {};

  // ── 1) Validation URL ─────────────────────────────────────────────────────
  const validation = validateUrl(url);
  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      error: validation.error,
      type: 'INVALID_URL',
      suggestion: "Vérifiez que l'URL est correcte (ex: https://monsite.ci)",
    });
  }

  const normalizedUrl = validation.url;

  // ── 2) Accessibilité ──────────────────────────────────────────────────────
  let accessibility;
  try {
    accessibility = await checkUrlAccessible(normalizedUrl);
  } catch (err) {
    console.error('[SCAN] ⚠️  checkUrlAccessible a planté :', err.message);
    accessibility = { accessible: false, error: 'Impossible de vérifier le site' };
  }

  if (!accessibility.accessible) {
    return res.status(422).json({
      success: false,
      error: accessibility.error,
      type: 'SITE_UNREACHABLE',
      suggestion: 'Vérifiez que le site est en ligne et réessayez dans quelques minutes',
    });
  }

  // ── 3) Cache 1 heure (Supabase) ───────────────────────────────────────────
  if (!forceRefresh) {
    const cachedScan = await readCache(normalizedUrl);
    if (cachedScan?.results_json) {
      console.log(`[SCAN] ♻️  Cache hit pour ${normalizedUrl}`);
      return res.json({
        ...cachedScan.results_json,
        success: true,
        cached: true,
        scan_id: cachedScan.id,
      });
    }
  } else {
    console.log(`[SCAN] Cache ignoré pour calibration fraîche: ${normalizedUrl}`);
  }

  // ── 4) Clé API Google PageSpeed ───────────────────────────────────────────
  const psKey = process.env.GOOGLE_PAGESPEED_KEY ?? null;
  const vtKey = process.env.VIRUSTOTAL_API_KEY ?? null;

  if (!psKey) {
    console.warn('[SCAN] GOOGLE_PAGESPEED_KEY manquante - fallback local active');
  }

  // ── 5) Exécution des 4 scanners en parallèle ─────────────────────────────
  const scanId = randomUUID();
  const startMs = Date.now();
  console.log(`\n[SCAN] Démarrage — id=${scanId} url=${normalizedUrl}`);

  try {
    const [perfResult, secResult, seoResult, uxResult] = await Promise.allSettled([
      safeRun('Performance', () => scanPerformance(normalizedUrl, psKey)),
      safeRun('Sécurité', () => scanSecurity(normalizedUrl, vtKey)),
      safeRun('SEO', () => scanSEO(normalizedUrl, psKey)),
      safeRun('UX/Mobile', () => scanUXMobile(normalizedUrl, psKey)),
    ]);

    const perf = perfResult.value?.ok ? perfResult.value.data : null;
    const sec = secResult.value?.ok ? secResult.value.data : null;
    const seo = seoResult.value?.ok ? seoResult.value.data : null;
    const ux = uxResult.value?.ok ? uxResult.value.data : null;

    const scores = {
      performance: perf?.score ?? null,
      security: sec?.score ?? null,
      seo: seo?.score ?? null,
      ux: ux?.score ?? null,
    };

    const globalScore = calculateGlobalScore(
      scores.performance,
      scores.security,
      scores.seo,
      scores.ux,
    );

    const scanDurationMs = Date.now() - startMs;
    console.log(`[SCAN] ✅ Terminé en ${scanDurationMs}ms — score global : ${globalScore}`);

    // ── 6) Construction de la réponse ─────────────────────────────────────
    const results = {
      success: true,
      scan_id: scanId,
      url: normalizedUrl,
      global_score: globalScore,
      grade: getGrade(globalScore),
      scores,

      metrics: {
        performance: perf ? {
          lcp: perf.lcp,
          cls: perf.cls,
          fcp: perf.fcp,
          tbt: perf.tbt ?? null,
          tti: perf.tti ?? null,
          page_weight_mb: perf.page_weight_mb,
          opportunities: perf.opportunities ?? [],
          server_location: perf.server_location ?? null,
          partial: perf.partial ?? false,
        } : null,

        security: sec ? {
          malware_detected: sec.malware_detected,
          observatory_score: sec.observatory_score,
          ssl_grade: sec.ssl_grade,
          https: sec.https ?? String(normalizedUrl || '').startsWith('https'),
          final_url: sec.finalUrl ?? null,
          security_grade: sec.security_grade ?? null,
          headers_presents: sec.headers_presents ?? [],
          headers_manquants: sec.headers_manquants ?? [],
          cookie_issues: sec.cookie_issues ?? [],
          ssl_details: sec.ssl_details ?? null,
          sensitive_files: sec.sensitive_files ?? null,
          failles_owasp_count: sec.failles_owasp_count ?? 0,
          partial: sec.partial ?? false,
        } : null,

        seo: seo ? {
          local_score: seo.local_score ?? null,
          pageSpeed_score: seo.pageSpeed_score ?? null,
          has_title: seo.has_title,
          has_description: seo.has_description,
          h1_count: seo.h1_count,
          has_viewport: seo.has_viewport,
          has_open_graph: seo.has_open_graph,
          has_canonical: seo.has_canonical ?? null,
          is_indexable: seo.is_indexable ?? null,
          has_sitemap: seo.has_sitemap ?? false,
          partial: seo.partial ?? false,
        } : null,

        ux: ux ? {
          accessibility_score: ux.accessibility_score,
          tap_targets_ok: ux.tap_targets_ok,
          issues: ux.issues ?? [],
          issues_count: ux.issues_count ?? 0,
          critical_count: ux.critical_count ?? 0,
          grade: ux.grade ?? null,
          partial: ux.partial ?? false,
        } : null,
      },

      critical_alerts: buildCriticalAlerts(sec, ux, perf),

      scanner_errors: {
        performance: perfResult.value?.ok === false ? perfResult.value.error : null,
        security: secResult.value?.ok === false ? secResult.value.error : null,
        seo: seoResult.value?.ok === false ? seoResult.value.error : null,
        ux: uxResult.value?.ok === false ? uxResult.value.error : null,
      },

      scan_duration_ms: scanDurationMs,
      // Résumé rapide pour l'UI
      summary: {
        https_enabled: sec?.https ?? String(normalizedUrl || '').startsWith('https'),
      },
    };

    // ── 7) Sauvegarde DB (ne bloque pas la réponse si ça échoue) ──────────
    await saveToDb(scanId, normalizedUrl, globalScore, results, email);

    // ── 8) Email optionnel (si fourni, fire-and-forget) ───────────────────
    if (email) {
      sendScanResultEmail(email, {
        url: normalizedUrl,
        scores: { global: globalScore, ...scores },
        recommendations: results.recommendations ?? {},
      }).catch((err) => console.error('[EMAIL] ❌ Erreur envoi email :', err.message));
    }

    return res.json(results);

  } catch (error) {
    console.error('[SCAN] ❌ Erreur fatale :', error);
    return res.status(500).json({
      success: false,
      error: "Erreur lors de l'analyse",
      type: 'SCAN_ERROR',
      suggestion: 'Réessayez dans quelques instants.',
    });
  }
}

// ── Construit la liste d'alertes critiques pour l'UI ─────────────────────────
function buildCriticalAlerts(sec, ux, perf) {
  const alerts = [];

  if (sec?.sensitive_files?.critical) {
    alerts.push({
      severity: 'critical',
      category: 'security',
      title: 'Fichiers sensibles accessibles publiquement',
      message: sec.sensitive_files.alert_message,
      files: sec.sensitive_files.exposed_files,
    });
  }

  if (sec?.malware_detected === true) {
    alerts.push({
      severity: 'critical',
      category: 'security',
      title: 'Malware détecté par VirusTotal',
      message: 'Votre site est signalé comme malveillant — risque de blacklistage Google',
    });
  }

  if (perf?.server_location?.latency_warning?.warning) {
    alerts.push({
      severity: 'warning',
      category: 'performance',
      title: 'Serveur géographiquement éloigné',
      message: perf.server_location.latency_warning.message,
      impact: perf.server_location.latency_warning.impact,
      recommendation: perf.server_location.latency_warning.recommendation,
    });
  }

  if (ux?.critical_count > 0) {
    const criticalIssues = (ux.issues ?? []).filter((i) => i.severity === 'high');
    for (const issue of criticalIssues) {
      alerts.push({
        severity: 'high',
        category: 'ux',
        title: issue.message,
        impact: issue.impact,
      });
    }
  }

  return alerts;
}

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

export async function handleScan(req, res) {
  const { url, email } = req.body;

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
  const accessibility = await checkUrlAccessible(normalizedUrl);
  if (!accessibility.accessible) {
    return res.status(422).json({
      success: false,
      error: accessibility.error,
      type: 'SITE_UNREACHABLE',
      suggestion: 'Vérifiez que le site est en ligne et réessayez dans quelques minutes',
    });
  }

  // ── 3) Cache 1 heure (Supabase) ───────────────────────────────────────────
  // IMPORTANT: ton schéma Supabase utilise results_json (jsonb) et user_email
  const oneHourAgo = new Date(Date.now() - 3_600_000).toISOString();

  const { data: cachedScan, error: cacheError } = await supabase
    .from('scans')
    .select('id,url,score,results_json,created_at')
    .eq('url', normalizedUrl)
    .gt('created_at', oneHourAgo)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (cacheError) {
    console.error('[SCAN] ⚠️  Erreur lecture cache Supabase :', cacheError.message);
  }

  if (cachedScan?.results_json) {
    console.log(`[SCAN] ♻️  Cache hit pour ${normalizedUrl}`);

    // On renvoie results_json tel quel (il contient déjà scores/metrics/etc.)
    // et on force cached=true + scan_id cohérent avec l’ID DB.
    return res.json({
      ...cachedScan.results_json,
      success: true,
      cached: true,
      scan_id: cachedScan.id,
    });
  }

  // ── 4) Clés API ───────────────────────────────────────────────────────────
  const psKey = process.env.GOOGLE_PAGESPEED_KEY;
  const vtKey = process.env.VIRUSTOTAL_API_KEY; // peut être vide (le scanner gère)

  if (!psKey) {
    return res.status(500).json({
      success: false,
      error: 'Clé GOOGLE_PAGESPEED_KEY manquante dans .env',
      type: 'CONFIG_ERROR',
    });
  }

  // ── 5) Exécution scans ────────────────────────────────────────────────────
  const scanId = randomUUID();
  const startMs = Date.now();
  console.log(`\n[SCAN] Démarrage — id=${scanId} url=${normalizedUrl}`);

  try {
    const [perfResult, secResult, seoResult, uxResult] = await Promise.allSettled([
      safeRun('Performance', () => scanPerformance(normalizedUrl, psKey)),
      safeRun('Sécurité', () => scanSecurity(normalizedUrl, vtKey)),
      safeRun('SEO', () => scanSEO(normalizedUrl)),
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
          has_title: seo.has_title,
          has_description: seo.has_description,
          h1_count: seo.h1_count,
          has_viewport: seo.has_viewport,
          has_open_graph: seo.has_open_graph,
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
    };

    // ── 6) Sauvegarde DB (alignée sur ton schéma Supabase) ───────────────────
    // Table scans:
    // id (uuid), url (text), score (integer), results_json (jsonb),
    // paid (boolean), user_email (varchar), created_at (timestamptz)
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
    }

    // ── 7) Email (si fourni) ────────────────────────────────────────────────
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
      suggestion: 'Réessayez dans quelques instants. Si le problème persiste, contactez le support.',
    });
  }
}

// ── Construit la liste d'alertes critiques pour l'UI ──────────────────────────
function buildCriticalAlerts(sec, ux, perf) {
  const alerts = [];

  // Fichiers sensibles exposés
  if (sec?.sensitive_files?.critical) {
    alerts.push({
      severity: 'critical',
      category: 'security',
      title: 'Fichiers sensibles accessibles publiquement',
      message: sec.sensitive_files.alert_message,
      files: sec.sensitive_files.exposed_files,
    });
  }

  // Malware détecté
  if (sec?.malware_detected === true) {
    alerts.push({
      severity: 'critical',
      category: 'security',
      title: 'Malware détecté par VirusTotal',
      message: 'Votre site est signalé comme malveillant — risque de blacklistage Google',
    });
  }

  // Serveur loin de l'Afrique (selon ton performanceScanner)
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

  // Problèmes UX critiques
  if (ux?.critical_count > 0) {
    const criticalIssues = (ux.issues || []).filter(i => i.severity === 'high');
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
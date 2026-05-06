// server/controllers/scanController.js

import { randomUUID } from 'crypto';
import { scanPerformance } from '../scanners/performanceScanner.js';
import { scanSecurity } from '../scanners/securityScanner.js';
import { scanSEO } from '../scanners/seoScanner.js';
import { scanUXMobile } from '../scanners/uxScanner.js';
import { fetchPageSpeedData } from '../scanners/pageSpeedScanner.js';
import { runAdvancedSecurityChecks } from '../../api/scanners/security-checks.js';
import { runExtendedSecurityChecks } from '../../api/scanners/extended-security-checks.js';
import { calculateGlobalScore, getGrade } from '../utils/scoreCalculator.js';
import { validateUrl, checkUrlAccessible } from '../utils/validators.js';
import { supabase } from '../config/supabase.js';
import { sendScanResultEmail } from '../services/emailService.js';

function combineSecurityScores({ legacyScore, advancedScore, extendedScore, https, malwareDetected }) {
  const base = Number.isFinite(Number(legacyScore)) ? Number(legacyScore) : null;
  if (base == null) return null;

  // Les scanners avancés/étendus pénalisent les best practices (CSP, HSTS, security.txt...).
  // Pour ne pas écraser un site HTTPS sain qui manque juste de best practices,
  // on plancher l'impact négatif et on pondère majoritairement le legacyScore.
  let blended = base;
  if (Number.isFinite(Number(advancedScore))) {
    const flooredAdvanced = (https && malwareDetected !== true)
      ? Math.max(Number(advancedScore), 50)
      : Number(advancedScore);
    blended = Math.round(blended * 0.85 + flooredAdvanced * 0.15);
  }
  if (Number.isFinite(Number(extendedScore))) {
    const flooredExtended = (https && malwareDetected !== true)
      ? Math.max(Number(extendedScore), 50)
      : Number(extendedScore);
    blended = Math.round(blended * 0.90 + flooredExtended * 0.10);
  }

  let score = Math.max(base, blended);
  // Minimum garanti pour les sites HTTPS sains :
  // HTTPS = chiffrement = pas de risque MITM. Pas de malware = pas de menace active.
  // Un tel site mérite au minimum 70 (acceptable), même sans tous les headers best practice.
  if (https && malwareDetected !== true) score = Math.max(score, 70);
  return Math.min(score, 97);
}

function toGradeValue(score) {
  const grade = getGrade(score);
  return typeof grade === 'string' ? grade : grade?.grade ?? null;
}

function detectTechnologyFromSeo(seo) {
  const html = String(seo?.html_snippet || '');
  const lower = html.toLowerCase();
  const technologies = [];
  let cms = null;

  if (lower.includes('wp-content') || lower.includes('wordpress')) cms = 'WordPress';
  if (lower.includes('shopify')) cms = cms || 'Shopify';
  if (lower.includes('drupal')) cms = cms || 'Drupal';
  if (lower.includes('joomla')) cms = cms || 'Joomla';
  if (lower.includes('react') || lower.includes('__next') || lower.includes('next.js')) technologies.push('React/Next.js');
  if (lower.includes('vue')) technologies.push('Vue.js');
  if (lower.includes('bootstrap')) technologies.push('Bootstrap');
  if (lower.includes('jquery')) technologies.push('jQuery');

  return { cms, technologies };
}

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

function getProtectionDetected(seo, ux) {
  const protections = [seo?.protection_detected, ux?.protection_detected]
    .filter(p => p?.detected);

  if (protections.length === 0) return null;

  return {
    detected: true,
    provider: protections[0].provider ?? null,
    reason: protections[0].reason ?? null,
    signals: protections.flatMap(p => p.signals ?? []),
  };
}

function hasNumericScore(result) {
  return Number.isFinite(Number(result?.score));
}

function isUnmeasuredPartial(result) {
  return result?.partial && !hasNumericScore(result);
}

function getScanConfidence({ perf, sec, seo, ux, protectionDetected }) {
  const unmeasuredPartialCount = [perf, sec, seo, ux].filter(isUnmeasuredPartial).length;
  if (protectionDetected?.detected) {
    return unmeasuredPartialCount >= 2 ? 'low' : 'medium';
  }
  if (unmeasuredPartialCount >= 2) return 'low';
  if (unmeasuredPartialCount === 1) return 'medium';
  return 'high';
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

  const scanUrl = accessibility.url || normalizedUrl;
  const finalUrl = accessibility.final_url || scanUrl;
  const auditUrl = scanUrl;

  // ── 3) Cache 1 heure (Supabase) ───────────────────────────────────────────
  if (!forceRefresh) {
    const cachedScan = await readCache(scanUrl);
    if (cachedScan?.results_json) {
      console.log(`[SCAN] ♻️  Cache hit pour ${scanUrl}`);
      return res.json({
        ...cachedScan.results_json,
        success: true,
        cached: true,
        scan_id: cachedScan.id,
      });
    }
  } else {
    console.log(`[SCAN] Cache ignoré pour calibration fraîche: ${scanUrl}`);
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
  console.log(`\n[SCAN] Démarrage — id=${scanId} url=${scanUrl}`);

  try {
    const pageSpeedPromise = psKey ? fetchPageSpeedData(auditUrl, psKey) : Promise.resolve(null);
    let pageSpeedErrorLogged = false;
    const getSharedPageSpeedData = async () => {
      try {
        return await pageSpeedPromise;
      } catch (err) {
        if (!pageSpeedErrorLogged) {
          pageSpeedErrorLogged = true;
          console.warn('[SCAN] PageSpeed mutualisé indisponible :', err.message);
        }
        return null;
      }
    };

    const [perfResult, secResult, seoResult, uxResult, advSecResult, extSecResult] = await Promise.allSettled([
      safeRun('Performance', async () => scanPerformance(auditUrl, psKey, await getSharedPageSpeedData())),
      safeRun('Sécurité', () => scanSecurity(scanUrl, vtKey)),
      safeRun('SEO', async () => scanSEO(scanUrl, psKey, await getSharedPageSpeedData())),
      safeRun('UX/Mobile', () => scanUXMobile(scanUrl, psKey)),
      safeRun('Sécurité Avancée', () => runAdvancedSecurityChecks(scanUrl)),
      safeRun('Sécurité Étendue', () => runExtendedSecurityChecks(scanUrl)),
    ]);

    const perf = perfResult.value?.ok ? perfResult.value.data : null;
    const sec = secResult.value?.ok ? secResult.value.data : null;
    const seo = seoResult.value?.ok ? seoResult.value.data : null;
    const ux = uxResult.value?.ok ? uxResult.value.data : null;
    const advSec = advSecResult.value?.ok ? advSecResult.value.data : null;
    const extSec = extSecResult.value?.ok ? extSecResult.value.data : null;

    if (sec && advSec) {
      sec.legacy_score = sec.legacy_score ?? sec.score;
      sec.advanced_checks = advSec.checks ?? [];
      sec.advanced_security_score = advSec.advanced_security_score ?? null;
      sec.advanced_counts = advSec.counts ?? null;

      const advFails = sec.advanced_checks
        .filter((c) => c.status === 'fail' || c.status === 'warning')
        .map((c) => c.check_name);
      sec.failed_checks = [...(sec.failed_checks || []), ...advFails];
    }

    if (sec && extSec) {
      sec.legacy_score = sec.legacy_score ?? sec.score;
      sec.extended_checks = extSec.checks ?? [];
      sec.extended_security_score = extSec.score ?? null;

      const extFails = sec.extended_checks
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

    const protectionDetected = getProtectionDetected(seo, ux);
    const scanConfidence = getScanConfidence({ perf, sec, seo, ux, protectionDetected });

    const globalScore = calculateGlobalScore(
      scores.performance,
      scores.security,
      scores.seo,
      scores.ux,
    );

    const scanDurationMs = Date.now() - startMs;
    console.log(`[SCAN] ✅ Terminé en ${scanDurationMs}ms — score global : ${globalScore}`);
    const tech = detectTechnologyFromSeo(seo);
    const geo = perf?.server_location ?? null;

    // ── 6) Construction de la réponse ─────────────────────────────────────
    const results = {
      success: true,
      scan_id: scanId,
      url: scanUrl,
      requested_url: normalizedUrl,
      audit_url: auditUrl,
      final_url: finalUrl,
      global_score: globalScore,
      grade: toGradeValue(globalScore),
      scores,
      scan_confidence: scanConfidence,
      protection_detected: protectionDetected,

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
          pageSpeed_final_url: perf.pageSpeed_final_url ?? null,
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
          legacy_score: sec.legacy_score ?? null,
          advanced_security_score: sec.advanced_security_score ?? null,
          advanced_checks: sec.advanced_checks ?? [],
          advanced_counts: sec.advanced_counts ?? null,
          extended_checks: extSec?.checks ?? [],
          extended_security_score: extSec?.score ?? null,
          failed_checks: sec.failed_checks ?? [],
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
          has_sitemap: seo.has_sitemap ?? null,
          partial: seo.partial ?? false,
          partial_reason: seo.partial_reason ?? null,
          protection_detected: seo.protection_detected ?? null,
        } : null,

        ux: ux ? {
          accessibility_score: ux.accessibility_score,
          tap_targets_ok: ux.tap_targets_ok,
          issues: ux.issues ?? [],
          issues_count: ux.issues_count ?? 0,
          critical_count: ux.critical_count ?? 0,
          grade: ux.grade ?? null,
          partial: ux.partial ?? false,
          partial_reason: ux.partial_reason ?? null,
          protection_detected: ux.protection_detected ?? null,
        } : null,
      },

      critical_alerts: buildCriticalAlerts(sec, ux, perf, extSec, protectionDetected),

      scanner_errors: {
        performance: perfResult.value?.ok === false ? perfResult.value.error : null,
        security: secResult.value?.ok === false ? secResult.value.error : null,
        seo: seoResult.value?.ok === false ? seoResult.value.error : null,
        ux: uxResult.value?.ok === false ? uxResult.value.error : null,
        advanced: advSecResult.value?.ok === false ? advSecResult.value.error : null,
        extended: extSecResult.value?.ok === false ? extSecResult.value.error : null,
      },

      scan_duration_ms: scanDurationMs,
      // Résumé rapide pour l'UI
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

    // ── 7) Sauvegarde DB (ne bloque pas la réponse si ça échoue) ──────────
    await saveToDb(scanId, scanUrl, globalScore, results, email);

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
function buildCriticalAlerts(sec, ux, perf, extSec, protectionDetected) {
  const alerts = [];

  if (protectionDetected?.detected) {
    alerts.push({
      severity: 'warning',
      category: 'scan',
      title: 'Protection anti-bot détectée',
      message: `Le site utilise une protection ${protectionDetected.provider || 'anti-bot'} : certaines mesures SEO/UX peuvent être partielles.`,
      recommendation: 'Interprétez les scores SEO et UX avec prudence ou relancez un audit depuis un environnement autorisé.',
    });
  }

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

  if (Array.isArray(extSec?.checks)) {
    extSec.checks
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

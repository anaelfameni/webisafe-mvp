// ✅ VÉRIFICATION PRÉLIMINAIRE : site accessible ?
try {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  const preCheck = await fetch(url, {
    method: 'HEAD',
    signal: controller.signal,
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Webisafe/1.0)' },
  });
  clearTimeout(timeout);

  // Si le site répond avec une erreur serveur grave
  if (preCheck.status >= 500) {
    return res.status(200).json({
      success: false,
      error: 'Site inaccessible ou en erreur serveur',
      code: 'SITE_UNREACHABLE',
    });
  }
} catch (err) {
  // DNS introuvable, timeout, connexion refusée
  return res.status(200).json({
    success: false,
    error: 'Ce site est inaccessible ou l\'URL est incorrecte.',
    code: 'SITE_UNREACHABLE',
  });
}

import { randomUUID } from 'crypto';
import { scanPerformance } from '../scanners/performanceScanner.js';
import { scanSecurity } from '../scanners/securityScanner.js';
import { scanSEO } from '../scanners/seoScanner.js';
import { scanUXMobile } from '../scanners/uxScanner.js';
import { calculateGlobalScore, getGrade } from '../utils/scoreCalculator.js';

/**
 * Enveloppe chaque scanner dans une Promise avec timeout global de sécurité.
 * La gestion fine du timeout est déjà dans chaque scanner via AbortController.
 */
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

/**
 * POST /api/scan
 * Corps attendu : { url: string }
 */
export async function handleScan(req, res) {
  const { url } = req.body;
  const scanId = randomUUID();
  const startMs = Date.now();

  console.log(`\n[SCAN] Démarrage — id=${scanId} url=${url}`);

  const psKey = process.env.GOOGLE_PAGESPEED_KEY;
  const vtKey = process.env.VIRUSTOTAL_API_KEY;

  if (!psKey) {
    return res.status(500).json({
      success: false,
      error: 'Clé GOOGLE_PAGESPEED_KEY manquante dans .env',
    });
  }

  // ── Lancement de tous les scanners en PARALLÈLE ──────────────────────────
  const [perfResult, secResult, seoResult, uxResult] = await Promise.allSettled([
    safeRun('Performance', () => scanPerformance(url, psKey)),
    safeRun('Sécurité', () => scanSecurity(url, vtKey)),
    safeRun('SEO', () => scanSEO(url)),
    safeRun('UX/Mobile', () => scanUXMobile(url, psKey)),
  ]);

  // ── Extraction des valeurs (Promise.allSettled ne rejette jamais) ─────────
  const perf = perfResult.value?.ok ? perfResult.value.data : null;
  const sec = secResult.value?.ok ? secResult.value.data : null;
  const seo = seoResult.value?.ok ? seoResult.value.data : null;
  const ux = uxResult.value?.ok ? uxResult.value.data : null;

  // ── Scores individuels (null si scanner échoué) ───────────────────────────
  const scores = {
    performance: perf?.score ?? null,
    security: sec?.score ?? null,
    seo: seo?.score ?? null,
    ux: ux?.score ?? null,
  };

  // ── Score global pondéré ─────────────────────────────────────────────────
  const globalScore = calculateGlobalScore(
    scores.performance,
    scores.security,
    scores.seo,
    scores.ux,
  );

  const scanDurationMs = Date.now() - startMs;
  console.log(`[SCAN] ✅ Terminé en ${scanDurationMs}ms — score global : ${globalScore}`);

  // ── Réponse complète ──────────────────────────────────────────────────────
  return res.json({
    success: true,
    scan_id: scanId,
    url,
    global_score: globalScore,
    grade: getGrade(globalScore),
    scores,
    metrics: {
      performance: perf ? {
        lcp: perf.lcp,
        cls: perf.cls,
        fcp: perf.fcp,
        page_weight_mb: perf.page_weight_mb,
      } : null,
      security: sec ? {
        malware_detected: sec.malware_detected,
        observatory_score: sec.observatory_score,
      } : null,
      seo: seo ? {
        has_title: seo.has_title,
        has_description: seo.has_description,
        h1_count: seo.h1_count,
        has_viewport: seo.has_viewport,
        has_open_graph: seo.has_open_graph,
      } : null,
      ux: ux ? {
        accessibility_score: ux.accessibility_score,
        tap_targets_ok: ux.tap_targets_ok,
      } : null,
    },
    scanner_errors: {
      performance: perfResult.value?.ok === false ? perfResult.value.error : null,
      security: secResult.value?.ok === false ? secResult.value.error : null,
      seo: seoResult.value?.ok === false ? seoResult.value.error : null,
      ux: uxResult.value?.ok === false ? uxResult.value.error : null,
    },
    scan_duration_ms: scanDurationMs,
  });
}

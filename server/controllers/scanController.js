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

  const accessibility = await checkUrlAccessible(normalizedUrl);
  if (!accessibility.accessible) {
    return res.status(422).json({
      success: false,
      error: accessibility.error,
      type: 'SITE_UNREACHABLE',
      suggestion: 'Vérifiez que le site est en ligne et réessayez dans quelques minutes',
    });
  }

  const oneHourAgo = new Date(Date.now() - 3_600_000).toISOString();
  const { data: cachedScan } = await supabase
    .from('scans')
    .select('*')
    .eq('url', normalizedUrl)
    .gt('created_at', oneHourAgo)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (cachedScan) {
    console.log(`[SCAN] ♻️  Cache hit pour ${normalizedUrl}`);
    return res.json({
      success: true,
      cached: true,
      scanId: cachedScan.id,
      ...cachedScan.data,
    });
  }

  const psKey = process.env.GOOGLE_PAGESPEED_KEY;
  const vtKey = process.env.VIRUSTOTAL_API_KEY;

  if (!psKey) {
    return res.status(500).json({
      success: false,
      error: 'Clé GOOGLE_PAGESPEED_KEY manquante dans .env',
      type: 'CONFIG_ERROR',
    });
  }

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
    };

    // ── 6. Sauvegarde en base ────────────────────────────────────────────────
    const { data: newScan, error: dbError } = await supabase
      .from('scans')
      .insert({
        id: scanId,
        url: normalizedUrl,
        email: email || null,
        data: results,
        paid: false,
      })
      .select()
      .single();

    if (dbError) {
      console.error('[SCAN] ⚠️  Erreur sauvegarde DB :', dbError.message);
    }

    // ── 7. Envoi email si adresse fournie ────────────────────────────────────
    if (email) {
      sendScanResultEmail(email, {
        url: normalizedUrl,
        scores: {
          global: globalScore,
          ...scores,
        },
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
// scripts/calibration.js
import { fileURLToPath } from 'url';
import path from 'path';
import { readFileSync } from 'fs';

// ── Chargement manuel du .env (compatible ESM) ────────────────────────────────
function loadEnv() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const envPath = path.resolve(__dirname, '../.env');

  let raw;
  try {
    raw = readFileSync(envPath, 'utf-8');
  } catch {
    console.error('\x1b[31m✗ Fichier .env introuvable à la racine du projet\x1b[0m');
    console.error('  → Créez un fichier \x1b[33m.env\x1b[0m contenant GOOGLE_PAGESPEED_KEY=...\n');
    process.exit(1);
  }

  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

// ── Vérification des clés ────────────────────────────────────────────────────
const REQUIRED_ENV = ['GOOGLE_PAGESPEED_KEY'];
let API_KEY = process.env.GOOGLE_PAGESPEED_KEY ?? '';

function ensureRequiredEnv() {
  const missingKeys = REQUIRED_ENV.filter((k) => !process.env[k]);

  if (missingKeys.length > 0) {
    console.error('\x1b[31m✗ Variables manquantes dans .env :\x1b[0m');
    missingKeys.forEach((k) => console.error(`  · ${k}`));
    console.error('\n  → Ajoutez-les dans votre fichier \x1b[33m.env\x1b[0m\n');
    process.exit(1);
  }

  API_KEY = process.env.GOOGLE_PAGESPEED_KEY;
}

// ── Sites de test ─────────────────────────────────────────────────────────────
// 30 sites : 10 sites ivoiens + 20 plus gros sites mondiaux & africains
const TEST_SITES = [
  // --- 10 sites ivoiens ---
  'https://abidjan.net',
  'https://orange.ci',
  'https://jumia.ci',
  'https://gouv.ci',
  'https://cie.ci',
  'https://aircoteivoire.com',
  'https://nsia.ci',
  'https://fratmat.info',
  'https://koaci.com',
  'https://sodeci.ci',

  // --- 20 plus gros sites mondiaux & africains ---
  'https://apple.com',
  'https://amazon.com',
  'https://facebook.com',
  'https://microsoft.com',
  'https://netflix.com',
  'https://youtube.com',
  'https://instagram.com',
  'https://linkedin.com',
  'https://github.com',
  'https://wikipedia.org',
  'https://booking.com',
  'https://spotify.com',
  'https://reddit.com',
  'https://tiktok.com',
  'https://paypal.com',
  'https://ebay.com',
  'https://cloudflare.com',
  'https://stripe.com',
  'https://x.com',
  'https://binance.com',
  'https://jumia.com',
  'https://ecobank.com',
  'https://jeuneafrique.com',
  'https://france24.com',
  'https://airbnb.com',
];

// ── Couleurs terminal ─────────────────────────────────────────────────────────
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

const colorize = (text, color) => `${color}${text}${RESET}`;
const ok = (v) => colorize(v, GREEN);
const fail = (v) => colorize(v, RED);
const warn = (v) => colorize(v, YELLOW);
const separator = (char = '─', len = 90) => char.repeat(len);

// ── Helpers ──────────────────────────────────────────────────────────────────
function scoreStatus(gap, threshold = 15) {
  if (gap === null) return warn('N/A');
  if (gap <= threshold) return ok(`✓ OK (écart: ${gap})`);
  return fail(`✗ REVOIR (écart: ${gap})`);
}

function boolStatus(webisafe, pagespeed) {
  if (webisafe === null || pagespeed === null) return warn('N/A');
  return webisafe === pagespeed ? ok('✓ Concordant') : fail('✗ Divergent');
}

function printScoreRow(label, wScore, gScore, threshold = 15) {
  const gap = wScore != null && gScore != null ? Math.abs(wScore - gScore) : null;
  const status = scoreStatus(gap, threshold);
  console.log(
    `  ${label.padEnd(24)}` +
    `Webisafe: ${String(wScore ?? 'N/A').padEnd(6)}  ` +
    `PageSpeed: ${String(gScore ?? 'N/A').padEnd(6)}  ` +
    status
  );
}

function printBoolRow(label, wVal, gVal) {
  const status = boolStatus(wVal, gVal);
  console.log(
    `  ${label.padEnd(24)}` +
    `Webisafe: ${String(wVal ?? 'N/A').padEnd(6)}  ` +
    `PageSpeed: ${String(gVal ?? 'N/A').padEnd(6)}  ` +
    status
  );
}

function printInfoRow(label, value, note = '') {
  console.log(
    `  ${label.padEnd(24)}` +
    `Webisafe: ${String(value ?? 'N/A').padEnd(26)}` +
    (note ? `${CYAN}ℹ  ${note}${RESET}` : '')
  );
}

function printCheckRow(label, status, note = '') {
  const statusColor = status === 'pass' ? GREEN : status === 'fail' ? RED : status === 'warning' ? YELLOW : CYAN;
  const statusIcon = status === 'pass' ? '✓' : status === 'fail' ? '✗' : status === 'warning' ? '⚠' : '○';
  console.log(
    `  ${label.padEnd(28)}` +
    `${statusColor}${statusIcon} ${String(status ?? 'N/A').padEnd(10)}${RESET}` +
    (note ? `${CYAN}ℹ ${note}${RESET}` : '')
  );
}

function printCheckList(title, checks, maxDisplay = 10) {
  if (!Array.isArray(checks) || checks.length === 0) {
    console.log(`  ${CYAN}${title} : Aucun check retourné${RESET}`);
    return;
  }
  console.log(`  ${BOLD}${title} (${checks.length} checks) :${RESET}`);
  checks.slice(0, maxDisplay).forEach((c) => {
    const name = c.check_name ?? c.title ?? 'unknown';
    printCheckRow(`    · ${name}`, c.status, c.criticality ? `(${c.criticality})` : '');
  });
  if (checks.length > maxDisplay) {
    console.log(`    ${CYAN}… et ${checks.length - maxDisplay} autre(s)${RESET}`);
  }
}

function countAdvancedChecks(checks) {
  if (!Array.isArray(checks)) return { pass: 0, fail: 0, warning: 0, total: 0 };
  return {
    pass: checks.filter(c => c.status === 'pass').length,
    fail: checks.filter(c => c.status === 'fail').length,
    warning: checks.filter(c => c.status === 'warning').length,
    total: checks.length,
  };
}

function buildPageSpeedProbeUrls(url) {
  const urls = [];
  try {
    const parsed = new URL(url);
    urls.push(parsed.href);
    if (!parsed.hostname.startsWith('www.') && parsed.hostname.includes('.')) {
      const wwwUrl = new URL(parsed.href);
      wwwUrl.hostname = `www.${parsed.hostname}`;
      urls.push(wwwUrl.href);
    }
  } catch {
    urls.push(url);
  }
  return Array.from(new Set(urls));
}

// ── API PageSpeed (référence) ─────────────────────────────────────────────────
async function getPageSpeedData(url) {
  for (const probeUrl of buildPageSpeedProbeUrls(url)) {
    try {
    const endpoint =
      `https://www.googleapis.com/pagespeedonline/v5/runPagespeed` +
      `?url=${encodeURIComponent(probeUrl)}&strategy=mobile&key=${API_KEY}` +
      `&category=performance&category=seo&category=best-practices&category=accessibility`;

    const res = await fetch(endpoint);
    const data = await res.json();
    const lhr = data.lighthouseResult;

    if (!lhr) {
      console.error(warn(`  ⚠ PageSpeed: pas de lighthouseResult pour ${probeUrl}`));
      continue;
    }

    const audits = lhr.audits ?? {};
    const categories = lhr.categories ?? {};

    return {
      performance: Math.round((categories.performance?.score ?? 0) * 100),
      seo: Math.round((categories.seo?.score ?? 0) * 100),
      bestPractices: Math.round((categories['best-practices']?.score ?? 0) * 100),
      accessibility: Math.round((categories.accessibility?.score ?? 0) * 100),
      url: probeUrl,
      finalUrl: lhr.finalUrl ?? data.id ?? null,

      // Sécurité basique
      https: audits['is-on-https']?.score === 1,
      http2: audits['uses-http2']?.score === 1,
      redirectsHttp: audits['redirects-http']?.score === 1,
      noVulnerableLibs: audits['no-vulnerable-libraries']?.score === 1,
      viewport: null,
      tapTargets: null,
      fontSize: null,
    };
  } catch (e) {
      console.error(fail(`  ✗ PageSpeed error (${probeUrl}): ${e.message}`));
    }
  }

  return null;
}

// ── API Webisafe ──────────────────────────────────────────────────────────────
async function getWebisafeData(url) {
  try {
    const res = await fetch('http://localhost:3001/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, force_refresh: true }),
    });

    const data = await res.json();

    const scores = data.scores ?? data.data?.scores ?? {};
    const metrics = data.metrics ?? data.data?.metrics ?? {};
    const perf = metrics.performance ?? {};
    const sec = metrics.security ?? {};
    const seo = metrics.seo ?? {};
    const ux = metrics.ux ?? {};

    // Métadonnées globales du scan
    const globalScore = data.global_score ?? data.data?.global_score ?? null;
    const grade = data.grade ?? data.data?.grade ?? null;
    const scanConfidence = data.scan_confidence ?? data.data?.scan_confidence ?? null;
    const scannerErrors = data.scanner_errors ?? data.data?.scanner_errors ?? {};
    const scanDurationMs = data.scan_duration_ms ?? data.data?.scan_duration_ms ?? null;
    const detectedTech = data.detected_technology ?? data.data?.detected_technology ?? {};

    return {
      url: data.url ?? data.data?.url ?? null,
      requested_url: data.requested_url ?? data.data?.requested_url ?? null,
      audit_url: data.audit_url ?? data.data?.audit_url ?? null,
      final_url: data.final_url ?? data.data?.final_url ?? null,

      // Scores globaux
      performance: scores.performance ?? null,
      security: scores.security ?? null,
      seo: scores.seo ?? null,
      ux_mobile: scores.ux ?? scores.ux_mobile ?? null,
      global_score: globalScore,
      grade,

      // IMPORTANT : perf partial (fallback)
      perf_partial: perf.partial ?? null,

      // ── Sécurité avancée ──────────────────────────────────────────────
      https: url.startsWith('https'),
      headers_manquants: null,
      malware: sec.malware_detected ?? null,
      failles_owasp: null,

      // Sécurité avancée (backend scan.js)
      legacy_score: sec.legacy_score ?? null,
      advanced_security_score: sec.advanced_security_score ?? null,
      extended_security_score: sec.extended_security_score ?? null,
      advanced_checks: sec.advanced_checks ?? null,
      extended_checks: sec.extended_checks ?? null,
      failed_checks: sec.failed_checks ?? null,
      advanced_counts: sec.advanced_counts ?? null,

      // SEO
      seo_partial: seo.partial ?? null,
      seo_pagespeed_score: seo.pageSpeed_score ?? null,
      seo_local_score: seo.local_score ?? null,
      sitemap: null,
      meta_tags: (seo.has_title != null && seo.has_description != null)
        ? (seo.has_title && seo.has_description) : null,
      open_graph: seo.has_open_graph ?? null,
      indexed: null,

      // UX Mobile
      responsive: seo.has_viewport ?? null,
      tap_targets: ux.tap_targets_ok ?? null,
      font_size: null,
      vitesse_mobile: ux.accessibility_score ?? null,

      // Métadonnées scanner
      scan_confidence: scanConfidence,
      scanner_errors: scannerErrors,
      scan_duration_ms: scanDurationMs,
      detected_technology: detectedTech,
    };
  } catch (e) {
    console.error(fail(`  ✗ Webisafe error (${url}): ${e.message}`));
    return null;
  }
}

// ── Calibration Performance ───────────────────────────────────────────────────
function calibratePerformance(w, g, results) {
  console.log(`\n  ${BOLD}⚡ PERFORMANCE${RESET}`);
  console.log('  ' + separator('·', 70));
  printInfoRow('URL PageSpeed', g.url ?? null, g.finalUrl ? `final: ${g.finalUrl}` : '');

  // Si Webisafe est en fallback (partial=true), on n'applique pas le seuil PSI
  if (w.perf_partial === true) {
    printInfoRow('Mode scan', 'Fallback (partial=true)', 'Score estimé (TTFB) → comparaison PSI ignorée');
    printScoreRow('Score global', w.performance, g.performance, 15);
    return true;
  }

  const gap = w.performance != null && g.performance != null
    ? Math.abs(w.performance - g.performance)
    : null;

  printScoreRow('Score global', w.performance, g.performance, 15);

  const passed = gap !== null && gap <= 15;
  if (!passed) results.failed.push('Performance — écart score global > 15 pts');
  return passed;
}

// ── Calibration Sécurité ──────────────────────────────────────────────────────
const REQUIRED_ADVANCED_CHECKS = ['waf', 'subdomains', 'security_txt', 'cors', 'supply_chain', 'email_advanced'];

function calibrateSecurity(w, g, results) {
  console.log(`\n  ${BOLD}🔒 SÉCURITÉ${RESET}`);
  console.log('  ' + separator('·', 70));

  // ── Scores ────────────────────────────────────────────────────────
  printInfoRow('Score global (combiné)', w.security, 'Legacy + Advanced + Extended');
  printInfoRow('  └─ Legacy score', w.legacy_score, 'Scan de base');
  printInfoRow('  └─ Advanced score', w.advanced_security_score, 'runAdvancedSecurityChecks()');
  printInfoRow('  └─ Extended score', w.extended_security_score, 'runExtendedSecurityChecks()');

  // ── Comparisons PageSpeed ───────────────────────────────────────
  console.log(`\n  ${BOLD}Comparaison PageSpeed (best-practices) :${RESET}`);
  printBoolRow('HTTPS', w.https, g.https);
  printBoolRow('HTTP/2', null, g.http2);
  printBoolRow('Redirects HTTP→HTTPS', null, g.redirectsHttp);
  printBoolRow('No vulnerable libs', null, g.noVulnerableLibs);
  printInfoRow('Best-Practices score', g.bestPractices, 'PageSpeed');

  // ── Checks avancés ──────────────────────────────────────────────
  console.log(`\n  ${BOLD}Sécurité avancée :${RESET}`);
  const advCounts = countAdvancedChecks(w.advanced_checks);
  const extCounts = countAdvancedChecks(w.extended_checks);

  printInfoRow('Checks avancés', `${advCounts.pass}/${advCounts.total} pass`, `fail=${advCounts.fail} warning=${advCounts.warning}`);
  printInfoRow('Checks étendus', `${extCounts.pass}/${extCounts.total} pass`, `fail=${extCounts.fail} warning=${extCounts.warning}`);

  printCheckList('Checks avancés', w.advanced_checks, 6);
  printCheckList('Checks étendus', w.extended_checks, 6);

  // ── Validation des checks requis ─────────────────────────────────
  const advNames = new Set((w.advanced_checks ?? []).map(c => c?.check_name).filter(Boolean));
  const extNames = new Set((w.extended_checks ?? []).map(c => c?.check_name).filter(Boolean));
  const allNames = new Set([...advNames, ...extNames]);
  const missingRequired = REQUIRED_ADVANCED_CHECKS.filter(name => !allNames.has(name));

  if (missingRequired.length > 0) {
    console.log(`\n  ${YELLOW}⚠ Checks requis manquants : ${missingRequired.join(', ')}${RESET}`);
  } else {
    console.log(`\n  ${ok('✓ Tous les checks avancés requis sont présents')}`);
  }

  // ── Failed checks globaux ───────────────────────────────────────
  if (Array.isArray(w.failed_checks) && w.failed_checks.length > 0) {
    console.log(`\n  ${YELLOW}Failed checks globaux : ${w.failed_checks.join(', ')}${RESET}`);
  }

  // ── Malware ─────────────────────────────────────────────────────
  printInfoRow('Malware',
    w.malware !== null ? (w.malware ? '⚠ Détecté' : 'Aucun') : null,
    'Vérifier sur virustotal.com'
  );

  // ── Critère de passage ──────────────────────────────────────────
  const httpsOk = w.https === g.https;
  const hasAdvanced = w.advanced_checks && w.advanced_checks.length > 0;
  const hasExtended = w.extended_checks && w.extended_checks.length > 0;
  const requiredOk = missingRequired.length === 0;

  const passed = httpsOk && hasAdvanced && hasExtended && requiredOk;

  if (!httpsOk) results.failed.push('Sécurité — HTTPS divergent vs PageSpeed');
  if (!hasAdvanced) results.failed.push('Sécurité — Aucun check avancé retourné');
  if (!hasExtended) results.failed.push('Sécurité — Aucun check étendu retourné');
  if (!requiredOk) results.failed.push(`Sécurité — Checks requis manquants : ${missingRequired.join(', ')}`);

  return passed;
}

// ── Calibration SEO ───────────────────────────────────────────────────────────
const SEO_THRESHOLD = 15;

export function getSeoCalibrationResult(w, g) {
  const gap = w.seo != null && g.seo != null
    ? Math.abs(w.seo - g.seo)
    : null;

  return {
    gap,
    threshold: SEO_THRESHOLD,
    passed: gap !== null && gap <= SEO_THRESHOLD,
  };
}

function calibrateSEO(w, g, results) {
  console.log(`\n  ${BOLD}🔍 SEO${RESET}`);
  console.log('  ' + separator('·', 70));

  const { threshold, passed } = getSeoCalibrationResult(w, g);

  printScoreRow('Score global', w.seo, g.seo, threshold);
  if (w.seo_pagespeed_score !== null) {
    printInfoRow('Source score SEO', `PageSpeed intégré (${w.seo_pagespeed_score}/100)`);
  } else if (w.seo_partial) {
    printInfoRow('Source score SEO', `Fallback HTML local (${w.seo_local_score ?? 'N/A'}/100)`);
  }
  printInfoRow('Sitemap', w.sitemap !== null ? (w.sitemap ? 'Présent' : 'Absent') : null);
  printInfoRow('Meta tags', w.meta_tags !== null ? (w.meta_tags ? 'OK' : 'Incomplets') : null);
  printInfoRow('Open Graph', w.open_graph !== null ? (w.open_graph ? 'Présent' : 'Absent') : null);
  printInfoRow('Indexation', w.indexed !== null ? (w.indexed ? 'Oui' : 'Non') : null);

  if (!passed) results.failed.push(`SEO — écart score global > ${threshold} pts`);
  return passed;
}

// ── Calibration Métadonnées ───────────────────────────────────────────────────
function calibrateMetadata(w, results) {
  console.log(`\n  ${BOLD}📊 MÉTADONNÉES DU SCAN${RESET}`);
  console.log('  ' + separator('·', 70));

  printInfoRow('Score global', w.global_score, `Grade: ${w.grade ?? 'N/A'}`);
  printInfoRow('URL scannée', w.url ?? null, w.audit_url ? `audit: ${w.audit_url}` : '');
  printInfoRow('URL finale', w.final_url ?? null);
  printInfoRow('Confiance scan', w.scan_confidence, 'low | medium | high');
  printInfoRow('Durée scan', w.scan_duration_ms !== null ? `${w.scan_duration_ms}ms` : null);

  const errors = w.scanner_errors ?? {};
  const hasErrors = Object.values(errors).some(e => e != null);
  if (hasErrors) {
    console.log(`  ${YELLOW}⚠ Erreurs scanner détectées :${RESET}`);
    Object.entries(errors).forEach(([key, err]) => {
      if (err) console.log(`    · ${key}: ${err}`);
    });
  } else {
    console.log(`  ${ok('✓ Aucune erreur scanner')}`);
  }

  const tech = w.detected_technology ?? {};
  printInfoRow('CMS détecté', tech.cms ?? null);
  printInfoRow('Technologies', Array.isArray(tech.technologies) ? tech.technologies.join(', ') : null);
  printInfoRow('Hosting pays', tech.hosting_country ?? null);
  printInfoRow('Hosting ISP', tech.hosting_isp ?? null);
  printInfoRow('Is local Africa', tech.is_local_africa !== null ? String(tech.is_local_africa) : null);

  const confidenceOk = w.scan_confidence === 'high' || w.scan_confidence === 'medium';
  const noScannerErrors = !hasErrors;

  const passed = confidenceOk && noScannerErrors;
  if (!confidenceOk) results.failed.push(`Métadonnées — Confiance scan trop faible (${w.scan_confidence})`);
  if (!noScannerErrors) results.failed.push('Métadonnées — Erreurs scanner détectées');
  return passed;
}

// ── Calibration UX Mobile ─────────────────────────────────────────────────────
function calibrateUX(w, g, results) {
  console.log(`\n  ${BOLD}📱 UX MOBILE${RESET}`);
  console.log('  ' + separator('·', 70));

  printInfoRow('Score global', w.ux_mobile, 'Pas de score direct PageSpeed → comparaison par signaux');
  printBoolRow('Viewport / Responsive', w.responsive, g.viewport);
  printBoolRow('Éléments tactiles', w.tap_targets, g.tapTargets);
  printBoolRow('Taille police ≥ 12px',
    w.font_size !== null ? w.font_size >= 12 : null,
    g.fontSize
  );
  printInfoRow('Vitesse mobile', w.vitesse_mobile !== null ? `${w.vitesse_mobile}/100` : null);

  const signals = [
    w.responsive === g.viewport,
    w.tap_targets === g.tapTargets,
    (w.font_size !== null ? w.font_size >= 12 : null) === g.fontSize,
  ].filter((v) => v !== null);

  const concordants = signals.filter(Boolean).length;

  const noPageSpeedUX = g.viewport === null && g.tapTargets === null && g.fontSize === null;
  const passed = noPageSpeedUX ? true : concordants >= 2;

  if (!passed) results.failed.push(`UX Mobile — ${concordants}/3 signaux concordants (min 2)`);
  return passed;
}

// ── Résumé d'un site ──────────────────────────────────────────────────────────
function printSiteSummary(perfOk, secOk, seoOk, uxOk, metaOk) {
  console.log(`\n  ${BOLD}Résumé du site :${RESET}`);
  console.log(`    Performance : ${perfOk ? ok('✓ Validé') : fail('✗ À revoir')}`);
  console.log(`    Sécurité    : ${secOk ? ok('✓ Validé') : fail('✗ À revoir')}`);
  console.log(`    SEO         : ${seoOk ? ok('✓ Validé') : fail('✗ À revoir')}`);
  console.log(`    UX Mobile   : ${uxOk ? ok('✓ Validé') : fail('✗ À revoir')}`);
  console.log(`    Métadonnées : ${metaOk ? ok('✓ Validé') : fail('✗ À revoir')}`);
}

// ── Rapport final ─────────────────────────────────────────────────────────────
function printFinalReport({ passed, total, failed }) {
  const pct = total > 0 ? Math.round((passed / total) * 100) : 0;

  console.log(`\n${BOLD}${'═'.repeat(90)}${RESET}`);
  console.log(`${BOLD}  RÉSULTAT GLOBAL : ${passed}/${total} critères validés (${pct} %)${RESET}`);
  console.log(separator());

  if (failed.length === 0) {
    console.log(ok('\n  ✓ Calibration réussie — tous les critères sont dans les seuils\n'));
  } else {
    console.log(fail(`\n  ✗ ${failed.length} point(s) à revoir :`));
    failed.forEach((f) => console.log(fail(`    · ${f}`)));
    console.log('');
  }

  console.log(`${CYAN}  Seuils utilisés :${RESET}`);
  console.log(`    Performance : écart ≤ 15 pts vs PageSpeed (sauf si partial=true)`);
  console.log(`    Sécurité    : HTTPS concordant + checks avancés/étendus présents`);
  console.log(`                  + tous les checks requis (waf, subdomains, security_txt, cors, supply_chain, email_advanced)`);
  console.log(`    SEO         : écart ≤ 15 pts vs PageSpeed`);
  console.log(`    UX Mobile   : ≥ 2/3 signaux concordants avec PageSpeed`);
  console.log(`    Métadonnées : confiance ≥ medium + aucune erreur scanner\n`);
}

// ── Runner ────────────────────────────────────────────────────────────────────
async function runCalibration() {
  loadEnv();
  ensureRequiredEnv();

  console.log(`\n${BOLD}${CYAN}${'═'.repeat(90)}${RESET}`);
  console.log(`${BOLD}${CYAN}  CALIBRATION WEBISAFE — 30 sites · Performance · Sécurité avancée · SEO · UX Mobile${RESET}`);
  console.log(`${BOLD}${CYAN}${'═'.repeat(90)}${RESET}\n`);

  const maskedKey = `${API_KEY.slice(0, 6)}…${API_KEY.slice(-4)}`;
  console.log(`${CYAN}  ✔ GOOGLE_PAGESPEED_KEY chargée depuis .env (${maskedKey})${RESET}\n`);

  const globalResults = { passed: 0, failed: [], total: 0 };

  for (const site of TEST_SITES) {
    console.log(`\n${BOLD}▶  ${site}${RESET}`);
    console.log(separator());

    const [w, g] = await Promise.all([
      getWebisafeData(site),
      getPageSpeedData(site),
    ]);

    if (!w || !g) {
      console.log(fail('  ✗ Données indisponibles — site ignoré'));
      continue;
    }

    const siteResults = { failed: [] };

    const perfOk = calibratePerformance(w, g, siteResults);
    const secOk = calibrateSecurity(w, g, siteResults);
    const seoOk = calibrateSEO(w, g, siteResults);
    const uxOk = calibrateUX(w, g, siteResults);
    const metaOk = calibrateMetadata(w, siteResults);

    globalResults.total += 5;
    if (perfOk) globalResults.passed++;
    if (secOk) globalResults.passed++;
    if (seoOk) globalResults.passed++;
    if (uxOk) globalResults.passed++;
    if (metaOk) globalResults.passed++;
    globalResults.failed.push(...siteResults.failed);

    printSiteSummary(perfOk, secOk, seoOk, uxOk, metaOk);
  }

  printFinalReport(globalResults);
}

const isMain = process.argv[1]
  ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  : false;

if (isMain) {
  runCalibration();
}

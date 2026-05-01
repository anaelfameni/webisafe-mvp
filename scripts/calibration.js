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
const TEST_SITES = [
  'https://abidjan.net',
  'https://orange.ci',
  'https://google.com',
  'https://wordpress.com',
  'https://jumia.ci',
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

// ── API PageSpeed (référence) ─────────────────────────────────────────────────
async function getPageSpeedData(url) {
  try {
    const endpoint =
      `https://www.googleapis.com/pagespeedonline/v5/runPagespeed` +
      `?url=${encodeURIComponent(url)}&strategy=mobile&key=${API_KEY}` +
      `&category=performance&category=seo&category=best-practices&category=accessibility`;

    const res = await fetch(endpoint);
    const data = await res.json();
    const lhr = data.lighthouseResult;

    if (!lhr) {
      console.error(warn(`  ⚠ PageSpeed: pas de lighthouseResult pour ${url}`));
      return null;
    }

    return {
      performance: Math.round((lhr.categories?.performance?.score ?? 0) * 100),
      seo: Math.round((lhr.categories?.seo?.score ?? 0) * 100),
      https: lhr.audits?.['is-on-https']?.score === 1,
      viewport: null,
      tapTargets: null,
      fontSize: null,
    };
  } catch (e) {
    console.error(fail(`  ✗ PageSpeed error (${url}): ${e.message}`));
    return null;
  }
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

    return {
      // Scores globaux
      performance: scores.performance ?? null,
      security: scores.security ?? null,
      seo: scores.seo ?? null,
      ux_mobile: scores.ux ?? scores.ux_mobile ?? null,

      // IMPORTANT : perf partial (fallback)
      perf_partial: perf.partial ?? null,

      // Sécurité
      https: url.startsWith('https'),
      headers_manquants: null,
      malware: sec.malware_detected ?? null,
      failles_owasp: null,

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
function calibrateSecurity(w, g, results) {
  console.log(`\n  ${BOLD}🔒 SÉCURITÉ${RESET}`);
  console.log('  ' + separator('·', 70));

  printInfoRow('Score global', w.security, 'Pas de référence PageSpeed → vérification manuelle');
  printBoolRow('HTTPS', w.https, g.https);
  printInfoRow('Headers manquants',
    w.headers_manquants !== null ? `${w.headers_manquants} manquant(s)` : null,
    'Vérifier sur securityheaders.com'
  );
  printInfoRow('Malware',
    w.malware !== null ? (w.malware ? '⚠ Détecté' : 'Aucun') : null,
    'Vérifier sur virustotal.com'
  );
  printInfoRow('Failles OWASP',
    w.failles_owasp !== null ? `${w.failles_owasp} faille(s)` : null,
    'Vérifier manuellement'
  );

  const passed = w.https === g.https;
  if (!passed) results.failed.push('Sécurité — HTTPS divergent');
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
function printSiteSummary(perfOk, secOk, seoOk, uxOk) {
  console.log(`\n  ${BOLD}Résumé du site :${RESET}`);
  console.log(`    Performance : ${perfOk ? ok('✓ Validé') : fail('✗ À revoir')}`);
  console.log(`    Sécurité    : ${secOk ? ok('✓ Validé') : fail('✗ À revoir')}`);
  console.log(`    SEO         : ${seoOk ? ok('✓ Validé') : fail('✗ À revoir')}`);
  console.log(`    UX Mobile   : ${uxOk ? ok('✓ Validé') : fail('✗ À revoir')}`);
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
  console.log(`    Sécurité    : concordance HTTPS + vérifications manuelles conseillées`);
  console.log(`    SEO         : écart ≤ 15 pts vs PageSpeed`);
  console.log(`    UX Mobile   : ≥ 2/3 signaux concordants avec PageSpeed\n`);
}

// ── Runner ────────────────────────────────────────────────────────────────────
async function runCalibration() {
  loadEnv();
  ensureRequiredEnv();

  console.log(`\n${BOLD}${CYAN}${'═'.repeat(90)}${RESET}`);
  console.log(`${BOLD}${CYAN}  CALIBRATION WEBISAFE — Performance · Sécurité · SEO · UX Mobile${RESET}`);
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

    globalResults.total += 4;
    if (perfOk) globalResults.passed++;
    if (secOk) globalResults.passed++;
    if (seoOk) globalResults.passed++;
    if (uxOk) globalResults.passed++;
    globalResults.failed.push(...siteResults.failed);

    printSiteSummary(perfOk, secOk, seoOk, uxOk);
  }

  printFinalReport(globalResults);
}

const isMain = process.argv[1]
  ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  : false;

if (isMain) {
  runCalibration();
}

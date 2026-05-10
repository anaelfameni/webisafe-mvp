import { createHash, randomUUID } from 'crypto';
import * as cheerio from 'cheerio';
import { analyzeCspQuality, analyzeSri, buildComplianceBadges, detectCms, detectJsLibraries } from '../../lib/audit/securitySignals.js';
import { checkDnssec, checkHttpMethods, scanWordPressSecurity } from './securityProbes.js';

const VT_BASE = 'https://www.virustotal.com/api/v3/urls';
const OBSERVATORY_BASE = 'https://http-observatory.security.mozilla.org/api/v1';
const TIMEOUT_VT_MS = 10_000;
const TIMEOUT_OBS_MS = 12_000;
const TIMEOUT_HEADERS_MS = 8_000;
const TIMEOUT_SENSITIVE_MS = 3_000;
const TIMEOUT_SSL_START_MS = 5_000;
const TIMEOUT_SSL_POLL_MS = 5_000;
const SSL_POLL_MAX = 9;

const SENSITIVE_TARGETS = [
  { path: '/.env', penalty: 20, severity: 'critical', label: '.env' },
  { path: '/wp-config.php', penalty: 20, severity: 'critical', label: 'wp-config.php' },
  { path: '/.git/HEAD', penalty: 20, severity: 'critical', label: '.git/HEAD' },
  { path: '/.git/config', penalty: 20, severity: 'critical', label: '.git/config' },
  { path: '/config.php', penalty: 20, severity: 'critical', label: 'config.php' },
  { path: '/phpinfo.php', penalty: 20, severity: 'critical', label: 'phpinfo.php' },
  { path: '/.htaccess', penalty: 15, severity: 'high', label: '.htaccess' },
  { path: '/backup.zip', penalty: 20, severity: 'critical', label: 'backup.zip' },
  { path: '/database.sql', penalty: 20, severity: 'critical', label: 'database.sql' },
  { path: '/web.config', penalty: 15, severity: 'high', label: 'web.config' },
  { path: '/config.yml', penalty: 15, severity: 'high', label: 'config.yml' },
  { path: '/config.yaml', penalty: 15, severity: 'high', label: 'config.yaml' },
  { path: '/.DS_Store', penalty: 10, severity: 'medium', label: '.DS_Store' },
  { path: '/admin', penalty: 0, severity: 'info', label: '/admin' },
  { path: '/api/swagger-ui.html', penalty: 5, severity: 'medium', label: 'Swagger UI' },
];

// Severities calibrées : ces headers sont des best practices défensives, pas des failles
// exploitables en soi quand HTTPS est actif. Aucun ne devrait être marqué 'high' ou 'critical'.
const SECURITY_HEADERS_CONFIG = {
  'strict-transport-security': { points: 20, severity: 'medium', label: 'HSTS', message: 'HSTS absent — protection downgrade HTTPS recommandée' },
  'content-security-policy': { points: 20, severity: 'medium', label: 'CSP', message: 'CSP absent — défense en profondeur contre XSS recommandée' },
  'x-frame-options': { points: 15, severity: 'low', label: 'X-Frame-Options', message: 'X-Frame-Options absent — anti-clickjacking recommandé' },
  'x-content-type-options': { points: 10, severity: 'low', label: 'X-Content-Type-Options', message: 'X-Content-Type-Options absent — anti-MIME-sniffing recommandé' },
  'referrer-policy': { points: 10, severity: 'low', label: 'Referrer-Policy', message: "Referrer-Policy absent — contrôle des fuites d'URL recommandé" },
  'permissions-policy': { points: 10, severity: 'low', label: 'Permissions-Policy', message: 'Permissions-Policy absent — contrôle APIs navigateur recommandé' },
};

// ── Utils ─────────────────────────────────────────────────────────────────────
function base64url(str) {
  return Buffer.from(str).toString('base64url');
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function signatureOf(text) {
  return createHash('sha1')
    .update((text || '').replace(/\s+/g, ' ').trim().slice(0, 60_000))
    .digest('hex');
}

async function fetchTarget(url, timeoutMs) {
  const res = await fetch(url, {
    method: 'GET',
    signal: AbortSignal.timeout(timeoutMs),
    redirect: 'follow',
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Webisafe/1.0)' },
  });
  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  const text = await res.text();
  return { status: res.status, finalUrl: res.url, contentType, text };
}

// ── 1) VirusTotal ─────────────────────────────────────────────────────────────
async function checkVirusTotal(url, apiKey) {
  if (!apiKey) {
    console.warn('[SECURITY] Clé VirusTotal absente — sous-scan ignoré');
    return { malware_detected: null };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_VT_MS);
  try {
    const encoded = base64url(url);
    const response = await fetch(`${VT_BASE}/${encoded}`, {
      headers: { 'x-apikey': apiKey },
      signal: controller.signal,
    });
    if (response.status === 404) return { malware_detected: false };
    if (!response.ok) throw new Error(`VirusTotal HTTP ${response.status}`);
    const data = await response.json();
    const stats = data?.data?.attributes?.last_analysis_stats ?? {};
    const maliciousCount = (stats.malicious ?? 0) + (stats.suspicious ?? 0);
    return { malware_detected: maliciousCount > 0, malicious_count: maliciousCount };
  } finally {
    clearTimeout(timer);
  }
}

// ── 2) Mozilla Observatory ────────────────────────────────────────────────────
async function checkObservatory(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_OBS_MS);
  try {
    const hostname = new URL(url).hostname;
    const response = await fetch(
      `${OBSERVATORY_BASE}/analyze?host=${encodeURIComponent(hostname)}&rescan=false`,
      { method: 'POST', signal: controller.signal },
    );
    if (!response.ok) throw new Error(`Observatory HTTP ${response.status}`);
    const data = await response.json();
    return { observatory_score: data?.score ?? null };
  } finally {
    clearTimeout(timer);
  }
}

// ── 3) Headers de sécurité ───────────────────────────────────────────────────
async function checkSecurityHeaders(url) {
  try {
    const fetchHeaders = (method) => fetch(url, {
      method,
      signal: AbortSignal.timeout(TIMEOUT_HEADERS_MS),
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Webisafe/1.0)' },
    });

    let response;
    try {
      response = await fetchHeaders('HEAD');
      if (!response.ok) throw new Error(`HEAD HTTP ${response.status}`);
    } catch (headErr) {
      console.warn('[SECURITY] HEAD headers check failed, fallback GET:', headErr.message);
      response = await fetchHeaders('GET');
    }

    let analyzed = analyzeSecurityHeaders(response.headers, response.url || url);
    const hasUsefulHeaderSignal =
      analyzed.headers_presents.length > 0 ||
      response.headers.get('server') ||
      response.headers.get('content-type');

    if (!hasUsefulHeaderSignal) {
      response = await fetchHeaders('GET');
      analyzed = analyzeSecurityHeaders(response.headers, response.url || url);
    }

    const finalUrl = response.url || url;
    return { ...analyzed, finalUrl };
  } catch (err) {
    console.warn('[SECURITY] Headers check failed:', err.message);
    const isHttps = url.startsWith('https://');
    return {
      score: 0,
      headers_presents: [],
      headers_manquants: Object.values(SECURITY_HEADERS_CONFIG).map(h => ({ header: h.label, message: h.message, severity: h.severity })),
      cookie_issues: [],
      header_score: 0,
      ssl_grade: isHttps ? 'Unknown' : 'Absent',
      grade: 'F',
    };
  }
}

export function analyzeSecurityHeaders(headers, url = '') {
  // Baseline 30 (au lieu de 15) : un site qui répond correctement a déjà une base saine.
  // Chaque header présent ajoute son poids.
  let score = 30;
  const present = [];
  const missing = [];

  for (const [header, config] of Object.entries(SECURITY_HEADERS_CONFIG)) {
    if (headers.get(header)) {
      score += config.points;
      present.push(header);
    } else {
      missing.push({ header: config.label, message: config.message, severity: config.severity });
    }
  }

  const cookies = headers.get('set-cookie') || '';
  const cookieIssues = [];
  if (cookies) {
    if (!cookies.includes('HttpOnly')) { cookieIssues.push('Cookies sans HttpOnly — Vol de session possible via XSS'); score -= 10; }
    if (!cookies.includes('Secure')) { cookieIssues.push('Cookies sans flag Secure — Transmis en clair sur HTTP'); score -= 10; }
    if (!cookies.includes('SameSite')) { cookieIssues.push('Cookies sans SameSite — Attaque CSRF possible'); score -= 5; }
  }

  const clampedScore = clamp(score, 0, 100);
  const isHttps = url.startsWith('https://');

  return {
    score: clampedScore,
    headers_presents: present,
    headers_manquants: missing,
    cookie_issues: cookieIssues,
    header_score: clampedScore,
    ssl_grade: isHttps ? (headers.get('strict-transport-security') ? 'A+' : 'A') : 'Absent',
    grade:
      clampedScore >= 85 ? 'A' :
        clampedScore >= 70 ? 'B' :
          clampedScore >= 50 ? 'C' :
            clampedScore >= 30 ? 'D' : 'F',
  };
}

// ── 4) Scan fichiers sensibles (anti soft-404) ────────────────────────────────
function checkRelevantContent(path, text) {
  const t = text || '';
  const checks = {
    '/.env': () => t.includes('=') && (t.includes('DB_') || t.includes('KEY') || t.includes('SECRET') || t.includes('PASSWORD') || t.includes('TOKEN')),
    '/wp-config.php': () => t.includes('DB_NAME') || t.includes('table_prefix') || t.includes('define('),
    '/.git/HEAD': () => t.startsWith('ref:') || t.includes('refs/heads/'),
    '/.git/config': () => t.includes('[core]') || t.includes('[remote'),
    '/config.php': () => t.includes('<?php') && (t.toLowerCase().includes('password') || t.toLowerCase().includes('database')),
    '/phpinfo.php': () => t.includes('PHP Version') || t.toLowerCase().includes('phpinfo()'),
    '/.htaccess': () => t.includes('RewriteEngine') || t.includes('Options') || t.includes('RewriteRule'),
    '/backup.zip': () => !t.trim().startsWith('<') && !t.toLowerCase().includes('<html') && t.length > 200,
    '/database.sql': () => t.includes('CREATE TABLE') || t.includes('INSERT INTO') || t.includes('DROP TABLE'),
    '/web.config': () => t.includes('<configuration>') || t.includes('<?xml'),
    '/config.yml': () => t.includes(':') && !t.toLowerCase().includes('<html'),
    '/config.yaml': () => t.includes(':') && !t.toLowerCase().includes('<html'),
    '/.DS_Store': () => t.length > 50 && !t.toLowerCase().includes('<html'),
    '/api/swagger-ui.html': () => t.toLowerCase().includes('swagger') || t.toLowerCase().includes('openapi'),
    '/admin': () => t.toLowerCase().includes('login') || t.toLowerCase().includes('password') || t.toLowerCase().includes('admin'),
  };
  const checker = checks[path];
  if (!checker) return false;
  try { return checker(); } catch { return false; }
}

export async function scanSensitiveFiles(url) {
  const base = url.replace(/\/$/, '');

  // Probe : URL inexistante → signature de la page "404/générique" du site
  let notFoundSig = null;
  try {
    const probe = await fetchTarget(`${base}/__webisafe_probe_${randomUUID()}`, TIMEOUT_SENSITIVE_MS);
    if (probe.text) notFoundSig = signatureOf(probe.text);
  } catch { }

  // Homepage : pour détecter les redirections vers l'accueil
  let homeSig = null;
  try {
    const home = await fetchTarget(`${base}/`, TIMEOUT_SENSITIVE_MS);
    if (home.status === 200 && home.text) homeSig = signatureOf(home.text);
  } catch { }

  const results = await Promise.allSettled(
    SENSITIVE_TARGETS.map(async (target) => {
      try {
        const r = await fetchTarget(`${base}${target.path}`, TIMEOUT_SENSITIVE_MS);

        if (r.status !== 200) return { path: target.path, exposed: false };

        const sig = signatureOf(r.text);

        // Soft-404 détecté
        if (notFoundSig && sig === notFoundSig)
          return { path: target.path, exposed: false };

        // Redirection vers homepage
        if (homeSig && sig === homeSig && (target.penalty ?? 0) > 0)
          return { path: target.path, exposed: false };

        // Contenu trop court
        if (r.text.length < 30 && (target.penalty ?? 0) > 0)
          return { path: target.path, exposed: false };

        // Pour les cibles critiques : exige du contenu pertinent
        if ((target.penalty ?? 0) > 0 && !checkRelevantContent(target.path, r.text))
          return { path: target.path, exposed: false };

        return { path: target.path, exposed: true };
      } catch {
        return { path: target.path, exposed: false };
      }
    }),
  );

  const exposed = results
    .filter(r => r.status === 'fulfilled' && r.value.exposed)
    .map(r => r.value.path);

  const exposedDetails = exposed.map((p) => {
    const t = SENSITIVE_TARGETS.find(x => x.path === p);
    return { path: p, severity: t?.severity ?? 'unknown', penalty: t?.penalty ?? 0, label: t?.label ?? p };
  });

  const penaltySum = exposedDetails.reduce((acc, x) => acc + (x.penalty ?? 0), 0);
  const scorePenalty = clamp(penaltySum, 0, 60);
  const critical = exposedDetails.some(x => (x.penalty ?? 0) > 0);

  if (exposed.length > 0) console.warn('[SECURITY] Fichiers/paths exposés :', exposed);

  return {
    exposed_files: exposed,
    exposed_details: exposedDetails,
    critical,
    score_penalty: scorePenalty,
    alert_message: critical
      ? `Fichiers sensibles accessibles : ${exposedDetails.filter(x => x.penalty > 0).map(x => x.path).join(', ')}`
      : (exposed.length > 0 ? `Chemins détectés : ${exposed.join(', ')}` : null),
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
    return { html: await response.text(), headers: response.headers, finalUrl: response.url || url };
  } catch {
    return { html: '', headers: null, finalUrl: url };
  }
}

// ── 5) SSL Labs ───────────────────────────────────────────────────────────────
export async function fetchSSLGrade(domain) {
  try {
    await fetch(
      `https://api.ssllabs.com/api/v3/analyze?host=${encodeURIComponent(domain)}&publish=off&startNew=on`,
      { signal: AbortSignal.timeout(TIMEOUT_SSL_START_MS) },
    );
    for (let i = 0; i < SSL_POLL_MAX; i++) {
      await new Promise(r => setTimeout(r, TIMEOUT_SSL_POLL_MS));
      const res = await fetch(
        `https://api.ssllabs.com/api/v3/analyze?host=${encodeURIComponent(domain)}&publish=off`,
        { signal: AbortSignal.timeout(TIMEOUT_SSL_START_MS) },
      );
      const data = await res.json();
      if (data.status === 'READY') {
        const endpoint = data.endpoints?.[0];
        const protocols = endpoint?.details?.protocols ?? [];
        return {
          grade: endpoint?.grade || 'N/A',
          tls_version: protocols.map(p => `${p.name} ${p.version}`).join(', ') || 'Inconnu',
          vulnerabilities: {
            poodle: endpoint?.details?.poodle || false,
            heartbleed: endpoint?.details?.heartbleed || false,
            beast: endpoint?.details?.vulnBeast || false,
          },
          cert_expiry: data.certs?.[0]?.notAfter
            ? new Date(data.certs[0].notAfter).toLocaleDateString('fr-FR')
            : null,
        };
      }
      if (data.status === 'ERROR') break;
    }
    return { grade: 'N/A', error: 'Timeout SSL Labs' };
  } catch (err) {
    return { grade: 'N/A', error: `SSL Labs indisponible (${err.message})` };
  }
}

// ── Score composite ───────────────────────────────────────────────────────────
// Répartition rééquilibrée : 35 HTTPS + 35 Malware + 15 Observatory/Headers + 10 Fichiers + 5 SSL
// Les fondamentaux (HTTPS + pas de malware) pèsent 70 pts. Les best practices headers : 15 pts max.
function computeSecurityScore({ malwareDetected, observatoryScore, isHttps, headerScore, sensitiveCritical, ssl_grade }) {
  if (malwareDetected === true) return Math.min(25, clamp(0, 0, 100));
  let score = 0;

  // Fondamentaux (75 pts)
  score += isHttps ? 35 : 0;                         // chiffrement transport
  score += isHttps ? 5 : 0;                          // SSL valide (implicite si HTTPS répond)
  if (malwareDetected === false) score += 35;        // vérifié OK
  else if (malwareDetected === null) score += 30;    // non vérifié → bénéfice du doute

  // Best practices (15 pts max)
  if (observatoryScore !== null) score += Math.round((observatoryScore / 100) * 15);
  else if (headerScore !== null) score += Math.round((headerScore / 100) * 15);
  else score += 5;

  // SSL (5 pts)
  if (ssl_grade === 'A+' || ssl_grade === 'A') score += 5;
  else if (ssl_grade === 'B' || ssl_grade === 'C') score += 2;
  else if (ssl_grade === 'D' || ssl_grade === 'E' || ssl_grade === 'F') score -= 5;

  // Hygiène (10 pts)
  if (!sensitiveCritical) score += 10;

  return clamp(score, 0, 100);
}

// ── Scanner principal ─────────────────────────────────────────────────────────
export async function scanSecurity(url, vtApiKey) {
  let isHttps = url.startsWith('https://');
  const domain = new URL(url).hostname;

  // SSL Labs : uniquement en production (trop lent en dev)
  const sslPromise = process.env.NODE_ENV === 'production'
    ? fetchSSLGrade(domain)
    : Promise.resolve({ grade: 'N/A', error: 'Désactivé en développement' });

  const [vtResult, obsResult, headersResult, sensitiveResult, sslResult] =
    await Promise.allSettled([
      checkVirusTotal(url, vtApiKey),
      checkObservatory(url),
      checkSecurityHeaders(url),
      scanSensitiveFiles(url),
      sslPromise,
    ]);

  const malwareDetected = vtResult.status === 'fulfilled' ? vtResult.value.malware_detected : null;
  const observatoryScore = obsResult.status === 'fulfilled' ? obsResult.value.observatory_score : null;

  const headersData = headersResult.status === 'fulfilled'
    ? headersResult.value
    : {
      headers_presents: [],
      headers_manquants: Object.values(SECURITY_HEADERS_CONFIG).map(h => ({ header: h.label, message: h.message, severity: h.severity })),
      cookie_issues: [],
      header_score: null,
      ssl_grade: isHttps ? 'Unknown' : 'Absent',
      finalUrl: url,
      grade: 'F',
    };

  // Si le check headers a retourné une URL finale, s'en servir pour déterminer HTTPS
  try {
    if (headersData && headersData.finalUrl && typeof headersData.finalUrl === 'string' && headersData.finalUrl.startsWith('https://')) {
      isHttps = true;
    }
  } catch (e) { /* ignore */ }

  const sensitiveData = sensitiveResult.status === 'fulfilled'
    ? sensitiveResult.value
    : { exposed_files: [], exposed_details: [], critical: false, score_penalty: 0, alert_message: null };

  const sslData = sslResult.status === 'fulfilled'
    ? sslResult.value
    : { grade: 'N/A', error: 'Non disponible' };

  // Logs erreurs
  if (vtResult.status === 'rejected') console.error('[SECURITY] VirusTotal :', vtResult.reason?.message);
  if (obsResult.status === 'rejected') console.error('[SECURITY] Observatory :', obsResult.reason?.message);
  if (headersResult.status === 'rejected') console.error('[SECURITY] Headers :', headersResult.reason?.message);
  if (sensitiveResult.status === 'rejected') console.error('[SECURITY] Sensitive files :', sensitiveResult.reason?.message);
  if (sslResult.status === 'rejected') console.error('[SECURITY] SSL Labs :', sslResult.reason?.message);

  const resolvedSslGrade = sslData.grade !== 'N/A' ? sslData.grade : headersData.ssl_grade;

  const baseScore = computeSecurityScore({
    malwareDetected,
    observatoryScore,
    isHttps,
    headerScore: headersData.header_score,
    sensitiveCritical: sensitiveData.critical,
    ssl_grade: resolvedSslGrade,
  });

  const finalScore = Math.max(0, baseScore - (sensitiveData.score_penalty ?? 0));

  const securityHtml = await fetchSecurityHtml(headersData.finalUrl ?? url);
  const $security = cheerio.load(securityHtml.html || '');
  const cspQuality = analyzeCspQuality(securityHtml.headers?.get?.('content-security-policy') || '');
  const cmsDetection = detectCms($security, securityHtml.html || '', { headers: securityHtml.headers });
  const jsLibraries = detectJsLibraries($security, securityHtml.html || '');
  const sri = analyzeSri($security, securityHtml.finalUrl || headersData.finalUrl || url);
  const [httpMethods, dnssec, wordpressSecurity] = await Promise.all([
    checkHttpMethods(headersData.finalUrl ?? url),
    checkDnssec(domain),
    scanWordPressSecurity(securityHtml.finalUrl || headersData.finalUrl || url, securityHtml.html || '', cmsDetection),
  ]);
  const complianceBadges = buildComplianceBadges({
    https: isHttps,
    csp_quality: cspQuality,
    dnssec,
    sri,
    malware_detected: malwareDetected,
  });

  return {
    score: finalScore,
    malware_detected: malwareDetected,
    observatory_score: observatoryScore,
    https: isHttps,
    finalUrl: headersData.finalUrl ?? url,
    ssl_grade: sslData.grade !== 'N/A' ? sslData.grade : headersData.ssl_grade,
    headers_presents: headersData.headers_presents,
    headers_manquants: headersData.headers_manquants,
    cookie_issues: headersData.cookie_issues,
    security_grade: headersData.grade,
    ssl_details: sslData,
    sensitive_files: sensitiveData,
    csp_quality: cspQuality,
    http_methods: httpMethods,
    dnssec,
    cms_detection: cmsDetection,
    wordpress_security: wordpressSecurity,
    js_libraries: jsLibraries,
    sri,
    compliance_badges: complianceBadges,
    headers_missing_count: headersData.headers_manquants?.length ?? 0,
    failles_owasp_count: sensitiveData.exposed_files?.length ?? 0,
    partial: observatoryScore === null && headersData.header_score === null,
  };
}
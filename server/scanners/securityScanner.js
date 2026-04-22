const VT_BASE = 'https://www.virustotal.com/api/v3/urls';
const OBSERVATORY_BASE = 'https://http-observatory.security.mozilla.org/api/v1';
const TIMEOUT_VT_MS = 10_000;
const TIMEOUT_OBS_MS = 12_000;
const TIMEOUT_HEADERS_MS = 8_000;

function base64url(str) {
  return Buffer.from(str).toString('base64url');
}

// ── VirusTotal ────────────────────────────────────────────────────────────────
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

    if (response.status === 404) {
      console.log('[SECURITY] URL inconnue de VirusTotal — considérée saine');
      return { malware_detected: false };
    }

    if (!response.ok) throw new Error(`VirusTotal HTTP ${response.status}`);

    const data = await response.json();
    const stats = data?.data?.attributes?.last_analysis_stats ?? {};
    const maliciousCount = (stats.malicious ?? 0) + (stats.suspicious ?? 0);

    return { malware_detected: maliciousCount > 0, malicious_count: maliciousCount };
  } finally {
    clearTimeout(timer);
  }
}

// ── Mozilla Observatory ───────────────────────────────────────────────────────
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

// ── Analyse directe des headers HTTP ─────────────────────────────────────────
// C'était la pièce manquante : sans cette analyse, le score était toujours
// basé sur Observatory seul (~50) + pas de malware = 80 fixe.
async function checkSecurityHeaders(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_HEADERS_MS);

  const REQUIRED_HEADERS = [
    { name: 'content-security-policy', label: 'CSP' },
    { name: 'strict-transport-security', label: 'HSTS' },
    { name: 'x-frame-options', label: 'X-Frame-Options' },
    { name: 'x-content-type-options', label: 'X-Content-Type-Options' },
    { name: 'referrer-policy', label: 'Referrer-Policy' },
    { name: 'permissions-policy', label: 'Permissions-Policy' },
  ];

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Webisafe/1.0)' },
    });

    const headers = response.headers;

    const manquants = REQUIRED_HEADERS
      .filter(h => !headers.get(h.name))
      .map(h => h.label);

    // Score sur 100 basé sur le ratio de headers présents
    const headerScore = Math.round(
      ((REQUIRED_HEADERS.length - manquants.length) / REQUIRED_HEADERS.length) * 100
    );

    // SSL grade simplifié
    const isHttps = url.startsWith('https://');
    const ssl_grade = isHttps
      ? (headers.get('strict-transport-security') ? 'A+' : 'A')
      : 'Absent';

    return { headers_manquants: manquants, header_score: headerScore, ssl_grade };
  } catch (err) {
    console.warn('[SECURITY] Headers check failed:', err.message);
    // Fallback minimal si le site bloque HEAD
    const isHttps = url.startsWith('https://');
    return {
      headers_manquants: REQUIRED_HEADERS.map(h => h.label), // tous manquants par défaut
      header_score: 0,
      ssl_grade: isHttps ? 'Unknown' : 'Absent',
    };
  } finally {
    clearTimeout(timer);
  }
}

// ── Calcul du score composite ─────────────────────────────────────────────────
// Répartition :
//   20 pts  HTTPS
//   30 pts  Observatory OU headers directs (si Observatory indisponible)
//   30 pts  Absence de malware
//   20 pts  Qualité des headers HTTP
function computeSecurityScore(malwareDetected, observatoryScore, isHttps, headerScore) {
  // Malware détecté → score nul immédiatement
  if (malwareDetected === true) return 0;

  let score = 0;

  // 1. HTTPS (20 pts)
  score += isHttps ? 20 : 0;

  // 2. Observatory / analyse headers (30 pts)
  if (observatoryScore !== null) {
    score += Math.round((observatoryScore / 100) * 30);
  } else if (headerScore !== null) {
    // Observatory indisponible → on utilise notre analyse directe
    score += Math.round((headerScore / 100) * 30);
  } else {
    score += 10; // inconnu → minimum
  }

  // 3. Malware (30 pts)
  if (malwareDetected === false) {
    score += 30;
  } else {
    // null = clé absente ou erreur → moitié des points
    score += 15;
  }

  // 4. Qualité des headers HTTP (20 pts)
  if (headerScore !== null) {
    score += Math.round((headerScore / 100) * 20);
  } else if (isHttps) {
    score += 10; // HTTPS sans détail → bonus partiel
  }

  return Math.min(100, Math.max(0, score));
}

// ── Scanner principal ─────────────────────────────────────────────────────────
export async function scanSecurity(url, vtApiKey) {
  const isHttps = url.startsWith('https://');

  const [vtResult, obsResult, headersResult] = await Promise.allSettled([
    checkVirusTotal(url, vtApiKey),
    checkObservatory(url),
    checkSecurityHeaders(url),
  ]);

  const malwareDetected = vtResult.status === 'fulfilled' ? vtResult.value.malware_detected : null;
  const observatoryScore = obsResult.status === 'fulfilled' ? obsResult.value.observatory_score : null;
  const headersData = headersResult.status === 'fulfilled' ? headersResult.value : {
    headers_manquants: [],
    header_score: null,
    ssl_grade: isHttps ? 'Unknown' : 'Absent',
  };

  if (vtResult.status === 'rejected') console.error('[SECURITY] VirusTotal :', vtResult.reason?.message);
  if (obsResult.status === 'rejected') console.error('[SECURITY] Observatory :', obsResult.reason?.message);
  if (headersResult.status === 'rejected') console.error('[SECURITY] Headers :', headersResult.reason?.message);

  const score = computeSecurityScore(
    malwareDetected,
    observatoryScore,
    isHttps,
    headersData.header_score,
  );

  return {
    score,
    malware_detected: malwareDetected,
    observatory_score: observatoryScore,
    https: isHttps,
    ssl_grade: headersData.ssl_grade,
    headers_manquants: headersData.headers_manquants,
    // Approximation OWASP basée sur les headers manquants
    failles_owasp_count: headersData.headers_manquants.length,
    partial: observatoryScore === null && headersData.header_score === null,
  };
}
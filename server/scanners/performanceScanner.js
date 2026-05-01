// server/scanners/performanceScanner.js

// ── Constants ─────────────────────────────────────────────────────────────────
const PAGESPEED_BASE = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

// PSI peut être lent sur certains sites (jumia, gros e-commerce, etc.)
const TIMEOUT_PS_MS = 60_000;
const TIMEOUT_PS_RETRY_MS = 75_000;

const TIMEOUT_TTFB_MS = 6_000;
const TIMEOUT_GEO_MS = 5_000;

// Latences estimées (en ms) depuis l'Afrique de l'Ouest selon le pays du serveur
const LATENCY_BY_COUNTRY = {
  US: 180, CA: 190,
  FR: 120, DE: 130, GB: 125, NL: 128, BE: 122, CH: 125,
  SG: 220, JP: 280, AU: 300, IN: 200,
  BR: 250, AR: 260,
};

// Codes pays Afrique de l'Ouest (latence locale ~20-40ms)
const WEST_AFRICA_CODES = new Set([
  'CI', 'SN', 'ML', 'BF', 'GN', 'TG', 'BJ', 'NE', 'CM', 'GH',
  'NG', 'MR', 'SL', 'LR', 'GM', 'GW', 'CV',
]);

// ── 1) Google PageSpeed Insights (robuste : category + timeout + retry) ───────
async function runPageSpeed(url, apiKey) {
  if (!apiKey) {
    throw new Error('Cle PageSpeed absente');
  }

  const attempt = async (timeoutMs) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // IMPORTANT : category=performance réduit la charge et accélère souvent la réponse
      const apiUrl =
        `${PAGESPEED_BASE}` +
        `?url=${encodeURIComponent(url)}` +
        `&strategy=mobile` +
        `&category=performance` +
        `&key=${apiKey}`;

      const response = await fetch(apiUrl, { signal: controller.signal });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`PageSpeed HTTP ${response.status} : ${body.slice(0, 200)}`);
      }

      const data = await response.json();
      const lr = data.lighthouseResult;

      if (!lr) throw new Error('Réponse PageSpeed invalide : lighthouseResult absent');

      const score = Math.round((lr.categories?.performance?.score ?? 0) * 100);
      const lcp = lr.audits?.['largest-contentful-paint']?.numericValue ?? null;
      const cls = lr.audits?.['cumulative-layout-shift']?.numericValue ?? null;
      const fcp = lr.audits?.['first-contentful-paint']?.numericValue ?? null;
      const tbt = lr.audits?.['total-blocking-time']?.numericValue ?? null;
      const tti = lr.audits?.['interactive']?.numericValue ?? null;
      const pageWeightB = lr.audits?.['total-byte-weight']?.numericValue ?? null;

      // Opportunités d'optimisation (top 5)
      const opportunities = Object.entries(lr.audits ?? {})
        .filter(([, audit]) =>
          audit?.details?.type === 'opportunity' &&
          audit.score !== null && audit.score < 0.9
        )
        .map(([key, audit]) => ({
          id: key,
          title: audit.title,
          description: audit.description,
          savings_ms: audit.details?.overallSavingsMs ?? null,
        }))
        .sort((a, b) => (b.savings_ms ?? 0) - (a.savings_ms ?? 0))
        .slice(0, 5);

      return {
        score,
        lcp,
        cls,
        fcp,
        tbt,
        tti,
        page_weight_mb: pageWeightB !== null
          ? Math.round((pageWeightB / 1_048_576) * 100) / 100
          : null,
        opportunities,
        partial: false,
      };
    } finally {
      clearTimeout(timer);
    }
  };

  try {
    return await attempt(TIMEOUT_PS_MS);
  } catch (err) {
    const msg = String(err?.message || '').toLowerCase();
    const isTimeoutOrAbort =
      msg.includes('aborted') ||
      msg.includes('timeout') ||
      msg.includes('timed out');

    // Retry 1 fois uniquement sur timeout/abort (cas très fréquent)
    if (isTimeoutOrAbort) {
      console.warn('[PERFORMANCE] PageSpeed timeout/abort → retry 1 fois (75s)');
      return await attempt(TIMEOUT_PS_RETRY_MS);
    }

    throw err;
  }
}

// ── 2) Fallback TTFB (si PageSpeed échoue) ────────────────────────────────────
async function measureTTFB(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_TTFB_MS);

  try {
    const start = Date.now();

    // HEAD peut être bloqué, GET est parfois plus fiable.
    // On utilise GET mais on ne lit pas forcément le body.
    await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Webisafe/1.0)' },
    });

    const ttfb = Date.now() - start;

    // Score estimé selon TTFB
    const score =
      ttfb < 300 ? 75 :
        ttfb < 600 ? 65 :
          ttfb < 1000 ? 55 :
            ttfb < 2000 ? 45 : 30;

    console.log(`[PERFORMANCE] Fallback TTFB ${ttfb}ms → score estimé ${score}`);

    return {
      score,
      lcp: null,
      cls: null,
      fcp: null,
      tbt: null,
      tti: null,
      page_weight_mb: null,
      ttfb_ms: ttfb,
      opportunities: [],
      partial: true,
      partial_reason: 'pagespeed_failed_fallback_ttfb',
    };
  } finally {
    clearTimeout(timer);
  }
}

// ── 3) Géolocalisation serveur (ip-api.com — gratuit) ─────────────────────────
export async function getServerLocation(domain) {
  try {
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(domain)}?fields=status,country,countryCode,city,isp,lat,lon,query,message`,
      { signal: AbortSignal.timeout(TIMEOUT_GEO_MS) },
    );

    if (!res.ok) throw new Error(`ip-api HTTP ${res.status}`);

    const geo = await res.json();
    if (geo.status !== 'success') throw new Error(`ip-api: ${geo.message || 'status non-success'}`);

    const ip = geo.query;
    const isLocalAfrica = WEST_AFRICA_CODES.has(geo.countryCode);
    const estimatedDelay = LATENCY_BY_COUNTRY[geo.countryCode] ?? 150;

    const latencyWarning = !isLocalAfrica
      ? {
        warning: true,
        message: `Serveur en ${geo.country} — latence estimée +${estimatedDelay}ms pour vos visiteurs ivoiriens`,
        impact: 'Vos visiteurs africains chargent votre site 2-3x plus lentement',
        recommendation: 'Envisagez un CDN (Cloudflare gratuit) ou un hébergeur africain',
      }
      : {
        warning: false,
        message: `Serveur en ${geo.country} — bonne proximité avec vos visiteurs africains`,
      };

    return {
      ip,
      country: geo.country,
      country_code: geo.countryCode,
      city: geo.city,
      isp: geo.isp,
      coordinates: { lat: geo.lat, lon: geo.lon },
      is_local_africa: isLocalAfrica,
      latency_warning: latencyWarning,
    };
  } catch (err) {
    console.warn('[PERFORMANCE] Géolocalisation échouée :', err.message);
    return null;
  }
}

// ── Scanner principal ─────────────────────────────────────────────────────────
export async function scanPerformance(url, apiKey) {
  const domain = new URL(url).hostname;

  // Lance PageSpeed + géolocalisation en parallèle
  const [psResult, geoResult] = await Promise.allSettled([
    runPageSpeed(url, apiKey),
    getServerLocation(domain),
  ]);

  let perfData;

  if (psResult.status === 'fulfilled') {
    perfData = psResult.value;
  } else {
    console.error('[PERFORMANCE] PageSpeed failed:', psResult.reason?.message, '— fallback TTFB activé');

    try {
      perfData = await measureTTFB(url);
    } catch (fallbackErr) {
      console.error('[PERFORMANCE] Fallback TTFB aussi échoué :', fallbackErr.message);
      perfData = {
        score: null,
        lcp: null,
        cls: null,
        fcp: null,
        tbt: null,
        tti: null,
        page_weight_mb: null,
        opportunities: [],
        partial: true,
        partial_reason: 'pagespeed_and_fallback_failed',
      };
    }
  }

  const geoData = geoResult.status === 'fulfilled' ? geoResult.value : null;
  if (geoResult.status === 'rejected') {
    console.warn('[PERFORMANCE] Geo :', geoResult.reason?.message);
  }

  return {
    ...perfData,
    server_location: geoData,
  };
}

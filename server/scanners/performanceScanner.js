const PAGESPEED_BASE = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
const TIMEOUT_MS = 25_000;

/**
 * Scan de performance via Google PageSpeed Insights (Mobile).
 * Si PageSpeed échoue (site qui bloque les bots, quota dépassé…),
 * un fallback mesure le TTFB réel pour estimer un score partiel.
 */
export async function scanPerformance(url, apiKey) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const apiUrl = `${PAGESPEED_BASE}?url=${encodeURIComponent(url)}&strategy=mobile&key=${apiKey}`;
    const response = await fetch(apiUrl, { signal: controller.signal });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`PageSpeed HTTP ${response.status} : ${body.slice(0, 200)}`);
    }

    const data = await response.json();
    const lr = data.lighthouseResult;

    if (!lr) throw new Error('Réponse PageSpeed invalide : lighthouseResult absent');

    const score = Math.round((lr.categories?.performance?.score ?? 0) * 100);
    const lcp = lr.audits?.['largest-contentful-paint']?.numericValue ?? null;
    const cls = lr.audits?.['cumulative-layout-shift']?.numericValue ?? null;
    const fcp = lr.audits?.['first-contentful-paint']?.numericValue ?? null;
    const pageWeightB = lr.audits?.['total-byte-weight']?.numericValue ?? null;

    return {
      score,
      lcp,
      cls,
      fcp,
      page_weight_mb: pageWeightB !== null
        ? Math.round((pageWeightB / 1_048_576) * 100) / 100
        : null,
      partial: false,
    };

  } catch (err) {
    // PageSpeed a échoué (site bloque les bots, quota, timeout…)
    console.error('[PERFORMANCE] PageSpeed failed:', err.message, '— fallback TTFB activé');

    // Fallback : mesure directe du temps de réponse serveur
    try {
      const start = Date.now();
      const fallbackController = new AbortController();
      const fallbackTimer = setTimeout(() => fallbackController.abort(), 5_000);

      await fetch(url, {
        method: 'HEAD',
        signal: fallbackController.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Webisafe/1.0)' },
      });
      clearTimeout(fallbackTimer);

      const ttfb = Date.now() - start;

      // Score estimé selon la réactivité du serveur
      // < 300ms → bon serveur, >= 2000ms → lent
      const fallbackScore =
  ttfb < 300  ? 75 :
  ttfb < 600  ? 65 :
  ttfb < 1000 ? 55 :
  ttfb < 2000 ? 45 : 30;

      console.log(`[PERFORMANCE] Fallback TTFB ${ttfb}ms → score estimé ${fallbackScore}`);

      return {
        score: fallbackScore,
        lcp: null,
        cls: null,
        fcp: null,
        page_weight_mb: null,
        partial: true, // indique que ce sont des données estimées
      };

    } catch (fallbackErr) {
      // Même le HEAD échoue → score null (non mesuré, pas 0)
      console.error('[PERFORMANCE] Fallback aussi échoué :', fallbackErr.message);
      return {
        score: null,
        lcp: null,
        cls: null,
        fcp: null,
        page_weight_mb: null,
        partial: true,
      };
    }

  } finally {
    clearTimeout(timer);
  }
}
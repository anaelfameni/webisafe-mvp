const PAGESPEED_BASE = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
const TIMEOUT_MS = 15_000;

/**
 * Scan UX/Accessibilité mobile via Google PageSpeed (category=accessibility).
 * Si PageSpeed échoue, retourne null (non mesuré) plutôt que 0.
 */
export async function scanUXMobile(url, apiKey) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const apiUrl = [
      PAGESPEED_BASE,
      `?url=${encodeURIComponent(url)}`,
      `&strategy=mobile`,
      `&category=accessibility`,
      `&key=${apiKey}`,
    ].join('');

    const response = await fetch(apiUrl, { signal: controller.signal });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`PageSpeed UX HTTP ${response.status} : ${body.slice(0, 200)}`);
    }

    const data = await response.json();
    const lr = data.lighthouseResult;

    if (!lr) throw new Error('Réponse PageSpeed UX invalide : lighthouseResult absent');

    const accessibilityScore = Math.round(
      (lr.categories?.accessibility?.score ?? 0) * 100,
    );

    // tap-targets : score >= 0.9 = éléments bien dimensionnés
    const tapTargetsRaw = lr.audits?.['tap-targets']?.score ?? null;
    const tapTargetsOk = tapTargetsRaw !== null ? tapTargetsRaw >= 0.9 : null;

    return {
      score: accessibilityScore,
      accessibility_score: accessibilityScore,
      tap_targets_ok: tapTargetsOk,
      partial: false,
    };

  } catch (err) {
    // PageSpeed inaccessible pour ce site (bloque les bots, quota…)
    // On retourne null : "non mesuré" est plus honnête que 0
    console.error('[UX] PageSpeed UX failed:', err.message, '— score non mesuré');

    // Fallback HTML : vérifier juste la présence du viewport mobile
    try {
      const fallbackController = new AbortController();
      const fallbackTimer = setTimeout(() => fallbackController.abort(), 5_000);

      const htmlResponse = await fetch(url, {
        signal: fallbackController.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Webisafe/1.0)' },
      });
      clearTimeout(fallbackTimer);

      const html = await htmlResponse.text();
      const hasViewport = /name=["']viewport["']/i.test(html);
      const hasMediaQuery = /@media/i.test(html);

      // Score minimal basé sur les indices HTML
      const fallbackScore = hasViewport && hasMediaQuery ? 55 : hasViewport ? 40 : 25;

      console.log(`[UX] Fallback HTML → viewport:${hasViewport} mediaQuery:${hasMediaQuery} → score estimé ${fallbackScore}`);

      return {
        score: fallbackScore,
        accessibility_score: null,
        tap_targets_ok: null,
        partial: true,
      };

    } catch {
      return {
        score: null,
        accessibility_score: null,
        tap_targets_ok: null,
        partial: true,
      };
    }

  } finally {
    clearTimeout(timer);
  }
}
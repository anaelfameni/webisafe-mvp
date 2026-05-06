const PAGESPEED_BASE = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
const TIMEOUT_PS_MS = 60_000;
const TIMEOUT_PS_RETRY_MS = 75_000;
const DEFAULT_CATEGORIES = ['performance', 'seo', 'best-practices', 'accessibility'];

function isTimeoutError(err) {
  const msg = String(err?.message || '').toLowerCase();
  return msg.includes('aborted') || msg.includes('timeout') || msg.includes('timed out');
}

export async function fetchPageSpeedData(url, apiKey, categories = DEFAULT_CATEGORIES) {
  if (!apiKey) {
    throw new Error('Cle PageSpeed absente');
  }

  const attempt = async (timeoutMs) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const params = new URLSearchParams({
        url,
        strategy: 'mobile',
        key: apiKey,
      });
      for (const category of categories) params.append('category', category);

      const response = await fetch(`${PAGESPEED_BASE}?${params.toString()}`, { signal: controller.signal });
      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`PageSpeed HTTP ${response.status} : ${body.slice(0, 200)}`);
      }

      const data = await response.json();
      const lr = data.lighthouseResult;
      if (!lr) throw new Error('Réponse PageSpeed invalide : lighthouseResult absent');

      return {
        requested_url: url,
        final_url: lr.finalUrl ?? data.id ?? null,
        fetch_time: lr.fetchTime ?? null,
        categories: {
          performance: getPageSpeedScore({ lighthouseResult: lr }, 'performance'),
          seo: getPageSpeedScore({ lighthouseResult: lr }, 'seo'),
          best_practices: getPageSpeedScore({ lighthouseResult: lr }, 'best-practices'),
          accessibility: getPageSpeedScore({ lighthouseResult: lr }, 'accessibility'),
        },
        audits: lr.audits ?? {},
        lighthouseResult: lr,
      };
    } finally {
      clearTimeout(timer);
    }
  };

  try {
    return await attempt(TIMEOUT_PS_MS);
  } catch (err) {
    if (isTimeoutError(err)) {
      console.warn('[PAGESPEED] timeout/abort → retry 1 fois (75s)');
      return await attempt(TIMEOUT_PS_RETRY_MS);
    }
    throw err;
  }
}

export function getPageSpeedScore(pageSpeedData, category) {
  const score = pageSpeedData?.lighthouseResult?.categories?.[category]?.score;
  return typeof score === 'number' ? Math.round(score * 100) : null;
}

export function buildPerformanceMetricsFromPageSpeed(pageSpeedData) {
  if (!pageSpeedData?.lighthouseResult) return null;

  const lr = pageSpeedData.lighthouseResult;
  const audits = lr.audits ?? {};
  const pageWeightB = audits['total-byte-weight']?.numericValue ?? null;
  const opportunities = Object.entries(audits)
    .filter(([, audit]) => audit?.details?.type === 'opportunity' && audit.score !== null && audit.score < 0.9)
    .map(([key, audit]) => ({
      id: key,
      title: audit.title,
      description: audit.description,
      savings_ms: audit.details?.overallSavingsMs ?? null,
    }))
    .sort((a, b) => (b.savings_ms ?? 0) - (a.savings_ms ?? 0))
    .slice(0, 5);

  return {
    score: getPageSpeedScore(pageSpeedData, 'performance'),
    lcp: audits['largest-contentful-paint']?.numericValue ?? null,
    cls: audits['cumulative-layout-shift']?.numericValue ?? null,
    fcp: audits['first-contentful-paint']?.numericValue ?? null,
    tbt: audits['total-blocking-time']?.numericValue ?? null,
    tti: audits.interactive?.numericValue ?? null,
    page_weight_mb: pageWeightB !== null ? Math.round((pageWeightB / 1_048_576) * 100) / 100 : null,
    opportunities,
    pageSpeed_final_url: pageSpeedData.final_url,
    partial: false,
  };
}

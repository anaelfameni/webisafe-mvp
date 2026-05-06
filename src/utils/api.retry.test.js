import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildAnalysisRequestUrls, runFullAnalysis } from './api.js';

function successResponse(url) {
  return new Response(JSON.stringify({
    success: true,
    url,
    global_score: 80,
    grade: 'A',
    scores: { performance: 75, security: 70, seo: 90, ux: 85 },
    metrics: {
      performance: {},
      security: {},
      seo: {},
      ux: {},
    },
    critical_alerts: [],
  }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

describe('runFullAnalysis URL fallback', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds a www fallback for bare public domains', () => {
    expect(buildAnalysisRequestUrls('https://nsiabanque.ci/')).toEqual([
      'https://nsiabanque.ci/',
      'https://www.nsiabanque.ci/',
    ]);
  });

  it('retries with www when the first scan request says the site is unreachable', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        success: false,
        error: "Impossible de joindre le site. Vérifiez l'URL.",
        type: 'SITE_UNREACHABLE',
      }), {
        status: 422,
        headers: { 'content-type': 'application/json' },
      }))
      .mockResolvedValueOnce(successResponse('https://www.nsiabanque.ci/'));

    vi.stubGlobal('fetch', fetchMock);

    const result = await runFullAnalysis('https://nsiabanque.ci/', undefined, 'admin@test.com');
    const firstBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    const secondBody = JSON.parse(fetchMock.mock.calls[1][1].body);

    expect(firstBody.url).toBe('https://nsiabanque.ci/');
    expect(secondBody.url).toBe('https://www.nsiabanque.ci/');
    expect(result.success).toBe(true);
    expect(result.url).toBe('https://www.nsiabanque.ci/');
  });
});

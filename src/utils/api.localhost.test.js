import test from 'node:test';
import assert from 'node:assert/strict';

import { runFullAnalysis } from './api.js';

test('runFullAnalysis sends localhost scans to the backend with HTTP protocol', async () => {
  const originalFetch = globalThis.fetch;
  let requestBody;

  globalThis.fetch = async (_url, options = {}) => {
    requestBody = JSON.parse(options.body);

    return new Response(JSON.stringify({
      success: true,
      url: requestBody.url,
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
  };

    try {
    const result = await runFullAnalysis('localhost:5173', undefined, 'client@test.com');

    assert.equal(requestBody.url, 'http://localhost:5173/');
    assert.equal(requestBody.email, 'client@test.com');
    assert.equal(requestBody.force_refresh, true);
    assert.equal(result.success, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

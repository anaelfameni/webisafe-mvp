import assert from 'node:assert/strict';
import test from 'node:test';
import { scanSEO } from './seoScanner.js';

const GOOGLE_LIKE_HTML = `
<!doctype html>
<html>
  <head><title>Google</title></head>
  <body><a href="/search">Search</a></body>
</html>`;

function createResponse({ ok = true, status = 200, text = '', json = null } = {}) {
  return {
    ok,
    status,
    async text() {
      return text;
    },
    async json() {
      return json;
    },
  };
}

test('scanSEO uses the PageSpeed SEO score when a PageSpeed key is provided', async (t) => {
  const originalFetch = globalThis.fetch;
  const calls = [];

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async (url) => {
    calls.push(String(url));

    if (String(url).includes('pagespeedonline')) {
      return createResponse({
        json: {
          lighthouseResult: {
            categories: {
              seo: { score: 0.91 },
            },
          },
        },
      });
    }

    return createResponse({ text: GOOGLE_LIKE_HTML });
  };

  const result = await scanSEO('https://google.com/', 'psi-key');

  assert.equal(result.local_score, 55);
  assert.equal(result.pageSpeed_score, 91);
  assert.equal(result.score, 91);
  assert.equal(result.partial, false);
  assert.equal(calls.length, 2);
  assert.match(calls[1], /category=seo/);
});

test('scanSEO keeps the local HTML score as fallback when PageSpeed SEO fails', async (t) => {
  const originalFetch = globalThis.fetch;

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async (url) => {
    if (String(url).includes('pagespeedonline')) {
      return createResponse({ ok: false, status: 500, json: {} });
    }

    return createResponse({ text: GOOGLE_LIKE_HTML });
  };

  const result = await scanSEO('https://google.com/', 'psi-key');

  assert.equal(result.local_score, 55);
  assert.equal(result.pageSpeed_score, null);
  assert.equal(result.score, 55);
  assert.equal(result.partial, true);
});

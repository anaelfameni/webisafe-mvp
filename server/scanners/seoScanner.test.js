import assert from 'node:assert/strict';
import { afterEach, test } from 'vitest';
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
    url: 'https://google.com/',
    async text() {
      return text;
    },
    async json() {
      return json;
    },
  };
}

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test('scanSEO uses the PageSpeed SEO score when a PageSpeed key is provided', async () => {
  const calls = [];

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
  assert.equal(calls.filter((call) => call.includes('pagespeedonline')).length, 1);
  assert.equal(calls.some((call) => /category=seo/.test(call)), true);
});

test('scanSEO keeps the local HTML score as fallback when PageSpeed SEO fails', async () => {
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

test('scanSEO reuses shared PageSpeed data without making a second PageSpeed request', async () => {
  const calls = [];

  globalThis.fetch = async (url) => {
    calls.push(String(url));
    return createResponse({ text: GOOGLE_LIKE_HTML });
  };

  const result = await scanSEO('https://google.com/', 'psi-key', {
    lighthouseResult: {
      categories: {
        seo: { score: 0.75 },
      },
      audits: {},
    },
  });

  assert.equal(result.pageSpeed_score, 75);
  assert.equal(result.score, 75);
  assert.equal(calls.some((call) => /pagespeedonline/.test(call)), false);
});

test('scanSEO exposes enhanced SEO technical, AI visibility, and business recommendation data', async () => {
  const html = `<!doctype html>
  <html lang="fr"><head>
    <title>Agence Web Abidjan - Création site PME</title>
    <meta name="description" content="Agence web à Abidjan spécialisée dans la création de sites professionnels, rapides et sécurisés pour PME ambitieuses en Côte d’Ivoire.">
    <meta property="og:title" content="Agence Web Abidjan">
    <meta property="og:description" content="Création de sites professionnels pour PME.">
    <meta property="og:image" content="https://example.com/og.jpg">
    <meta name="twitter:title" content="Agence Web Abidjan">
    <meta name="twitter:description" content="Création de sites professionnels pour PME.">
    <meta name="twitter:image" content="https://example.com/twitter.jpg">
    <script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"Agence Web Abidjan"}</script>
  </head><body><a href="/contact">Contact</a><a href="/mentions-legales">Mentions légales</a><main><h1>Agence Web Abidjan</h1><h2>Sites PME</h2><p>${'Contenu lisible '.repeat(20)}</p></main></body></html>`;

  globalThis.fetch = async (url) => {
    const value = String(url);
    if (value.endsWith('/robots.txt')) return createResponse({ text: 'User-agent: *\nAllow: /\nSitemap: https://example.com/sitemap.xml' });
    if (value.endsWith('/sitemap.xml')) return createResponse({ text: '<urlset></urlset>' });
    if (value.endsWith('/favicon.ico')) return createResponse({ text: '' });
    return createResponse({ text: html });
  };

  const result = await scanSEO('https://example.com/');

  assert.equal(result.technical_checks.title_length.status, 'pass');
  assert.equal(result.technical_checks.meta_description_length.status, 'pass');
  assert.equal(result.technical_checks.robots_txt.status, 'pass');
  assert.equal(result.ai_visibility.score >= 70, true);
  assert.equal(Array.isArray(result.business_recommendations), true);
  assert.equal(result.has_title, true);
  assert.equal(result.has_description, true);
});

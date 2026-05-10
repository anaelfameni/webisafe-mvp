import assert from 'node:assert/strict';
import { afterEach, test } from 'vitest';

import { scanSecurity } from './securityScanner.js';

const originalFetch = globalThis.fetch;
const originalResolve = globalThis.Dns?.resolve;

function createResponse({ status = 200, text = '', headers = {}, url = 'https://example.com/' } = {}) {
  const normalizedHeaders = new Map(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]));
  return {
    ok: status >= 200 && status < 300,
    status,
    url,
    headers: {
      get(key) {
        return normalizedHeaders.get(String(key).toLowerCase()) || null;
      },
    },
    async text() {
      return text;
    },
    async json() {
      return { score: 80 };
    },
  };
}

const WORDPRESS_HTML = `<!doctype html>
<html><head>
  <meta name="generator" content="WordPress 5.8">
  <script src="https://code.jquery.com/jquery-1.12.4.min.js"></script>
</head><body>
  <link rel="stylesheet" href="/wp-content/plugins/contact-form-7/style.css">
</body></html>`;

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (globalThis.Dns && originalResolve) globalThis.Dns.resolve = originalResolve;
});

test('scanSecurity returns HTTP method, DNSSEC, and WordPress security signals', async () => {
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    const value = String(url);
    const method = options.method || 'GET';
    calls.push({ url: value, method });

    if (method === 'OPTIONS') {
      return createResponse({ headers: { allow: 'GET, POST, OPTIONS, TRACE, PROPFIND' } });
    }

    if (method === 'TRACE') return createResponse({ status: 200, text: 'TRACE accepted' });
    if (method === 'PUT') return createResponse({ status: 405 });
    if (method === 'DELETE') return createResponse({ status: 405 });
    if (method === 'PROPFIND') return createResponse({ status: 207, text: '<multistatus />' });
    if (value.endsWith('/wp-login.php')) return createResponse({ text: '<form>wp-submit</form>' });
    if (value.endsWith('/xmlrpc.php')) return createResponse({ status: 200, text: 'XML-RPC server accepts POST requests only.' });
    if (value.endsWith('/wp-json/wp/v2/users')) return createResponse({ text: '[{"id":1,"name":"Admin"}]' });
    if (value.endsWith('/readme.html')) return createResponse({ text: '<br /> Version 5.8' });
    if (value.includes('/wp-content/plugins/')) return createResponse({ status: 200, text: WORDPRESS_HTML });
    if (value.includes('http-observatory')) return createResponse({ text: '{}', headers: {} });

    return createResponse({ text: WORDPRESS_HTML, headers: { 'content-security-policy': "default-src 'self'; frame-ancestors 'self'" } });
  };

  globalThis.Dns = {
    resolve: async (domain, type) => {
      if (type === 'DS') return [{ keyTag: 12345 }];
      return [];
    },
  };

  const result = await scanSecurity('https://example.com/', 'vt-key');

  assert.equal(calls.some((call) => call.method === 'OPTIONS'), true);
  assert.equal(result.http_methods.trace_enabled, true);
  assert.equal(result.http_methods.webdav_exposed, true);
  assert.equal(result.http_methods.risky_methods.includes('TRACE'), true);
  assert.equal(result.dnssec.status, 'pass');
  assert.equal(result.csp_quality.present, true);
  assert.equal(result.csp_quality.score >= 70, true);
  assert.equal(result.cms_detection.primary, 'WordPress');
  assert.equal(result.js_libraries.detected.some((item) => item.name === 'jQuery' && item.version === '1.12.4'), true);
  assert.equal(result.js_libraries.outdated_or_risky.some((item) => item.name === 'jQuery'), true);
  assert.equal(result.sri.external_scripts_count, 1);
  assert.equal(result.sri.missing_integrity_count, 1);
  assert.equal(result.compliance_badges.some((badge) => badge.label === 'Préparation PCI DSS'), true);
  assert.equal(result.wordpress_security.applicable, true);
  assert.equal(result.wordpress_security.wp_login_visible, true);
  assert.equal(result.wordpress_security.xmlrpc_active, true);
  assert.equal(result.wordpress_security.users_exposed, true);
  assert.equal(result.wordpress_security.version_exposed, true);
});

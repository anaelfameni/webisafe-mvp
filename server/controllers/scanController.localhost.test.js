import test from 'node:test';
import assert from 'node:assert/strict';

test('scans localhost without requiring a PageSpeed key in local development', async () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = {
    GOOGLE_PAGESPEED_KEY: process.env.GOOGLE_PAGESPEED_KEY,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  };

  delete process.env.GOOGLE_PAGESPEED_KEY;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_ANON_KEY;

  const html = `
    <!doctype html>
    <html>
      <head>
        <title>Local Test Site</title>
        <meta name="description" content="Local scan fixture">
        <meta name="viewport" content="width=device-width, initial-scale=1">
      </head>
      <body>
        <header>Header</header>
        <nav><a href="/about">About</a></nav>
        <main><h1>Local Test Site</h1></main>
      </body>
    </html>
  `;

  globalThis.fetch = async (url, options = {}) => {
    const href = String(url);

    if (href.includes('googleapis.com')) {
      return new Response('PageSpeed cannot audit localhost', { status: 400 });
    }

    if (href.includes('http-observatory.security.mozilla.org')) {
      return new Response('{}', { status: 500 });
    }

    if (href.includes('ip-api.com')) {
      return new Response(JSON.stringify({ status: 'fail', message: 'private range' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    return new Response(options.method === 'HEAD' ? null : html, {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  };

  try {
    const moduleUrl = new URL(`./scanController.js?local=${Date.now()}`, import.meta.url);
    const { handleScan } = await import(moduleUrl.href);

    let statusCode = 200;
    let payload;
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(body) {
        payload = body;
        return body;
      },
    };

    await handleScan({ body: { url: 'localhost:5173' } }, res);

    assert.equal(statusCode, 200);
    assert.equal(payload.success, true);
    assert.equal(payload.url, 'http://localhost:5173/');
    assert.notEqual(payload.type, 'CONFIG_ERROR');
  } finally {
    globalThis.fetch = originalFetch;

    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

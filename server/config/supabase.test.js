import test from 'node:test';
import assert from 'node:assert/strict';

test('exports null client when Supabase is not configured for local development', async () => {
  const originalUrl = process.env.SUPABASE_URL;
  const originalServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    const moduleUrl = new URL(`./supabase.js?missing=${Date.now()}`, import.meta.url);
    const { supabase } = await import(moduleUrl.href);
    assert.equal(supabase, null);
  } finally {
    if (originalUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = originalUrl;

    if (originalServiceRole === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRole;
  }
});

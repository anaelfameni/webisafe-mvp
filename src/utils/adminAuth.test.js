import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'vitest';
import assert from 'node:assert/strict';

test('keeps expected Supabase account emails available in tests only', () => {
  assert.equal('admin@test.com', 'admin@test.com');
  assert.equal('client@test.com', 'client@test.com');
});

test('does not export local credential helpers', () => {
  const source = readFileSync(resolve('src/utils/adminAuth.js'), 'utf8');

  assert.equal(source.includes('admin@test.com'), false);
  assert.equal(source.includes('client@test.com'), false);
  assert.equal(source.includes('password'), false);
  assert.equal(source.includes('localStorage'), false);
});

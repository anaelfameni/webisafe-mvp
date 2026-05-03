import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('api scan function runs from the free African Vercel compute region', () => {
  const config = JSON.parse(readFileSync(new URL('./vercel.json', import.meta.url), 'utf8'));

  assert.deepEqual(config.functions?.['api/scan.js']?.regions, ['cpt1']);
});

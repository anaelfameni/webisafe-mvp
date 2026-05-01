import test from 'node:test';
import assert from 'node:assert/strict';

import { validateUrl, normalizeURL } from './validators.js';

test('normalizes localhost without protocol to HTTP for local scans', () => {
  assert.equal(normalizeURL('localhost:5173'), 'http://localhost:5173/');
  assert.equal(normalizeURL('127.0.0.1:5173'), 'http://127.0.0.1:5173/');
});

test('keeps public domains on HTTPS when protocol is omitted', () => {
  assert.equal(normalizeURL('example.com'), 'https://example.com/');
});

test('allows localhost and loopback scan URLs', () => {
  assert.deepEqual(validateUrl('localhost:5173'), {
    valid: true,
    url: 'http://localhost:5173/',
  });
  assert.deepEqual(validateUrl('http://localhost:5173'), {
    valid: true,
    url: 'http://localhost:5173/',
  });
  assert.deepEqual(validateUrl('127.0.0.1:5173'), {
    valid: true,
    url: 'http://127.0.0.1:5173/',
  });
});

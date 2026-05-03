import test from 'node:test';
import assert from 'node:assert/strict';

import { isValidURL, normalizeURL } from './validators.js';

test('normalizes localhost without protocol to HTTP for local scans', () => {
  assert.equal(normalizeURL('localhost:5173'), 'http://localhost:5173/');
  assert.equal(normalizeURL('127.0.0.1:5173'), 'http://127.0.0.1:5173/');
});

test('keeps public domains on HTTPS when protocol is omitted', () => {
  assert.equal(normalizeURL('example.com'), 'https://example.com/');
});

test('accepts localhost URLs as valid scan targets', () => {
  assert.equal(isValidURL('localhost:5173'), true);
  assert.equal(isValidURL('http://localhost:5173'), true);
});

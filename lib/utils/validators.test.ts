import test from 'node:test';
import assert from 'node:assert/strict';

import {
  deriveGrade,
  extractScanTarget,
  isPrivateHostname,
  validateScanUrl,
} from './validators.ts';

test('validateScanUrl accepts a valid https url', () => {
  const result = validateScanUrl('https://example.com/path');

  assert.equal(result.ok, true);
  assert.equal(result.normalizedUrl, 'https://example.com/path');
});

test('validateScanUrl rejects unsupported protocols', () => {
  const result = validateScanUrl('ftp://example.com');

  assert.equal(result.ok, false);
  assert.equal(result.code, 'INVALID_URL');
});

test('extractScanTarget derives domain and https flag', () => {
  const result = extractScanTarget('https://blog.example.co.uk/page');

  assert.equal(result.hostname, 'blog.example.co.uk');
  assert.equal(result.domain, 'example.co.uk');
  assert.equal(result.protocol, 'https:');
  assert.equal(result.httpsEnabled, true);
});

test('isPrivateHostname detects localhost and private ipv4 targets', () => {
  assert.equal(isPrivateHostname('localhost'), true);
  assert.equal(isPrivateHostname('127.0.0.1'), true);
  assert.equal(isPrivateHostname('192.168.1.10'), true);
  assert.equal(isPrivateHostname('example.com'), false);
});

test('deriveGrade maps scores to the expected labels', () => {
  assert.deepEqual(deriveGrade(93), { grade: 'A+', interpretation: 'Excellent - Top 10%' });
  assert.deepEqual(deriveGrade(84), { grade: 'A', interpretation: 'Très bon - Top 25%' });
  assert.deepEqual(deriveGrade(75), { grade: 'B', interpretation: 'Bon - Top 50%' });
  assert.deepEqual(deriveGrade(64), { grade: 'C', interpretation: 'Moyen - Améliorations nécessaires' });
  assert.deepEqual(deriveGrade(53), { grade: 'D', interpretation: 'Insuffisant - Corrections urgentes' });
  assert.deepEqual(deriveGrade(20), { grade: 'F', interpretation: 'Critique - Refonte nécessaire' });
});

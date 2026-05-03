import assert from 'node:assert/strict';
import test from 'node:test';
import { getSeoCalibrationResult } from './calibration.js';

test('SEO calibration rejects a large PageSpeed gap instead of widening the threshold', () => {
  const result = getSeoCalibrationResult({ seo: 55 }, { seo: 91 });

  assert.equal(result.gap, 36);
  assert.equal(result.threshold, 15);
  assert.equal(result.passed, false);
});

test('SEO calibration accepts close scores', () => {
  const result = getSeoCalibrationResult({ seo: 89 }, { seo: 91 });

  assert.equal(result.gap, 2);
  assert.equal(result.threshold, 15);
  assert.equal(result.passed, true);
});

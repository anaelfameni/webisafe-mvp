import { describe, expect, it } from 'vitest';
import {
  buildAccessibilityProbeUrls,
  calibratePerformanceResult,
  combineSecurityScores,
  hasCompleteAdvancedSecurity,
  shouldUseCachedScan,
} from './scan.js';

describe('scan calibration and cache policy', () => {
  it('tries the www variant when probing a bare domain', () => {
    expect(buildAccessibilityProbeUrls('https://nsiabanque.ci/')).toContain('https://www.nsiabanque.ci/');
  });

  it('bypasses cache when a fresh scan is explicitly requested', () => {
    const cached = { results_json: { metrics: { security: { extended_checks: [{ check_name: 'waf' }] } } } };

    expect(shouldUseCachedScan(cached, true)).toBe(false);
  });

  it('treats cached scans without required advanced checks as stale', () => {
    const cached = { results_json: { metrics: { security: { extended_checks: [] } } } };

    expect(shouldUseCachedScan(cached, false)).toBe(false);
  });

  it('accepts cached scans containing the expected advanced checks', () => {
    const cached = {
      results_json: {
        metrics: {
          security: {
            extended_checks: [
              { check_name: 'waf' },
              { check_name: 'subdomains' },
              { check_name: 'security_txt' },
              { check_name: 'cors' },
              { check_name: 'supply_chain' },
              { check_name: 'email_advanced' },
            ],
          },
        },
      },
    };

    expect(hasCompleteAdvancedSecurity(cached.results_json)).toBe(true);
    expect(shouldUseCachedScan(cached, false)).toBe(true);
  });

  it('does not let advanced security duplicate penalties pull HTTPS bank-grade scans below their standard score', () => {
    const score = combineSecurityScores({
      legacyScore: 69,
      advancedScore: 45,
      extendedScore: 70,
      https: true,
      malwareDetected: false,
    });

    expect(score).toBeGreaterThanOrEqual(69);
  });

  it('keeps a clean HTTPS site at acceptable level even when missing all best-practice headers', () => {
    // Cas réel : cybastiontech.com (entreprise cybersécurité) avec HTTPS + SSL A + pas malware
    // mais 6 headers de best practice manquants. Ne devrait JAMAIS descendre sous 70.
    const score = combineSecurityScores({
      legacyScore: 80,        // HTTPS (40) + SSL (10) + Malware non vérifié (30) + 0 headers
      advancedScore: 35,      // pénalisé par 6 headers fail/warning
      extendedScore: 80,      // WAF OK, security.txt manquant -4, autres OK
      https: true,
      malwareDetected: false,
    });

    expect(score).toBeGreaterThanOrEqual(70);
  });

  it('guarantees minimum 70 for HTTPS sites with no malware (regression test)', () => {
    // Même un legacyScore artificiellement bas ne devrait pas plonger un site HTTPS sain
    const score = combineSecurityScores({
      legacyScore: 50,
      advancedScore: 30,
      extendedScore: 40,
      https: true,
      malwareDetected: null,
    });

    expect(score).toBeGreaterThanOrEqual(70);
  });

  it('still penalizes sites with confirmed malware regardless of HTTPS', () => {
    const score = combineSecurityScores({
      legacyScore: 30,
      advancedScore: 50,
      extendedScore: 60,
      https: true,
      malwareDetected: true,
    });

    expect(score).toBeLessThan(70);
  });

  it('does not artificially boost HTTP sites without HTTPS', () => {
    const score = combineSecurityScores({
      legacyScore: 40,
      advancedScore: 60,
      extendedScore: 70,
      https: false,
      malwareDetected: false,
    });

    expect(score).toBeLessThan(70);
  });

  it('marks extreme PageSpeed lab outliers as estimated instead of trusting a single very low run blindly', () => {
    const calibrated = calibratePerformanceResult({
      score: 24,
      raw_score: 24,
      lcp: 56333,
      fcp: 10657,
      cls: 0.557,
      page_weight_mb: 10.21,
      failed_checks: ['lcp_poor', 'cls_poor', 'fcp_poor', 'weight_very_heavy'],
      partial: false,
    });

    expect(calibrated.score).toBeGreaterThanOrEqual(35);
    expect(calibrated.partial).toBe(true);
    expect(calibrated.partial_reason).toBe('pagespeed_extreme_lab_outlier');
  });
});

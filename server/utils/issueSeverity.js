export const ISSUE_SEVERITY = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
  UNKNOWN: 'unknown',
};

const SEVERITY_CAPS = {
  critical: 49,
  high: 84,
  medium: 94,
  low: 97,
};

export function getSeverityCap(issues = []) {
  const severities = Array.isArray(issues)
    ? issues.map(issue => issue?.severity).filter(Boolean)
    : [];

  if (severities.includes(ISSUE_SEVERITY.CRITICAL)) return SEVERITY_CAPS.critical;
  if (severities.includes(ISSUE_SEVERITY.HIGH)) return SEVERITY_CAPS.high;

  const mediumCount = severities.filter(s => s === ISSUE_SEVERITY.MEDIUM).length;
  if (mediumCount >= 3) return 89;
  if (mediumCount > 0) return SEVERITY_CAPS.medium;

  const lowCount = severities.filter(s => s === ISSUE_SEVERITY.LOW).length;
  if (lowCount >= 3) return 95;
  if (lowCount > 0) return SEVERITY_CAPS.low;

  return 100;
}

export function capBySeverity(score, issues = []) {
  if (score === null || score === undefined) return null;
  const n = Number(score);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, Math.min(Math.round(n), getSeverityCap(issues))));
}
